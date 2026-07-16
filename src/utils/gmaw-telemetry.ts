/**
 * GMAW Telemetry Engine — WeldSim Studio
 *
 * Hyper-focused, single-process solver for GMAW (MIG) welding.
 * No SMAW stick burn-off math. No GTAW dual-hand tracking.
 * Fixed torch geometry with static contact-tube length.
 *
 * Pipeline:
 *   Raw GMAWTelemetryPacket → resolveAmperage() → calculateHeatInput()
 *   → assessMeltingThreshold() → computeBeadExpansion() → GMAWFrameResult
 *
 * The GMAWFrameResult feeds directly into Three.js mesh distortion
 * and bead growth algorithms in ModelViewer3D.tsx.
 */

import type {
  GMAWTelemetryPacket,
  GMAWTelemetryFrame,
  GMAWFrameResult,
  GMAWSessionSummary,
} from '../types';

// ── Constants ────────────────────────────────────────────────────────────────

/** GMAW arc thermal efficiency (η) */
const GMAW_THERMAL_EFFICIENCY = 0.8;

/** Wire feed speed → amperage linear coefficient (0.9 mm steel wire) */
const WFS_AMPERAGE_COEFFICIENT = 0.55;

/** WFS → amperage intercept (A) */
const WFS_AMPERAGE_INTERCEPT = 10;

/** Critical heat input threshold for plate melting (kJ/mm) — typical for 6 mm carbon steel */
const MELTING_THRESHOLD_BASE = 0.18;

/** Thickness scaling factor for melting threshold */
const MELTING_THICKNESS_FACTOR = 0.03;

// ── Step A: Empirical Amperage Resolution ────────────────────────────────────

/**
 * Resolves operating amperage from Wire Feed Speed.
 *
 * GMAW operates on Constant Voltage (CV). Current (I) is a function of
 * Wire Feed Speed (W). Standard 0.9 mm steel wire baseline profile.
 *
 *   I ≈ 0.55 · W + 10
 *
 * @param wfs_ipm - Wire feed speed in inches per minute
 * @returns Resolved amperage (A)
 */
export function resolveAmperage(wfs_ipm: number): number {
  return WFS_AMPERAGE_COEFFICIENT * wfs_ipm + WFS_AMPERAGE_INTERCEPT;
}

// ── Step B: Net Energy Deposit Density ──────────────────────────────────────

/**
 * Calculates net heat input per unit length.
 *
 *   Q = η · (V · I) / v
 *
 * where:
 *   η = 0.8 (GMAW arc thermal efficiency)
 *   V = voltage setpoint (V)
 *   I = resolved amperage (A)
 *   v = actual travel speed (mm/s)
 *
 * Result is in kJ/mm for compatibility with the existing simulation engine.
 *
 * @param voltage - Constant-voltage setpoint (V)
 * @param amperage - Resolved amperage (A)
 * @param travelSpeed - Actual travel speed from tracking (mm/s)
 * @returns Heat input per unit length (kJ/mm)
 */
export function calculateHeatInput(
  voltage: number,
  amperage: number,
  travelSpeed: number
): number {
  // Guard against zero/negative travel speed (gun stationary)
  const v = Math.max(travelSpeed, 0.5);
  return (GMAW_THERMAL_EFFICIENCY * voltage * amperage) / (v * 1000);
}

// ── Step C: Melting Threshold Assessment ────────────────────────────────────

/**
 * Determines the critical plate melting threshold for a given thickness.
 *
 * Thinner plates have a lower melting threshold (easier to burn through).
 *
 *   Q_crit = MELTING_THRESHOLD_BASE + thickness · MELTING_THICKNESS_FACTOR
 *
 * @param thickness_mm - Plate thickness in mm
 * @returns Critical heat input threshold (kJ/mm)
 */
export function getMeltingThreshold(thickness_mm: number): number {
  return MELTING_THRESHOLD_BASE + thickness_mm * MELTING_THICKNESS_FACTOR;
}

/**
 * Checks if the computed heat input exceeds the critical melting threshold.
 */
export function isAboveMeltingThreshold(
  heatInput: number,
  thickness_mm: number
): boolean {
  return heatInput > getMeltingThreshold(thickness_mm);
}

// ── Step C (cont.): Three.js Bead Expansion ──────────────────────────────────

