import React, { useEffect, useState, useRef, useCallback } from 'react';
import mqtt from 'mqtt';
import { getSqliteDbInstance } from '../utils/localDb';
import { QrGeneratorCard } from './QrGeneratorCard';
import { GMAWTelemetryPacket } from '../types';

/**
 * WeldVisionStudio — Global Ingestion & State Layout Controller
 *
 * Top-level wrapper that:
 *   1. Establishes dual MQTT clients (Local LAN + Cloud WAN fallback)
 *   2. Manages the multi-user active sessions roster
 *   3. Runs GMAW thermophysics ingestion on incoming frames
 *   4. Routes enriched telemetry to the Three.js simulation viewport
 *   5. Initializes SQLite-WASM/OPFS for offline persistence
 */

// ── Broker Configuration ─────────────────────────────────────────────────────

const LOCAL_LAN_BROKER = 'ws://192.168.1.45:9001/mqtt';
const CLOUD_WAN_BROKER = 'wss://your-hivemq-cluster.com:8884/mqtt';

// ── GMAW Thermophysics Inline Functions ──────────────────────────────────────

function resolveAmperage(wfsIpms: number): number {
  return 0.55 * wfsIpms + 10;
}

function calculateHeatInput(voltage: number, amperage: number, speedMms: number): number {
  return speedMms > 0 ? (0.8 * voltage * amperage) / speedMms : 0;
}

// ── Props ────────────────────────────────────────────────────────────────────

interface WeldVisionStudioProps {
  /** The existing Three.js simulation scene (ModelViewer3D) */
  threeJsScene?: React.ReactNode;
}

// ── Component ────────────────────────────────────────────────────────────────

