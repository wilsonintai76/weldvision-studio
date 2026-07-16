import React from 'react';
import { DefectMetric } from '../types';
import { AlertTriangle, CheckCircle, ShieldAlert, Sparkles, BookOpen, Wrench } from 'lucide-react';

interface DefectAnalyzerProps {
  defects: DefectMetric[];
  selectedDefect: string | null;
  onSelectDefect: (defectId: string | null) => void;
  overallScore: number;
}

export const DefectAnalyzer: React.FC<DefectAnalyzerProps> = ({
  defects,
  selectedDefect,
  onSelectDefect,
  overallScore,
}) => {
  // Sort defects so critical ones appear at the top by default
  const sortedDefects = [...defects].sort((a, b) => b.severity - a.severity);

  // If a defect is selected, find its metric detail
  const activeDefectDetail = selectedDefect ? defects.find(d => d.id === selectedDefect) : null;

  const getStatusIcon = (status: DefectMetric['status']) => {
    switch (status) {
      case 'Critical':
        return <ShieldAlert className="w-5 h-5 text-red-500" />;
      case 'Acceptable':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
    }
  };

  const getStatusClass = (status: DefectMetric['status']) => {
    switch (status) {
      case 'Critical':
        return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'Acceptable':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      default:
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
    }
  };

  const getScoreColor = (score: number) => {
    if (score > 85) return 'text-emerald-400';
    if (score > 60) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-slate-100 flex flex-col gap-6" id="defect-analyzer-card">
      
      {/* Top Banner: Overall Score & Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-display font-semibold text-lg text-slate-100">
            Weld Quality Inspection Report
          </h2>
          <span className="text-xs text-slate-400">Analysis of surface flaws, root fusion, and structural integrity.</span>
        </div>
        
        {/* Core Gauge Score */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 flex items-center gap-4 shrink-0">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-slate-500 tracking-wider">INTEGRITY SCORE</span>
            <span className={`font-display font-extrabold text-2xl ${getScoreColor(overallScore)}`}>
              {overallScore}/100
            </span>
          </div>
          <div className="text-xs text-slate-400 max-w-[120px] leading-tight font-mono">
            {overallScore > 85 ? '✓ EXCELLENT - Passes visual codes.' : overallScore > 60 ? '⚠ LIMIT CONFORMING - Needs grinding/rework.' : '❌ REJECTED - Under code limits.'}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Defect List and Selected Detail */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Col: Flaws List (4 cols) */}
        <div className="md:col-span-5 flex flex-col gap-3">
          <span className="text-xs font-mono text-slate-400 tracking-wider uppercase">Active Defects Severity</span>
          <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
            {sortedDefects.map((def) => {
              const isActiveInspection = selectedDefect === def.id;
              return (
                <button
                  key={def.id}
                  onClick={() => onSelectDefect(isActiveInspection ? null : def.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                    isActiveInspection
                      ? 'bg-orange-500/10 border-orange-500/50 shadow-md'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700/80'
                  }`}
                  id={`defect-list-item-${def.id}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-slate-100">{def.name}</span>
                    <div className="flex items-center gap-2">
                      {/* Bar Gauge */}
                      <div className="w-16 bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${def.severity > 50 ? 'bg-red-500' : def.severity > 15 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${def.severity}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{def.severity}%</span>
                    </div>
                  </div>

                  <div className={`text-[10px] font-mono font-bold px-2 py-1 rounded border shrink-0 ${getStatusClass(def.status)}`}>
                    {def.status}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Col: Interactive Inspector Panel (7 cols) */}
        <div className="md:col-span-7 bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 flex flex-col gap-5 min-h-[300px]">
          {activeDefectDetail ? (
            <div className="flex flex-col gap-4 animate-fadeIn">
              {/* Flaw Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-mono text-orange-400 tracking-wider font-bold">METALLURGICAL INSPECTOR</span>
                  <h3 className="font-display font-bold text-lg text-slate-100 flex items-center gap-2">
                    {getStatusIcon(activeDefectDetail.status)}
                    {activeDefectDetail.name}
                  </h3>
                </div>
                <button
                  onClick={() => onSelectDefect(null)}
                  className="text-xs text-slate-500 hover:text-slate-300 font-mono"
                  id="close-inspector-btn"
                >
                  Close ×
                </button>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 border border-slate-900 px-3.5 py-2.5 rounded-lg">
                {activeDefectDetail.description}
              </p>

              {/* Causes and Remedies */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
                {/* Causes */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    PRIMARY CAUSES
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-slate-400 flex flex-col gap-1.5 pl-1.5 leading-normal">
                    {activeDefectDetail.causes.map((cause, idx) => (
                      <li key={idx}>{cause}</li>
                    ))}
                  </ul>
                </div>

                {/* Mitigations */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                    SHOP REMEDIES / LIMITS
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-slate-400 flex flex-col gap-1.5 pl-1.5 leading-normal">
                    {activeDefectDetail.mitigations.map((mit, idx) => (
                      <li key={idx}>{mit}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* AWS Standard Code Limit */}
              <div className="bg-slate-900 border border-slate-850 rounded-xl p-3.5 mt-2 flex gap-2.5">
                <BookOpen className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono text-slate-400 tracking-wider">AWS STRUCTURAL CODE COMPLIANCE</span>
                  <span className="text-[11px] text-slate-300 leading-relaxed font-sans">{activeDefectDetail.awsStandard}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center gap-3 py-10 h-full">
              <Sparkles className="w-10 h-10 text-slate-700 animate-pulse" />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-slate-400">No defect currently selected</span>
                <span className="text-xs text-slate-500 max-w-[280px]">
                  Click on any defect card in the list or directly click on active weld flaws in the joint diagram to open metallurgy analysis.
                </span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
