import { WeldParameters, SimulationResult, DefectMetric, DistortionMetric, LabPreset } from '../types';

// Process thermal efficiency factors
const EFFICIENCY = {
  SMAW: 0.80,
  GMAW: 0.85,
  GTAW: 0.65,
};

// Material coefficients
// CTE factor, Thermal Conductivity factor, Yield Strength (MPa)
const MATERIAL_COEFFS = {
  'Carbon Steel': { cte: 1.0, cond: 1.0, yield: 250 },
  'Stainless Steel': { cte: 1.5, cond: 2.2, yield: 290 }, // Traps heat locally (low conductivity), high thermal expansion
  'Aluminum': { cte: 1.9, cond: 0.4, yield: 270 },        // Fast heat dissipation (high conductivity), high expansion
};

const RESTRAINT_MULT = {
  'None': 1.0,
  'Medium': 0.35,
  'High': 0.08,
};

const RESTRAINT_STRESS_FACTOR = {
  'None': 0.25,
  'Medium': 0.68,
  'High': 0.96,
};

export function simulateWelding(params: WeldParameters): SimulationResult {
  const {
    material,
    process,
    jointType,
    restraint,
    thickness,
    current,
    voltage,
    speed,
    preheat,
    gasFlow,
  } = params;

  // 1. Calculate Heat Input (Q) in kJ/mm
  const eta = EFFICIENCY[process];
  const heatInput = (eta * voltage * current) / (speed * 1000);

  // 2. Weld Bead Dimensions
  // Width scales with voltage and current, limited by heat input
  const baseWidth = Math.sqrt(voltage) * (current / 100) * 2.8;
  const weldWidth = Math.max(3, Math.min(24, baseWidth * (1 - Math.exp(-heatInput))));

  // Penetration scales with current, inversely with speed and material conduction
  const condFactor = material === 'Aluminum' ? 0.7 : material === 'Stainless Steel' ? 1.15 : 1.0;
  const rawPenetration = (current / 110) * (5.5 / speed) * 3.2 * condFactor;
  const weldPenetration = Math.max(0.5, Math.min(thickness * 1.3, rawPenetration));

  // Check for burn-through: thin plate, high heat, penetration exceeds plate thickness
  const isBurnThrough = thickness < 4.5 && weldPenetration > thickness * 1.05;

  // 3. Cooling Rate Index (approximated)
  // Higher value means faster cooling (quenched). Thick plate, low heat input, low preheat = fast cooling.
  const coolingRate = (thickness * thickness * 8) / (heatInput * (preheat + 100) + 1);

  // 4. Calculate Individual Defects (0 to 100 severity)

  // A. Undercut
  const speedFactor = Math.max(0, (speed - 5.5) / 12.5); // speed > 5.5 mm/s
  const currentFactor = Math.max(0, (current - 160) / 160); // current > 160
  let undercutSev = (speedFactor * 42) + (currentFactor * 35) + (voltage > 27 ? (voltage - 27) * 7 : 0);
  if (process === 'GTAW') undercutSev *= 1.25; // TIG is highly sensitive to travel speed undercut
  if (jointType === 'T-Joint' || jointType === 'T-Joint (Single Fillet)') undercutSev *= 1.15; // Fillet weld has gravity effects increasing undercut at the top toe
  const undercut = Math.max(0, Math.min(100, Math.round(undercutSev)));

  // B. Lack of Fusion / Penetration (LOF/LOP)
  const relativeHeat = heatInput / (thickness * 0.16);
  let lofSev = 0;
  if (relativeHeat < 0.75) {
    lofSev += (0.75 - relativeHeat) * 110;
  }
  if (speed > 9.5) {
    lofSev += (speed - 9.5) * 8;
  }
  if (material === 'Aluminum' && current < 130) {
    // Aluminum needs high power to break oxide layer and melt high-conductivity plate
    lofSev += (130 - current) * 0.5;
  }
  // Root penetration is critical on butt joints
  if (jointType === 'Butt Joint' && weldPenetration < thickness * 0.85) {
    lofSev += (thickness * 0.85 - weldPenetration) * 12;
  }
  const lackOfFusion = Math.max(0, Math.min(100, Math.round(lofSev)));

  // C. Porosity
  let porositySev = 0;
  if (process === 'GMAW' || process === 'GTAW') {
    // Gas flow validation
    if (gasFlow < 9) {
      porositySev += (9 - gasFlow) * 12;
    } else if (gasFlow > 19) {
      porositySev += (gasFlow - 19) * 7; // turbulent gas flow pulls air in
    }
    // High wind / high speed blows shielding away
    if (speed > 11) {
      porositySev += (speed - 11) * 6;
    }
  } else {
    // SMAW is sensitive to moisture (low preheat or damp electrodes)
    if (preheat < 60 && thickness > 10) {
      porositySev += 20;
    }
    if (speed > 10) {
      porositySev += (speed - 10) * 4;
    }
  }
  const porosity = Math.max(0, Math.min(100, Math.round(porositySev)));

  // D. Slag Inclusion
  let slagSev = 0;
  if (process === 'SMAW') {
    if (current < 110) {
      slagSev += (110 - current) * 0.45;
    }
    if (speed < 3.2) {
      // slag runs ahead of puddle
      slagSev += (3.2 - speed) * 24;
    } else if (speed > 9.0) {
      // weld pool freezes too fast, trapping slag
      slagSev += (speed - 9.0) * 16;
    }
  }
  const slagInclusion = Math.max(0, Math.min(100, Math.round(slagSev)));

  // E. Solidification / Hydrogen Cracking
  let crackSev = 0;
  const mat = MATERIAL_COEFFS[material];
  const restraintAdd = restraint === 'High' ? 35 : restraint === 'Medium' ? 15 : 0;

  if (material === 'Carbon Steel') {
    // Cold cracking / Hydrogen cracking - high cooling rate + restraint + high thickness
    const coolingFactor = Math.max(0, (coolingRate - 4.5) * 12);
    const hydrogenSusc = process === 'SMAW' && preheat < 70 ? 20 : 0;
    crackSev = coolingFactor + restraintAdd + hydrogenSusc - (preheat > 80 ? (preheat - 80) * 0.15 : 0);
  } else if (material === 'Stainless Steel') {
    // Hot cracking - caused by high heat input, slow cooling, and restraint
    const highHeatFactor = heatInput > 1.9 ? (heatInput - 1.9) * 45 : 0;
    crackSev = highHeatFactor + restraintAdd + 10;
  } else {
    // Aluminum - hot cracking sensitive in thermal-stress regions
    const alumFactor = current > 230 && speed > 9 ? 35 : 10;
    crackSev = alumFactor + restraintAdd;
  }
  const cracking = Math.max(0, Math.min(100, Math.round(crackSev)));

  // 5. Generate Defect Objects
  const defects: DefectMetric[] = [
    {
      id: 'undercut',
      name: 'Undercut',
      severity: undercut,
      status: undercut > 55 ? 'Critical' : undercut > 20 ? 'Acceptable' : 'None',
      description: 'A groove melted into the base metal adjacent to the weld toe and left unfilled by weld metal.',
      causes: [
        'Excessively high travel speed',
        'Excessive welding current (too hot)',
        'Too long of an arc length (excessive voltage)',
        'Improper torch manipulation / angle'
      ],
      mitigations: [
        'Reduce travel speed to allow proper side-wall fill',
        'Lower the welding current / heat input',
        'Shorten the arc length (reduce voltage)',
        'Maintain correct torch angle and pause briefly at the weld toes'
      ],
      awsStandard: 'AWS D1.1 limits undercut to max 1.0 mm depth for structural members under static loading, and 0.25 mm for cyclic loading.'
    },
    {
      id: 'lof',
      name: 'Lack of Fusion / Penetration',
      severity: lackOfFusion,
      status: lackOfFusion > 50 ? 'Critical' : lackOfFusion > 15 ? 'Acceptable' : 'None',
      description: 'Failure to fuse weld metal to the joint sidewalls or preceding weld beads (LOF), or failure to extend weld metal through the joint root (LOP).',
      causes: [
        'Insufficent heat input (low current / voltage)',
        'Excessively fast travel speed causing bead to ride ahead',
        'Improper joint preparation or fit-up',
        'Aluminum: High thermal conductivity draining heat too quickly from joint toes'
      ],
      mitigations: [
        'Increase welding current and adjust voltage to restore heat input',
        'Decrease travel speed to allow proper melting of joint sidewalls',
        'Improve joint design (increase bevel angle or root gap)',
        'Aluminum: Ensure proper preheating or higher starting currents'
      ],
      awsStandard: 'AWS D1.1 forbids any incomplete fusion (LOF). Incomplete joint penetration (LOP) is only permitted in specific partial-penetration joint specifications.'
    },
    {
      id: 'porosity',
      name: 'Porosity',
      severity: porosity,
      status: porosity > 40 ? 'Critical' : porosity > 10 ? 'Acceptable' : 'None',
      description: 'Cavity-type defects formed by gas entrapment during solidification of the weld pool.',
      causes: [
        'Inadequate shielding gas flow (breeze, empty tank)',
        'Excessive shielding gas flow causing turbulence and drawing air in',
        'Surface contaminants (oil, grease, rust, moisture)',
        'Wet/damp SMAW electrode flux coatings'
      ],
      mitigations: [
        'Adjust shielding gas flow rate to the recommended range (typically 12-16 L/min)',
        'Use windbreaks when welding outdoors',
        'Thoroughly clean weld joint faces prior to welding',
        'Store SMAW electrodes in specialized rod-drying ovens'
      ],
      awsStandard: 'AWS D1.1 permits no visible porosity on the weld surface. For radiography, total sum of porosity diameter must not exceed limits (typically < 10 mm in any 25 mm weld).'
    },
    {
      id: 'slag',
      name: 'Slag Inclusion',
      severity: slagInclusion,
      status: slagInclusion > 45 ? 'Critical' : slagInclusion > 15 ? 'Acceptable' : 'None',
      description: 'Non-metallic solid material entrapped in the weld metal or between weld metal and base metal.',
      causes: [
        'Only SMAW (Stick) or FCAW (Flux-Cored): Travel speed too slow, allowing slag to float ahead and run under the arc',
        'Incomplete slag removal between subsequent weld passes',
        'Low current failing to keep slag fully molten and floating',
        'Incorrect electrode angle pushing slag into the groove'
      ],
      mitigations: [
        'Increase travel speed to keep the arc ahead of the molten slag',
        'Meticulously clean all slag from previous passes with a chipping hammer/wire brush',
        'Increase welding current to improve slag fluidity',
        'Maintain a slight drag angle to push slag behind the weld pool'
      ],
      awsStandard: 'AWS D1.1 structural codes reject slag inclusions that exceed specific length criteria (typically maximum 6 mm long in static joints).'
    },
    {
      id: 'cracking',
      name: 'Solidification & Hydrogen Cracking',
      severity: cracking,
      status: cracking > 50 ? 'Critical' : cracking > 15 ? 'Acceptable' : 'None',
      description: 'Localized fractures resulting from stress. Hot cracking occurs during solidification; cold cracking (hydrogen-induced) occurs after cooling.',
      causes: [
        'High cooling rates (thick plates, absence of preheating)',
        'High joint restraint levels preventing natural shrinkage contracting',
        'Hydrogen entrapment from moisture or hydrocarbons (cold cracking)',
        'Stainless Steel: High heat input causing segregation of low-melting elements'
      ],
      mitigations: [
        'Apply preheating to slow the cooling rate, allowing hydrogen to diffuse out safely',
        'Modify clamp sequence or structure design to reduce restraint levels',
        'Use low-hydrogen electrodes and clean joint faces to eliminate moisture',
        'Stainless: Limit heat input, use low-interstitial consumables'
      ],
      awsStandard: 'All major welding codes (AWS, ASME, ISO) enforce a zero-tolerance policy for cracking. Any crack is a critical, non-conforming structural defect.'
    },
  ];

  // 6. Distortion Calculations
  const matCoeff = MATERIAL_COEFFS[material];
  const rMult = RESTRAINT_MULT[restraint];

  // Angular Distortion (degrees)
  // Base angular distortion is proportional to heat input, CTE, and thermal conductivity (how trapped the gradient is)
  // and inversely proportional to thickness.
  const rawAngular = 5.8 * (heatInput * matCoeff.cte * matCoeff.cond) / Math.pow(thickness, 1.25);
  const angular = Math.max(0, Math.min(13, Math.round(rawAngular * rMult * 10) / 10));

  // Transverse Shrinkage (mm)
  const rawTransverse = 1.8 * (heatInput * matCoeff.cte) / Math.pow(thickness, 0.75);
  const transverse = Math.max(0, Math.min(5, Math.round(rawTransverse * rMult * 100) / 100));

  // Longitudinal Shrinkage (mm)
  const rawLongitudinal = 0.85 * (heatInput * matCoeff.cte) / Math.pow(thickness, 0.75);
  const longitudinal = Math.max(0, Math.min(2.5, Math.round(rawLongitudinal * rMult * 100) / 100));

  // Residual Stress (MPa)
  // Higher restraint means LESS distortion but HIGHER internal stress.
  const stressMult = RESTRAINT_STRESS_FACTOR[restraint];
  // Stress scales with heat input and thickness, but is capped close to the material yield strength
  const stressFactor = Math.min(1.0, (heatInput * 4) / thickness);
  const residualStress = Math.round(matCoeff.yield * stressMult * (0.4 + 0.6 * stressFactor));

  const distortion: DistortionMetric = {
    angular,
    transverse,
    longitudinal,
    residualStress,
  };

  // 7. Calculate Quality Score
  let qualityScore = 100;
  if (isBurnThrough) {
    qualityScore = 5;
  } else {
    // Penalize for defects
    qualityScore -= undercut * 0.4;
    qualityScore -= lackOfFusion * 0.55;
    qualityScore -= porosity * 0.45;
    qualityScore -= slagInclusion * 0.35;
    qualityScore -= cracking * 0.75;
    
    // Penalize if weld bead width/penetration ratios are poor (e.g. cold or over-profiled)
    const ratio = weldWidth / (weldPenetration + 0.1);
    if (ratio > 8) {
      qualityScore -= 10; // overly wide/flat bead, high risk of cold lap
    } else if (ratio < 1.2) {
      qualityScore -= 8; // overly narrow bead, excessive penetration or lack of tie-in
    }
  }

  const overallQualityScore = Math.max(1, Math.min(100, Math.round(qualityScore)));

  return {
    heatInput: Math.round(heatInput * 100) / 100,
    coolingRate: Math.round(coolingRate * 10) / 10,
    weldWidth: Math.round(weldWidth * 10) / 10,
    weldPenetration: Math.round(weldPenetration * 10) / 10,
    defects,
    distortion,
    overallQualityScore,
    isBurnThrough,
  };
}

