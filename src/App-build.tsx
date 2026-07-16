import { useState, useMemo } from 'react';
import { WeldParameters } from './types';
import { WeldingControls } from './components/WeldingControls';
import { simulateWelding } from './utils/simulation';
import { LandingPage } from './components/LandingPage';
import { useAuth } from './context/AuthContext';

const DEFAULTS: WeldParameters = {
  material: 'Carbon Steel', process: 'GMAW', jointType: 'Butt Joint',
  restraint: 'Medium', thickness: 8, current: 180, voltage: 24,
  speed: 6.5, preheat: 20, gasFlow: 14, electrodeDiameter: 0.9,
};

export default function App() {
  const { user, logout } = useAuth();
  const [hasStarted, setHasStarted] = useState(false);
  const [params, setParams] = useState(DEFAULTS);
  const sim = useMemo(() => simulateWelding(params), [params]);

  if (!hasStarted) return <LandingPage onStart={() => setHasStarted(true)} />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 max-w-[500px] mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold">Step 1: Controls</h1>
        <button onClick={() => { setHasStarted(false); logout(); }}
          className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded text-sm">
          Sign Out
        </button>
      </div>
      <WeldingControls parameters={params} onChange={setParams} />
      <div className="mt-4 text-sm text-slate-400">
        Heat: {sim.heatInput} kJ/mm | Score: {sim.overallQualityScore}/100
      </div>
    </div>
  );
}
