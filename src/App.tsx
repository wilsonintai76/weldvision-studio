import { useState, useMemo } from 'react';
import { WeldParameters } from './types';
import { WeldingControls } from './components/WeldingControls';
import { ModelViewer3D } from './components/ModelViewer3D';
import { simulateWelding } from './utils/simulation';
import { LandingPage } from './components/LandingPage';
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

  // ── Workshop Mode (3D disabled for testing) ──
  if (isWorkshopMode) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <header className="h-12 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold">WeldVision<span className="text-amber-500">Studio</span></span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsWorkshopMode(false)} className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-700/50 border border-slate-600">Analysis</button>
            <button onClick={() => { setHasStarted(false); logout(); }} className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1"><LogOut className="w-3 h-3" /> Sign Out</button>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Flame className="w-16 h-16 text-amber-500 mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-bold mb-2">Live Workshop</h2>
            <p className="text-slate-500">Waiting for Android Trainer connection via MQTT...</p>
            <p className="text-[10px] text-slate-600 mt-2">3D viewer disabled for testing — no React errors</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Analysis Mode ──
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="h-12 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold">WeldVision<span className="text-amber-500">Studio</span></span>
          <span className="text-[10px] text-slate-500 ml-2">Analysis Mode</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsWorkshopMode(true)} className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-700/50 border border-slate-600">Workshop</button>
          <button onClick={() => { setHasStarted(false); logout(); }} className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1"><LogOut className="w-3 h-3" /> Sign Out</button>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-[380px] shrink-0 overflow-y-auto p-4 border-r border-slate-800">
          <WeldingControls parameters={params} onChange={setParams} />
          <div className="mt-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Weld Quality</h3>
            <span className={`text-3xl font-black ${sim.overallQualityScore > 85 ? 'text-emerald-400' : sim.overallQualityScore > 60 ? 'text-amber-400' : 'text-red-400'}`}>{sim.overallQualityScore}/100</span>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="bg-slate-950 rounded-lg p-2"><span className="text-slate-500">Heat</span><p className="text-slate-200 font-mono">{sim.heatInput} kJ/mm</p></div>
              <div className="bg-slate-950 rounded-lg p-2"><span className="text-slate-500">Width</span><p className="text-slate-200 font-mono">{sim.weldWidth} mm</p></div>
            </div>
            {sim.isBurnThrough && <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">⚠ Burn-through detected</div>}
          </div>
        </div>
        <div className="flex-1 p-4">
          <ModelViewer3D parameters={params} distortion={sim.distortion} heatInput={sim.heatInput} />
        </div>
      </div>
    </div>
  );
}
