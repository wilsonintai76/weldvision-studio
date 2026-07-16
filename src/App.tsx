import { useState, useMemo } from 'react';
import { WeldParameters } from './types';
import { ModelViewer3D } from './components/ModelViewer3D';
import { simulateWelding } from './utils/simulation';
import { LandingPage } from './components/LandingPage';
import { useAuth } from './context/AuthContext';
import { LogOut, Flame } from 'lucide-react';

const DEFAULTS: WeldParameters = {
  material: 'Carbon Steel', process: 'GMAW', jointType: 'Butt Joint',
  restraint: 'Medium', thickness: 8, current: 180, voltage: 24,
  speed: 6.5, preheat: 20, gasFlow: 14, electrodeDiameter: 0.9,
};

export default function App() {
  const { user, logout } = useAuth();
  const [hasStarted, setHasStarted] = useState(false);
  const [params] = useState<WeldParameters>(DEFAULTS);
  const sim = useMemo(() => simulateWelding(params), [params]);

  if (!hasStarted) return <LandingPage onStart={() => setHasStarted(true)} />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="h-12 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold">WeldVision<span className="text-amber-500">Studio</span></span>
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Live Workshop</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setHasStarted(false); logout(); }}
            className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1">
            <LogOut className="w-3 h-3" /> Sign Out
          </button>
          <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-xs font-bold text-slate-950">
            {user?.name?.charAt(0) || 'I'}
          </div>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar: read-only info panel */}
        <div className="w-[340px] shrink-0 overflow-y-auto p-4 border-r border-slate-800">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Live Parameters</h2>
            <div className="space-y-2.5 text-xs">
              {[
                ['Voltage', `${params.voltage} V`],
                ['Amperage', `${params.current} A`],
                ['Wire Speed', `${Math.round((params.current - 10) / 0.55)} IPM`],
                ['Gas Flow', `${params.gasFlow} L/min`],
                ['Thickness', `${params.thickness} mm`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-mono text-amber-400">{value}</span>
                </div>
              ))}
              <hr className="border-slate-800" />
              <div className="flex justify-between font-bold">
                <span className="text-slate-400">Quality</span>
                <span className={`font-mono text-lg ${sim.overallQualityScore > 85 ? 'text-emerald-400' : sim.overallQualityScore > 60 ? 'text-amber-400' : 'text-red-400'}`}>
                  {sim.overallQualityScore}/100
                </span>
              </div>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Workshop Info</h2>
            <div className="space-y-2 text-xs">
              {[
                ['Material', 'Carbon Steel (A36)'],
                ['Joint', 'Butt Joint (1G)'],
                ['Process', 'GMAW (MIG) · CV'],
              ].map(([label, value]) => (
                <div key={label} className="bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">
                  <span className="text-slate-500">{label}</span>
                  <p className="text-slate-300">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Right: 3D viewport */}
        <div className="flex-1">
          <ModelViewer3D parameters={params} distortion={sim.distortion} heatInput={sim.heatInput} />
        </div>
      </div>
    </div>
  );
}
