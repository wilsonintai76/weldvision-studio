import { useState, useMemo, useEffect } from 'react';
import { WeldParameters, LabPreset } from './types';
import { WeldingControls } from './components/WeldingControls';
import { JointVisualizer } from './components/JointVisualizer';
import { DistortionVisualizer } from './components/DistortionVisualizer';
import { DefectAnalyzer } from './components/DefectAnalyzer';
import { WeldingLabPresets } from './components/WeldingLabPresets';
import { ModelViewer3D } from './components/ModelViewer3D';
import { DefectGallery } from './components/DefectGallery';
import { WeldQuiz } from './components/WeldQuiz';
import { AudioToggle } from './components/AudioToggle';
import { simulateWelding } from './utils/simulation';
import { motion, AnimatePresence } from 'motion/react';
import { LandingPage } from './components/LandingPage';
import { 
  Flame, 
  Layers, 
  HelpCircle, 
  Info, 
  ChevronRight, 
  TrendingUp, 
  Clock, 
  Sparkles, 
  RotateCcw,
  BookOpen,
  Rotate3d,
  Trophy,
  X,
  LogOut
} from 'lucide-react';

const DEFAULT_PARAMETERS: WeldParameters = {
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
  electrodeDiameter: 3.2,
};

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [parameters, setParameters] = useState<WeldParameters>(DEFAULT_PARAMETERS);
  const [selectedDefect, setSelectedDefect] = useState<string | null>(null);
  const [activePresetId, setActivePresetId] = useState<string | null>('perfect');
  const [activeTab, setActiveTab] = useState<'bead' | 'distortion' | '3d' | 'gallery' | 'quiz'>('bead');

  // Inactivity timeout logic
  useEffect(() => {
    if (!hasStarted) return;
    
    const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setHasStarted(false);
      }, INACTIVITY_LIMIT);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(name => document.addEventListener(name, resetTimer, true));
    
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(name => document.removeEventListener(name, resetTimer, true));
    };
  }, [hasStarted]);

  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const tooltips = {
    heatInput: {
      title: "Heat Input Rate (kJ/mm)",
      description: "Thermal energy delivered per unit length. Higher heat improves fusion but increases distortion and burn-through risk."
    },
    beadWidth: {
      title: "Bead Width (mm)",
      description: "The lateral span of the solidified weld pool. Controlled primarily by arc voltage and travel speed."
    },
    penetration: {
      title: "Root Penetration (mm)",
      description: "Depth of fusion into the base metal. Critical for structural integrity and load-bearing capacity."
    },
    quench: {
      title: "Quench Index (CR)",
      description: "Relative cooling rate of the Heat Affected Zone. Fast cooling can cause brittle martensite formation."
    }
  };

  const MetricCard = ({ id, icon: Icon, colorClass, label, value, subValue, tooltipKey }: any) => (
    <div 
      className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3 md:p-4 flex items-center gap-3 md:gap-4 shadow-md relative group cursor-help"
      onClick={() => setActiveTooltip(activeTooltip === tooltipKey ? null : tooltipKey)}
      onMouseEnter={() => setActiveTooltip(tooltipKey)}
      onMouseLeave={() => setActiveTooltip(null)}
      id={id}
    >
      <div className={`p-2.5 md:p-3 ${colorClass} rounded-xl shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider truncate">{label}</span>
          <Info className="w-2.5 h-2.5 text-slate-600" />
        </div>
        <motion.div 
          key={label + value}
          initial={{ opacity: 0.6, x: -2 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="text-base md:text-lg font-display font-bold text-slate-100"
        >
          {value}
        </motion.div>
        <motion.span 
          key={label + subValue.text}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`text-[9px] font-mono font-bold mt-1 px-1.5 py-0.5 rounded border self-start truncate max-w-full ${subValue.class}`}
        >
          {subValue.text}
        </motion.span>
      </div>

      <AnimatePresence>
        {activeTooltip === tooltipKey && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute z-50 bottom-full left-0 right-0 mb-3 p-3 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl pointer-events-none sm:w-64 sm:left-1/2 sm:-translate-x-1/2"
          >
            <div className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-1">
              {tooltips[tooltipKey as keyof typeof tooltips].title}
            </div>
            <p className="text-[12px] text-slate-300 leading-snug font-normal">
              {tooltips[tooltipKey as keyof typeof tooltips].description}
            </p>
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 border-r border-b border-slate-700 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // Recalculate welding simulation on parameter change
  const simulation = useMemo(() => {
    return simulateWelding(parameters);
  }, [parameters]);

  const handleParameterChange = (newParams: WeldParameters) => {
    setParameters(newParams);
    setActivePresetId(null); // Clear active preset if user customized values
  };

  const handleSelectPreset = (preset: LabPreset) => {
    setParameters({
      ...DEFAULT_PARAMETERS,
      ...preset.parameters,
    } as WeldParameters);
    setActivePresetId(preset.id);
    setSelectedDefect(null);
  };

  const handleReset = () => {
    setParameters(DEFAULT_PARAMETERS);
    setActivePresetId('perfect');
    setSelectedDefect(null);
  };

  // Helper for thermal rating
  const getHeatInputClass = (hi: number) => {
    if (hi < 0.5) return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
    if (hi > 2.5) return 'text-red-400 bg-red-500/10 border-red-500/20';
    return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  };

  return (
    <AnimatePresence mode="wait">
      {!hasStarted ? (
        <LandingPage key="landing" onStart={() => setHasStarted(true)} />
      ) : (
        <motion.div 
          key="lab"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-6 flex flex-col gap-6 select-none" 
          id="app-root"
        >
          {/* Main Header Row from Professional Polish Theme */}
          <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-3 md:px-6 shrink-0 rounded-t-2xl shadow-lg">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className="w-7 h-7 md:w-8 md:h-8 bg-amber-500 rounded flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 md:w-5 md:h-5 text-slate-900" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z"/></svg>
          </div>
          <h1 className="text-sm md:text-lg font-bold tracking-tight text-white flex items-center shrink-0 truncate">
            WeldSim<span className="text-amber-500 font-normal ml-0.5 md:ml-1">Studio</span>
          </h1>
          <span className="hidden lg:inline-block ml-4 px-2.5 py-0.5 rounded bg-slate-700 text-xs text-slate-300 border border-slate-600 truncate">
            Project: AX-204 Shell Assembly
          </span>
        </div>
        
        <div className="flex items-center gap-3 md:gap-6 shrink-0">
          <div className="flex items-center gap-2 md:gap-4 text-xs sm:text-sm font-semibold">
            <button 
              onClick={() => setHasStarted(false)}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-700/50 border border-slate-600 text-[10px] text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all uppercase tracking-tight"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">Exit Session</span>
            </button>
            <div className="w-[1px] h-4 bg-slate-700 mx-0.5"></div>
            <div className="flex items-center gap-1.5 px-1.5 md:px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-amber-400 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="hidden sm:inline">Analysis Mode</span>
            </div>
            <AudioToggle current={parameters.current} heatInput={simulation.heatInput} />
            <button 
              onClick={handleReset}
              className="text-slate-400 hover:text-white cursor-pointer transition-colors font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Workshop</span>
            </button>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-600 border border-slate-500 flex items-center justify-center text-xs font-bold text-white uppercase">
            AX
          </div>
        </div>
      </header>

      {/* Intro Description banner */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-bold text-white tracking-tight">WELDING DEFECT &amp; DISTORTION MODELER</h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Analyze base metal solidification, localized heat absorption gradients, metallurgical defects, and thermal contraction warps in real time under AWS Structural Codes.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-md text-[11px] text-slate-300 font-mono">ISO 5817-B Compliant</span>
        </div>
      </div>

      {/* Top Level Real-Time Physical Metrics Dashboard */}
      <motion.section 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        id="quick-metrics-dashboard"
      >
        <MetricCard 
          id="metric-heat"
          icon={Flame}
          colorClass="bg-amber-500/10 text-amber-500"
          label="Heat Input Rate"
          value={<>{simulation.heatInput} <span className="text-[10px] md:text-xs text-slate-500 font-mono">kJ/mm</span></>}
          subValue={{
            text: simulation.heatInput < 0.5 ? 'Cold Weld' : simulation.heatInput > 2.5 ? 'Excessive' : 'Ideal Window',
            class: getHeatInputClass(simulation.heatInput)
          }}
          tooltipKey="heatInput"
        />

        <MetricCard 
          id="metric-width"
          icon={Layers}
          colorClass="bg-cyan-500/10 text-cyan-400"
          label="Bead Width"
          value={simulation.isBurnThrough ? 'Blowout' : `${simulation.weldWidth} mm`}
          subValue={{
            text: `Ratio: ${simulation.isBurnThrough ? 'N/A' : (simulation.weldWidth / (simulation.weldPenetration + 0.1)).toFixed(1)}`,
            class: 'text-slate-500'
          }}
          tooltipKey="beadWidth"
        />

        <MetricCard 
          id="metric-pen"
          icon={TrendingUp}
          colorClass="bg-amber-500/10 text-amber-400"
          label="Root Penetration"
          value={simulation.isBurnThrough ? 'Total' : `${simulation.weldPenetration} mm`}
          subValue={{
            text: `Fusion: ${simulation.isBurnThrough ? '100%+' : `${Math.round((simulation.weldPenetration / parameters.thickness) * 100)}%`}`,
            class: 'text-slate-500'
          }}
          tooltipKey="penetration"
        />

        <MetricCard 
          id="metric-quench"
          icon={Clock}
          colorClass="bg-emerald-500/10 text-emerald-400"
          label="Quench Index"
          value={<>{simulation.coolingRate} <span className="text-[10px] md:text-xs text-slate-500 font-mono">CR</span></>}
          subValue={{
            text: simulation.coolingRate > 8 ? 'Rapid Cooling' : simulation.coolingRate < 2 ? 'Slow Cooling' : 'Nominal Anneal',
            class: 'text-slate-500'
          }}
          tooltipKey="quench"
        />
      </motion.section>

      {/* Main Core Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Parameter controls (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <WeldingControls 
            parameters={parameters}
            onChange={handleParameterChange}
          />
        </div>

        {/* Right Column: Visualization Tabs & Analysis (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Diagnostic View Toggles */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-1.5 flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTab('bead')}
              className={`flex-1 min-w-[80px] py-2 px-3 rounded-lg text-xs font-semibold font-display tracking-wide transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activeTab === 'bead'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/40'
              }`}
              id="tab-btn-bead"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bead Profile (2D)</span>
              <span className="inline sm:hidden">Bead</span>
            </button>
            <button
              onClick={() => setActiveTab('distortion')}
              className={`flex-1 min-w-[80px] py-2 px-3 rounded-lg text-xs font-semibold font-display tracking-wide transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activeTab === 'distortion'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/40'
              }`}
              id="tab-btn-distortion"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Warping (2D)</span>
              <span className="inline sm:hidden">Warp</span>
            </button>
            <button
              onClick={() => setActiveTab('3d')}
              className={`flex-1 min-w-[80px] py-2 px-3 rounded-lg text-xs font-semibold font-display tracking-wide transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activeTab === '3d'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/40'
              }`}
              id="tab-btn-3d"
            >
              <Rotate3d className="w-3.5 h-3.5" />
              <span>3D Lab</span>
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              className={`flex-1 min-w-[80px] py-2 px-3 rounded-lg text-xs font-semibold font-display tracking-wide transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activeTab === 'gallery'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/40'
              }`}
              id="tab-btn-gallery"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Defects</span>
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex-1 min-w-[80px] py-2 px-3 rounded-lg text-xs font-semibold font-display tracking-wide transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activeTab === 'quiz'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/40'
              }`}
              id="tab-btn-quiz"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Quiz</span>
            </button>
          </div>

          {/* Active Tab View Window */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            id="tab-viewport"
            className="flex flex-col gap-6"
          >
            {activeTab === 'bead' ? (
              <>
                <JointVisualizer
                  parameters={parameters}
                  simulation={simulation}
                  selectedDefect={selectedDefect}
                  onSelectDefect={setSelectedDefect}
                />
                <DefectAnalyzer
                  defects={simulation.defects}
                  selectedDefect={selectedDefect}
                  onSelectDefect={setSelectedDefect}
                  overallScore={simulation.overallQualityScore}
                />
              </>
            ) : activeTab === 'distortion' ? (
              <>
                <DistortionVisualizer
                  parameters={parameters}
                  distortion={simulation.distortion}
                  heatInput={simulation.heatInput}
                />
                <DefectAnalyzer
                  defects={simulation.defects}
                  selectedDefect={selectedDefect}
                  onSelectDefect={setSelectedDefect}
                  overallScore={simulation.overallQualityScore}
                />
              </>
            ) : activeTab === '3d' ? (
              <ModelViewer3D
                parameters={parameters}
                distortion={simulation.distortion}
                heatInput={simulation.heatInput}
              />
            ) : activeTab === 'gallery' ? (
              <DefectGallery />
            ) : (
              <WeldQuiz />
            )}
          </motion.div>
        </div>

      </div>

      {/* Failure Lab Preset Section (Full Width Footer) */}
      <section className="mt-2">
        <WeldingLabPresets 
          onSelectPreset={handleSelectPreset}
          activePresetId={activePresetId}
        />
      </section>

      {/* Basic Educational Theory/Guide Panel */}
      <footer className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4" id="education-theory-section">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <BookOpen className="w-5 h-5 text-amber-500" />
          <h2 className="font-display font-semibold text-base text-slate-100">
            Welding Metallurgy &amp; Physics Reference
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400 leading-relaxed">
          {/* Concept 1 */}
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-slate-200 flex items-center gap-1">
              <ChevronRight className="w-4 h-4 text-amber-500 shrink-0" />
              1. Heat Input &amp; cooling (T8/5)
            </span>
            <p>
              The **Heat Input Rate (Q)** represents the amount of energy introduced per unit length of weld. High current or low travel speed increases heat absorption, promoting grain growth and thermal distortion, while excessively low heat causes poor sidewall penetration and "lack of fusion".
            </p>
          </div>

          {/* Concept 2 */}
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-slate-200 flex items-center gap-1">
              <ChevronRight className="w-4 h-4 text-amber-500 shrink-0" />
              2. Metallurgical Defects
            </span>
            <p>
              **Undercuts** occur when high heat and speed erode base boundaries without filler replenishment. **Porosity** represents gas bubbles (nitrogen/hydrogen) trapped due to inadequate shielding gas coverage or rapid freezing. **Hydrogen cracks** trigger under severe constraints during quenched cooling.
            </p>
          </div>

          {/* Concept 3 */}
          <div className="flex flex-col gap-1.5">
            <span className="font-semibold text-slate-200 flex items-center gap-1">
              <ChevronRight className="w-4 h-4 text-amber-500 shrink-0" />
              3. The Constraint Dilemma
            </span>
            <p>
              When a hot weldment cools, it shrinks. Without fixture constraints (**Restraint: None**), base plates warp heavily, resulting in angular deflection. Adding heavy constraints (**Restraint: High**) keeps the assembly completely flat, but converts the strain into **intense residual stress**, driving hot/cold cracks.
            </p>
          </div>
        </div>
      </footer>

      {/* Footer Status Bar from Professional Polish Theme */}
      <footer className="h-10 bg-slate-800 border border-slate-700 px-4 flex items-center justify-between text-[10px] text-slate-400 tracking-wide rounded-xl shrink-0">
        <div className="flex gap-4 items-center">
          <span className="flex items-center gap-1.5 font-medium text-emerald-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            SYSTEMS READY
          </span>
          <span className="hidden sm:inline">LASER TEMP: 28°C</span>
          <span className="hidden sm:inline">GAS PRESSURE: 12.4 BAR</span>
        </div>
        <div>
          CONNECTED TO: <span className="text-amber-500 font-mono">WELD-BOT-PRIME-04</span> | LATENCY: 12ms
        </div>
      </footer>
    </motion.div>
  )}
</AnimatePresence>
  );
}
