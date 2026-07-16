import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  X, 
  HelpCircle, 
  CheckCircle, 
  AlertTriangle, 
  TrendingDown, 
  ShieldAlert, 
  Layers, 
  Info,
  Flame,
  Zap,
  Hammer
} from 'lucide-react';

interface DefectItem {
  id: string;
  name: string;
  category: 'Structural' | 'Surface' | 'Internal' | 'Visual';
  severity: 'Minor' | 'Moderate' | 'Critical';
  description: string;
  causes: string[];
  mitigations: string[];
  awsStandard: string;
  metallurgyDetails: string;
}

export const DefectGallery: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDefect, setSelectedDefect] = useState<DefectItem | null>(null);
  const [simulatedDefectType, setSimulatedDefectType] = useState<string>('porosity');

  const defects: DefectItem[] = [
    {
      id: 'porosity',
      name: 'Gas Porosity (Pores)',
      category: 'Internal',
      severity: 'Moderate',
      description: 'Porosity is the formation of tiny gas pockets or voids trapped inside the cooling weld bead. It resembles a sponge-like Swiss-cheese texture and severely degrades the load-carrying capacity of the weldment.',
      causes: [
        'Inadequate or disrupted shielding gas flow rate (drafts/wind blowing away gas cover)',
        'Moisture, rust, grease, or scale on the base metal surfaces',
        'Excessive weld travel speed (gas escapes too slowly as weld freezes)',
        'Contaminated filler metal wire or damp SMAW flux coating'
      ],
      mitigations: [
        'Ensure the gas flow rate is between 12-20 L/min and use wind-blocks/tents',
        'Pre-clean all base metal with wire brush or solvent degreasers',
        'Reduce welding speeds and maintain a consistent torch angle',
        'Store SMAW electrodes in specialized electrode baking ovens'
      ],
      awsStandard: 'AWS D1.1 Clause 6.12: Porosity cannot exceed 1 pore per 100mm of weld bead; max diameter is restricted to 1.6mm.',
      metallurgyDetails: 'When dissolved nitrogen, oxygen, or hydrogen exceed solubility limits in molten iron, they nucleate as gas bubbles. Rapid solidification traps these bubbles before they can float to the surface.'
    },
    {
      id: 'undercut',
      name: 'Weld Edge Undercut',
      category: 'Surface',
      severity: 'Moderate',
      description: 'An undercut is an eroded groove or channel melted into the base metal at the toe (edge) of the weld, left unfilled by the filler metal. This creates a severe notch effect, acting as a stress concentration point.',
      causes: [
        'Excessively high welding current (too hot) which melts the plate corners too rapidly',
        'Too fast travel speed (filler metal does not have time to wash back into the corners)',
        'Incorrect torch angle (pointing too much towards one side)',
        'Excessively long arc length / voltage'
      ],
      mitigations: [
        'Lower the welding machine amperage and/or voltage',
        'Slow down the travel speed to let the weld pool flow into the toe lines',
        'Keep the torch angle close to 45° for fillet welds and weave slightly',
        'Maintain a short, tight arc length'
      ],
      awsStandard: 'AWS D1.1 Table 6.1: For materials under 25mm thick, the undercut depth must not exceed 1.0mm; strictly prohibited to exceed 1.6mm.',
      metallurgyDetails: 'High localized heat input combined with surface tension gradients (Marangoni effect) washes liquid steel outward. If the heat source is removed too quickly, the liquid fails to backflow and solidify in the groove.'
    },
    {
      id: 'cracking',
      name: 'Longitudinal Centerline Crack',
      category: 'Structural',
      severity: 'Critical',
      description: 'Centerline cracks run along the center axis of the weld bead. This is a critical structural failure mode, occurring during cooling due to high contraction stress in highly restrained joints.',
      causes: [
        'High restraint levels on the plates (no room for thermal contraction)',
        'Incorrect bead shape (excessive depth-to-width ratio, e.g. "pear-shaped" bead)',
        'Incompatible filler metal with high carbon or impurity pickup from base metal',
        'Rapid cooling rates in thick plates'
      ],
      mitigations: [
        'Provide preheating (e.g. 150-200°C) to slow the cooling rate',
        'Optimize joint fit-up geometry to create wide, shallow beads',
        'Use low-hydrogen electrodes (such as E7018) to minimize hydrogen cracking risk',
        'Allow flexible clamping or sequence weld runs differently'
      ],
      awsStandard: 'AWS D1.1 Clause 6.12.1: CRACKS OF ANY NATURE ARE STRICTLY UNACCEPTABLE. Requires immediate gouging, grinding, and re-welding.',
      metallurgyDetails: 'Occurs as hot cracking (solidification cracking) when low-melting-point liquid segregates to the center grain boundary during dendritic solidification. High tensile stress tears these weak liquid-films apart.'
    },
    {
      id: 'fusion',
      name: 'Lack of Fusion / Penetration',
      category: 'Internal',
      severity: 'Critical',
      description: 'Lack of fusion is the failure of the weld metal to merge completely with the base metal or preceding weld passes. Incomplete penetration occurs when the weld joint root is left completely un-melted.',
      causes: [
        'Too low heat input (low amperage or voltage setting)',
        'Incorrect torch angle or aiming away from the joint center',
        'Extremely fast travel speed where the arc skips over cold base metal',
        'Excessive weld groove scale or oxidation'
      ],
      mitigations: [
        'Increase welding current (amperage) and/or arc voltage',
        'Improve torch manipulation to heat both groove face walls evenly',
        'Slow down travel speed and hold the arc on the leading edge of the puddle',
        'Thoroughly grind away root-face scale before welding'
      ],
      awsStandard: 'AWS D1.1 Section 6.12.2: Incomplete root penetration is restricted to a maximum aggregate length of 25mm in any 300mm of weld.',
      metallurgyDetails: 'If the base metal surface temperature fails to reach its melting point before the liquid puddle covers it, no true metallic bond is established. The weld metal simply sits on cold steel, held by weak friction.'
    },
    {
      id: 'slag',
      name: 'Slag Inclusions',
      category: 'Internal',
      severity: 'Minor',
      description: 'Slag inclusions are non-metallic oxides and slag residues trapped between weld passes or inside the weld bead. Common in SMAW (Stick) and FCAW processes where molten flux floats to protect the pool.',
      causes: [
        'Failure to clean slag between passes (dirty weld runs)',
        'Incorrect torch angle causing the molten slag to run ahead of the weld pool',
        'Too low welding current where the slag remains too viscous to float out',
        'Uneven bead shape creating tight crevices that trap slag'
      ],
      mitigations: [
        'Vigorously chip and wire-brush all slag before starting a new weld pass',
        'Tilt torch so the arc blow forces slag behind the weld puddle',
        'Increase current to keep the pool fluid longer, letting slag float to the top',
        'Maintain smooth bead contours'
      ],
      awsStandard: 'AWS D1.1 Table 6.1: Slag inclusions are restricted to a maximum length of 6.0mm and must be separated by at least 3 times their length.',
      metallurgyDetails: 'Slag has a lower density and lower melting point than steel, so it floats. However, if solidified steel encapsulates the viscous flux due to uneven cooling, it remains trapped as an internal oxide defect.'
    },
    {
      id: 'spatter',
      name: 'Excessive Metallic Spatter',
      category: 'Visual',
      severity: 'Minor',
      description: 'Spatter consists of tiny metal droplets expelled from the welding arc that fuse to the surrounding plate surfaces. While mostly an aesthetic issue, it can damage nearby threads or harbor corrosion.',
      causes: [
        'Incorrect shielding gas mix (e.g. 100% CO2 causes harsh, spattery transfer)',
        'Excessively long arc length / high voltage',
        'Magnetic arc blow (welding currents creating strong asymmetrical magnetic forces)',
        'Damp or dirty filler metal wire'
      ],
      mitigations: [
        'Switch to an Argon/CO2 blend (e.g. 75/25) for smoother spray transfer',
        'Reduce voltage/arc length to stabilize the metal droplet stream',
        'Rearrange the ground clamp to counteract magnetic arc blow forces',
        'Use clean wire and apply anti-spatter spray'
      ],
      awsStandard: 'AWS D1.1 Visual Standards: Excessive spatter must be removed. All spatter must be cleaned before paint/protective coatings are applied.',
      metallurgyDetails: 'Occurs when the liquid metal droplet transfer becomes unstable, short-circuiting violently or getting blown sideways by plasma-jet forces, dispersing liquid iron droplets outward.'
    }
  ];

  const filteredDefects = defects.filter(d => {
    const matchesCategory = selectedCategory === 'All' || d.category === selectedCategory;
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-full text-slate-100" id="defect-gallery-panel">
      
      {/* Header banner */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-500" />
          <div className="flex flex-col">
            <h2 className="font-display font-semibold text-base text-slate-100">
              Defect Reference Gallery &amp; Interactive Simulator
            </h2>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
              AWS D1.1 Structural Welding Standards Inspection Lab
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: INTERACTIVE ILLUSTRATIVE SEAM VISUALIZER */}
      <div className="p-5 bg-slate-950 border-b border-slate-800">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-500" />
          1. Dynamic Seam Defect Visualizer (Select Defect type below to observe graphic)
        </h3>

        {/* The simulated graphic of the weld seam */}
        <div className="w-full bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[170px]">
          
          {/* Seam Background Line */}
          <div className="absolute w-full h-[2px] bg-slate-800 top-1/2 left-0 -translate-y-1/2 z-0" />

          {/* SVG representation of Weld Seam + Selected Defect */}
          <svg className="w-full max-w-[650px] h-[100px] relative z-10" viewBox="0 0 600 100">
            {/* Base Plates (Slate boundaries) */}
            <rect x="0" y="35" width="600" height="30" fill="#1e293b" rx="2" stroke="#334155" strokeWidth="1" />
            <line x1="0" y1="50" x2="600" y2="50" stroke="#0f172a" strokeWidth="2" strokeDasharray="5,5" />

            {/* Weld Bead Ripple Pattern */}
            <path 
              d="M 10 50 Q 15 35 20 50 Q 25 35 30 50 Q 35 35 40 50 Q 45 35 50 50 Q 55 35 60 50 Q 65 35 70 50 Q 75 35 80 50 Q 85 35 90 50 Q 95 35 100 50 Q 105 35 110 50 Q 115 35 120 50 Q 125 35 130 50 Q 135 35 140 50 Q 145 35 150 50 Q 155 35 160 50 Q 165 35 170 50 Q 175 35 180 50 Q 185 35 190 50 Q 195 35 200 50 Q 205 35 210 50 Q 215 35 220 50 Q 225 35 230 50 Q 235 35 240 50 Q 245 35 250 50 Q 255 35 260 50 Q 265 35 270 50 Q 275 35 280 50 Q 285 35 290 50 Q 295 35 300 50 Q 305 35 310 50 Q 315 35 320 50 Q 325 35 330 50 Q 335 35 340 50 Q 345 35 350 50 Q 355 35 360 50 Q 365 35 370 50 Q 375 35 380 50 Q 385 35 390 50 Q 395 35 400 50 Q 405 35 410 50 Q 415 35 420 50 Q 425 35 430 50 Q 435 35 440 50 Q 445 35 450 50 Q 455 35 460 50 Q 465 35 470 50 Q 475 35 480 50 Q 485 35 490 50 Q 495 35 500 50 Q 505 35 510 50 Q 515 35 520 50 Q 525 35 530 50 Q 535 35 540 50 Q 545 35 550 50 Q 555 35 560 50 Q 565 35 570 50 Q 575 35 580 50 Q 585 35 590 50" 
              fill="none" 
              stroke="#64748b" 
              strokeWidth="12" 
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.85"
            />

            {/* DEFECT GRAPHICS RENDERING */}
            {simulatedDefectType === 'porosity' && (
              <g id="visual-porosity">
                {/* Little cluster holes along center */}
                <circle cx="150" cy="50" r="2.5" fill="#090d16" stroke="#f59e0b" strokeWidth="0.5" />
                <circle cx="156" cy="46" r="1.5" fill="#090d16" stroke="#f59e0b" strokeWidth="0.5" />
                <circle cx="144" cy="54" r="2.0" fill="#090d16" stroke="#f59e0b" strokeWidth="0.5" />
                <circle cx="162" cy="52" r="1.2" fill="#090d16" stroke="#f59e0b" strokeWidth="0.5" />
                <circle cx="138" cy="48" r="1.8" fill="#090d16" stroke="#f59e0b" strokeWidth="0.5" />

                <circle cx="340" cy="48" r="2.2" fill="#090d16" stroke="#f59e0b" strokeWidth="0.5" />
                <circle cx="348" cy="54" r="1.6" fill="#090d16" stroke="#f59e0b" strokeWidth="0.5" />
                <circle cx="332" cy="50" r="2.8" fill="#090d16" stroke="#f59e0b" strokeWidth="0.5" />

                <text x="120" y="25" fill="#f59e0b" fontSize="9" fontFamily="monospace" fontWeight="bold">GAS VOIDS (POROSITY)</text>
              </g>
            )}

            {simulatedDefectType === 'undercut' && (
              <g id="visual-undercut">
                {/* Red/dark grooves eaten into the edges of the weld bead */}
                <path d="M 80 43 L 180 43" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
                <path d="M 280 57 L 380 57" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
                
                <text x="80" y="25" fill="#f43f5e" fontSize="9" fontFamily="monospace" fontWeight="bold">PLATE TOE GROOVE (UNDERCUT)</text>
              </g>
            )}

            {simulatedDefectType === 'cracking' && (
              <g id="visual-cracking">
                {/* Jagged red hairline centerline crack */}
                <path 
                  d="M 210 50 L 225 48 L 235 52 L 255 49 L 270 53 L 285 50 L 305 52 L 320 48" 
                  fill="none" 
                  stroke="#ef4444" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Glow behind crack */}
                <path 
                  d="M 210 50 L 225 48 L 235 52 L 255 49 L 270 53 L 285 50 L 305 52 L 320 48" 
                  fill="none" 
                  stroke="#ef4444" 
                  strokeWidth="6" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.3"
                />
                <text x="210" y="25" fill="#ef4444" fontSize="9" fontFamily="monospace" fontWeight="bold">CENTERLINE TRANSVERSE CRACK (CRITICAL)</text>
              </g>
            )}

            {simulatedDefectType === 'fusion' && (
              <g id="visual-fusion">
                {/* Highlight un-melted root zones along center */}
                <line x1="180" y1="50" x2="420" y2="50" stroke="#f43f5e" strokeWidth="4" strokeDasharray="12,6" />
                <text x="180" y="25" fill="#f43f5e" fontSize="9" fontFamily="monospace" fontWeight="bold">INCOMPLETE SEAM FUSION / PENETRATION</text>
              </g>
            )}

            {simulatedDefectType === 'slag' && (
              <g id="visual-slag">
                {/* Trapped glass-like grey flux inclusions */}
                <rect x="220" y="46" width="18" height="7" rx="3" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                <rect x="245" y="48" width="12" height="5" rx="2" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                <rect x="390" y="45" width="22" height="8" rx="4" fill="#334155" stroke="#94a3b8" strokeWidth="1" />
                <text x="220" y="25" fill="#94a3b8" fontSize="9" fontFamily="monospace" fontWeight="bold">TRAPPED OXIDE RESIDUE (SLAG)</text>
              </g>
            )}

            {simulatedDefectType === 'spatter' && (
              <g id="visual-spatter">
                {/* Droplets scattered outside weld zone */}
                <circle cx="80" cy="20" r="1.5" fill="#f59e0b" />
                <circle cx="105" cy="72" r="1.0" fill="#f59e0b" />
                <circle cx="140" cy="25" r="1.8" fill="#f59e0b" />
                <circle cx="210" cy="78" r="1.2" fill="#f59e0b" />
                <circle cx="280" cy="22" r="2.0" fill="#f59e0b" />
                <circle cx="310" cy="74" r="1.5" fill="#f59e0b" />
                <circle cx="450" cy="18" r="1.0" fill="#f59e0b" />
                <circle cx="490" cy="79" r="2.2" fill="#f59e0b" />
                
                <text x="240" y="25" fill="#f59e0b" fontSize="9" fontFamily="monospace" fontWeight="bold">METALLIC DROPS (SPATTER)</text>
              </g>
            )}
          </svg>

          {/* Selector Button Row */}
          <div className="flex flex-wrap gap-2.5 mt-2.5 z-20">
            {defects.map((def) => (
              <button
                key={def.id}
                onClick={() => setSimulatedDefectType(def.id)}
                className={`px-3 py-1 rounded-lg text-[10px] font-mono uppercase font-bold border transition-all ${
                  simulatedDefectType === def.id 
                    ? 'bg-amber-500 border-amber-500 text-slate-950' 
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {def.name.split(' (')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 2: THE COMPREHENSIVE CARD REFERENCE GRID */}
      <div className="p-6 flex-1 flex flex-col gap-4">
        
        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search defect index..."
              className="bg-transparent text-xs text-white placeholder-slate-500 outline-none w-full"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto p-0.5">
            {['All', 'Structural', 'Surface', 'Internal', 'Visual'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-950/60 border border-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* The Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredDefects.map((def) => {
            let severityBadge = 'bg-red-500/10 text-red-400 border-red-500/20';
            if (def.severity === 'Moderate') severityBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            if (def.severity === 'Minor') severityBadge = 'bg-blue-500/10 text-blue-400 border-blue-500/20';

            return (
              <div
                key={def.id}
                onClick={() => setSelectedDefect(def)}
                className="bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-4 flex flex-col justify-between gap-4 cursor-pointer transition-all hover:scale-[1.01] duration-150 group"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">
                      {def.category}
                    </span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${severityBadge}`}>
                      {def.severity}
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-sm text-slate-100 group-hover:text-amber-400 transition-colors">
                    {def.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-normal line-clamp-3">
                    {def.description}
                  </p>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-900 pt-2 font-mono">
                  <span>AWS Limit Standard</span>
                  <span className="text-amber-500 font-bold group-hover:underline flex items-center gap-0.5">
                    View Details →
                  </span>
                </div>
              </div>
            );
          })}

          {filteredDefects.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center text-slate-500">
              <Search className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm">No defects found matching your query.</p>
            </div>
          )}
        </div>
      </div>

      {/* DETAIL INSPECTION MODAL */}
      {selectedDefect && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div 
            className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Close Button */}
            <button
              onClick={() => setSelectedDefect(null)}
              className="absolute top-4 right-4 p-1 bg-slate-900 border border-slate-800 rounded-lg hover:text-white transition text-slate-400 z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Body */}
            <div className="p-6 md:p-8 flex flex-col gap-6">
              
              {/* Header block */}
              <div className="flex flex-col gap-1.5 border-b border-slate-800 pb-4 pr-8">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-amber-500 uppercase tracking-widest font-bold">
                    {selectedDefect.category} Category
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    selectedDefect.severity === 'Critical' 
                      ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                      : selectedDefect.severity === 'Moderate' 
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>
                    {selectedDefect.severity}
                  </span>
                </div>
                <h3 className="text-xl font-bold font-display text-white">{selectedDefect.name}</h3>
              </div>

              {/* Physical description */}
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-amber-500" />
                  PHYSICAL DESCRIPTION
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {selectedDefect.description}
                </p>
              </div>

              {/* Metallurgy details */}
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-col gap-1.5">
                <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  METALLURGICAL MECHANICS
                </span>
                <p className="text-xs text-slate-400 leading-relaxed italic">
                  {selectedDefect.metallurgyDetails}
                </p>
              </div>

              {/* Grid: Causes vs Mitigations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Causes */}
                <div className="bg-red-950/10 border border-red-900/20 p-4 rounded-xl flex flex-col gap-2">
                  <span className="text-[11px] font-mono text-red-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    PRIMARY CAUSES
                  </span>
                  <ul className="list-disc list-inside text-xs text-slate-400 flex flex-col gap-1.5 pl-1 leading-normal">
                    {selectedDefect.causes.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>

                {/* Mitigations */}
                <div className="bg-emerald-950/10 border border-emerald-900/20 p-4 rounded-xl flex flex-col gap-2">
                  <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <Hammer className="w-3.5 h-3.5" />
                    MITIGATIONS / WORKSHOP LIMITS
                  </span>
                  <ul className="list-disc list-inside text-xs text-slate-400 flex flex-col gap-1.5 pl-1 leading-normal">
                    {selectedDefect.mitigations.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* AWS Standard Limits */}
              <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-300">AWS Code Limit Standard:</strong> {selectedDefect.awsStandard}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