/**
 * Computes the bead expansion factor and thermal color stop for a single
 * telemetry frame. This feeds directly into Three.js procedural geometry.
 *
 * Bead expansion logic:
 *   If Q > Q_crit AND trigger_pressed → grow bead, shift color along gradient
 *   Thermal gradient: Bright Yellow (0.0) → Deep Cherry Red (0.5) → Slag Gray (1.0)
 *
 * @param heatInput - Computed heat input (kJ/mm)
 * @param meltingThreshold - Critical melting threshold (kJ/mm)
 * @param triggerPressed - Gun trigger state
 * @returns Bead expansion factor (0-1 normalized) and thermal color stop
 */
export function computeBeadExpansion(
  heatInput: number,
  meltingThreshold: number,
  triggerPressed: boolean
): { beadExpansionFactor: number; thermalColorStop: number } {
  if (!triggerPressed) {
    // Trigger released — no active bead growth, color drifts toward slag gray
    return { beadExpansionFactor: 0, thermalColorStop: 1.0 };
  }

  if (heatInput <= meltingThreshold) {
    // Below melting threshold — no deposition
    return { beadExpansionFactor: 0, thermalColorStop: 0.95 };
  }

  // Above threshold: expansion factor scales with heat input surplus
  // Normalized so that 2× threshold ≈ full expansion
  const surplus = heatInput - meltingThreshold;
  const expansionFactor = Math.min(1.0, surplus / meltingThreshold);

  // Thermal color: higher heat → stays yellow longer (brighter puddle)
  // Lower heat (just above threshold) → cools faster toward red
  const colorStop = Math.max(0.0, Math.min(1.0, 1.0 - expansionFactor * 0.8));

  return {
    beadExpansionFactor: expansionFactor,
    thermalColorStop: colorStop,
  };
}

// ── Full Frame Pipeline ─────────────────────────────────────────────────────

/**
 * Processes a single GMAW telemetry frame through the full thermophysics
 * pipeline, producing a GMAWFrameResult ready for Three.js consumption.
 *
 * This is the primary entry point called per-frame (up to 60 Hz).
 *
 * @param packet - Full GMAW telemetry packet from MQTT / OPFS
 * @param thickness_mm - Plate thickness for melting threshold (default 6 mm)
 * @param tipCalibration - Optional calibration offsets from bracket_calibration table
 * @returns GMAWFrameResult with resolved physics and bead expansion data
 */
export function processGMAWFrame(
  packet: GMAWTelemetryPacket,
  thickness_mm: number = 6,
  tipCalibration?: { offset_x: number; offset_y: number; offset_z: number }
): GMAWFrameResult {
  const { settings, telemetry } = packet;

  // Step A: Resolve amperage from wire feed speed
  const resolvedAmperage = resolveAmperage(settings.wire_feed_speed_ipm);

  // Step B: Calculate net heat input
  const heatInput = calculateHeatInput(
    settings.voltage,
    resolvedAmperage,
    telemetry.travel_speed_mms
  );

  // Step C: Melting threshold
  const meltingThreshold = getMeltingThreshold(thickness_mm);
  const aboveMelting = isAboveMeltingThreshold(heatInput, thickness_mm);

  // Step C (cont.): Bead expansion
  const { beadExpansionFactor, thermalColorStop } = computeBeadExpansion(
    heatInput,
    meltingThreshold,
    telemetry.trigger_pressed
  );

  // Apply calibration offsets to tip position
  const tipPosition = {
    x: telemetry.x_mm + (tipCalibration?.offset_x ?? 0),
    y: telemetry.y_mm + (tipCalibration?.offset_y ?? 0),
    z: telemetry.z_gap_mm + (tipCalibration?.offset_z ?? 0),
  };

  return {
    resolved_amperage: resolvedAmperage,
    heat_input: heatInput,
    above_melting_threshold: aboveMelting,
    tip_position: tipPosition,
    bead_expansion_factor: beadExpansionFactor,
    thermal_color_stop: thermalColorStop,
  };
}

// ── Session Scoring ─────────────────────────────────────────────────────────

/**
 * Scores a completed GMAW session based on telemetry consistency.
 *
 * - spatial_score: How steady the z_gap was (standard deviation penalty)
 * - speed_score: How consistent travel speed was
 *
 * @param frames - Array of all telemetry frames from the session
 * @returns spatial_score (0-100) and speed_score (0-100)
 */
