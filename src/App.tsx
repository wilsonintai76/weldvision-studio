import { useState, useMemo } from 'react';
import { WeldParameters } from './types';
import { WeldingControls } from './components/WeldingControls';
import { ModelViewer3D } from './components/ModelViewer3D';
import { simulateWelding } from './utils/simulation';
import { LandingPage } from './components/LandingPage';
import { WeldVisionStudio } from './components/WeldVisionStudio';
import { useAuth } from './context/AuthContext';
import { LogOut, Flame, Settings } from 'lucide-react';

const DEFAULTS: WeldParameters = {
  material: 'Carbon Steel', process: 'GMAW', jointType: 'Butt Joint',
  restraint: 'Medium', thickness: 8, current: 180, voltage: 24,
  speed: 6.5, preheat: 20, gasFlow: 14, electrodeDiameter: 0.9,
};

export default function App() {
  const { user, logout } = useAuth();
  const [hasStarted, setHasStarted] = useState(false);
  const [isWorkshopMode, setIsWorkshopMode] = useState(true);
  const [params, setParams] = useState<WeldParameters>(DEFAULTS);
  const sim = useMemo(() => simulateWelding(params), [params]);

  if (!hasStarted) {
    return <LandingPage onStart={() => setHasStarted(true)} />;
  }

  // ── Workshop Mode ──
  if (isWorkshopMode) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <header className="h-12 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-500 rounded flex items-center justify-center">
              <Flame className="w-3.5 h-3.5 text-slate-900" />
            </div>
            <span className="text-sm font-bold">WeldVision<span className="text-amber-500">Studio</span></span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsWorkshopMode(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-700/50 border border-slate-600">
              Analysis
            </button>
            <button onClick={() => { setHasStarted(false); logout(); }}
              className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1">
              <LogOut className="w-3 h-3" /> Sign Out
            </button>
            <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-slate-950">
              {user?.name?.charAt(0) || 'I'}
            </div>
          </div>
        </header>
        <WeldVisionStudio>
          <ModelViewer3D parameters={params} distortion={sim.distortion} heatInput={sim.heatInput} />
        </WeldVisionStudio>
      </div>
    );
  }

  // ── Analysis Mode ──
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="h-12 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-amber-500 rounded flex items-center justify-center">
            <Settings className="w-3.5 h-3.5 text-slate-900" />
          </div>
          <span className="text-sm font-bold">WeldVision<span className="text-amber-500">Studio</span></span>
          <span className="text-[10px] text-slate-500 ml-2">Analysis Mode</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsWorkshopMode(true)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-700/50 border border-slate-600">
            Workshop
          </button>
          <button onClick={() => { setHasStarted(false); logout(); }}
            className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1">
            <LogOut className="w-3 h-3" /> Sign Out
          </button>
          <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-slate-950">
            {user?.name?.charAt(0) || 'I'}
          </div>
        </div>
      </header>
      <div className="flex-1 flex gap-0 overflow-hidden">
        <div className="w-[380px] shrink-0 overflow-y-auto p-4 border-r border-slate-800">
          <WeldingControls parameters={params} onChange={setParams} />
          <div className="mt-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Weld Quality</h3>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black ${sim.overallQualityScore > 85 ? 'text-emerald-400' : sim.overallQualityScore > 60 ? 'text-amber-400' : 'text-red-400'}`}>
                {sim.overallQualityScore}
              </span>
              <span className="text-sm text-slate-500">/100</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="bg-slate-950 rounded-lg p-2">
                <span className="text-slate-500">Heat Input</span>
                <p className="text-slate-200 font-mono">{sim.heatInput} kJ/mm</p>
              </div>
              <div className="bg-slate-950 rounded-lg p-2">
                <span className="text-slate-500">Penetration</span>
                <p className="text-slate-200 font-mono">{sim.weldPenetration} mm</p>
              </div>
            </div>
            {sim.isBurnThrough && (
              <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                ⚠ Burn-through detected
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 p-4">
          <ModelViewer3D parameters={params} distortion={sim.distortion} heatInput={sim.heatInput} />
        </div>
      </div>
    </div>
  );
}
