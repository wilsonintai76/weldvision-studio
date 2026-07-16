import React from 'react';
import { WeldParameters, WeldingProcess, MaterialType, JointType, RestraintLevel } from '../types';
import { Sliders, Settings, ShieldAlert, Zap, Flame, Wind } from 'lucide-react';

interface WeldingControlsProps {
  parameters: WeldParameters;
  onChange: (params: WeldParameters) => void;
}

export const WeldingControls: React.FC<WeldingControlsProps> = ({ parameters, onChange }) => {
  const handleSelectChange = (field: keyof WeldParameters, value: string) => {
    const updated = { ...parameters, [field]: value };
    
    // Automatically adjust default gas flow if process is switched
    if (field === 'process') {
      if (value === 'SMAW') {
        updated.gasFlow = 0;
      } else if (parameters.gasFlow === 0) {
        updated.gasFlow = 14;
      }
    }
    
    onChange(updated);
  };

  const handleSliderChange = (field: keyof WeldParameters, value: number) => {
    onChange({ ...parameters, [field]: value });
  };

  const isGasRequired = parameters.process === 'GMAW' || parameters.process === 'GTAW';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl text-slate-100 flex flex-col gap-6 md:gap-8" id="welding-controls-panel">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
        <Settings className="w-5 h-5 text-amber-500 animate-pulse" id="controls-header-icon" />
        <h2 className="font-display font-semibold text-lg text-slate-100" id="controls-header-title">
          Weld Machine Configuration
        </h2>
      </div>

      {/* Grid for Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        {/* Material Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono text-slate-400 uppercase tracking-wider" htmlFor="material-select">BASE MATERIAL</label>
          <div className="min-h-[44px] flex items-center">
            <select
              id="material-select"
              value={parameters.material}
              onChange={(e) => handleSelectChange('material', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
            >
              <option value="Carbon Steel">Carbon Steel (A36)</option>
              <option value="Stainless Steel">Stainless Steel (304)</option>
              <option value="Aluminum">Aluminum (6061-T6)</option>
            </select>
          </div>
        </div>

        {/* Process Selection */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono text-slate-400 uppercase tracking-wider" htmlFor="process-select">WELDING PROCESS</label>
          <div className="min-h-[44px] flex items-center">
            <select
              id="process-select"
              value={parameters.process}
              onChange={(e) => handleSelectChange('process', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
            >
              <option value="GMAW">MIG / GMAW (Gas Metal Arc)</option>
              <option value="GTAW">TIG / GTAW (Gas Tungsten Arc)</option>
              <option value="SMAW">Stick / SMAW (Shielded Metal)</option>
            </select>
          </div>
        </div>

        {/* Joint Configuration */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono text-slate-400 uppercase tracking-wider" htmlFor="joint-select">JOINT CONFIGURATION</label>
          <div className="min-h-[44px] flex items-center">
            <select
              id="joint-select"
              value={parameters.jointType}
              onChange={(e) => handleSelectChange('jointType', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
            >
              <option value="Butt Joint">Butt Joint (Single-V)</option>
              <option value="T-Joint">T-Joint (Double Fillet)</option>
              <option value="T-Joint (Single Fillet)">T-Joint (Single Fillet)</option>
              <option value="Lap Joint">Lap Joint (Fillet)</option>
            </select>
          </div>
        </div>

        {/* Restraint Configuration */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono text-slate-400 uppercase tracking-wider" htmlFor="restraint-select">CLAMPING & RESTRAINT</label>
          <div className="min-h-[44px] flex items-center">
            <select
              id="restraint-select"
              value={parameters.restraint}
              onChange={(e) => handleSelectChange('restraint', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
            >
              <option value="None">None (Free to Warp)</option>
              <option value="Medium">Medium (Soft Clamps)</option>
              <option value="High">High (Rigid Fixture / Heavy Tack)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sliders Container */}
      <div className="flex flex-col gap-6 md:gap-8 border-t border-slate-800 pt-6">
        <div className="flex items-center gap-1 text-xs font-mono text-amber-400 tracking-wider">
          <Sliders className="w-3.5 h-3.5" />
          <span>REAL-TIME PARAMETERS</span>
        </div>

        {/* Plate Thickness */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-300 font-medium">Plate Thickness</span>
            <span className="font-mono text-amber-400 font-bold">{parameters.thickness} mm</span>
          </div>
          <div className="min-h-[32px] flex items-center">
            <input
              type="range"
              min="2"
              max="20"
              step="0.5"
              value={parameters.thickness}
              onChange={(e) => handleSliderChange('thickness', parseFloat(e.target.value))}
              className="w-full h-2.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
            <span>2 mm</span>
            <span>11 mm</span>
            <span>20 mm</span>
          </div>
        </div>

        {/* Amperage / Current */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-300 font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Welding Current
            </span>
            <span className="font-mono text-amber-400 font-bold">{parameters.current} Amps</span>
          </div>
          <div className="min-h-[32px] flex items-center">
            <input
              type="range"
              min="40"
              max="320"
              step="5"
              value={parameters.current}
              onChange={(e) => handleSliderChange('current', parseInt(e.target.value))}
              className="w-full h-2.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
            <span>40 A</span>
            <span>180 A</span>
            <span>320 A</span>
          </div>
          {parameters.current > 240 && parameters.thickness < 5 && (
            <div className="flex items-center gap-1.5 text-[11px] leading-tight text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-md mt-1">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Warning: Current is extremely high for {parameters.thickness}mm material. Burn-through highly probable.</span>
            </div>
          )}
          {parameters.current < 100 && parameters.thickness > 12 && (
            <div className="flex items-center gap-1.5 text-[11px] leading-tight text-sky-400 bg-sky-500/10 border border-sky-500/20 px-3 py-2 rounded-md mt-1">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Warning: Current is insufficient for heavy {parameters.thickness}mm plate. Risk of lack of fusion.</span>
            </div>
          )}
        </div>

        {/* Voltage */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-300 font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Arc Voltage
            </span>
            <span className="font-mono text-amber-400 font-bold">{parameters.voltage} V</span>
          </div>
          <div className="min-h-[32px] flex items-center">
            <input
              type="range"
              min="10"
              max="35"
              step="0.5"
              value={parameters.voltage}
              onChange={(e) => handleSliderChange('voltage', parseFloat(e.target.value))}
              className="w-full h-2.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
            <span>10 V</span>
            <span>22 V</span>
            <span>35 V</span>
          </div>
        </div>

        {/* Travel Speed */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-300 font-medium flex items-center gap-2">
              Travel Speed
            </span>
            <span className="font-mono text-amber-400 font-bold">{parameters.speed} mm/s</span>
          </div>
          <div className="min-h-[32px] flex items-center">
            <input
              type="range"
              min="1.5"
              max="18"
              step="0.5"
              value={parameters.speed}
              onChange={(e) => handleSliderChange('speed', parseFloat(e.target.value))}
              className="w-full h-2.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
            <span>1.5 mm/s</span>
            <span>7.0 mm/s</span>
            <span>18.0 mm/s</span>
          </div>
        </div>

        {/* Preheating Temperature */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-300 font-medium flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              Pre-heating
            </span>
            <span className="font-mono text-amber-400 font-bold">{parameters.preheat} °C</span>
          </div>
          <div className="min-h-[32px] flex items-center">
            <input
              type="range"
              min="20"
              max="250"
              step="5"
              value={parameters.preheat}
              onChange={(e) => handleSliderChange('preheat', parseInt(e.target.value))}
              className="w-full h-2.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
            <span>20 °C</span>
            <span>135 °C</span>
            <span>250 °C</span>
          </div>
        </div>

        {/* Shielding Gas Flow */}
        <div className={`flex flex-col gap-3 transition-all duration-300 ${isGasRequired ? 'opacity-100 max-h-[160px]' : 'opacity-30 pointer-events-none max-h-0 overflow-hidden'}`}>
          <div className="flex justify-between text-sm">
            <span className="text-slate-300 font-medium flex items-center gap-2">
              <Wind className="w-4 h-4 text-cyan-400" />
              Gas Flow Rate
            </span>
            <span className="font-mono text-amber-400 font-bold">{parameters.gasFlow} L/min</span>
          </div>
          <div className="min-h-[32px] flex items-center">
            <input
              type="range"
              min="0"
              max="25"
              step="1"
              value={parameters.gasFlow}
              onChange={(e) => handleSliderChange('gasFlow', parseInt(e.target.value))}
              className="w-full h-2.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
              disabled={!isGasRequired}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
            <span>0 L/min</span>
            <span>12 L/min</span>
            <span>25 L/min</span>
          </div>
          {isGasRequired && parameters.gasFlow < 8 && (
            <div className="flex items-center gap-1.5 text-[11px] leading-tight text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-md mt-1">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Lacking Gas Protection: Severe atmospheric nitrogen gas trapping. Massive porosity!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
