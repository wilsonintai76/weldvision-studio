import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handle } from 'hono/cloudflare-pages';

// ── Types ────────────────────────────────────────────────────────────────────

type Bindings = {
  AI: Ai; // Cloudflare Workers AI binding (declared in wrangler.toml)
};

interface PredictiveAnalysisBody {
  parameters: {
    material: string;
    thickness: number;
    jointType: string;
    process: string;
    preheat: number;
  };
  distortion: {
    angular: number;
    transverse: number;
    longitudinal: number;
    residualStress: number;
  };
  heatInput: number;
  mitigatedDistortion: {
    angular: number;
    transverse: number;
    longitudinal: number;
    residualStress: number;
  };
  metallurgy: {
    riskScore: number;
    pcm: number;
    tc: number;
    ri: number;
    t85: number;
  };
}

/** GMAW telemetry packet matching the uniform data contract */
interface GMAWTelemetryBody {
  meta: {
    session_id: string;
    student_id: string;
    bracket_id: string;
  };
  settings: {
    voltage: number;
    wire_feed_speed_ipm: number;
  };
  telemetry: {
    x_mm: number;
    y_mm: number;
    z_gap_mm: number;
    travel_speed_mms: number;
    work_angle_deg: number;
    travel_angle_deg: number;
    trigger_pressed: boolean;
  };
}

/** GMAW frame result computed by the thermophysics engine */
interface GMAWFrameResponse {
  resolved_amperage: number;
  heat_input: number;
  above_melting_threshold: boolean;
  tip_position: { x: number; y: number; z: number };
  bead_expansion_factor: number;
  thermal_color_stop: number;
}

// ── GMAW Thermophysics (edge-compatible, no imports needed) ──────────────────

const GMAW_ETA = 0.8;
const WFS_COEFF = 0.55;
const WFS_INTERCEPT = 10;
const MELT_BASE = 0.18;
const MELT_THICK_FACTOR = 0.03;

function resolveAmperage(wfs_ipm: number): number {
  return WFS_COEFF * wfs_ipm + WFS_INTERCEPT;
}

function calculateHeatInput(voltage: number, amperage: number, travelSpeed: number): number {
  const v = Math.max(travelSpeed, 0.5);
  return (GMAW_ETA * voltage * amperage) / (v * 1000);
}

function getMeltingThreshold(thickness_mm: number): number {
  return MELT_BASE + thickness_mm * MELT_THICK_FACTOR;
}

function computeBeadExpansion(
  heatInput: number,
  meltingThreshold: number,
  triggerPressed: boolean
): { beadExpansionFactor: number; thermalColorStop: number } {
  if (!triggerPressed) return { beadExpansionFactor: 0, thermalColorStop: 1.0 };
  if (heatInput <= meltingThreshold) return { beadExpansionFactor: 0, thermalColorStop: 0.95 };

  const surplus = heatInput - meltingThreshold;
  const expansionFactor = Math.min(1.0, surplus / meltingThreshold);
  const colorStop = Math.max(0.0, Math.min(1.0, 1.0 - expansionFactor * 0.8));

  return { beadExpansionFactor: expansionFactor, thermalColorStop: colorStop };
}

// ── Hono App ─────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for all routes (needed during Pages dev proxy)
app.use('*', cors());

