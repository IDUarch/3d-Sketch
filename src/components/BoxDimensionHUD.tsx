import React from 'react';
import { Box, Plus, Sparkles, Ruler } from 'lucide-react';
import { BoxDimensions } from '../types';

interface BoxDimensionHUDProps {
  dimensions: BoxDimensions;
  onChangeDimensions: (dims: BoxDimensions) => void;
  onInsertBox: () => void;
  lang: 'fa' | 'en';
  activePlaneName: string;
}

export const BoxDimensionHUD: React.FC<BoxDimensionHUDProps> = ({
  dimensions,
  onChangeDimensions,
  onInsertBox,
  lang,
  activePlaneName,
}) => {
  const isFa = lang === 'fa';

  const updateField = (field: keyof BoxDimensions, val: number) => {
    const clamped = Math.max(0.1, Math.min(60, Number(val.toFixed(2))));
    onChangeDimensions({
      ...dimensions,
      [field]: isNaN(clamped) ? 1 : clamped,
    });
  };

  const presets = [
    { label: isFa ? 'مکعب ۱متر' : '1m Cube', w: 1.0, h: 1.0, d: 1.0 },
    { label: isFa ? 'اتاق ۳×۳' : '3m Room', w: 3.0, h: 2.8, d: 3.0 },
    { label: isFa ? 'ستون' : 'Column', w: 0.4, h: 3.0, d: 0.4 },
    { label: isFa ? 'دیوار' : 'Wall', w: 4.0, h: 2.8, d: 0.25 },
  ];

  return (
    <div
      id="box-dimension-hud"
      aria-label={isFa ? 'تنظیم ابعاد مکعب سه‌بعدی' : '3D Box Dimensions HUD'}
      className="absolute top-16 left-1/2 -translate-x-1/2 z-25 pointer-events-auto"
      dir={isFa ? 'rtl' : 'ltr'}
    >
      <div className="bg-slate-900/80 backdrop-blur-2xl border border-indigo-500/30 rounded-2xl shadow-2xl p-3 text-slate-100 flex flex-col sm:flex-row items-center gap-3">
        {/* Title badge */}
        <div className="flex items-center gap-2 px-1">
          <div className="p-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/30">
            <Box className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{isFa ? 'ابزار مکعب سه‌بعدی' : '3D Box Tool'}</span>
            </span>
            <span className="text-[10px] text-indigo-300/80 truncate max-w-[120px]">
              {activePlaneName}
            </span>
          </div>
        </div>

        {/* Numeric Dimension Inputs */}
        <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-xl border border-white/10">
          {/* Width (X) */}
          <div className="flex items-center gap-1">
            <label htmlFor="dim-width-input" className="text-[11px] font-semibold text-rose-300">
              {isFa ? 'طول X:' : 'W (X):'}
            </label>
            <input
              id="dim-width-input"
              type="number"
              step="0.1"
              min="0.1"
              max="50"
              value={dimensions.width}
              onChange={(e) => updateField('width', parseFloat(e.target.value))}
              className="w-14 bg-slate-800/80 border border-white/15 rounded-lg px-1.5 py-1 text-xs text-white font-mono text-center focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
            />
            <span className="text-[10px] text-slate-400">m</span>
          </div>

          <span className="text-slate-600 font-mono">×</span>

          {/* Height (Y) */}
          <div className="flex items-center gap-1">
            <label htmlFor="dim-height-input" className="text-[11px] font-semibold text-emerald-300">
              {isFa ? 'ارتفاع Y:' : 'H (Y):'}
            </label>
            <input
              id="dim-height-input"
              type="number"
              step="0.1"
              min="0.1"
              max="50"
              value={dimensions.height}
              onChange={(e) => updateField('height', parseFloat(e.target.value))}
              className="w-14 bg-slate-800/80 border border-white/15 rounded-lg px-1.5 py-1 text-xs text-white font-mono text-center focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            />
            <span className="text-[10px] text-slate-400">m</span>
          </div>

          <span className="text-slate-600 font-mono">×</span>

          {/* Depth (Z) */}
          <div className="flex items-center gap-1">
            <label htmlFor="dim-depth-input" className="text-[11px] font-semibold text-sky-300">
              {isFa ? 'عمق Z:' : 'D (Z):'}
            </label>
            <input
              id="dim-depth-input"
              type="number"
              step="0.1"
              min="0.1"
              max="50"
              value={dimensions.depth}
              onChange={(e) => updateField('depth', parseFloat(e.target.value))}
              className="w-14 bg-slate-800/80 border border-white/15 rounded-lg px-1.5 py-1 text-xs text-white font-mono text-center focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
            />
            <span className="text-[10px] text-slate-400">m</span>
          </div>
        </div>

        {/* Quick presets */}
        <div className="hidden lg:flex items-center gap-1">
          {presets.map((pr) => (
            <button
              key={pr.label}
              onClick={() => onChangeDimensions({ width: pr.w, height: pr.h, depth: pr.d })}
              className="px-2 py-1 rounded-lg text-[10px] bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all"
            >
              {pr.label}
            </button>
          ))}
        </div>

        {/* Insert Box with dimensions Button */}
        <button
          id="btn-insert-box"
          onClick={onInsertBox}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-medium shadow-lg shadow-indigo-600/30 transition-all cursor-pointer whitespace-nowrap"
          title={isFa ? 'درج مکعب با این ابعاد روی صفحه فعال' : 'Insert 3D box with these dimensions'}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isFa ? 'درج مکعب' : 'Insert Box'}</span>
        </button>
      </div>

      {/* Interactive Drag Hint */}
      <div className="flex justify-center mt-1">
        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-900/70 border border-white/10 text-indigo-200/90 shadow-sm backdrop-blur-md">
          {isFa
            ? '💡 با ماوس روی صفحه کلیک و درگ کنید، یا ابعاد دلخواه را وارد و «درج مکعب» را بزنید'
            : '💡 Drag with mouse on plane to draw, or enter dimensions and click Insert Box'}
        </span>
      </div>
    </div>
  );
};
