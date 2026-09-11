import React, { useState } from 'react';
import {
  PenTool,
  Edit3,
  Highlighter,
  Minus,
  Square,
  Box,
  Eraser,
  MousePointer,
  Ruler,
  RotateCw,
  Undo2,
  Redo2,
  Palette,
  Circle,
} from 'lucide-react';
import { ToolType, InteractionMode } from '../types';

interface ToolbarProps {
  tool: ToolType;
  mode: InteractionMode;
  strokeColor: string;
  strokeSize: number;
  strokeOpacity: number;
  canUndo: boolean;
  canRedo: boolean;
  onSelectTool: (tool: ToolType) => void;
  onSelectMode: (mode: InteractionMode) => void;
  onChangeColor: (color: string) => void;
  onChangeSize: (size: number) => void;
  onChangeOpacity: (opacity: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  lang: 'fa' | 'en';
}

const PALETTE_COLORS = [
  { hex: '#F8FAFC', label: 'سفید روشن / White' },
  { hex: '#818CF8', label: 'نیلی فضایی / Indigo' },
  { hex: '#38BDF8', label: 'آبی آسمانی / Sky' },
  { hex: '#34D399', label: 'سبز نعنایی / Emerald' },
  { hex: '#FBBF24', label: 'کهربایی / Amber' },
  { hex: '#FB7185', label: 'رز / Rose' },
  { hex: '#C084FC', label: 'بنفش نئونی / Violet' },
  { hex: '#0F172A', label: 'مشکی کربنی / Dark' },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  mode,
  strokeColor,
  strokeSize,
  strokeOpacity,
  canUndo,
  canRedo,
  onSelectTool,
  onSelectMode,
  onChangeColor,
  onChangeSize,
  onChangeOpacity,
  onUndo,
  onRedo,
  lang,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizeSlider, setShowSizeSlider] = useState(false);
  const isFa = lang === 'fa';

  const tools: { id: ToolType; label: string; icon: React.ReactNode }[] = [
    { id: 'select', label: isFa ? 'انتخاب اشیاء (S)' : 'Select Objects (S)', icon: <MousePointer className="w-5 h-5" /> },
    { id: 'pen', label: isFa ? 'راپید / قلم' : 'Ink Pen', icon: <PenTool className="w-5 h-5" /> },
    { id: 'pencil', label: isFa ? 'مداد اسکیس' : 'Pencil', icon: <Edit3 className="w-5 h-5" /> },
    { id: 'marker', label: isFa ? 'ماژیک راندو' : 'Marker', icon: <Highlighter className="w-5 h-5" /> },
    { id: 'line', label: isFa ? 'خط مستقیم' : 'Straight Line', icon: <Minus className="w-5 h-5" /> },
    { id: 'rect', label: isFa ? 'کادر مستطیل' : 'Rectangle', icon: <Square className="w-5 h-5" /> },
    { id: 'box', label: isFa ? 'مکعب سه‌بعدی' : '3D Box / Cube', icon: <Box className="w-5 h-5" /> },
    { id: 'measure', label: isFa ? 'متر و اندازه‌گیری سه‌بعدی (M)' : '3D Measure Tape (M)', icon: <Ruler className="w-5 h-5" /> },
    { id: 'eraser', label: isFa ? 'پاک‌کن' : 'Eraser', icon: <Eraser className="w-5 h-5" /> },
  ];

