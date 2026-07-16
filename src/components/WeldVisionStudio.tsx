import React, { useState } from 'react';
import { QrGeneratorCard } from './QrGeneratorCard';

interface WeldVisionStudioProps {
  threeJsScene?: React.ReactNode;
}

/**
 * WeldVisionStudio — Live Workshop Layout
 *
 * Multi-student monitoring interface with embedded Three.js viewport.
 * MQTT ingestion pipeline connects when broker is available.
 */
export const WeldVisionStudio: React.FC<WeldVisionStudioProps> = ({
  threeJsScene,
}) => {
  const [selectedStudentId] = useState<string | null>(null);

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-100 font-sans">
      {/* LEFT SIDEBAR */}
      <div className="w-1/4 min-w-70 border-r border-slate-800 p-4 flex flex-col justify-between">
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-black tracking-wide text-amber-400">
            WELDVISION STUDIO
          </h2>
          <div>
            <h3 className="text-xs font-bold text-slate-400 tracking-widest uppercase mb-2">
              Active Workshop Feeds
            </h3>
            <p className="text-sm text-slate-500 italic px-1">
              Waiting for hardware trigger locks...
            </p>
            <p className="text-[10px] text-slate-600 px-1 mt-1">
              Connect Android Trainer via MQTT to start receiving live telemetry.
            </p>
          </div>
        </div>
        <QrGeneratorCard
          student={{ id: 'stu_marcus_99', name: 'Marcus Vance' }}
          assignedBracketId="brk_035_gmaw"
        />
      </div>

      {/* RIGHT WORKSPACE */}
      <div className="w-3/4 p-6 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">Live Volumetric Simulation Workspace</h1>
            <p className="text-sm text-slate-400">
              Monitoring Target:{' '}
              <span className="text-amber-400 font-mono font-bold">
                {selectedStudentId || 'None Selected'}
              </span>
            </p>
          </div>
          <div className="flex gap-4 text-xs font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div>Process: <span className="text-emerald-400 font-bold">GMAW (CV)</span></div>
            <div>Frequency: <span className="text-amber-400 font-bold">60 Hz Stream</span></div>
          </div>
        </div>
        <div className="grow rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner">
          {threeJsScene || (
            <div className="w-full h-full flex items-center justify-center text-slate-600 italic">
              [ Three.js Simulation Viewport ]
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