export function scoreGMAWSession(frames: GMAWTelemetryFrame[]): {
  spatial_score: number;
  speed_score: number;
} {
  if (frames.length === 0) {
    return { spatial_score: 0, speed_score: 0 };
  }

  const n = frames.length;

  // Z-gap scoring — ideal range 2-5 mm, penalize deviation
  const zGaps = frames.map((f) => f.z_gap_mm);
  const zMean = zGaps.reduce((a, b) => a + b, 0) / n;
  const zStdDev = Math.sqrt(
    zGaps.reduce((sum, z) => sum + (z - zMean) ** 2, 0) / n
  );
  // Score: 100 - penalty for gap outside ideal range and std dev
  const zCenterPenalty = Math.abs(zMean - 3.5) * 8; // center at 3.5 mm
  const zStdPenalty = zStdDev * 12;
  const spatialScore = Math.max(0, Math.min(100, Math.round(100 - zCenterPenalty - zStdPenalty)));

  // Speed scoring — consistency is key
  const speeds = frames.map((f) => f.travel_speed_mms);
  const speedMean = speeds.reduce((a, b) => a + b, 0) / n;
  const speedStdDev = Math.sqrt(
    speeds.reduce((sum, s) => sum + (s - speedMean) ** 2, 0) / n
  );
  // Score: 100 - CV penalty (coefficient of variation)
  const cv = speedMean > 0 ? speedStdDev / speedMean : 1;
  const speedScore = Math.max(0, Math.min(100, Math.round(100 - cv * 100)));

  return { spatial_score: spatialScore, speed_score: speedScore };
}

/**
 * Builds a complete GMAWSessionSummary ready for D1 insertion.
 */
export function buildSessionSummary(
  packet: GMAWTelemetryPacket,
  frames: GMAWTelemetryFrame[],
  r2JsonKey: string
): GMAWSessionSummary {
  const avgAmperage =
    frames.length > 0
      ? frames.reduce((sum, f) => {
          // Approximate per-frame amperage (same settings across session)
          return sum + resolveAmperage(packet.settings.wire_feed_speed_ipm);
        }, 0) / frames.length
      : 0;

  const avgHeatInput =
    frames.length > 0
      ? frames.reduce((sum, f) => {
          const I = resolveAmperage(packet.settings.wire_feed_speed_ipm);
          return sum + calculateHeatInput(packet.settings.voltage, I, f.travel_speed_mms);
        }, 0) / frames.length
      : 0;

  const { spatial_score, speed_score } = scoreGMAWSession(frames);

  return {
    session_id: packet.meta.session_id,
    student_id: packet.meta.student_id,
    bracket_id: packet.meta.bracket_id,
    configured_voltage: packet.settings.voltage,
    configured_wfs_ipm: packet.settings.wire_feed_speed_ipm,
    resolved_avg_amperage: Math.round(avgAmperage * 10) / 10,
    calculated_heat_input: Math.round(avgHeatInput * 10000) / 10000,
    spatial_score,
    speed_score,
    final_grade: null, // Awaiting instructor review
    r2_json_key: r2JsonKey,
    created_at: new Date().toISOString(),
  };
}

// ── Thermal Gradient Color Map ──────────────────────────────────────────────

/**
 * Returns an RGB color tuple for a given thermal color stop.
 *
 * Gradient: Bright Yellow (0.0) → Deep Cherry Red (0.5) → Slag Gray (1.0)
 *
 * @param stop - Normalized thermal color stop (0-1)
 * @returns [r, g, b] values (0-255)
 */
export function thermalGradientColor(stop: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, stop));

  if (t < 0.5) {
    // Bright Yellow → Orange → Cherry Red
    const s = t / 0.5;
    return [
      Math.round(255),
      Math.round(255 - s * 155),    // 255 → 100
      Math.round(0 + s * 40),       // 0 → 40
    ];
  } else {
    // Cherry Red → Slag Gray
    const s = (t - 0.5) / 0.5;
    return [
      Math.round(255 - s * 95),     // 255 → 160
      Math.round(100 - s * 40),     // 100 → 60
      Math.round(40 + s * 40),      // 40 → 80
    ];
  }
}
