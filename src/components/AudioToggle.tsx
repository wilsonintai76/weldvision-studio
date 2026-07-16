import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioToggleProps {
  current: number;
  heatInput: number;
}

export function AudioToggle({ current, heatInput }: AudioToggleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  const ctxRef = useRef<AudioContext | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const humSourceRef = useRef<OscillatorNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);

  useEffect(() => {
    if (isPlaying) {
      if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = ctxRef.current;
      
      // If the audio context is suspended (browser policy), resume it
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      masterGainRef.current = ctx.createGain();
      masterGainRef.current.connect(ctx.destination);
      
      filterRef.current = ctx.createBiquadFilter();
      filterRef.current.type = 'lowpass';
      filterRef.current.connect(masterGainRef.current);
      
      // Noise
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        let white = Math.random() * 2 - 1;
        // Occasional crackle
        if (Math.random() < 0.003) { 
          white += (Math.random() * 2 - 1) * 4;
        }
        output[i] = white * 0.4;
      }
      
      noiseSourceRef.current = ctx.createBufferSource();
      noiseSourceRef.current.buffer = noiseBuffer;
      noiseSourceRef.current.loop = true;
      noiseSourceRef.current.connect(filterRef.current);
      
      // Hum
      humSourceRef.current = ctx.createOscillator();
      humSourceRef.current.type = 'sawtooth';
      humSourceRef.current.frequency.value = 60; // 60Hz hum
      
      const humGain = ctx.createGain();
      humGain.gain.value = 0.08;
      humSourceRef.current.connect(humGain);
      humGain.connect(filterRef.current);
      
      noiseSourceRef.current.start();
      humSourceRef.current.start();
    } else {
      if (noiseSourceRef.current) {
        noiseSourceRef.current.stop();
        noiseSourceRef.current = null;
      }
      if (humSourceRef.current) {
        humSourceRef.current.stop();
        humSourceRef.current = null;
      }
    }
    
    return () => {
      if (noiseSourceRef.current) {
        try { noiseSourceRef.current.stop(); } catch (e) {}
        noiseSourceRef.current = null;
      }
      if (humSourceRef.current) {
        try { humSourceRef.current.stop(); } catch (e) {}
        humSourceRef.current = null;
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying && masterGainRef.current && filterRef.current && ctxRef.current) {
      // Modulate based on current and heatInput
      // Current (50 to 300) -> Filter frequency 500Hz to 4000Hz
      const minCurrent = 50;
      const maxCurrent = 300;
      const normalizedCurrent = Math.max(0, Math.min(1, (current - minCurrent) / (maxCurrent - minCurrent)));
      const freq = 500 + normalizedCurrent * 3500;
      filterRef.current.frequency.setTargetAtTime(freq, ctxRef.current.currentTime, 0.1);
      
      // Heat input (0.5 to 3.0) -> Volume 0.1 to 0.6
      const minHeat = 0.5;
      const maxHeat = 3.0;
      const normalizedHeat = Math.max(0, Math.min(1, (heatInput - minHeat) / (maxHeat - minHeat)));
      // Base volume + extra for high heat
      const volume = 0.1 + normalizedHeat * 0.5;
      masterGainRef.current.gain.setTargetAtTime(volume, ctxRef.current.currentTime, 0.1);
      
      if (humSourceRef.current) {
        // Higher current = slightly higher pitch hum (120Hz harmonics etc)
        humSourceRef.current.frequency.setTargetAtTime(60 + normalizedCurrent * 60, ctxRef.current.currentTime, 0.1);
      }
    }
  }, [current, heatInput, isPlaying]);

  return (
    <button
      onClick={() => setIsPlaying(!isPlaying)}
      className={`p-1.5 rounded-md transition-colors flex items-center justify-center border ${isPlaying ? 'bg-amber-500/20 text-amber-500 border-amber-500/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'}`}
      title={isPlaying ? "Mute Welding Sound" : "Play Welding Sound"}
    >
      {isPlaying ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
    </button>
  );
}