// Preset library
export const LAB_PRESETS: LabPreset[] = [
  {
    id: 'perfect',
    name: 'Standard Nominal Weld',
    description: 'Perfect parameters resulting in a clean, fully penetrating bead with negligible defects.',
    difficulty: 'Easy',
    targetDefect: 'None',
    parameters: {
      material: 'Carbon Steel',
      process: 'GMAW',
      jointType: 'Butt Joint',
      restraint: 'Medium',
      thickness: 8,
      current: 180,
      voltage: 24,
      speed: 6.5,
      preheat: 20,
      gasFlow: 14,
    }
  },
  {
    id: 'undercut-lab',
    name: 'Rapid Speed Undercutting',
    description: 'Simulates the effect of traveling too fast while keeping voltage high. The arc blows away side wall metal without filling it.',
    difficulty: 'Novice Error',
    targetDefect: 'Undercut',
    parameters: {
      material: 'Carbon Steel',
      process: 'GMAW',
      jointType: 'Butt Joint',
      restraint: 'None',
      thickness: 6,
      current: 240,
      voltage: 28,
      speed: 14.5,
      preheat: 20,
      gasFlow: 14,
    }
  },
  {
    id: 'cold-lap',
    name: 'Cold Lap & Lack of Penetration',
    description: 'Thick plates welded at low current and fast travel speeds. The base metal does not melt, leaving no fusion at the root.',
    difficulty: 'Critical Structural Error',
    targetDefect: 'Lack of Fusion',
    parameters: {
      material: 'Carbon Steel',
      process: 'GMAW',
      jointType: 'Butt Joint',
      restraint: 'Medium',
      thickness: 16,
      current: 110,
      voltage: 18,
      speed: 9.0,
      preheat: 20,
      gasFlow: 14,
    }
  },
  {
    id: 'gas-shield-fail',
    name: 'Shielding Gas Starvation',
    description: 'Welding with the shielding gas cylinder valve nearly closed. Massive atmospheric gas entrapment causes porous bubbles in the weld bead.',
    difficulty: 'Novice Error',
    targetDefect: 'Porosity',
    parameters: {
      material: 'Carbon Steel',
      process: 'GMAW',
      jointType: 'T-Joint',
      restraint: 'Medium',
      thickness: 8,
      current: 170,
      voltage: 23,
      speed: 5.5,
      preheat: 20,
      gasFlow: 3,
    }
  },
  {
    id: 'slag-trap',
    name: 'Sloppy SMAW Slag Trap',
    description: 'Welding with a very slow travel speed using stick electrodes. The molten slag spills ahead of the arc, becoming trapped beneath the metal.',
    difficulty: 'Stick Welding Trap',
    targetDefect: 'Slag Inclusion',
    parameters: {
      material: 'Carbon Steel',
      process: 'SMAW',
      jointType: 'T-Joint',
      restraint: 'Medium',
      thickness: 10,
      current: 100,
      voltage: 22,
      speed: 2.0, // extremely slow
      preheat: 20,
    }
  },
  {
    id: 'ss-distorter',
    name: 'Stainless Steel Banana Effect',
    description: 'High heat input combined with stainless steel\'s high expansion and poor conductivity. Results in severe angular warping.',
    difficulty: 'Metallurgical Challenge',
    targetDefect: 'Angular Distortion',
    parameters: {
      material: 'Stainless Steel',
      process: 'GTAW',
      jointType: 'Butt Joint',
      restraint: 'None', // No clamps = max distortion
      thickness: 5,
      current: 210,
      voltage: 20,
      speed: 3.5, // slow speed = massive heat input
      preheat: 20,
      gasFlow: 12,
    }
  },
  {
    id: 'hydrogen-crack',
    name: 'Thick Plate Hydrogen Cracking',
    description: 'Welding highly constrained thick carbon steel plates without preheat. The rapid cooling rate traps hydrogen, triggering delayed fractures.',
    difficulty: 'Advanced Failure',
    targetDefect: 'Solidification & Hydrogen Cracking',
    parameters: {
      material: 'Carbon Steel',
      process: 'SMAW',
      jointType: 'Butt Joint',
      restraint: 'High', // High clamping = high residual stress
      thickness: 18,
      current: 160,
      voltage: 24,
      speed: 7.0,
      preheat: 20, // cold start on thick steel
    }
  },
  {
    id: 'burn-through-lab',
    name: 'Thin Plate Blowout (Burn-through)',
    description: 'Applying massive amperage on a very thin aluminum sheet. The entire bottom side drops out, leaving a gaping hole.',
    difficulty: 'Operator Error',
    targetDefect: 'Burn-through',
    parameters: {
      material: 'Aluminum',
      process: 'GMAW',
      jointType: 'Butt Joint',
      restraint: 'None',
      thickness: 3,
      current: 260, // too high for 3mm
      voltage: 29,
      speed: 4.5,
      preheat: 20,
      gasFlow: 15,
    }
  }
];