  return (
    <aside
      id="main-toolbar"
      aria-label={isFa ? 'نوار ابزار طراحی' : 'Drawing toolbar'}
      className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 p-2 bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 transition-all text-slate-200"
    >
      {/* Interaction Mode Switcher: Draw vs 3D Orbit */}
      <div className="flex flex-col gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
        <button
          id="mode-draw-button"
          onClick={() => onSelectMode('draw')}
          className={`p-2.5 rounded-lg transition-all relative group ${
            mode === 'draw'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
          title={isFa ? 'حالت ترسیم روی بوم سه‌بعدی' : 'Draw Mode'}
        >
          <PenTool className="w-5 h-5" />
          <span className="sr-only">{isFa ? 'حالت ترسیم' : 'Draw Mode'}</span>
        </button>

        <button
          id="mode-orbit-button"
          onClick={() => onSelectMode('orbit')}
          className={`p-2.5 rounded-lg transition-all relative group ${
            mode === 'orbit'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
          title={isFa ? 'چرخش و پیمایش سه‌بعدی صحنه' : '3D Orbit & Pan Mode'}
        >
          <RotateCw className="w-5 h-5" />
          <span className="sr-only">{isFa ? 'چرخش سه‌بعدی' : '3D Orbit'}</span>
        </button>
      </div>

      <div className="w-6 h-px bg-white/10 my-0.5" />

      {/* Drawing Tools */}
      <div className="flex flex-col gap-1">
        {tools.map((t) => {
          const isSelected = mode === 'draw' && tool === t.id;
          return (
            <button
              key={t.id}
              id={`tool-btn-${t.id}`}
              onClick={() => {
                onSelectTool(t.id);
                if (mode !== 'draw') onSelectMode('draw');
              }}
              className={`p-2.5 rounded-xl transition-all relative group ${
                isSelected
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title={t.label}
            >
              {t.icon}
              <span className="sr-only">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="w-6 h-px bg-white/10 my-0.5" />

      {/* Stroke Size and Preview */}
      <div className="relative">
        <button
          id="stroke-size-button"
          onClick={() => setShowSizeSlider(!showSizeSlider)}
          className={`p-2 rounded-xl transition-all flex flex-col items-center justify-center text-slate-300 hover:bg-white/10 ${
            showSizeSlider ? 'bg-white/10 ring-2 ring-indigo-500/40' : ''
          }`}
          title={isFa ? `ضخامت خط: ${strokeSize}px` : `Size: ${strokeSize}px`}
        >
          <div
            className="rounded-full bg-indigo-400 shadow-sm transition-all"
            style={{ width: Math.min(22, Math.max(4, strokeSize * 2.5)), height: Math.min(22, Math.max(4, strokeSize * 2.5)) }}
          />
          <span className="text-[9px] font-mono mt-1 text-slate-400 font-semibold">{strokeSize}</span>
        </button>

        {showSizeSlider && (
          <div
            className="absolute left-full ml-3 top-0 bg-slate-900/90 backdrop-blur-2xl rounded-2xl p-3.5 shadow-2xl border border-white/15 w-52 flex flex-col gap-3 z-30 text-slate-200"
            dir={isFa ? 'rtl' : 'ltr'}
          >
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                <span>{isFa ? 'ضخامت خط' : 'Stroke Size'}</span>
                <span className="font-mono text-indigo-400">{strokeSize}px</span>
              </div>
              <input
                type="range"
                min="1"
                max="16"
                step="0.5"
                value={strokeSize}
                onChange={(e) => onChangeSize(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1.5">
                <span>{isFa ? 'شفافیت قلم' : 'Opacity'}</span>
                <span className="font-mono text-indigo-400">{Math.round(strokeOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={strokeOpacity}
                onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Color Selector */}
      <div className="relative">
        <button
          id="color-picker-button"
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="p-2 rounded-xl transition-all relative hover:bg-white/10 flex items-center justify-center"
          title={isFa ? 'انتخاب رنگ قلم' : 'Stroke Color'}
        >
          <span
            className="w-6 h-6 rounded-full border-2 border-white/40 shadow-sm ring-1 ring-white/10"
            style={{ backgroundColor: strokeColor }}
          />
        </button>

        {showColorPicker && (
          <div
            className="absolute left-full ml-3 top-0 bg-slate-900/90 backdrop-blur-2xl rounded-2xl p-3.5 shadow-2xl border border-white/15 w-56 z-30 text-slate-200"
            dir={isFa ? 'rtl' : 'ltr'}
          >
            <div className="text-xs font-semibold text-slate-200 mb-2.5 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isFa ? 'پالت اسکیس مدرن' : 'Palette Preset'}</span>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-3">
              {PALETTE_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => {
                    onChangeColor(c.hex);
                    setShowColorPicker(false);
                  }}
                  className={`w-9 h-9 rounded-xl border-2 transition-transform hover:scale-110 flex items-center justify-center ${
                    strokeColor.toLowerCase() === c.hex.toLowerCase()
                      ? 'border-indigo-400 shadow-lg shadow-indigo-500/30 scale-105'
                      : 'border-white/20 ring-1 ring-white/10'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <label className="text-[11px] text-slate-400 cursor-pointer">
                {isFa ? 'رنگ سفارشی:' : 'Custom:'}
              </label>
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => onChangeColor(e.target.value)}
                className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
              />
            </div>
          </div>
        )}
      </div>

      <div className="w-6 h-px bg-white/10 my-0.5" />

      {/* Undo & Redo */}
      <div className="flex flex-col gap-1">
        <button
          id="undo-button"
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-2 rounded-xl transition-colors ${
            canUndo ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-slate-600 cursor-not-allowed'
          }`}
          title={isFa ? 'بازگشت (Undo)' : 'Undo (Ctrl+Z)'}
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          id="redo-button"
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-2 rounded-xl transition-colors ${
            canRedo ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-slate-600 cursor-not-allowed'
          }`}
          title={isFa ? 'تکرار مجدد (Redo)' : 'Redo (Ctrl+Y)'}
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
