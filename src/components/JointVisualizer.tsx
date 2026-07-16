import React, { useState } from 'react';
import { WeldParameters, SimulationResult, DefectMetric } from '../types';
import { Eye, ShieldAlert, Sparkles, AlertCircle, HelpCircle } from 'lucide-react';

interface JointVisualizerProps {
  parameters: WeldParameters;
  simulation: SimulationResult;
  selectedDefect: string | null;
  onSelectDefect: (defectId: string | null) => void;
}

export const JointVisualizer: React.FC<JointVisualizerProps> = ({
  parameters,
  simulation,
  selectedDefect,
  onSelectDefect,
}) => {
  const { thickness, jointType, process, preheat } = parameters;
  const { weldWidth, weldPenetration, heatInput, defects, isBurnThrough } = simulation;
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Pixel mapping: scale 1mm = 6.5 pixels (thickness max 20mm -> 130px)
  const pxScale = 6.5;
  const [thermalMode, setThermalMode] = useState<boolean>(false);
  const pxThickness = Math.max(15, Math.min(130, thickness * pxScale));
  
  // Center coordinates
  const cx = 250;
  const cy = 160; // bottom baseline of top plate/butt plates
  const plateTop = cy - pxThickness;

  // Calculate bead pixel dimensions
  const pxWidth = Math.max(20, Math.min(160, weldWidth * pxScale));
  const pxPenetration = Math.max(5, Math.min(150, weldPenetration * pxScale));
  
  // HAZ boundary scales with Heat Input and preheat temperature
  const hazFactor = 1 + (heatInput * 0.45) + (preheat / 200);
  const pxHazWidth = pxWidth * hazFactor;
  const pxHazPenetration = pxPenetration * hazFactor;

  // Find active defects with substantial severity to display
  const activeUndercut = defects.find(d => d.id === 'undercut' && d.severity > 20);
  const activeLOF = defects.find(d => d.id === 'lof' && d.severity > 20);
  const activePorosity = defects.find(d => d.id === 'porosity' && d.severity > 15);
  const activeSlag = defects.find(d => d.id === 'slag' && d.severity > 15);
  const activeCracking = defects.find(d => d.id === 'cracking' && d.severity > 20);

  // Helpers to check highlight state
  const isHighlighted = (defectId: string) => selectedDefect === defectId || hoveredRegion === defectId;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100 flex flex-col gap-4" id="joint-visualizer-card">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-amber-500" />
          <h2 className="font-display font-semibold text-lg text-slate-100" id="visualizer-header-title">
            Interactive Weld Cross-Section
          </h2>
        </div>
        <div className="flex gap-2 text-xs font-mono">
          <label className="flex items-center gap-1.5 cursor-pointer bg-slate-900 border border-slate-700 px-2 py-1 rounded-md text-slate-300 hover:bg-slate-800 transition-colors mr-2"><input type="checkbox" checked={thermalMode} onChange={(e) => setThermalMode(e.target.checked)} className="accent-rose-500" /><span className="text-[10px] font-semibold">Thermal Camera Mode</span></label>
          <span className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 text-slate-400">
            Scale: <span className="text-amber-400">1mm ≈ {pxScale}px</span>
          </span>
          <span className="bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 text-slate-400">
            Heat Input: <span className="text-amber-400">{heatInput} kJ/mm</span>
          </span>
        </div>
      </div>

      {/* Visualizer Frame */}
      <div className="relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center p-2 min-h-[300px]">
        {/* Background Grid Accent */}
        <div className="absolute inset-0 opacity-5 pointer-events-none bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:16px_16px]" />

        {/* Dynamic Welding Spark Particles (Glow effect when heat is high) */}
        {heatInput > 1.2 && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[10px] font-mono text-amber-500/80 bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>THERMAL GLOW ACTIVE</span>
          </div>
        )}

        {/* SVG Core Diagram */}
        <svg viewBox="0 0 500 280" className="w-full max-w-[500px] h-auto drop-shadow-lg overflow-visible" id="weld-svg-diagram">
          <defs>
            {/* Heat Affected Zone Gradient */}
            <radialGradient id="haz-grad" cx="50%" cy="40%" r="50%">
              {thermalMode ? (
                <>
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
                  <stop offset="40%" stopColor="#c026d3" stopOpacity="0.7" />
                  <stop offset="70%" stopColor="#1d4ed8" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#020617" stopOpacity="0.0" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#f97316" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                </>
              )}
            </radialGradient>

            {/* Weld Bead Metal Fill Gradient */}
            <linearGradient id="bead-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              {thermalMode ? (
                <>
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="20%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#ef4444" />
                  <stop offset="80%" stopColor="#7e22ce" />
                  <stop offset="100%" stopColor="#1e3a8a" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="35%" stopColor="#ea580c" />
                  <stop offset="75%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#334155" />
                </>
              )}
            </linearGradient>
            <linearGradient id="bead-grad-disabled" x1="0%" y1="0%" x2="0%" y2="100%">
              
            </linearGradient>

            {/* Glowing Weld Core */}
            <radialGradient id="fusion-core" cx="50%" cy="20%" r="40%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#f97316" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.0" />
            </radialGradient>
            {/* Gas Shielding Cloud */}
            <radialGradient id="gas-cloud-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
            </radialGradient>
          </defs>

          {/* ==================== BASE METAL PLATES ==================== */}
          {jointType === 'Butt Joint' && (
            <g id="base-plates-butt">
              {/* Left Plate */}
              <rect
                x="50"
                y={plateTop}
                width="190"
                height={pxThickness}
                fill={thermalMode ? "#020617" : "#475569"}
                stroke="#1e293b"
                strokeWidth="1.5"
                className="transition-all duration-300"
              />
              {/* Left V-groove Bevel Cut */}
              <path
                d={`M 240 ${plateTop} L 244 ${cy} L 240 ${cy} Z`}
                fill={thermalMode ? "#0f172a" : "#334155"}
              />
              {/* Right Plate */}
              <rect
                x="260"
                y={plateTop}
                width="190"
                height={pxThickness}
                fill={thermalMode ? "#020617" : "#475569"}
                stroke="#1e293b"
                strokeWidth="1.5"
                className="transition-all duration-300"
              />
              {/* Right V-groove Bevel Cut */}
              <path
                d={`M 260 ${plateTop} L 256 ${cy} L 260 ${cy} Z`}
                fill={thermalMode ? "#0f172a" : "#334155"}
              />
            </g>
          )}

          {(jointType === 'T-Joint' || jointType === 'T-Joint (Single Fillet)') && (
            <g id="base-plates-t">
              {/* Horizontal Bottom Plate */}
              <rect
                x="50"
                y={cy}
                width="400"
                height="24"
                fill={thermalMode ? "#020617" : "#475569"}
                stroke="#1e293b"
                strokeWidth="1.5"
              />
              {/* Vertical Standing Plate */}
              <rect
                x={cx - pxThickness / 2}
                y={cy - 120}
                width={pxThickness}
                height="120"
                fill={thermalMode ? "#020617" : "#475569"}
                stroke="#1e293b"
                strokeWidth="1.5"
                className="transition-all duration-300"
              />
            </g>
          )}

          {jointType === 'Lap Joint' && (
            <g id="base-plates-lap">
              {/* Bottom Plate */}
              <rect
                x="140"
                y={cy}
                width="280"
                height={pxThickness}
                fill={thermalMode ? "#020617" : "#475569"}
                stroke="#1e293b"
                strokeWidth="1.5"
                className="transition-all duration-300"
              />
              {/* Top Overlapping Plate */}
              <rect
                x="80"
                y={cy - pxThickness}
                width="280"
                height={pxThickness}
                fill={thermalMode ? "#0f172a" : "#334155"}
                stroke="#1e293b"
                strokeWidth="1.5"
                className="transition-all duration-300"
              />
            </g>
          )}

          {/* ==================== BURN THROUGH HOLE (IF ACTIVE) ==================== */}
          {isBurnThrough && (
            <g id="burn-through-graphics">
              {/* Molten slag overflow / drip */}
              <path
                d={`M ${jointType === 'Lap Joint' ? 335 : cx - 25} ${cy} Q ${jointType === 'Lap Joint' ? 360 : cx} ${cy + 60} ${jointType === 'Lap Joint' ? 385 : cx + 25} ${cy} Z`}
                fill="#ea580c"
                opacity="0.9"
                className="animate-pulse"
              />
              {/* Burning red hot ring */}
              <ellipse
                cx={jointType === 'Lap Joint' ? 360 : cx}
                cy={cy}
                rx="28"
                ry="12"
                fill="#f43f5e"
                opacity="0.85"
              >
                <animate attributeName="rx" values="28;45;28" dur="1s" repeatCount="indefinite" />
                <animate attributeName="ry" values="12;20;12" dur="1s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.85;0;0.85" dur="1s" repeatCount="indefinite" />
              </ellipse>
              <ellipse
                cx={jointType === 'Lap Joint' ? 360 : cx}
                cy={cy}
                rx="20"
                ry="8"
                fill="#0f172a"
              />
            </g>
          )}

          {/* ==================== HEAT AFFECTED ZONE (HAZ) ==================== */}
          {!isBurnThrough && (
            <g id="haz-layer" opacity={Math.min(0.9, heatInput * 0.35)}>
              {jointType === 'Butt Joint' && (
                <ellipse
                  cx={cx}
                  cy={plateTop + pxPenetration / 2}
                  rx={pxHazWidth / 1.3}
                  ry={pxHazPenetration * 1.1}
                  fill="url(#haz-grad)"
                />
              )}
              {(jointType === 'T-Joint' || jointType === 'T-Joint (Single Fillet)') && (
                <>
                  {/* Left Fillet HAZ */}
                  <circle
                    cx={cx - pxThickness / 2}
                    cy={cy}
                    r={pxHazWidth * 0.6}
                    fill="url(#haz-grad)"
                  />
                  {/* Right Fillet HAZ */}
                  {jointType === 'T-Joint' && (
                    <circle
                      cx={cx + pxThickness / 2}
                      cy={cy}
                      r={pxHazWidth * 0.6}
                      fill="url(#haz-grad)"
                    />
                  )}
                </>
              )}
              {jointType === 'Lap Joint' && (
                <circle
                  cx="360"
                  cy={cy}
                  r={pxHazWidth * 0.6}
                  fill="url(#haz-grad)"
                />
              )}
            </g>
          )}

          {/* ==================== LIQUID/SOLIDIFIED BEAD ==================== */}
          {!isBurnThrough && (
            <g id="weld-bead-layer">
              {jointType === 'Butt Joint' && (
                <>
                  {/* Weld Penetration (bottom pool) */}
                  <path
                    d={`M ${cx - pxWidth / 2} ${plateTop} Q ${cx} ${plateTop + pxPenetration} ${cx + pxWidth / 2} ${plateTop} Z`}
                    fill="url(#bead-grad)"
                    stroke="#b45309"
                    strokeWidth="0.5"
                  />
                  {/* Weld Cap Reinforcement (top cap crown) */}
                  <path
                    d={`M ${cx - pxWidth / 2} ${plateTop} Q ${cx} ${plateTop - pxWidth * 0.28} ${cx + pxWidth / 2} ${plateTop} Z`}
                    fill="url(#bead-grad)"
                    stroke="#78350f"
                    strokeWidth="1"
                  />
                  {/* Glowing core when hot */}
                  <ellipse
                    cx={cx}
                    cy={plateTop}
                    rx={pxWidth * 0.35}
                    ry={pxWidth * 0.15}
                    fill="url(#fusion-core)"
                    opacity="0.8"
                  />
                </>
              )}

              {(jointType === 'T-Joint' || jointType === 'T-Joint (Single Fillet)') && (
                <>
                  {/* Left Fillet Weld Bead */}
                  <path
                    d={`M ${cx - pxThickness / 2} ${cy - pxWidth / 1.5} Q ${cx - pxThickness / 2 - pxWidth / 2.2} ${cy - pxWidth / 2.2} ${cx - pxThickness / 2 - pxWidth / 1.5} ${cy} L ${cx - pxThickness / 2} ${cy} Z`}
                    fill="url(#bead-grad)"
                    stroke="#78350f"
                    strokeWidth="1"
                  />
                  {/* Right Fillet Weld Bead */}
                  {jointType === 'T-Joint' && (
                    <path
                      d={`M ${cx + pxThickness / 2} ${cy - pxWidth / 1.5} Q ${cx + pxThickness / 2 + pxWidth / 2.2} ${cy - pxWidth / 2.2} ${cx + pxThickness / 2 + pxWidth / 1.5} ${cy} L ${cx + pxThickness / 2} ${cy} Z`}
                      fill="url(#bead-grad)"
                      stroke="#78350f"
                      strokeWidth="1"
                    />
                  )}
                  {/* Hot core dots inside fillets */}
                  <circle cx={cx - pxThickness / 2 - pxWidth * 0.25} cy={cy - pxWidth * 0.25} r={pxWidth * 0.15} fill="url(#fusion-core)" opacity="0.75" />
                  {jointType === 'T-Joint' && (
                    <circle cx={cx + pxThickness / 2 + pxWidth * 0.25} cy={cy - pxWidth * 0.25} r={pxWidth * 0.15} fill="url(#fusion-core)" opacity="0.75" />
                  )}
                </>
              )}

              {jointType === 'Lap Joint' && (
                <>
                  {/* Overlap fillet bead on the edge */}
                  <path
                    d={`M 360 ${cy - pxWidth / 1.5} Q ${360 + pxWidth / 2.2} ${cy - pxWidth / 2.2} ${360 + pxWidth / 1.5} ${cy} L 360 ${cy} Z`}
                    fill="url(#bead-grad)"
                    stroke="#78350f"
                    strokeWidth="1"
                  />
                  {/* Hot center core */}
                  <circle cx={360 + pxWidth * 0.25} cy={cy - pxWidth * 0.25} r={pxWidth * 0.15} fill="url(#fusion-core)" opacity="0.75" />
                </>
              )}
            </g>
          )}

          {/* ==================== ACTIVE DEFECT RENDERING (OVERLAYS) ==================== */}

          {/* 1. UNDERCUT (Frown-shaped bites out of base metal at weld toes) */}
          {activeUndercut && !isBurnThrough && (
            <g
              id="visual-undercut"
              className={`cursor-pointer transition-transform duration-300 ${isHighlighted('undercut') ? 'scale-110 origin-center' : 'opacity-85'}`}
              onClick={() => onSelectDefect(selectedDefect === 'undercut' ? null : 'undercut')}
              onMouseEnter={() => setHoveredRegion('undercut')}
              onMouseLeave={() => setHoveredRegion(null)}
            >
              {jointType === 'Butt Joint' && (
                <>
                  {/* Left Toe Bite */}
                  <path
                    d={`M ${cx - pxWidth / 2 - 2} ${plateTop - 1} Q ${cx - pxWidth / 2 + 5} ${plateTop + 8} ${cx - pxWidth / 2 + 3} ${plateTop + 14}`}
                    fill="none"
                    stroke={isHighlighted('undercut') ? '#ef4444' : '#f87171'}
                    strokeWidth={isHighlighted('undercut') ? '4.5' : '2.5'}
                  />
                  {/* Right Toe Bite */}
                  <path
                    d={`M ${cx + pxWidth / 2 + 2} ${plateTop - 1} Q ${cx + pxWidth / 2 - 5} ${plateTop + 8} ${cx + pxWidth / 2 - 3} ${plateTop + 14}`}
                    fill="none"
                    stroke={isHighlighted('undercut') ? '#ef4444' : '#f87171'}
                    strokeWidth={isHighlighted('undercut') ? '4.5' : '2.5'}
                  />
                  {/* Interactive Clicks Highlights */}
                  <circle cx={cx - pxWidth / 2} cy={plateTop + 4} r="10" fill="transparent" />
                  <circle cx={cx + pxWidth / 2} cy={plateTop + 4} r="10" fill="transparent" />
                </>
              )}

              {(jointType === 'T-Joint' || jointType === 'T-Joint (Single Fillet)') && (
                <>
                  {/* Top toe bites */}
                  <path
                    d={`M ${cx - pxThickness / 2 - 1} ${cy - pxWidth / 1.5 - 2} Q ${cx - pxThickness / 2 + 8} ${cy - pxWidth / 1.5 + 4} ${cx - pxThickness / 2} ${cy - pxWidth / 1.5 + 10}`}
                    fill="none"
                    stroke={isHighlighted('undercut') ? '#ef4444' : '#f87171'}
                    strokeWidth={isHighlighted('undercut') ? '4' : '2.5'}
                  />
                  {jointType === 'T-Joint' && (
                    <path
                      d={`M ${cx + pxThickness / 2 + 1} ${cy - pxWidth / 1.5 - 2} Q ${cx + pxThickness / 2 - 8} ${cy - pxWidth / 1.5 + 4} ${cx + pxThickness / 2} ${cy - pxWidth / 1.5 + 10}`}
                      fill="none"
                      stroke={isHighlighted('undercut') ? '#ef4444' : '#f87171'}
                      strokeWidth={isHighlighted('undercut') ? '4' : '2.5'}
                    />
                  )}
                </>
              )}

              {jointType === 'Lap Joint' && (
                <>
                  <path
                    d={`M 358 ${cy - pxWidth / 1.5 - 2} Q 365 ${cy - pxWidth / 1.5 + 4} 360 ${cy - pxWidth / 1.5 + 10}`}
                    fill="none"
                    stroke={isHighlighted('undercut') ? '#ef4444' : '#f87171'}
                    strokeWidth={isHighlighted('undercut') ? '4' : '2.5'}
                  />
                  <path
                    d={`M ${360 + pxWidth / 1.5 - 2} ${cy + 1} Q ${360 + pxWidth / 1.5 - 8} ${cy - 4} ${360 + pxWidth / 1.5 - 10} ${cy}`}
                    fill="none"
                    stroke={isHighlighted('undercut') ? '#ef4444' : '#f87171'}
                    strokeWidth={isHighlighted('undercut') ? '4' : '2.5'}
                  />
                </>
              )}
            </g>
          )}

          {/* 2. LACK OF PENETRATION / FUSION (Dark separator lines/root gaps) */}
          {activeLOF && !isBurnThrough && (
            <g
              id="visual-lof"
              className={`cursor-pointer transition-opacity duration-300 ${isHighlighted('lof') ? 'opacity-100' : 'opacity-80'}`}
              onClick={() => onSelectDefect(selectedDefect === 'lof' ? null : 'lof')}
              onMouseEnter={() => setHoveredRegion('lof')}
              onMouseLeave={() => setHoveredRegion(null)}
            >
              {jointType === 'Butt Joint' && (
                <>
                  {/* Bottom center root gap line left un-melted */}
                  <rect
                    x={cx - 3}
                    y={cy - pxThickness * 0.35}
                    width="6"
                    height={pxThickness * 0.38}
                    fill={isHighlighted('lof') ? '#ef4444' : '#0f172a'}
                    stroke={isHighlighted('lof') ? '#fca5a5' : 'none'}
                    strokeWidth="1"
                    className="animate-pulse"
                  />
                  {/* Sidewall un-fused border line */}
                  <path
                    d={`M ${cx - pxWidth / 2.5} ${plateTop + 8} Q ${cx - pxWidth * 0.2} ${plateTop + pxPenetration * 0.7} ${cx - 5} ${cy - 5}`}
                    fill="none"
                    stroke={isHighlighted('lof') ? '#ef4444' : '#1e293b'}
                    strokeWidth={isHighlighted('lof') ? '3.5' : '2.2'}
                  />
                </>
              )}

              {(jointType === 'T-Joint' || jointType === 'T-Joint (Single Fillet)') && (
                <>
                  {/* Root notch lack of fusion at the very junction of vertical and horizontal */}
                  <rect x={cx - 3} y={cy - 4} width="6" height="6" fill={isHighlighted('lof') ? '#ef4444' : '#0f172a'} />
                </>
              )}
              {jointType === 'Lap Joint' && (
                <>
                  <rect x={357} y={cy - 4} width="6" height="6" fill={isHighlighted('lof') ? '#ef4444' : '#0f172a'} />
                </>
              )}
            </g>
          )}

          {/* 3. POROSITY (Small circle gas bubbles clustered in the weld) */}
          {activePorosity && !isBurnThrough && (
            <g
              id="visual-porosity"
              className="cursor-pointer"
              onClick={() => onSelectDefect(selectedDefect === 'porosity' ? null : 'porosity')}
              onMouseEnter={() => setHoveredRegion('porosity')}
              onMouseLeave={() => setHoveredRegion(null)}
            >
              {jointType === 'Butt Joint' && (
                <g fill={isHighlighted('porosity') ? '#fca5a5' : '#cbd5e1'} stroke={isHighlighted('porosity') ? '#ef4444' : '#475569'} strokeWidth="1">
                  <circle cx={cx - 15} cy={plateTop + 10} r={isHighlighted('porosity') ? '4.5' : '3'} />
                  <circle cx={cx + 18} cy={plateTop + 8} r={isHighlighted('porosity') ? '3.5' : '2.5'} />
                  <circle cx={cx + 2} cy={plateTop + 24} r={isHighlighted('porosity') ? '4' : '2.8'} />
                  <circle cx={cx - 8} cy={plateTop + 18} r={isHighlighted('porosity') ? '3' : '2'} />
                  <circle cx={cx + 10} cy={plateTop + 19} r={isHighlighted('porosity') ? '4.5' : '3'} />
                </g>
              )}

              {(jointType === 'T-Joint' || jointType === 'T-Joint (Single Fillet)') && (
                <g fill={isHighlighted('porosity') ? '#fca5a5' : '#cbd5e1'} stroke={isHighlighted('porosity') ? '#ef4444' : '#475569'} strokeWidth="1">
                  {/* Gas pocket clusters inside fillet zones */}
                  <circle cx={cx - pxThickness / 2 - 14} cy={cy - 12} r="2.5" />
                  <circle cx={cx - pxThickness / 2 - 24} cy={cy - 4} r="3" />
                  {jointType === 'T-Joint' && (
                    <>
                      <circle cx={cx + pxThickness / 2 + 14} cy={cy - 12} r="2.5" />
                      <circle cx={cx + pxThickness / 2 + 24} cy={cy - 4} r="3" />
                    </>
                  )}
                </g>
              )}
              {jointType === 'Lap Joint' && (
                <g fill={isHighlighted('porosity') ? '#fca5a5' : '#cbd5e1'} stroke={isHighlighted('porosity') ? '#ef4444' : '#475569'} strokeWidth="1">
                  <circle cx={360 + pxWidth * 0.2} cy={cy - pxWidth * 0.3} r="2.5" />
                  <circle cx={360 + pxWidth * 0.4} cy={cy - pxWidth * 0.15} r="3" />
                </g>
              )}
            </g>
          )}

          {/* 4. SLAG INCLUSION (Irregular dark angular bodies trapped in bead) */}
          {activeSlag && process === 'SMAW' && !isBurnThrough && (
            <g
              id="visual-slag"
              className="cursor-pointer"
              onClick={() => onSelectDefect(selectedDefect === 'slag' ? null : 'slag')}
              onMouseEnter={() => setHoveredRegion('slag')}
              onMouseLeave={() => setHoveredRegion(null)}
            >
              <g fill={isHighlighted('slag') ? '#b45309' : '#1c1917'} stroke={isHighlighted('slag') ? '#f97316' : '#44403c'} strokeWidth="1">
                {/* Jagged slag pockets */}
                {jointType === 'Butt Joint' && (
                  <>
                    <polygon points={`${cx - 24},${plateTop + 10} ${cx - 14},${plateTop + 14} ${cx - 20},${plateTop + 18}`} />
                    <polygon points={`${cx + 14},${plateTop + 18} ${cx + 24},${plateTop + 22} ${cx + 18},${plateTop + 25}`} />
                  </>
                )}
                {(jointType === 'T-Joint' || jointType === 'T-Joint (Single Fillet)') && (
                  <>
                    <polygon points={`${cx - pxThickness / 2 - 20},${cy - 8} ${cx - pxThickness / 2 - 12},${cy - 14} ${cx - pxThickness / 2 - 15},${cy - 4}`} />
                    {jointType === 'T-Joint' && (
                      <polygon points={`${cx + pxThickness / 2 + 20},${cy - 8} ${cx + pxThickness / 2 + 12},${cy - 14} ${cx + pxThickness / 2 + 15},${cy - 4}`} />
                    )}
                  </>
                )}
                {jointType === 'Lap Joint' && (
                  <>
                    <polygon points={`${360 + pxWidth * 0.2},${cy - pxWidth * 0.3} ${360 + pxWidth * 0.3},${cy - pxWidth * 0.4} ${360 + pxWidth * 0.25},${cy - pxWidth * 0.2}`} />
                  </>
                )}
              </g>
            </g>
          )}

          {/* 5. CRACKING (Centerline hot crack or HAZ hydrogen crack lightning line) */}
          {activeCracking && !isBurnThrough && (
            <g
              id="visual-cracking"
              className="cursor-pointer"
              onClick={() => onSelectDefect(selectedDefect === 'cracking' ? null : 'cracking')}
              onMouseEnter={() => setHoveredRegion('cracking')}
              onMouseLeave={() => setHoveredRegion(null)}
            >
              {/* Jagged crack line through center (solidification) */}
              <path
                d={jointType === 'Butt Joint' 
                  ? `M ${cx} ${plateTop - pxWidth * 0.15} L ${cx - 3} ${plateTop + pxPenetration * 0.3} L ${cx + 3} ${plateTop + pxPenetration * 0.6} L ${cx} ${plateTop + pxPenetration * 0.95}`
                  : (jointType === 'T-Joint' || jointType === 'T-Joint (Single Fillet)')
                  ? `M ${cx - pxThickness / 2 - pxWidth * 0.3} ${cy - pxWidth * 0.3} L ${cx - pxThickness / 2 - pxWidth * 0.2} ${cy - pxWidth * 0.15} L ${cx - pxThickness / 2 - pxWidth * 0.4} ${cy}`
                  : `M ${360 + pxWidth * 0.1} ${cy - pxWidth * 0.6} L ${360 + pxWidth * 0.3} ${cy - pxWidth * 0.4} L ${360 + pxWidth * 0.2} ${cy - pxWidth * 0.2}`}
                fill="none"
                stroke={isHighlighted('cracking') ? '#f43f5e' : '#e11d48'}
                strokeWidth={isHighlighted('cracking') ? '3.5' : '2'}
                className="animate-pulse"
              />
              {/* Secondary hairline branch */}
              {jointType === 'Butt Joint' && (
                <path
                  d={`M ${cx - 3} ${plateTop + pxPenetration * 0.3} L ${cx - 12} ${plateTop + pxPenetration * 0.45}`}
                  fill="none"
                  stroke={isHighlighted('cracking') ? '#f43f5e' : '#e11d48'}
                  strokeWidth="1.2"
                />
              )}
            </g>
          )}
          {/* ==================== GAS SHIELDING CLOUD ==================== */}
          <g id="gas-shielding" style={{ pointerEvents: 'none' }}>
            <ellipse
              cx={jointType === 'Lap Joint' ? 360 : cx}
              cy={cy - 20}
              rx={Math.max(10, parameters.gasFlow * 4)}
              ry={Math.max(10, parameters.gasFlow * 2.5)}
              fill="url(#gas-cloud-grad)"
              className="animate-pulse"
              opacity={Math.min(0.8, parameters.gasFlow / 20)}
              style={{ mixBlendMode: 'screen', transition: 'all 0.5s ease' }}
            />
          </g>
        </svg>

        {/* Labels overlay */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-1 text-[11px] font-mono text-slate-500 bg-slate-950/80 px-2 py-1.5 rounded border border-slate-900">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-slate-700 border border-slate-600 rounded-sm inline-block" />
            <span>Base Plate ({parameters.material})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-gradient-to-b from-orange-500 to-slate-600 border border-amber-700 rounded-sm inline-block" />
            <span>Solidified Weld Bead</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-red-600 opacity-60 rounded-sm inline-block" />
            <span>Heat Affected Zone (HAZ)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-sky-400 opacity-40 rounded-full inline-block" />
            <span>Gas Shielding Cloud</span>
          </div>
        </div>

        {/* Highlight Banner */}
        {(selectedDefect || hoveredRegion) && (
          <div className="absolute top-3 left-3 bg-rose-950/90 border border-rose-500/30 text-rose-200 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 animate-bounce">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Inspecting: {selectedDefect ? defects.find(d => d.id === selectedDefect)?.name : defects.find(d => d.id === hoveredRegion)?.name}</span>
          </div>
        )}
      </div>

      {/* Quick Visual Warnings */}
      {isBurnThrough && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl text-red-200" id="burn-through-alert">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-sm">Critical Blowout: Burn-Through Detected!</span>
            <span className="text-xs text-red-300">The heat input ({heatInput} kJ/mm) is far too intense for a {thickness}mm plate. The arc has melted completely through the root, causing total structural failure. Reduce current, or increase travel speed.</span>
          </div>
        </div>
      )}

      {/* Interactive Helper Hint */}
      {!isBurnThrough && (
        <div className="text-xs text-slate-400 flex items-center justify-between gap-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Tip: Click on defective areas in the diagram to inspect industry codes and mitigation steps.</span>
          </span>
          {selectedDefect && (
            <button
              onClick={() => onSelectDefect(null)}
              className="text-amber-500 hover:text-amber-400 font-mono text-[10px] uppercase font-bold tracking-wider"
              id="clear-selection-btn"
            >
              Clear Inspector
            </button>
          )}
        </div>
      )}
    </div>
  );
};
