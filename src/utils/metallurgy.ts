import { MaterialType, JointType, RestraintLevel } from '../types';

// Typical chemical compositions (simplified for simulation)
const compositions = {
  'Carbon Steel': { C: 0.18, Si: 0.35, Mn: 1.4, Cu: 0.02, Cr: 0.03, Ni: 0.01, Mo: 0.01, V: 0.005, B: 0.0001 },
  'Stainless Steel': { C: 0.08, Si: 0.75, Mn: 2.0, Cu: 0.0, Cr: 18.0, Ni: 8.0, Mo: 0.0, V: 0.0, B: 0.0 },
  'Aluminum': { C: 0, Si: 0, Mn: 0, Cu: 0, Cr: 0, Ni: 0, Mo: 0, V: 0, B: 0 } // Aluminum is non-ferrous
};

/**
 * Calculates Carbon Equivalent (IIW)
 */
export const calculateCE = (material: MaterialType): number => {
  if (material !== 'Carbon Steel') return 0;
  const comp = compositions[material];
  return comp.C + comp.Mn / 6 + (comp.Cr + comp.Mo + comp.V) / 5 + (comp.Ni + comp.Cu) / 15;
};

/**
 * Calculates Pcm (Ito-Bessyo) - better for low-carbon/HSLA steels
 */
export const calculatePcm = (material: MaterialType): number => {
  if (material !== 'Carbon Steel') return 0;
  const comp = compositions[material];
  return comp.C + comp.Si / 30 + (comp.Mn + comp.Cu + comp.Cr) / 20 + comp.Ni / 60 + comp.Mo / 15 + comp.V / 10 + 5 * comp.B;
};

/**
 * Calculates Restraint Intensity (RI) in N/(mm·mm)
 * RI is a function of geometry, thickness, and clamping/jigs.
 */
export const calculateRestraintIntensity = (
  jointType: JointType,
  thickness: number,
  restraint: RestraintLevel,
  useJigs: boolean
): number => {
  let k = 40; // Base stiffness coefficient
  if (jointType === 'Butt Joint') k = 20;
  if (jointType === 'T-Joint' || jointType === 'T-Joint (Single Fillet)') k = 60;
  if (jointType === 'Lap Joint') k = 30;

  let restraintFactor = 1.0;
  if (restraint === 'Medium') restraintFactor = 1.5;
  if (restraint === 'High') restraintFactor = 3.0;
  if (useJigs) restraintFactor *= 2.0;

  // RI ≈ k * thickness * restraintFactor
  return k * thickness * restraintFactor;
};

/**
 * Calculates t8/5 (Cooling time from 800°C to 500°C) in seconds
 * Simplified 2D/3D heat flow approximation
 */
export const calculateT85 = (heatInput: number, thickness: number, material: MaterialType): number => {
  // Thermal efficiency factors (assumed)
  const efficiency = 0.8;
  const Q = heatInput * efficiency; // kJ/mm

  // Material thermal properties
  let thermalFactor = 1.0;
  if (material === 'Stainless Steel') thermalFactor = 0.3; // Low conductivity, slow cooling
  if (material === 'Aluminum') thermalFactor = 4.0; // High conductivity, rapid cooling

  // Threshold thickness for 2D vs 3D heat flow (approximate)
  const h_crit = Math.sqrt(Q / 2); 
  
  if (thickness < h_crit) {
    // 2D Heat Flow (Thin plate)
    return (Q**2) / (4 * Math.PI * 0.025 * thickness**2 * thermalFactor) * ( (1/(500-20)**2) - (1/(800-20)**2) );
  } else {
    // 3D Heat Flow (Thick plate)
    return (Q / (2 * Math.PI * 0.025 * thermalFactor)) * ( (1/(500-20)) - (1/(800-20)) );
  }
};

/**
 * Calculates Hydrogen Cracking Risk Score (0-100)
 */
export const calculateHICRisk = (
  params: {
    material: MaterialType;
    thickness: number;
    heatInput: number;
    preheat: number;
    restraint: RestraintLevel;
    jointType: JointType;
    useJigs: boolean;
  }
): { riskScore: number; pcm: number; tc: number; ri: number; t85: number } => {
  if (params.material !== 'Carbon Steel') {
    // For Stainless/Aluminum, use a different simplified risk metric or return baseline
    // Solidification cracking is more common here, but for this simulation we'll focus on the requested model
    return { riskScore: 10, pcm: 0, tc: 0, ri: 0, t85: 0 };
  }

  const Pcm = calculatePcm(params.material);
  const RI = calculateRestraintIntensity(params.jointType, params.thickness, params.restraint, params.useJigs);
  const t85 = calculateT85(params.heatInput, params.thickness, params.material);
  
  // Diffusible hydrogen level (ml/100g)
  // Assume 5 ml/100g for typical low-hydrogen process
  const H = 5;

  // Tc = 1440 * Pcm - 392 + 50 * log10(H) + RI/10
  const Tc = 1440 * Pcm - 392 + 50 * Math.log10(H) + RI / 10;

  // Risk Score calculation
  // Baseline risk increases if actual preheat < critical preheat (Tc)
  // Also increases if cooling rate is too fast (t85 is small)
  let risk = 20; // Base risk
  
  const preheatDeficit = Math.max(0, Tc - params.preheat);
  risk += preheatDeficit * 0.8;

  // t85 < 5s indicates high risk of martensite formation in carbon steel
  if (t85 < 5) risk += (5 - t85) * 15;

  // Cap at 100
  return {
    riskScore: Math.min(100, Math.round(risk)),
    pcm: Math.round(Pcm * 1000) / 1000,
    tc: Math.round(Tc),
    ri: Math.round(RI),
    t85: Math.round(t85 * 10) / 10
  };
};
