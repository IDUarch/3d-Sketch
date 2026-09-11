import React from 'react';
import {
  Magnet,
  Grid,
  Box,
  Sliders,
  X,
  Sparkles,
  Check,
  Compass,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { SnapSettings } from '../types';

interface SnapSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SnapSettings;
  onUpdateSettings: (newSettings: Partial<SnapSettings>) => void;
  lang: 'fa' | 'en';
}

const GRID_PRESETS = [0.1, 0.25, 0.5, 1.0, 2.0];

export const SnapSettingsModal: React.FC<SnapSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  lang,
}) => {
  if (!isOpen) return null;

  const isFa = lang === 'fa';

  return (
    <div
      id="snap-settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      dir={isFa ? 'rtl' : 'ltr'}
    >
      <div
        id="snap-settings-modal-card"
        className="w-full max-w-lg bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-6 text-slate-100 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-lg transition-colors ${
                settings.enabled
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-emerald-500/20'
                  : 'bg-white/10 border-white/15 text-slate-400'
              }`}
            >
              <Magnet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  {isFa ? 'تنظیمات گرید و آهنربای سه‌بعدی' : '3ds Max Grid & Snap Settings'}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  {isFa ? 'حالت CAD' : 'CAD Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isFa
                  ? 'قفل حرکت نشانگر و ترسیم خطوط و احجام روی تقاطع‌های گرید و رئوس احجام'
                  : 'Constrain cursor and strokes to grid intersections and volume vertices'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Master Snap-to-Grid Toggle Banner */}
          <div
            className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
              settings.enabled
                ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-950/40'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  {isFa ? 'آهنربا و اسنپ سه‌بعدی (Snap-to-Grid)' : 'Snap-to-Grid (Master Toggle)'}
                </span>
                <span className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-slate-300">
                  Shift + S
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {settings.enabled
                  ? isFa
                    ? 'فعال: خطوط، مکعب‌ها و نشانگر به دقت به گرید و رئوس متصل می‌شوند.'
                    : 'Active: Cursor and stroke drawing magnetically lock to coordinates.'
                  : isFa
                    ? 'غیرفعال: ترسیم آزاد بدون انطباق هندسی با گرید.'
                    : 'Disabled: Freehand drawing without geometric grid constraints.'}
              </p>
            </div>

            <button
              id="master-snap-toggle-switch"
              onClick={() => onUpdateSettings({ enabled: !settings.enabled })}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                settings.enabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.enabled
                    ? isFa
                      ? '-translate-x-7'
                      : 'translate-x-7'
                    : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Snapping Target Options (3ds Max Snap Categories) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isFa ? 'اهداف آهنربایی فعال (Snap Types)' : 'Active Snap Targets (3ds Max Style)'}
            </h3>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Option 1: Grid Intersection Points */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  settings.gridIntersection
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                <input
                  type="checkbox"
                  checked={settings.gridIntersection}
                  onChange={(e) => onUpdateSettings({ gridIntersection: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-slate-800"
                />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <Grid className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-100">
                      {isFa ? 'نقاط تقاطع گرید (Grid Intersections)' : 'Grid Intersection Points'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isFa
                      ? 'قفل کردن موقعیت قلم و احجام بر روی خطوط متقاطع شطرنجی صفحه فعال'
                      : 'Align cursor movement and stroke placement to reference grid coordinate intersections'}
                  </p>
                </div>
              </label>

              {/* Option 2: Volume Vertices */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  settings.volumeVertex
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-white'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                <input
                  type="checkbox"
                  checked={settings.volumeVertex}
                  onChange={(e) => onUpdateSettings({ volumeVertex: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-600 text-cyan-600 focus:ring-cyan-500 bg-slate-800"
                />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold text-slate-100">
                      {isFa ? 'رئوس و گوشه‌های احجام (Volume Vertices)' : 'Volume & Box Vertices (Vertex)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isFa
                      ? 'اتصال مغناطیسی خودکار به ۸ گوشه و رئوس احجام و مکعب‌های ساخته‌شده'
                      : 'Forces alignment to 8 corner vertices and sub-elements of created 3D volumes'}
                  </p>
                </div>
              </label>

              {/* Option 3: Volume Edges / Midpoints */}
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  settings.volumeEdge
                    ? 'bg-amber-500/10 border-amber-500/40 text-white'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                <input
                  type="checkbox"
                  checked={settings.volumeEdge}
                  onChange={(e) => onUpdateSettings({ volumeEdge: e.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-600 text-amber-600 focus:ring-amber-500 bg-slate-800"
                />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-slate-100">
                      {isFa ? 'سگمنت‌ها و نقاط میانی (Edge Midpoints)' : 'Volume Edges & Midpoints (Edge)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isFa
                      ? 'انطباق با سگمنت‌های متصل و نقطه مرکزی لبه‌های مکعب‌ها'
                      : 'Snap to edge segments and midpoints of created boxes'}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Grid Spacing / Snap Step */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {isFa ? 'فواصل گرید آهنربا (Grid Spacing)' : 'Grid Snap Spacing'}
              </h3>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                {settings.gridSize.toFixed(2)} m
              </span>
            </div>

            {/* Quick Preset Buttons */}
            <div className="grid grid-cols-5 gap-2">
              {GRID_PRESETS.map((size) => (
                <button
                  key={size}
                  onClick={() => onUpdateSettings({ gridSize: size })}
                  className={`py-1.5 px-2 rounded-xl text-xs font-mono font-medium border transition-all ${
                    Math.abs(settings.gridSize - size) < 0.01
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-500/20'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {size}m
                </button>
              ))}
            </div>

            {/* Range Slider for Fine Adjustment */}
            <div className="space-y-1.5 pt-1">
              <input
                type="range"
                min="0.05"
                max="3.0"
                step="0.05"
                value={settings.gridSize}
                onChange={(e) => onUpdateSettings({ gridSize: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.05m (Fine)</span>
                <span>0.5m (Standard)</span>
                <span>3.0m (Coarse)</span>
              </div>
            </div>
          </div>

          {/* Magnetic Sensitivity & Visual Reticle */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                {isFa ? 'فاصله گیرایی مغناطیسی (Pixel Radius)' : 'Magnetic Snap Radius'}
              </label>
              <span className="text-xs font-mono text-slate-400">
                {settings.magneticRadius} px
              </span>
            </div>
            <input
              type="range"
              min="12"
              max="40"
              step="2"
              value={settings.magneticRadius}
              onChange={(e) => onUpdateSettings({ magneticRadius: parseInt(e.target.value, 10) })}
              className="w-full accent-indigo-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />

            {/* Show Snap Indicator Glyph */}
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={settings.showSnapGlyph}
                onChange={(e) => onUpdateSettings({ showSnapGlyph: e.target.checked })}
                className="h-4 w-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-slate-800"
              />
              <span>
                {isFa
                  ? 'نمایش نشانگرهای گرافیکی 3ds Max در موقعیت اسنپ (Glyphs)'
                  : 'Display 3ds Max style snap glyphs & coordinate tags on viewport'}
              </span>
            </label>
          </div>

          {/* 3ds Max Snap Legend */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-2 text-[11px] text-slate-400">
            <div className="font-semibold text-slate-300">
              {isFa ? 'راهنمای نشانگرهای آهنربا (3ds Max Glyphs):' : 'Snap Markers Legend:'}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-1.5 text-emerald-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                <span>{isFa ? 'تقاطع گرید' : 'Grid Int.'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-cyan-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block" />
                <span>{isFa ? 'راس مکعب' : 'Vertex'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
                <span>{isFa ? 'لبه و میانه' : 'Edge Mid.'}</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <button
              onClick={() =>
                onUpdateSettings({
                  enabled: true,
                  gridIntersection: true,
                  volumeVertex: true,
                  volumeEdge: true,
                  gridSize: 0.5,
                  magneticRadius: 24,
                  showSnapGlyph: true,
                })
              }
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              {isFa ? 'بازنشانی به پیش‌فرض' : 'Reset to Defaults'}
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              {isFa ? 'تایید و بستن' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
