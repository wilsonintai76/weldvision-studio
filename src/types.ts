export type MaterialType = 'Carbon Steel' | 'Stainless Steel' | 'Aluminum';

export type WeldingProcess = 'SMAW' | 'GMAW' | 'GTAW';

export type JointType = 'Butt Joint' | 'T-Joint' | 'Lap Joint' | 'T-Joint (Single Fillet)';

export type RestraintLevel = 'None' | 'Medium' | 'High';

export interface WeldParameters {
  material: MaterialType;
  process: WeldingProcess;
  jointType: JointType;
  restraint: RestraintLevel;
  thickness: number; // mm (2 - 20)
  current: number; // A (40 - 320)
  voltage: number; // V (10 - 35)
  speed: number; // mm/s (1.5 - 18)
  preheat: number; // °C (20 - 250)
  gasFlow: number; // L/min (0 - 25), relevant for GMAW/GTAW
  electrodeDiameter: number; // mm (1.6 - 5.0)
}

export interface DefectMetric {
  id: string;
  name: string;
  severity: number; // 0 to 100
  status: 'None' | 'Acceptable' | 'Critical';
  description: string;
  causes: string[];
  mitigations: string[];
  awsStandard: string;
}

export interface DistortionMetric {
  angular: number; // degrees
  transverse: number; // mm
  longitudinal: number; // mm
  residualStress: number; // MPa
}

export interface SimulationResult {
  heatInput: number; // kJ/mm
  coolingRate: number; // °C/s (high, medium, low represented as numerical index)
  weldWidth: number; // mm
  weldPenetration: number; // mm
  defects: DefectMetric[];
  distortion: DistortionMetric;
  overallQualityScore: number; // 0 to 100
  isBurnThrough: boolean;
}

export interface MetallurgyResult {
  riskScore: number;
  pcm: number;
  tc: number;
  ri: number;
  t85: number;
}

export interface LabPreset {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  targetDefect: string;
  parameters: Partial<WeldParameters>;
}

// ── GMAW-Specific Telemetry Contract (aligned with Android WeldVisionState.kt) ─

/**
 * Every MQTT packet matches Android's WeldVisionState fields exactly.
 * No field name translation needed between Android and Web.
 */
export interface GMAWTelemetryPacket {
  meta: GMAWSessionMeta;
  settings: GMAWMachineSettings;
  plate: GMAWPlateConfig;          // Physical plate from Android module
  telemetry: GMAWTelemetryFrame;
}

export interface GMAWSessionMeta {
  session_id: string;
  student_id: string;
  bracket_id: string;
  /** Android module name: "mig_butt", "mig_tee", etc. */
  module: string;
}

/** Machine settings — matches Android WeldingModule */
export interface GMAWMachineSettings {
  voltage: number;           // Arc voltage (V)
  amperage: number;          // Welding current (A)
  wireFeedSpeed: number;     // Wire feed speed (IPM or mm/s)
  gasFlowRate: number;       // Shielding gas flow (CFH or L/min)
}

/** Physical plate — set by Android module, drives simulation */
export interface GMAWPlateConfig {
  material: 'Carbon Steel' | 'Stainless Steel' | 'Aluminum';
  thickness: number;         // Plate thickness (mm)
  jointType: JointType;
}

/** Per-frame telemetry — matches Android real-time tracking */
export interface GMAWTelemetryFrame {
  x_mm: number;              // Gun tip X position (mm)
  y_mm: number;              // Gun tip Y position (mm)
  z_gap_mm: number;          // Contact tip to workpiece gap (mm)
  travel_speed_mms: number;  // Instantaneous travel speed (mm/s)
  work_angle_deg: number;    // Work angle (degrees)
  travel_angle_deg: number;  // Travel/drag angle (degrees)
  trigger_pressed: boolean;  // Gun trigger state
  /** Target values for scoring */
  targetGap: number;         // Ideal arc gap (mm)
  targetSpeed: number;       // Ideal travel speed (mm/s)
}

/**
 * Result of the GMAW thermophysics solver for a single telemetry frame.
 * Feeds directly into the Three.js mesh distortion / bead growth algorithms.
 */
export interface GMAWFrameResult {
  /** Resolved operating amperage from wire feed speed (A) */
  resolved_amperage: number;
  /** Net heat input per unit length (kJ/mm) */
  heat_input: number;
  /** Whether the heat input exceeds the critical melting threshold */
  above_melting_threshold: boolean;
  /** Smoothed 3D tip position after SQLite matrix transforms */
  tip_position: { x: number; y: number; z: number };
  /** Bead expansion radius factor (normalized 0-1) */
  bead_expansion_factor: number;
  /** Thermal gradient color stop (0 = Bright Yellow, 0.5 = Cherry Red, 1 = Slag Gray) */
  thermal_color_stop: number;
}

/**
 * Aggregated session summary stored in D1 after a completed GMAW run.
 */
export interface GMAWSessionSummary {
  session_id: string;
  student_id: string;
  bracket_id: string;
  configured_voltage: number;
  configured_wfs_ipm: number;
  resolved_avg_amperage: number;
  calculated_heat_input: number;
  spatial_score: number;
  speed_score: number;
  final_grade: number | null;
  r2_json_key: string;
  created_at: string;
}

// ── Calibration ─────────────────────────────────────────────────────────────

export interface BracketCalibration {
  bracket_id: string;
  focal_length_px: number;
  tip_offset_x_mm: number;
  tip_offset_y_mm: number;
  tip_offset_z_mm: number;
  updated_at: string;
}
