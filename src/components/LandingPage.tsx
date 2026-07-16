import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Layers, Cpu, ShieldCheck, Gauge, Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      onStart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

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
      icon: <Gauge className="w-5 h-5 text-emerald-400" />,
      title: "Wire Feed Physics",
      desc: "Real-time amperage resolution from WFS. Heat input density mapped to 3D bead geometry."
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">GMAW Simulation · v2.0</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-black text-white tracking-tighter mb-4">
            WELDVISION <span className="text-amber-500">STUDIO</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Hyper-focused GMAW (MIG) welding simulation. Fixed-torch geometry, deterministic thermophysics, and real-time 3D bead visualization for technical education.
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

        {/* Instructor Sign-In */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="max-w-sm mx-auto"
        >
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-1 text-center">
              Instructor Sign In
            </h2>
            <p className="text-[10px] text-slate-500 text-center mb-5">
              Students access via Android Trainer only
            </p>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-4">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 bg-amber-500 text-slate-950 py-2.5 rounded-lg font-bold uppercase tracking-wider text-sm hover:bg-amber-400 disabled:opacity-50 transition-all mt-1"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                Sign In
              </button>
            </form>
          </div>

          <div className="mt-6 flex items-center gap-4 opacity-30 justify-center">
            <span className="text-[10px] font-mono tracking-tighter uppercase">GMAW Constant Voltage</span>
            <div className="w-px h-3 bg-slate-700"></div>
            <span className="text-[10px] font-mono tracking-tighter uppercase">0.9mm Steel Wire</span>
            <div className="w-px h-3 bg-slate-700"></div>
            <span className="text-[10px] font-mono tracking-tighter uppercase">AWS D1.1 Standards</span>
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
