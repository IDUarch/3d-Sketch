import React, { useState } from 'react';
import {
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Move3d,
  Crosshair,
  RotateCcw,
  Compass,
  Box as BoxIcon,
  Sliders,
  Palette,
} from 'lucide-react';
import { DrawingPlane } from '../types';

interface SurfaceControllerProps {
  planes: DrawingPlane[];
  activePlane: DrawingPlane;
  onSelectPlane: (planeId: string) => void;
  onUpdatePlaneOffset: (planeId: string, deltaOffset: number) => void;
  onSetPlaneAbsoluteOffset: (planeId: string, axis: 'x' | 'y' | 'z', value: number) => void;
  onAlignCameraToPlane: (plane: DrawingPlane) => void;
  showAxes: boolean;
  onToggleAxes: () => void;
  lang: 'fa' | 'en';
  isOpen?: boolean;
  onToggleOpen?: (open: boolean) => void;
  activePanelTab?: 'surfaces' | 'layers' | 'selection' | 'materials';
  onSelectPanelTab?: (tab: 'surfaces' | 'layers' | 'selection' | 'materials') => void;
  hasSelection?: boolean;
}

export function SurfaceController({
  planes,
  activePlane,
  onSelectPlane,
  onUpdatePlaneOffset,
  onSetPlaneAbsoluteOffset,
  onAlignCameraToPlane,
  showAxes,
  onToggleAxes,
  lang,
  isOpen,
  onToggleOpen,
  activePanelTab = 'surfaces',
  onSelectPanelTab,
  hasSelection = false,
}: SurfaceControllerProps) {
  const [internalDrawerOpen, setInternalDrawerOpen] = useState(true);
  const isDrawerOpen = isOpen !== undefined ? isOpen : internalDrawerOpen;
  const setDrawerOpen = (open: boolean) => {
    setInternalDrawerOpen(open);
    onToggleOpen?.(open);
  };

  const [isExpanded, setIsExpanded] = useState(true);
  const isFa = lang === 'fa';

  // Identify principal coordinate planes
  const xoyPlane = planes.find((p) => p.surfaceType === 'xoy') || planes.find((p) => p.id === 'plane-ground') || planes[1];
  const xozPlane = planes.find((p) => p.surfaceType === 'xoz') || planes.find((p) => p.id === 'plane-facade') || planes[0];
  const yozPlane = planes.find((p) => p.surfaceType === 'yoz') || planes.find((p) => p.id === 'plane-side-yoz') || planes[2];

  // Determine current active plane surface type and offset axis
  const surfaceType = activePlane.surfaceType || (
    Math.abs(activePlane.normal.y) > 0.8
      ? 'xoy'
      : Math.abs(activePlane.normal.z) > 0.8
      ? 'xoz'
      : 'yoz'
  );

  // Active axis coordinate value
  let activeAxisName: 'x' | 'y' | 'z' = 'y';
  let activeAxisLabel = isFa ? 'محور ارتفاع (Y)' : 'Height Axis (Y)';
  let currentOffset = activePlane.origin.y;
  let minSlider = -2;
  let maxSlider = 8;

  if (surfaceType === 'xoz') {
    activeAxisName = 'z';
    activeAxisLabel = isFa ? 'محور عمق (Z)' : 'Depth Axis (Z)';
    currentOffset = activePlane.origin.z;
    minSlider = -6;
    maxSlider = 6;
  } else if (surfaceType === 'yoz') {
    activeAxisName = 'x';
    activeAxisLabel = isFa ? 'محور عرض (X)' : 'Section Axis (X)';
    currentOffset = activePlane.origin.x;
    minSlider = -6;
    maxSlider = 6;
  }

  // Common architectural level presets
  const presetsBySurface = {
    xoy: [
      { label: isFa ? 'زیرزمین (-1.5m)' : 'Basement (-1.5m)', val: -1.5 },
      { label: isFa ? 'همکف (0.0m)' : 'Ground (0m)', val: 0.0 },
      { label: isFa ? 'طبقه اول (+2.8m)' : 'Level 1 (+2.8m)', val: 2.8 },
      { label: isFa ? 'بام (+5.5m)' : 'Roof (+5.5m)', val: 5.5 },
    ],
    xoz: [
      { label: isFa ? 'دیوار عقب (-2m)' : 'Back (-2m)', val: -2.0 },
      { label: isFa ? 'مبداء (0.0m)' : 'Center (0m)', val: 0.0 },
      { label: isFa ? 'نمای جلو (+1.5m)' : 'Front (+1.5m)', val: 1.5 },
      { label: isFa ? 'ورودی (+3.0m)' : 'Street (+3m)', val: 3.0 },
    ],
    yoz: [
      { label: isFa ? 'جناح چپ (-2.5m)' : 'Left (-2.5m)', val: -2.5 },
      { label: isFa ? 'محور مرکزی (0.0m)' : 'Center (0m)', val: 0.0 },
      { label: isFa ? 'جناح راست (+2.5m)' : 'Right (+2.5m)', val: 2.5 },
    ],
  };

  const currentPresets = presetsBySurface[surfaceType as 'xoy' | 'xoz' | 'yoz'] || presetsBySurface.xoy;

  if (!isDrawerOpen) {
    return (
      <button
        id="open-surface-drawer-btn"
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="fixed top-34 right-0 z-30 flex items-center gap-2 px-3 py-2.5 bg-slate-950/90 backdrop-blur-xl border-y border-l border-sky-500/40 rounded-l-2xl shadow-2xl text-slate-200 hover:text-white hover:bg-slate-900/95 transition-all cursor-pointer group animate-in fade-in slide-in-from-right-2 duration-150"
        title={isFa ? 'باز کردن پنل صفحات ترسیم و محورها' : 'Open Surfaces & Axes Panel'}
        dir={isFa ? 'rtl' : 'ltr'}
      >
        <div
          className="w-2.5 h-2.5 rounded-full ring-2 ring-sky-400/40 animate-pulse"
          style={{ backgroundColor: activePlane.color || '#38bdf8' }}
        />
        <div className="flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold">{isFa ? 'صفحات ترسیم و محورها' : 'Surfaces & Axes'}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono font-bold">
            {surfaceType.toUpperCase()}
          </span>
        </div>
        <ChevronLeft className="w-3.5 h-3.5 text-sky-400 group-hover:-translate-x-0.5 transition-transform rtl:rotate-180" />
      </button>
    );
  }

  return (
    <aside
      id="surface-controller-drawer"
      aria-label={isFa ? 'کنترل صفحات سه‌بعدی و محورها' : '3D Surface & Axes Controller'}
      className="fixed top-20 right-3 sm:right-5 z-30 w-72 sm:w-80 max-h-[calc(100vh-6.5rem)] overflow-y-auto bg-slate-950/94 backdrop-blur-2xl border border-sky-500/35 rounded-2xl shadow-2xl p-3 text-slate-100 flex flex-col gap-2.5 transition-all duration-300 ease-out select-none"
      dir={isFa ? 'rtl' : 'ltr'}
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#0284c7 #0f172a' }}
    >
      {/* Optional Top Right-Panel Tab Bar */}
      {onSelectPanelTab && (
        <div className="flex items-center gap-1 p-0.5 bg-black/40 rounded-xl border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => onSelectPanelTab('surfaces')}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg transition-all cursor-pointer ${
              activePanelTab === 'surfaces'
                ? 'bg-sky-500 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-sky-300" />
            <span>{isFa ? 'صفحات ترسیم' : 'Planes'}</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectPanelTab('layers')}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg transition-all cursor-pointer ${
              activePanelTab === 'layers'
                ? 'bg-indigo-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-300" />
            <span>{isFa ? 'لایه‌ها' : 'Layers'}</span>
          </button>
          {hasSelection && (
            <button
              type="button"
              onClick={() => onSelectPanelTab('selection')}
              className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg transition-all cursor-pointer ${
                activePanelTab === 'selection'
                  ? 'bg-rose-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BoxIcon className="w-3.5 h-3.5 text-rose-300" />
              <span>{isFa ? 'ویرایش حجم' : 'Box'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onSelectPanelTab('materials')}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg transition-all cursor-pointer ${
              activePanelTab === 'materials'
                ? 'bg-amber-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-amber-300" />
            <span>{isFa ? 'متریال' : 'Mat'}</span>
          </button>
        </div>
      )}

      {/* Header bar: Surface title & expand/close toggle */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full ring-2 ring-sky-400/30 animate-pulse"
            style={{ backgroundColor: activePlane.color || '#38bdf8' }}
          />
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
              <span>{isFa ? 'صفحات ترسیم و محورها' : 'Surfaces & Axes'}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono font-bold">
                {surfaceType.toUpperCase()}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              {isFa ? (activePlane.nameFa || activePlane.name) : activePlane.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Toggle Axes XYZ */}
          <button
            type="button"
            onClick={onToggleAxes}
            className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
              showAxes
                ? 'bg-sky-500/25 text-sky-300 border border-sky-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title={isFa ? 'نمایش / پنهان محورهای سه‌بعدی (XYZ)' : 'Toggle 3D XYZ Axes'}
          >
            <Compass className="w-3.5 h-3.5" />
          </button>

          {/* Minimize / Expand section */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={isExpanded ? (isFa ? 'کوچک کردن' : 'Collapse') : (isFa ? 'بزرگ کردن' : 'Expand')}
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>

          {/* Retract drawer to right edge */}
          <button
            id="retract-surface-drawer-btn"
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={isFa ? 'بستن کشو (مشاهده تمام‌صفحه مدل)' : 'Collapse panel to edge'}
          >
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
      </div>

      {/* 3 Primary Surface Switcher Buttons */}
      <div className="grid grid-cols-3 gap-1.5">
        {/* XOY Surface (Floor/Plan) */}
        <button
          type="button"
          onClick={() => xoyPlane && onSelectPlane(xoyPlane.id)}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all border cursor-pointer ${
            activePlane.id === xoyPlane?.id || surfaceType === 'xoy'
              ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-md shadow-sky-500/10 font-bold scale-[1.02]'
              : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
          }`}
          title={isFa ? 'صفحه افقی کف و پلان (XOY)' : 'Horizontal Floor / Plan Plane (XOY)'}
        >
          <div className="flex items-center gap-1 text-xs font-bold font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span>XOY</span>
          </div>
          <span className="text-[10px] text-slate-300 mt-0.5 truncate max-w-full">
            {isFa ? 'کف / پلان' : 'Floor / Plan'}
          </span>
        </button>

        {/* XOZ Surface (Front) */}
        <button
          type="button"
          onClick={() => xozPlane && onSelectPlane(xozPlane.id)}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all border cursor-pointer ${
            activePlane.id === xozPlane?.id || surfaceType === 'xoz'
              ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 shadow-md shadow-emerald-500/10 font-bold scale-[1.02]'
              : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
          }`}
          title={isFa ? 'صفحه قائم نما از روبرو (XOZ)' : 'Vertical Front Elevation (XOZ)'}
        >
          <div className="flex items-center gap-1 text-xs font-bold font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>XOZ</span>
          </div>
          <span className="text-[10px] text-slate-300 mt-0.5 truncate max-w-full">
            {isFa ? 'از روبرو' : 'Front'}
          </span>
        </button>

        {/* YOZ Surface (Side/Section) */}
        <button
          type="button"
          onClick={() => yozPlane && onSelectPlane(yozPlane.id)}
          className={`flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all border cursor-pointer ${
            activePlane.id === yozPlane?.id || surfaceType === 'yoz'
              ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-md shadow-amber-500/10 font-bold scale-[1.02]'
              : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
          }`}
          title={isFa ? 'صفحه قائم برش جانبی (YOZ)' : 'Vertical Side Section (YOZ)'}
        >
          <div className="flex items-center gap-1 text-xs font-bold font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>YOZ</span>
          </div>
          <span className="text-[10px] text-slate-300 mt-0.5 truncate max-w-full">
            {isFa ? 'برش جانبی' : 'Side'}
          </span>
        </button>
      </div>

      {/* Expanded Surface Movement & Offset Controls */}
      {isExpanded && (
        <div className="flex flex-col gap-2.5 pt-2 border-t border-white/10">
          {/* Active Movement Axis & Current Coordinate */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Move3d className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-semibold">{activeAxisLabel}:</span>
            </div>
            <div className="flex items-center gap-1 font-mono font-bold text-sky-300 bg-sky-500/15 px-2 py-0.5 rounded-lg border border-sky-400/30">
              <span>{currentOffset >= 0 ? `+${currentOffset.toFixed(2)}` : currentOffset.toFixed(2)}</span>
              <span className="text-[10px] text-slate-400 font-sans">m</span>
            </div>
          </div>

          {/* Slider to smoothly slide surface along its normal axis */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>{minSlider}m</span>
              <span className="text-slate-400">{isFa ? 'جابجایی تراز صفحه' : 'Slide plane position'}</span>
              <span>+{maxSlider}m</span>
            </div>
            <input
              type="range"
              min={minSlider}
              max={maxSlider}
              step={0.1}
              value={Number(currentOffset.toFixed(2))}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onSetPlaneAbsoluteOffset(activePlane.id, activeAxisName, val);
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          {/* Precise Nudge Buttons */}
          <div className="grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => onUpdatePlaneOffset(activePlane.id, -1.0)}
              className="py-1 px-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-mono text-slate-300 hover:text-white transition-colors text-center cursor-pointer active:scale-95"
              title={isFa ? '۱ متر به عقب' : '1m back'}
            >
              -1.0m
            </button>
            <button
              type="button"
              onClick={() => onUpdatePlaneOffset(activePlane.id, -0.2)}
              className="py-1 px-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-mono text-slate-300 hover:text-white transition-colors text-center cursor-pointer active:scale-95"
              title={isFa ? '۰.۲ متر به عقب' : '0.2m back'}
            >
              -0.2m
            </button>
            <button
              type="button"
              onClick={() => onUpdatePlaneOffset(activePlane.id, 0.2)}
              className="py-1 px-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-mono text-slate-300 hover:text-white transition-colors text-center cursor-pointer active:scale-95"
              title={isFa ? '۰.۲ متر به جلو' : '0.2m forward'}
            >
              +0.2m
            </button>
            <button
              type="button"
              onClick={() => onUpdatePlaneOffset(activePlane.id, 1.0)}
              className="py-1 px-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-mono text-slate-300 hover:text-white transition-colors text-center cursor-pointer active:scale-95"
              title={isFa ? '۱ متر به جلو' : '1m forward'}
            >
              +1.0m
            </button>
          </div>

          {/* Architectural Level Presets */}
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400 font-medium">
              {isFa ? 'ترازهای معماری پیشنهادی:' : 'Architectural Level Presets:'}
            </div>
            <div className="flex flex-wrap gap-1">
              {currentPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSetPlaneAbsoluteOffset(activePlane.id, activeAxisName, preset.val)}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                    Math.abs(currentOffset - preset.val) < 0.05
                      ? 'bg-sky-500 text-white border-sky-400 shadow font-bold'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onSetPlaneAbsoluteOffset(activePlane.id, activeAxisName, 0.0)}
                className="text-[10px] px-2 py-0.5 rounded-lg border border-dashed border-white/20 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                title={isFa ? 'تنظیم مجدد روی مبداء صفر' : 'Reset to Origin (0.0m)'}
              >
                <RotateCcw className="w-2.5 h-2.5 inline ml-1 rtl:mr-0 rtl:ml-1" />
                0.0m
              </button>
            </div>
          </div>

          {/* Action: Align Camera to Surface */}
          <button
            type="button"
            onClick={() => onAlignCameraToPlane(activePlane)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-sky-200 text-xs font-semibold transition-all shadow-sm cursor-pointer active:scale-98"
          >
            <Crosshair className="w-3.5 h-3.5 text-sky-400" />
            <span>{isFa ? 'دید مستقیم و عمود بر صفحه' : 'Snap Camera Orthogonal to Plane'}</span>
          </button>
        </div>
      )}
    </aside>
  );
}
