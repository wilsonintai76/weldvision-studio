import React, { useState, useMemo } from 'react';
import { WeldParameters, DistortionMetric, MaterialType } from '../types';
import { Activity, Thermometer, ShieldCheck, Zap, AlertTriangle, Layers, Maximize, MoveVertical, Link, PenTool, Brain, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { PredictiveAnalysis } from './PredictiveAnalysis';
import { motion, AnimatePresence } from 'motion/react';

interface DistortionVisualizerProps {
  parameters: WeldParameters;
  distortion: DistortionMetric;
  heatInput: number;
}

export const DistortionVisualizer: React.FC<DistortionVisualizerProps> = ({
  parameters,
  distortion,
  heatInput,
}) => {
  const { material, restraint, thickness, jointType } = parameters;
  const { angular, transverse, longitudinal, residualStress } = distortion;

  // State to simulate the cooling / solidification percentage (0% = flat hot metal, 100% = fully cooled and distorted)
  const [coolProgress, setCoolProgress] = useState<number>(0);
  const [showBaseline, setShowBaseline] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isCurveMinimized, setIsCurveMinimized] = useState<boolean>(false);

  React.useEffect(() => {
    setIsDragging(false);
    setCoolProgress(0);
    const timer = setTimeout(() => {
      setCoolProgress(100);
    }, 100);
    return () => clearTimeout(timer);
  }, [parameters, distortion]);

  // Mitigation Strategies State
  const [usePresetting, setUsePresetting] = useState<boolean>(false);
  const [useJigs, setUseJigs] = useState<boolean>(false);
  const [useBackstep, setUseBackstep] = useState<boolean>(false);
  const [useBalanced, setUseBalanced] = useState<boolean>(false);

  // Calculate mitigated distortion values
  const mitigatedDistortion = useMemo(() => {
    let effectiveAngular = angular;
    let effectiveTransverse = transverse;
    let effectiveLongitudinal = longitudinal;
    let effectiveStress = residualStress;

    // 1. Presetting (Pre-bending plates opposite to predicted shrinkage)
    if (usePresetting && (jointType === 'Butt Joint' || jointType === 'T-Joint' || jointType === 'T-Joint (Single Fillet)')) {
      effectiveAngular = Math.max(0.1, effectiveAngular - 4.5); 
    }
    
    // 2. Balanced Welding (e.g. Double-V butt joint, welding both sides to counteract stresses)
    if (useBalanced && (jointType === 'Butt Joint' || jointType === 'T-Joint')) {
      effectiveAngular = Math.max(0.1, effectiveAngular * 0.2); 
      effectiveStress = effectiveStress * 0.8; 
    }

    // 3. Jigs and Fixtures (Physical restraint against movement)
    if (useJigs) {
      effectiveAngular = effectiveAngular * 0.3;
      effectiveTransverse = effectiveTransverse * 0.4;
      effectiveLongitudinal = effectiveLongitudinal * 0.4;
      effectiveStress = effectiveStress * 1.5; // Physical restraint spikes internal residual stress!
    }

    // 4. Backstep & Skip Welding (Reduces transverse/longitudinal stress build-up)
    if (useBackstep) {
      effectiveTransverse = effectiveTransverse * 0.5;
      effectiveLongitudinal = effectiveLongitudinal * 0.5;
      effectiveStress = effectiveStress * 0.75; 
    }

    return {
      angular: Math.round(effectiveAngular * 10) / 10,
      transverse: Math.round(effectiveTransverse * 100) / 100,
      longitudinal: Math.round(effectiveLongitudinal * 100) / 100,
      residualStress: Math.round(effectiveStress)
    };
  }, [angular, transverse, longitudinal, residualStress, usePresetting, useJigs, useBackstep, useBalanced, jointType]);

    const calculateRecoveryTime = useMemo(() => {
    // Determine ideal heat input (rough estimate based on thickness and material)
    let idealHeatInput = thickness * 0.15;
    if (material === 'Aluminum') idealHeatInput *= 1.2;
    if (material === 'Stainless Steel') idealHeatInput *= 0.8;
    
    // Recovery time proportional to deviation from ideal, plus baseline cooling
    const heatDeviation = Math.abs(heatInput - idealHeatInput);
    const baseTime = 120; // 2 mins base
    const stressFactor = Math.max(0, mitigatedDistortion.residualStress - 100) * 0.5;
    const deviationFactor = heatDeviation * 500;
    
    return Math.round(baseTime + stressFactor + deviationFactor);
  }, [heatInput, thickness, material, mitigatedDistortion.residualStress]);

  // Exaggeration factor to make the distortion angle visibly noticeable on screen
  // If presetting is used, the plates start pre-bent negatively!
  const basePresetAngle = usePresetting ? -4.5 : 0;
  
  // The visual angle interpolates from the initial pre-set state (at 0% cooled)
  // to the final mitigated state (at 100% cooled)
  const currentVisualAngle = basePresetAngle * (1 - (coolProgress / 100)) + mitigatedDistortion.angular * (coolProgress / 100);
  
  const visualTilt = currentVisualAngle * 1.5;

  const isHighRisk = Math.abs(mitigatedDistortion.angular) > 5;
  const plateColor1 = isHighRisk ? '#ef4444' : (Math.abs(mitigatedDistortion.angular) > 2 ? '#f59e0b' : '#475569');
  const plateColor2 = isHighRisk ? '#dc2626' : (Math.abs(mitigatedDistortion.angular) > 2 ? '#d97706' : '#334155');

  const transitionStyle = isDragging ? { transition: 'none' } : { transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), fill 0.8s ease' };
  const pathTransitionStyle = isDragging ? { transition: 'none' } : { transition: 'd 0.8s cubic-bezier(0.4, 0, 0.2, 1)' };

  // Generate coordinates for thermal temperature decay curve
  const getThermalCurvePoints = () => {
    let thermalConductivity = 50; 
    if (material === 'Stainless Steel') thermalConductivity = 16;
    if (material === 'Aluminum') thermalConductivity = 160;

    const points: string[] = [];
    const width = 240;
    const height = 120;
    
    const decayFactor = thermalConductivity === 16 ? 0.045 : thermalConductivity === 160 ? 0.012 : 0.024;
    
    for (let x = 0; x <= width; x++) {
      const distance = x - width / 2;
      const temp = 1530 * Math.exp(-decayFactor * Math.abs(distance));
      
      const svgX = x;
      const svgY = height - (temp / 1600) * (height - 15);
      points.push(`${svgX},${svgY}`);
    }
    return points.join(' ');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100 flex flex-col gap-6" id="distortion-visualizer-card">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-500" />
          <h2 className="font-display font-semibold text-lg text-slate-100" id="distortion-header-title">
            Weld Shrinkage &amp; Thermal Distortion
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 px-3 py-1 rounded-md border border-slate-800">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block animate-pulse" />
          <span>Post-Weld Cooling State</span>
        </div>
      </div>

      {/* Grid of Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Side: Interactive 2D Warping Visualization */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-mono text-slate-400">WARPING GEOMETRY SIMULATION</span>
            <div className="flex items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer bg-slate-900 border border-slate-700 px-2 py-1 rounded-md text-slate-300 hover:bg-slate-800 transition-colors mr-2"><input type="checkbox" checked={showBaseline} onChange={(e) => setShowBaseline(e.target.checked)} className="accent-amber-500" /><span className="text-[10px] font-semibold">Toggle Baseline</span></label>
              <span className="text-slate-500">Cooling:</span>
              <span className="font-mono text-amber-400 font-semibold">{coolProgress}%</span>
            </div>
          </div>

          <div className="relative bg-slate-950 border border-slate-800 rounded-xl h-48 flex flex-col justify-center items-center overflow-hidden p-4">
            <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-500">
              CROSS-SECTION DEFLECTION {restraint === 'High' ? '(RESTRAINED)' : ''}
            </div>

            {/* Simulated distorted geometry */}
            <svg viewBox="0 0 320 120" className="w-full max-w-[280px] h-auto overflow-visible" id="warping-svg">
              {jointType === 'Butt Joint' && (
                <g id="butt-warp" transform={`translate(160, 85)`}>
                  {/* Baseline Ghost */}
                  {showBaseline && (
                    <g opacity="0.5">
                      <rect x="-120" y="-8" width="120" height="12" fill="#38bdf8" fillOpacity="0.1" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
                      <rect x="0" y="-8" width="120" height="12" fill="#38bdf8" fillOpacity="0.1" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
                    </g>
                  )}
                  {/* Left Plate curls upward around joint center */}
                  <g transform={`rotate(${-visualTilt}, 0, 0)`} style={transitionStyle}>
                    <rect x="-120" y="-8" width="120" height="12" fill={plateColor1} stroke="#1e293b" strokeWidth="1.5" style={transitionStyle} />
                    {/* Measurement angle line */}
                    <line x1="-120" x2="0" y1="4" y2="4" stroke="#64748b" strokeDasharray="2 2" />
                  </g>
                  
                  {/* Right Plate curls upward */}
                  <g transform={`rotate(${visualTilt}, 0, 0)`} style={transitionStyle}>
                    <rect x="0" y="-8" width="120" height="12" fill={plateColor1} stroke="#1e293b" strokeWidth="1.5" style={transitionStyle} />
                    {/* Measurement angle line */}
                    <line x1="0" x2="120" y1="4" y2="4" stroke="#64748b" strokeDasharray="2 2" />
                  </g>

                  {/* Liquid/Solid bead in center */}
                  <path d={`M -10 -8 Q 0 ${-5 - visualTilt * 0.5} 10 -8 Q 0 ${12 - visualTilt * 0.2} -10 -8 Z`} fill="#f97316" opacity="0.9" style={pathTransitionStyle} />

                  {/* Horizontal Flat Baseline for comparison */}
                  <line x1="-130" x2="130" y1="4" y2="4" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.35" />
                </g>
              )}

              {(jointType === 'T-Joint' || jointType === 'T-Joint (Single Fillet)') && (
                <g id="t-warp" transform={`translate(160, 95)`}>
                  {/* Baseline Ghost */}
                  {showBaseline && (
                    <g opacity="0.5">
                      <rect x="-120" y="0" width="240" height="10" fill="#38bdf8" fillOpacity="0.1" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
                      <rect x="-6" y="-80" width="12" height="80" fill="#38bdf8" fillOpacity="0.1" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
                    </g>
                  )}
                  {/* Horizontal Base Plate */}
                  <rect x="-120" y="0" width="240" height="10" fill={plateColor1} stroke="#1e293b" strokeWidth="1.5" style={transitionStyle} />

                  {/* Vertical Plate tilts toward side bead due to asymmetric shrinkage */}
                  {/* For T-joints, angular distortion manifests as the vertical member tilting slightly */}
                  <g transform={`rotate(${jointType === 'T-Joint (Single Fillet)' ? visualTilt * 1.5 : visualTilt * 0.75}, 0, 0)`} style={transitionStyle}>
                    <rect x="-6" y="-80" width="12" height="80" fill={plateColor2} stroke="#1e293b" strokeWidth="1.5" style={transitionStyle} />
                    {/* Deflection path indicator */}
                    <path d={`M 0 -80 Q ${visualTilt * 1.5} -40 0 0`} fill="none" stroke="#f97316" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" style={pathTransitionStyle} />
                  </g>
                  {/* Welds at base corners */}
                  <path d="M -6 0 L -16 0 Q -11 -11 -6 -10 Z" fill="#ea580c" />
                  {jointType === 'T-Joint' && (
                    <path d="M 6 0 L 16 0 Q 11 -11 6 -10 Z" fill="#ea580c" />
                  )}
                  
                  <line x1="0" x2="0" y1="-90" y2="10" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                </g>
              )}

              {jointType === 'Lap Joint' && (
                <g id="lap-warp" transform={`translate(160, 75)`}>
                  {/* Baseline Ghost */}
                  {showBaseline && (
                    <g opacity="0.5">
                      <rect x="-110" y="5" width="130" height="10" fill="#38bdf8" fillOpacity="0.1" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
                      <rect x="-20" y="-5" width="130" height="10" fill="#38bdf8" fillOpacity="0.1" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
                    </g>
                  )}
                  {/* Warped overlapping plates */}
                  <g transform={`rotate(${-visualTilt * 0.4}, -60, 10)`} style={transitionStyle}>
                    <rect x="-110" y="5" width="130" height="10" fill={plateColor1} stroke="#1e293b" strokeWidth="1.5" style={transitionStyle} />
                  </g>
                  <g transform={`rotate(${visualTilt * 0.4}, 60, -5)`} style={transitionStyle}>
                    <rect x="-20" y="-5" width="130" height="10" fill={plateColor2} stroke="#1e293b" strokeWidth="1.5" style={transitionStyle} />
                  </g>
                  <path d="M -20 -5 L -32 5 Q -20 10 -10 5 Z" fill="#ea580c" />
                </g>
              )}
            </svg>

            {/* Live Angular Arch Gauge */}
            {mitigatedDistortion.angular >= 0 && (
              <div className={`absolute bottom-2 right-2 bg-slate-900/90 border px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1.5 ${isHighRisk ? 'border-red-500/50 text-red-400' : 'border-slate-800 text-amber-400'}`}>
                {isHighRisk && <AlertTriangle className="w-3 h-3 text-red-500 animate-pulse" />}
                <div>
                  Angular Deflection: <span className="font-bold">{Math.round(currentVisualAngle * 10) / 10}°</span>
                  {isHighRisk && <div className="text-[8px] leading-none mt-0.5 text-red-500 font-bold uppercase tracking-wider">High Risk Failure</div>}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Cooling Progress Slider */}
          <div className="flex items-center gap-3 bg-slate-950/40 border border-slate-800 px-4 py-2.5 rounded-xl">
            <span className="text-xs text-slate-400 font-mono shrink-0">WELD AGE:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={coolProgress}
              onChange={(e) => setCoolProgress(parseInt(e.target.value))}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              className="flex-1 h-2.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <span className="text-[10px] font-mono font-bold text-cyan-400 w-12 text-right">
              {coolProgress === 100 ? 'COOLED' : coolProgress === 0 ? 'MOLTEN' : `${coolProgress}%`}
            </span>
          </div>
        </div>

        {/* Right Side: Thermal Profile Graph & Material Dynamics */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Activity className="w-4 h-4 text-amber-500" />
              Thermal Cooling Curve
            </span>
            <button 
              onClick={() => setIsCurveMinimized(!isCurveMinimized)}
              className="p-1 hover:bg-slate-800 rounded-md transition-colors text-slate-500 hover:text-slate-200"
              title={isCurveMinimized ? "Expand Curve" : "Minimize Curve"}
            >
              {isCurveMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {!isCurveMinimized && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="flex flex-col gap-4 overflow-hidden"
              >
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-center h-48 relative">
                  <svg viewBox="0 0 240 120" className="w-full h-full overflow-visible" id="thermal-chart">
                    {/* Reference Grid lines */}
                    <line x1="0" x2="240" y1="105" y2="105" stroke="#334155" strokeWidth="1" />
                    <line x1="120" x2="120" y1="0" y2="120" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                    
                    {/* Melting Point boundary (1500°C) */}
                    <line x1="0" x2="240" y1="15" y2="15" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="1 3" />
                    <text x="5" y="24" fill="#f87171" fontSize="8" fontFamily="monospace">Melting Temp (1500°C)</text>

                    {/* Dynamic Thermal Curve */}
                    <polyline
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="2.5"
                      points={getThermalCurvePoints()}
                      className="transition-all duration-500"
                    />

                    {/* Glowing thermal core spot */}
                    <circle cx="120" cy="15" r="4" fill="#fef08a">
                      <animate attributeName="r" values="4;12;4" dur="1.5s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0;0.8" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="120" cy="15" r="2.5" fill="#fef08a" />

                    {/* Axis markers */}
                    <text x="123" y="115" fill="#64748b" fontSize="8" fontFamily="monospace">Weld Center (0)</text>
                    <text x="5" y="115" fill="#64748b" fontSize="8" fontFamily="monospace">-20mm</text>
                    <text x="205" y="115" fill="#64748b" fontSize="8" fontFamily="monospace">+20mm</text>
                  </svg>
                  
                  <div className="absolute top-2 right-2 text-[9px] font-mono text-slate-500 text-right">
                    Peak: ~1530°C
                    <br />
                    HAZ Width: {Math.round(thickness * (1 + heatInput * 0.45))}mm
                  </div>
                </div>

                {/* Metallurgical Conductivity Explanation */}
                <div className="text-xs bg-slate-950/30 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-1 text-slate-300">
                  <span className="font-medium text-slate-200">Thermal Gradient Analysis:</span>
                  {material === 'Stainless Steel' ? (
                    <span>Stainless has **poor thermal conductivity** (16 W/mK), which traps intense heat at the seam, generating a highly concentrated, steep thermal gradient. Combined with high expansion rates, this creates **extreme angular distortion**.</span>
                  ) : material === 'Aluminum' ? (
                    <span>Aluminum has **extraordinary conductivity** (160 W/mK). Heat spreads outwards almost instantly, resulting in a broad, low-peak thermal curve. Distortion is moderate, but rapid cooling increases LOF risk.</span>
                  ) : (
                    <span>Carbon steel displays balanced thermal properties. The temperature decays gradually outward. Thermal distortion is predictable but requires proper joint spacing.</span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mitigation Strategies Toggles */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-slate-200">Apply Distortion Mitigation Strategies</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          
          <label className={`flex flex-col gap-1.5 p-3 rounded-lg border cursor-pointer transition-all ${usePresetting ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={usePresetting} onChange={(e) => setUsePresetting(e.target.checked)} className="accent-emerald-500" />
              <span className="text-xs font-semibold text-slate-200">Presetting</span>
            </div>
            <span className="text-[10px] text-slate-400 leading-snug">Pre-bend plates opposite to shrinkage. Compensates for angular distortion.</span>
          </label>

          <label className={`flex flex-col gap-1.5 p-3 rounded-lg border cursor-pointer transition-all ${useBalanced ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={useBalanced} onChange={(e) => setUseBalanced(e.target.checked)} className="accent-emerald-500" disabled={jointType === 'Lap Joint' || jointType === 'T-Joint (Single Fillet)'} />
              <span className={`text-xs font-semibold ${jointType === 'Lap Joint' || jointType === 'T-Joint (Single Fillet)' ? 'text-slate-600' : 'text-slate-200'}`}>Balanced Sequence</span>
            </div>
            <span className="text-[10px] text-slate-400 leading-snug">Weld opposite sides (e.g., Double-V) to counteract internal contraction stresses.</span>
          </label>

          <label className={`flex flex-col gap-1.5 p-3 rounded-lg border cursor-pointer transition-all ${useJigs ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={useJigs} onChange={(e) => setUseJigs(e.target.checked)} className="accent-amber-500" />
              <span className="text-xs font-semibold text-slate-200">Jigs & Fixtures</span>
            </div>
            <span className="text-[10px] text-slate-400 leading-snug">Force plates to yield rather than move. Reduces warping but spikes internal stress!</span>
          </label>

          <label className={`flex flex-col gap-1.5 p-3 rounded-lg border cursor-pointer transition-all ${useBackstep ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={useBackstep} onChange={(e) => setUseBackstep(e.target.checked)} className="accent-emerald-500" />
              <span className="text-xs font-semibold text-slate-200">Backstep / Skip</span>
            </div>
            <span className="text-[10px] text-slate-400 leading-snug">Welding backwards in short steps. Prevents transverse contraction build-up.</span>
          </label>

        </div>
      </div>

      {/* Numerical Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric A: Angular */}
        <div className="bg-slate-950/60 border border-slate-800/50 p-3.5 rounded-xl flex flex-col gap-1 transition-all">
          <span className="text-[10px] font-mono text-slate-500">ANGULAR WARPING</span>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-xl text-slate-100">{mitigatedDistortion.angular}°</span>
            {angular !== mitigatedDistortion.angular && <span className="text-[10px] text-slate-500 line-through">{angular}°</span>}
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (mitigatedDistortion.angular / 12) * 100)}%` }} />
          </div>
        </div>

        {/* Metric B: Transverse */}
        <div className="bg-slate-950/60 border border-slate-800/50 p-3.5 rounded-xl flex flex-col gap-1 transition-all">
          <span className="text-[10px] font-mono text-slate-500">TRANSVERSE CONTRACTION</span>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-xl text-slate-100">{mitigatedDistortion.transverse} mm</span>
            {transverse !== mitigatedDistortion.transverse && <span className="text-[10px] text-slate-500 line-through">{transverse}</span>}
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (mitigatedDistortion.transverse / 4.5) * 100)}%` }} />
          </div>
        </div>

        {/* Metric C: Longitudinal */}
        <div className="bg-slate-950/60 border border-slate-800/50 p-3.5 rounded-xl flex flex-col gap-1 transition-all">
          <span className="text-[10px] font-mono text-slate-500">SEAM SHORTENING</span>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-xl text-slate-100">{mitigatedDistortion.longitudinal} mm</span>
            {longitudinal !== mitigatedDistortion.longitudinal && <span className="text-[10px] text-slate-500 line-through">{longitudinal}</span>}
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (mitigatedDistortion.longitudinal / 2.5) * 100)}%` }} />
          </div>
        </div>

        {/* Metric D: Residual Stress */}
        <div className="bg-slate-950/60 border border-slate-800/50 p-3.5 rounded-xl flex flex-col gap-1 relative overflow-hidden transition-all">
          <span className="text-[10px] font-mono text-slate-500">RESIDUAL INTERNAL STRESS</span>
          <div className="flex items-baseline gap-2">
            <span className={`font-display font-bold text-xl ${mitigatedDistortion.residualStress > 200 ? 'text-red-400' : mitigatedDistortion.residualStress > 100 ? 'text-amber-400' : 'text-slate-100'}`}>
              {mitigatedDistortion.residualStress} MPa
            </span>
            {residualStress !== mitigatedDistortion.residualStress && <span className="text-[10px] text-slate-500 line-through">{residualStress}</span>}
          </div>
          <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1">
            <div className={`h-full rounded-full transition-all duration-300 ${mitigatedDistortion.residualStress > 200 ? 'bg-red-500' : mitigatedDistortion.residualStress > 100 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (mitigatedDistortion.residualStress / 300) * 100)}%` }} />
          </div>
          {(restraint === 'High' || useJigs) && (
            <div className="absolute top-1 right-1" title="High residual stress due to heavy restraint!">
              <ShieldCheck className={`w-3.5 h-3.5 ${mitigatedDistortion.residualStress > 200 ? 'text-red-500' : 'text-emerald-500'}`} />
            </div>
          )}
        </div>
      </div>

      {/* High Restraint Tradeoff Educational Alert */}
      {(restraint === 'High' || useJigs) && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-amber-200">
          <AlertTriangle className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-xs">High Restraint Tradeoff!</span>
            <span className="text-[11px] text-amber-300">Heavy clamping prevents visible metal warping (angular distortion reduces to {mitigatedDistortion.angular}°), but locks in massive internal thermal stresses ({mitigatedDistortion.residualStress} MPa). This severely increases cracking susceptibility during solidification.</span>
          </div>
        </div>
      )}
      <div className="mt-1 bg-slate-900 border border-slate-700 rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Thermometer className="w-5 h-5 text-amber-500" />
          <span className="text-sm font-semibold text-slate-200">Estimated Recovery Time to Ideal Thermal State:</span>
        </div>
        <span className="text-xl font-mono font-bold text-amber-400">{calculateRecoveryTime}s</span>
      </div>

      <PredictiveAnalysis 
        parameters={parameters}
        distortion={distortion}
        heatInput={heatInput}
        mitigatedDistortion={mitigatedDistortion}
      />
    </div>
  );
};
