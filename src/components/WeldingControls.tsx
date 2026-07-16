import React, { useMemo } from 'react';
import { WeldParameters } from '../types';
import { Settings, Zap, Wind, Crosshair } from 'lucide-react';
import { resolveAmperage } from '../utils/gmaw-telemetry';

interface Props {
  parameters: WeldParameters;
  onChange: (p: WeldParameters) => void;
  targetGap?: number;
  targetSpeed?: number;
}

export const WeldingControls: React.FC<Props> = ({ parameters, onChange, targetGap, targetSpeed }) => {
  const set = (f: keyof WeldParameters, v: number) => onChange({ ...parameters, [f]: v });
  const wfs = useMemo(() => Math.round((parameters.current - 10) / 0.55), [parameters.current]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-slate-100 flex flex-col gap-6">
      {/* Setup */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <Settings className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">Setup Parameters</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">
            <span className="text-[9px] font-mono text-slate-500 uppercase">Material</span>
            <p className="text-sm text-slate-300">Carbon Steel (A36)</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">
            <span className="text-[9px] font-mono text-slate-500 uppercase">Joint</span>
            <p className="text-sm text-slate-300">Butt Joint (1G)</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-mono text-slate-500 uppercase">Restraint</span>
              <p className="text-xs text-slate-300">{parameters.restraint === 'Medium' ? 'Soft Clamps' : 'None'}</p>
            </div>
            <button onClick={() => onChange({ ...parameters, restraint: parameters.restraint === 'Medium' ? 'None' : 'Medium' })}
              className={`w-9 h-5 rounded-full transition-colors ${parameters.restraint === 'Medium' ? 'bg-amber-500' : 'bg-slate-600'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${parameters.restraint === 'Medium' ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Material Thickness</span>
            <span className="font-mono text-amber-400 font-bold">{parameters.thickness} mm</span>
          </div>
          <input type="range" min="2" max="20" step="0.5" value={parameters.thickness}
            onChange={(e) => set('thickness', parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-950 rounded-lg accent-amber-500 cursor-pointer" />
        </div>
      </div>

      {/* Machine Settings */}
      <div className="border-t border-slate-800 pt-5">
        <div className="flex items-center gap-1.5 mb-3">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">Machine Settings</span>
        </div>
        <div className="flex flex-col gap-1.5 mb-4">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Voltage</span>
            <span className="font-mono text-amber-400 font-bold">{parameters.voltage} V</span>
          </div>
          <input type="range" min="10" max="35" step="0.5" value={parameters.voltage}
            onChange={(e) => set('voltage', parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-950 rounded-lg accent-amber-500 cursor-pointer" />
        </div>
        <div className="flex flex-col gap-1.5 mb-4">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Amperage / Wire Speed</span>
            <span className="font-mono text-amber-400 font-bold">{parameters.current} A / {wfs} IPM</span>
          </div>
          <input type="range" min="40" max="320" step="5" value={parameters.current}
            onChange={(e) => set('current', parseInt(e.target.value))}
            className="w-full h-2 bg-slate-950 rounded-lg accent-amber-500 cursor-pointer" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5"><Wind className="w-3 h-3 text-cyan-400" />Gas Flow Rate</span>
            <span className="font-mono text-amber-400 font-bold">{parameters.gasFlow} L/min</span>
          </div>
          <input type="range" min="0" max="25" step="1" value={parameters.gasFlow}
            onChange={(e) => set('gasFlow', parseInt(e.target.value))}
            className="w-full h-2 bg-slate-950 rounded-lg accent-amber-500 cursor-pointer" />
        </div>
      </div>

      {/* Grading Targets (from trainer) */}
      <div className="border-t border-slate-800 pt-5">
        <div className="flex items-center gap-1.5 mb-3">
          <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">Grading Targets</span>
          <span className="text-[9px] text-slate-600 ml-auto">trainer</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">
            <span className="text-[9px] font-mono text-slate-500 uppercase">Target Arc Gap</span>
            <p className="text-sm text-slate-300 font-mono">{targetGap != null ? `${targetGap} mm` : '—'}</p>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">
            <span className="text-[9px] font-mono text-slate-500 uppercase">Target Speed</span>
            <p className="text-sm text-slate-300 font-mono">{targetSpeed != null ? `${targetSpeed} mm/s` : '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
