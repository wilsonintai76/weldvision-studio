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
