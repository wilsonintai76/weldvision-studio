import React from 'react';
import { LAB_PRESETS } from '../utils/simulation';
import { LabPreset } from '../types';
import { Beaker, ShieldAlert, Sparkles, AlertTriangle, Play, Check } from 'lucide-react';

interface WeldingLabPresetsProps {
  onSelectPreset: (preset: LabPreset) => void;
  activePresetId: string | null;
}

export const WeldingLabPresets: React.FC<WeldingLabPresetsProps> = ({
  onSelectPreset,
  activePresetId,
}) => {
  const getPresetIcon = (defect: string) => {
    switch (defect) {
      case 'None':
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
      case 'Undercut':
      case 'Lack of Fusion':
      case 'Porosity':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-red-400" />;
    }
  };

  const getDifficultyClass = (difficulty: string) => {
    if (difficulty === 'Easy') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (difficulty.includes('Novice')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100 flex flex-col gap-4" id="welding-presets-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
        <Beaker className="w-5 h-5 text-amber-500" />
        <div className="flex flex-col">
          <h2 className="font-display font-semibold text-lg text-slate-100">
            Interactive Failure Lab
          </h2>
          <span className="text-xs text-slate-400">Instantly configure standard welding flaws or nominal specs to inspect.</span>
        </div>
      </div>

      {/* Presets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" id="presets-grid">
        {LAB_PRESETS.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className={`text-left p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all duration-200 group relative overflow-hidden ${
                isActive
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-lg scale-[1.02]'
                  : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-950/60'
              }`}
              id={`preset-card-${preset.id}`}
            >
              {/* Highlight Background Flare */}
              {isActive && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
              )}

              {/* Top Row: Badges */}
              <div className="flex justify-between items-center gap-2">
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${getDifficultyClass(preset.difficulty)}`}>
                  {preset.difficulty}
                </span>
                <span className="flex items-center gap-1 text-[9px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-900">
                  {getPresetIcon(preset.targetDefect)}
                  <span>{preset.targetDefect}</span>
                </span>
              </div>

              {/* Body */}
              <div className="flex flex-col gap-1">
                <h3 className="font-display font-bold text-sm text-slate-100 group-hover:text-amber-400 transition-colors">
                  {preset.name}
                </h3>
                <p className="text-[11px] text-slate-400 leading-normal line-clamp-2">
                  {preset.description}
                </p>
              </div>

              {/* Bottom Row: Parameter Overviews */}
              <div className="flex justify-between items-center border-t border-slate-850 pt-2 text-[9px] font-mono text-slate-500">
                <div className="flex gap-1.5 flex-wrap">
                  {preset.parameters.process && <span>{preset.parameters.process}</span>}
                  {preset.parameters.material && <span>• {preset.parameters.material}</span>}
                  {preset.parameters.thickness && <span>• {preset.parameters.thickness}mm</span>}
                </div>
                
                {/* Active/Play Indicator */}
                <div className="flex items-center gap-1 text-[10px] font-mono uppercase font-bold text-amber-500">
                  {isActive ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Active</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="text-slate-500 group-hover:text-amber-400 transition-colors">Load</span>
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
