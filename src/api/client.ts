/**
 * Hono RPC Client — WeldVision Studio
 *
 * Provides a fully type-safe client for calling the Cloudflare Worker API.
 * Uses Hono's built-in RPC mechanism (hc) for end-to-end type safety.
 *
 * Usage:
 *   import { api } from '@/api/client';
 *   const result = await api['predictive-analysis'].$post({ json: { ... } });
 */

import { hc } from 'hono/client';
import type { AppType } from '../../functions/api/[[route]]';

// Create the typed RPC client pointing at our API origin.
// In dev, Vite proxies /api/* to the Worker. In production, same-origin.
// Hono RPC strips the base path, so routes are relative to /api.
export const api = hc<AppType>('/api');

// ── Typed helper functions ────────────────────────────────────────────────────

/**
 * Calls POST /api/predictive-analysis with full type safety.
 * Returns { riskScore, explanation } from the Llama 3.3 70B model.
 */
export async function predictiveAnalysis(body: {
  parameters: { material: string; thickness: number; jointType: string; process: string; preheat: number };
  distortion: { angular: number; transverse: number; longitudinal: number; residualStress: number };
  heatInput: number;
  mitigatedDistortion: { angular: number; transverse: number; longitudinal: number; residualStress: number };
  metallurgy: { riskScore: number; pcm: number; tc: number; ri: number; t85: number };
}) {
  const res = await api['predictive-analysis'].$post({ json: body });
  return res.json();
}

// ── GMAW Telemetry Endpoints ──────────────────────────────────────────────────
// These use Hono's hc() with the full path since they live in a sub-router.
// The sub-router is mounted at /api/gmaw within the main app.

interface GMAWTelemetryBody {
  meta: { session_id: string; student_id: string; bracket_id: string };
  settings: { voltage: number; wire_feed_speed_ipm: number };
  telemetry: {
    x_mm: number; y_mm: number; z_gap_mm: number;
    travel_speed_mms: number; work_angle_deg: number;
    travel_angle_deg: number; trigger_pressed: boolean;
  };
}

interface GMAWFrameResponse {
  resolved_amperage: number;
  heat_input: number;
  above_melting_threshold: boolean;
  tip_position: { x: number; y: number; z: number };
  bead_expansion_factor: number;
  thermal_color_stop: number;
}

interface GMAWSessionSummary {
  session_id: string; student_id: string; bracket_id: string;
  configured_voltage: number; configured_wfs_ipm: number;
  resolved_avg_amperage: number; calculated_heat_input: number;
  spatial_score: number; speed_score: number;
  final_grade: number | null; r2_json_key: string; created_at: string;
}

/**
 * Calls POST /api/gmaw/ingest with a single GMAW telemetry frame.
 */
export async function gmawIngest(
  body: GMAWTelemetryBody,
  thicknessMm?: number
): Promise<GMAWFrameResponse> {
  const url = thicknessMm
    ? `/api/gmaw/ingest?thickness_mm=${thicknessMm}`
    : '/api/gmaw/ingest';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GMAW ingest failed: ${res.status}`);
  return res.json();
}

/**
 * Calls POST /api/gmaw/session with a batch of frames for scoring.
 */
export async function gmawSession(body: {
  packet: GMAWTelemetryBody;
  frames: GMAWTelemetryBody['telemetry'][];
  r2_key?: string;
}): Promise<GMAWSessionSummary> {
  const res = await fetch('/api/gmaw/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GMAW session failed: ${res.status}`);
  return res.json();
}
