import React from 'react';
import { motion } from 'motion/react';
import { Play, BookOpen, Cpu, Layers, ShieldCheck, ChevronRight } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const objectives = [
    {
      icon: <Layers className="w-5 h-5 text-indigo-400" />,
      title: "Weld Metallurgy",
      desc: "Analyze material transformation and Heat Affected Zones (HAZ) in real-time."
    },
    {
      icon: <Cpu className="w-5 h-5 text-amber-400" />,
      title: "AI Analysis",
      desc: "Utilize Llama-powered models to predict post-weld crack risks and distortion."
    },
    {
      icon: <BookOpen className="w-5 h-5 text-emerald-400" />,
      title: "Simulation Data",
      desc: "Export and track thermal cooling curves and distortion metrics for LMS reporting."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">TVET Simulation Module 4.2</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-black text-white tracking-tighter mb-4">
            3D VIRTUAL <span className="text-indigo-500">WELD LAB</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Advanced metallurgical simulation and predictive distortion analysis platform for professional engineering education.
          </p>
        </motion.div>

        {/* Objectives Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {objectives.map((obj, i) => (
            <motion.div
              key={obj.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl hover:border-indigo-500/30 transition-colors"
            >
              <div className="mb-4">{obj.icon}</div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">{obj.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">{obj.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center"
        >
          <button
            onClick={onStart}
            className="group relative flex items-center gap-3 bg-white text-slate-950 px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm hover:bg-indigo-500 hover:text-white transition-all shadow-2xl shadow-indigo-500/20 active:scale-95"
          >
            <span>Launch Simulation</span>
            <Play className="w-4 h-4 fill-current transition-transform group-hover:translate-x-1" />
            
            {/* Pulsing ring */}
            <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping -z-10"></div>
          </button>
          
          <div className="mt-8 flex items-center gap-6 opacity-30">
            <span className="text-[10px] font-mono tracking-tighter uppercase">SCORM 2004 Compatible</span>
            <div className="w-[1px] h-3 bg-slate-700"></div>
            <span className="text-[10px] font-mono tracking-tighter uppercase">xAPI Ready</span>
            <div className="w-[1px] h-3 bg-slate-700"></div>
            <span className="text-[10px] font-mono tracking-tighter uppercase">LMS LTI v1.3</span>
          </div>
        </motion.div>
      </div>

      {/* Decorative BG elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-indigo-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-purple-600/10 rounded-full blur-[120px]"></div>
      </div>
    </div>
  );
};