// POST /api/predictive-analysis
// Accepts weld parameters, calls Llama 3.3 70B via Workers AI,
// returns a professional metallurgical crack-risk explanation.
app.post('/api/predictive-analysis', async (c) => {
  let body: PredictiveAnalysisBody;

  try {
    body = await c.req.json<PredictiveAnalysisBody>();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { parameters, heatInput, mitigatedDistortion, metallurgy } = body;

  try {
    const aiResult = await c.env.AI.run(
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast' as any,
      {
        messages: [
          {
            role: 'system',
            content:
              'You are a welding metallurgy tutor. Explain the crack risk result concisely in 3-4 sentences, referencing cooling rate (t8/5), martensite risk, preheat vs critical preheat (Tc), restraint intensity, and residual stress. Be professional and technical but clear.',
          },
          {
            role: 'user',
            content: `Risk Score: ${metallurgy.riskScore}/100, Material: ${parameters.material}, Pcm: ${metallurgy.pcm}, Cooling Rate (t8/5): ${metallurgy.t85}s, Critical Preheat (Tc): ${metallurgy.tc}°C, Actual Preheat: ${parameters.preheat}°C, Restraint Intensity (RI): ${metallurgy.ri} N/mm·mm, Residual Stress: ${mitigatedDistortion.residualStress} MPa, Heat Input: ${heatInput} kJ/mm, Joint: ${parameters.jointType}. Explain the metallurgical implication of this crack risk score.`,
          },
        ],
      }
    );

    const explanation = ((aiResult as unknown) as { response: string }).response;


    return c.json({
      riskScore: metallurgy.riskScore,
      explanation: explanation || 'Analysis complete. Review the computed risk metrics above.',
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Workers AI Error:', errorMessage);
    return c.json(
      { error: 'Failed to generate predictive analysis', detail: errorMessage },
      500
    );
  }

});

// POST /api/gmaw/ingest
// Accepts a single GMAW telemetry frame, runs the thermophysics solver,
// and returns the GMAWFrameResult for Three.js consumption.
// Used by: browser client (via MQTT bridge) or offline queue sync.
app.post('/api/gmaw/ingest', async (c) => {
  let body: GMAWTelemetryBody;

  try {
    body = await c.req.json<GMAWTelemetryBody>();
  } catch {
    return c.json({ error: 'Invalid JSON body. Expected GMAW telemetry packet.' }, 400);
  }

  // Validate required fields
  const { meta, settings, telemetry } = body;
  if (!meta?.session_id || !settings?.voltage || !telemetry) {
    return c.json({ error: 'Missing required fields: meta.session_id, settings.voltage, telemetry' }, 400);
  }

  // Extract optional thickness from query or default to 6 mm
  const thicknessParam = c.req.query('thickness_mm');
  const thickness = thicknessParam ? parseFloat(thicknessParam) : 6;

  // Step A: Resolve amperage
  const amperage = resolveAmperage(settings.wire_feed_speed_ipm);

  // Step B: Calculate heat input
  const heatInput = calculateHeatInput(settings.voltage, amperage, telemetry.travel_speed_mms);

  // Step C: Melting threshold + bead expansion
  const meltingThreshold = getMeltingThreshold(thickness);
  const { beadExpansionFactor, thermalColorStop } = computeBeadExpansion(
    heatInput,
    meltingThreshold,
    telemetry.trigger_pressed
  );

  const result: GMAWFrameResponse = {
    resolved_amperage: Math.round(amperage * 10) / 10,
    heat_input: Math.round(heatInput * 10000) / 10000,
    above_melting_threshold: heatInput > meltingThreshold,
    tip_position: {
      x: telemetry.x_mm,
      y: telemetry.y_mm,
      z: telemetry.z_gap_mm,
    },
    bead_expansion_factor: Math.round(beadExpansionFactor * 1000) / 1000,
    thermal_color_stop: Math.round(thermalColorStop * 1000) / 1000,
  };

  return c.json(result);
});

// POST /api/gmaw/session
// Accepts a batch of telemetry frames + session metadata, scores the session,
// and returns a GMAWSessionSummary ready for D1 insertion.
app.post('/api/gmaw/session', async (c) => {
  let body: { packet: GMAWTelemetryBody; frames: GMAWTelemetryBody['telemetry'][]; r2_key?: string };

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { packet, frames, r2_key } = body;

  if (!packet?.meta?.session_id || !frames?.length) {
    return c.json({ error: 'Missing required fields: packet.meta.session_id, frames[]' }, 400);
  }

  // Score the session
  const n = frames.length;

  // Spatial score — z_gap consistency
  const zGaps = frames.map((f) => f.z_gap_mm);
  const zMean = zGaps.reduce((a, b) => a + b, 0) / n;
  const zStdDev = Math.sqrt(zGaps.reduce((sum, z) => sum + (z - zMean) ** 2, 0) / n);
  const zCenterPenalty = Math.abs(zMean - 3.5) * 8;
  const zStdPenalty = zStdDev * 12;
  const spatialScore = Math.max(0, Math.min(100, Math.round(100 - zCenterPenalty - zStdPenalty)));

  // Speed score — travel speed consistency
  const speeds = frames.map((f) => f.travel_speed_mms);
  const speedMean = speeds.reduce((a, b) => a + b, 0) / n;
  const speedStdDev = Math.sqrt(speeds.reduce((sum, s) => sum + (s - speedMean) ** 2, 0) / n);
  const cv = speedMean > 0 ? speedStdDev / speedMean : 1;
  const speedScore = Math.max(0, Math.min(100, Math.round(100 - cv * 100)));

  // Average amperage and heat input
  const avgAmperage = resolveAmperage(packet.settings.wire_feed_speed_ipm);
  let totalHeatInput = 0;
  for (const f of frames) {
    totalHeatInput += calculateHeatInput(packet.settings.voltage, avgAmperage, f.travel_speed_mms);
  }
  const avgHeatInput = totalHeatInput / n;

  return c.json({
    session_id: packet.meta.session_id,
    student_id: packet.meta.student_id,
    bracket_id: packet.meta.bracket_id,
    configured_voltage: packet.settings.voltage,
    configured_wfs_ipm: packet.settings.wire_feed_speed_ipm,
    resolved_avg_amperage: Math.round(avgAmperage * 10) / 10,
    calculated_heat_input: Math.round(avgHeatInput * 10000) / 10000,
    spatial_score: spatialScore,
    speed_score: speedScore,
    final_grade: null,
    r2_json_key: r2_key || `${packet.meta.session_id}.json`,
    created_at: new Date().toISOString(),
  });
});

// ── Export for Cloudflare Pages Functions ────────────────────────────────────
// The `handle` adapter converts Hono's app into a Pages Functions handler.
// Cloudflare Pages Functions will pick this up from /functions/api/[[route]].ts
export const onRequest = handle(app);

// Export the app type for Hono RPC client usage in the frontend
export type AppType = typeof app;