export const WeldVisionStudio: React.FC<WeldVisionStudioProps> = ({
  threeJsScene,
}) => {
  const [activeSessions, setActiveSessions] = useState<Map<string, { status: string; bracketId?: string }>>(
    new Map()
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [dbReady, setDbReady] = useState(false);

  // Mutable refs for 60 Hz performance — avoids React re-render on every frame
  const sessionBuffers = useRef<Map<string, any[]>>(new Map());
  const threeCanvasRef = useRef<any>(null);

  // ── SQLite-WASM / OPFS Init ────────────────────────────────────────────────

  useEffect(() => {
    async function initPersistentLayers() {
      try {
        await getSqliteDbInstance();
        console.log('OPFS SQLite Engine verified. COOP/COEP headers active.');
        setDbReady(true);
      } catch (err) {
        console.error('OPFS Initialization failed. Running in fallback memory mode.', err);
      }
    }
    initPersistentLayers();
  }, []);

  // ── Dual MQTT Ingestion Pipeline ───────────────────────────────────────────

  useEffect(() => {
    // Attempt local LAN broker connection
    const localClient = mqtt.connect(LOCAL_LAN_BROKER, {
      reconnectPeriod: 3000,
      connectTimeout: 5000,
    });

    // Attempt cloud WAN fallback connection
    const cloudClient = mqtt.connect(CLOUD_WAN_BROKER, {
      username: 'studio_dashboard',
      password: 'pwd',
      reconnectPeriod: 5000,
      connectTimeout: 8000,
    });

    const handleIncomingFrame = (topic: string, message: Buffer) => {
      try {
        const topicParts = topic.split('/');
        // Path: weldvision/room_A/{student_id}/live
        const studentId = topicParts[2];

        const rawFrame = JSON.parse(message.toString()) as GMAWTelemetryPacket;

        // ── GMAW Real-Time Physical Ingestion ────────────────────────────
        const resolvedAmperage = resolveAmperage(rawFrame.settings.wire_feed_speed_ipm);
        const travelSpeed = rawFrame.telemetry.travel_speed_mms;

        // Net Energy Input: Q = (η · V · I) / v
        const netHeatInput = calculateHeatInput(
          rawFrame.settings.voltage,
          resolvedAmperage,
          travelSpeed
        );

        const enrichedFrame = {
          ...rawFrame,
          calculated: {
            amperage: resolvedAmperage,
            heatInput: netHeatInput,
          },
        };

        // Maintain telemetry stream in mutable ref without triggering React renders
        if (!sessionBuffers.current.has(studentId)) {
          sessionBuffers.current.set(studentId, []);
          setActiveSessions((prev) =>
            new Map(prev.set(studentId, { status: 'Welding...' }))
          );
        }
        sessionBuffers.current.get(studentId)!.push(enrichedFrame);

        // Route directly to Three.js scene if this student is selected
        if (studentId === selectedStudentId && threeCanvasRef.current) {
          threeCanvasRef.current.updateSimulationMesh(
            enrichedFrame.telemetry.x_mm,
            enrichedFrame.telemetry.y_mm,
            enrichedFrame.telemetry.z_gap_mm,
            netHeatInput,
            enrichedFrame.telemetry.trigger_pressed
          );
        }
      } catch (err) {
        console.warn('Failed to process MQTT frame:', err);
      }
    };

    localClient.on('message', handleIncomingFrame);
    cloudClient.on('message', handleIncomingFrame);

    localClient.on('connect', () => {
      console.log('[MQTT] Connected to local LAN broker');
      localClient.subscribe('weldvision/room_A/+/live');
    });

    cloudClient.on('connect', () => {
      console.log('[MQTT] Connected to cloud WAN broker');
      cloudClient.subscribe('weldvision/room_A/+/live');
    });

    localClient.on('error', (err) =>
      console.warn('[MQTT] Local broker error:', err.message)
    );
    cloudClient.on('error', (err) =>
      console.warn('[MQTT] Cloud broker error:', err.message)
    );

    return () => {
      localClient.end(true);
      cloudClient.end(true);
    };
  }, [selectedStudentId]);

  // ── Session End Handler ────────────────────────────────────────────────────

  const handleEndSession = useCallback(
    async (studentId: string) => {
      const buffer = sessionBuffers.current.get(studentId);
      if (!buffer || buffer.length === 0) return;

      try {
        // Persist to SQLite-WASM before clearing
        const sqlite = await getSqliteDbInstance();
        const firstFrame = buffer[0] as GMAWTelemetryPacket;

        sqlite.db.run(
          `INSERT OR REPLACE INTO local_sessions (session_id, student_id, bracket_id, voltage, wfs_ipm)
           VALUES (?, ?, ?, ?, ?)`,
          [
            firstFrame.meta.session_id,
            studentId,
            firstFrame.meta.bracket_id,
            firstFrame.settings.voltage,
            firstFrame.settings.wire_feed_speed_ipm,
          ]
        );

        // Batch insert telemetry frames
        const stmt = sqlite.db.prepare(
          `INSERT INTO local_telemetry (session_id, x_mm, y_mm, z_gap_mm, speed_mms, work_angle, travel_angle, trigger)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        );

        for (const frame of buffer) {
          stmt.run([
            frame.meta.session_id,
            frame.telemetry.x_mm,
            frame.telemetry.y_mm,
            frame.telemetry.z_gap_mm,
            frame.telemetry.travel_speed_mms,
            frame.telemetry.work_angle_deg,
            frame.telemetry.travel_angle_deg,
            frame.telemetry.trigger_pressed ? 1 : 0,
          ]);
        }
        stmt.free();

        await sqlite.saveToOpfs();
        console.log(`[SQLite] Session ${studentId} persisted to OPFS`);
      } catch (err) {
        console.error('Failed to persist session to SQLite:', err);
      }

      // Clean up session buffers and state
      sessionBuffers.current.delete(studentId);
      setActiveSessions((prev) => {
        const next = new Map(prev);
        next.delete(studentId);
        return next;
      });

      if (selectedStudentId === studentId) {
        setSelectedStudentId(null);
      }
    },
    [selectedStudentId]
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-100 font-sans">
      {/* ── LEFT SIDEBAR: Classroom Roster & Active MQTT Sessions ── */}
      <div className="w-1/4 min-w-[280px] border-r border-slate-800 p-4 flex flex-col justify-between">
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-black tracking-wide text-amber-400">
            WELDVISION STUDIO
          </h2>

          <div>
            <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-2">
              Active Workshop Feeds
            </h3>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {Array.from(activeSessions.keys()).map((studentId) => (
                <button
                  key={studentId}
                  onClick={() => setSelectedStudentId(studentId)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    selectedStudentId === studentId
                      ? 'bg-amber-500/20 border border-amber-500/40 shadow-lg font-bold'
                      : 'bg-slate-800 hover:bg-slate-750 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      {(studentId as string).replace('stu_', '').toUpperCase()}
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Mode: GMAW (MIG) &middot; Live
                  </div>
                </button>
              ))}
              {activeSessions.size === 0 && (
                <p className="text-sm text-slate-500 italic px-1">
                  Waiting for hardware trigger locks...
                </p>
              )}
            </div>

            {/* End Session button for selected student */}
            {selectedStudentId && activeSessions.has(selectedStudentId) && (
              <button
                onClick={() => handleEndSession(selectedStudentId)}
                className="mt-3 w-full text-xs font-bold uppercase tracking-wider bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-lg py-2 transition-colors"
              >
                End Session & Persist to OPFS
              </button>
            )}
          </div>
        </div>

        {/* ── Provisioning Desk Anchor ── */}
        {dbReady && (
          <QrGeneratorCard
            student={{ id: 'stu_marcus_99', name: 'Marcus Vance' }}
            assignedBracketId="brk_035_gmaw"
          />
        )}
      </div>

      {/* ── RIGHT WORKSPACE: Simulation Viewport ── */}
      <div className="w-3/4 p-6 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">
              Live Volumetric Simulation Workspace
            </h1>
            <p className="text-sm text-slate-400">
              Monitoring Target:{' '}
              <span className="text-amber-400 font-mono font-bold">
                {selectedStudentId || 'None Selected'}
              </span>
            </p>
          </div>
          <div className="flex gap-4 text-xs font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div>
              Process:{' '}
              <span className="text-emerald-400 font-bold">GMAW (CV)</span>
            </div>
            <div>
              Frequency:{' '}
              <span className="text-amber-400 font-bold">60 Hz Stream</span>
            </div>
          </div>
        </div>

        {/* ── Three.js Canvas Mount Point ── */}
        <div className="flex-grow rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner">
          {threeJsScene || (
            <div className="w-full h-full flex items-center justify-center text-slate-600 italic">
              [ Mount point for Three.js Defect/Distortion Canvas Component ]
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
