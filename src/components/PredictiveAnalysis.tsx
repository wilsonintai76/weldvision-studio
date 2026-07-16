import React, { useState, useMemo } from 'react';
import { Brain, Zap, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WeldParameters, DistortionMetric, MetallurgyResult } from '../types';
import { calculateHICRisk } from '../utils/metallurgy';
// AppType is exported from the Hono Worker for future Hono RPC integration
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { AppType } from '../../functions/api/[[route]]';

// Typed API request body matching the Worker's PredictiveAnalysisBody interface
interface AnalysisRequestBody {
  parameters: WeldParameters;
  distortion: DistortionMetric;
  heatInput: number;
  mitigatedDistortion: DistortionMetric;
  metallurgy: MetallurgyResult;
}

// Typed API response
interface PredictiveAnalysisResponse {
  riskScore: number;
  explanation: string;
}

// Typed fetch wrapper for /api/predictive-analysis (backed by the Hono Worker)
async function callPredictiveAnalysis(
  body: AnalysisRequestBody
): Promise<PredictiveAnalysisResponse> {
  const res = await fetch('/api/predictive-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json() as Promise<PredictiveAnalysisResponse>;
}

interface PredictiveAnalysisProps {
  parameters: WeldParameters;
  distortion: DistortionMetric;
  heatInput: number;
  mitigatedDistortion: DistortionMetric;
}

export const PredictiveAnalysis: React.FC<PredictiveAnalysisProps> = ({
  parameters,
  distortion,
  heatInput,
  mitigatedDistortion
}) => {
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Deterministic Metallurgy Calculation
  const metallurgy = useMemo(() => {
    return calculateHICRisk({
      material: parameters.material,
      thickness: parameters.thickness,
      heatInput,
      preheat: parameters.preheat,
      restraint: parameters.restraint,
      jointType: parameters.jointType,
      useJigs: false 
    });
  }, [parameters, heatInput]);

  const analyzeRisk = async () => {
    setIsAnalyzing(true);
    try {
      const data = await callPredictiveAnalysis({
        parameters,
        distortion,
        heatInput,
        mitigatedDistortion,
        metallurgy,
      });
      setAiExplanation(data.explanation);
    } catch (e) {
      console.error(e);
      setAiExplanation("Analysis failed. Please check your network connection and API configuration.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="mt-6 bg-slate-900 border border-indigo-500/30 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="bg-indigo-600/10 border-b border-indigo-500/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-400" />
          <h3 className="text-xs font-bold text-indigo-100 uppercase tracking-[0.15em]">Predictive Analysis Engine</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-indigo-400/60 uppercase">Model: Llama 3.3 70B</span>
          <button 
            onClick={analyzeRisk} 
            disabled={isAnalyzing}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-50 text-white px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all active:scale-95 shadow-lg shadow-indigo-900/40"
          >
            {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            {isAnalyzing ? 'Processing...' : 'Run Prediction'}
          </button>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-6">
        {/* Risk Gauge Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-4 bg-slate-950/50 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Crack Risk Score</span>
            <div className="relative">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-slate-800"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={263.8}
                  strokeDashoffset={263.8 - (263.8 * metallurgy.riskScore) / 100}
                  className={`${metallurgy.riskScore > 75 ? 'text-rose-500' : metallurgy.riskScore > 40 ? 'text-amber-500' : 'text-emerald-500'} transition-all duration-1000 ease-out`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-black font-mono text-white leading-none">
                  {metallurgy.riskScore}
                </span>
              </div>
            </div>
            <span className={`text-[10px] font-bold mt-2 uppercase ${metallurgy.riskScore > 75 ? 'text-rose-400' : metallurgy.riskScore > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {metallurgy.riskScore > 75 ? 'Critical Risk' : metallurgy.riskScore > 40 ? 'Moderate Alert' : 'Safe Window'}
            </span>
          </div>

          <div className="md:col-span-8 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950/30 p-3 rounded-lg border border-slate-800">
                <div className="text-[9px] text-slate-500 uppercase font-mono mb-1">Ito-Bessyo (Pcm)</div>
                <div className="text-sm font-bold text-slate-200">{metallurgy.pcm || 'N/A'}</div>
                <div className="text-[8px] text-slate-600 mt-1 uppercase italic">Chemical Sensitivity</div>
              </div>
              <div className="bg-slate-950/30 p-3 rounded-lg border border-slate-800">
                <div className="text-[9px] text-slate-500 uppercase font-mono mb-1">Cooling Rate (t8/5)</div>
                <div className="text-sm font-bold text-slate-200">{metallurgy.t85}s</div>
                <div className="text-[8px] text-slate-600 mt-1 uppercase italic">Thermal Transformation</div>
              </div>
              <div className="bg-slate-950/30 p-3 rounded-lg border border-slate-800">
                <div className="text-[9px] text-slate-500 uppercase font-mono mb-1">Restraint (RI)</div>
                <div className="text-sm font-bold text-slate-200">{metallurgy.ri}</div>
                <div className="text-[8px] text-slate-600 mt-1 uppercase italic">N/mm·mm Intensity</div>
              </div>
              <div className="bg-slate-950/30 p-3 rounded-lg border border-slate-800">
                <div className="text-[9px] text-slate-500 uppercase font-mono mb-1">Crit. Preheat (Tc)</div>
                <div className="text-sm font-bold text-slate-200">{metallurgy.tc}°C</div>
                <div className="text-[8px] text-slate-600 mt-1 uppercase italic">Minimum for H-Safety</div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insight Card */}
        <AnimatePresence>
          {aiExplanation && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/40 to-purple-500/40 rounded-xl blur-sm opacity-50"></div>
              <div className="relative bg-slate-950/80 backdrop-blur-sm border border-indigo-500/20 rounded-xl p-5 shadow-inner">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                  <span className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em]">Llama AI Insights</span>
                </div>
                <p className="text-sm text-indigo-100/90 leading-relaxed font-serif italic italic-indigo-100">
                  "{aiExplanation}"
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
                  <span className="text-[9px] text-slate-600 uppercase font-mono tracking-tighter">Probabilistic Forecasting Alpha 0.4</span>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                    <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                    <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isAnalyzing && !aiExplanation && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 border border-dashed border-slate-800 rounded-xl">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="text-[10px] text-slate-500 uppercase font-mono animate-pulse">Consulting Llama Metallurgical Models...</span>
          </div>
        )}
      </div>
    </div>
  );
};
