import React, { useState } from 'react';
import {
  Camera,
  Compass,
  Download,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Maximize2,
  BookmarkPlus,
  Eye,
  Grid,
  Languages,
  Box,
  Palette,
  Magnet,
  Sliders,
  Settings,
} from 'lucide-react';
import { LensFocalLength, DrawingPlane, CameraBookmark, Point3D, SnapSettings } from '../types';

interface TopBarProps {
  focalLength: LensFocalLength;
  isOrtho: boolean;
  activePlane: DrawingPlane;
  planes: DrawingPlane[];
  showPlaneGrid: boolean;
  showGroundGrid: boolean;
  onToggleAllGrids?: () => void;
  shadingMode: 'shaded' | 'wireframe';
  onToggleShadingMode: () => void;
  isMaterialPanelOpen?: boolean;
  onToggleMaterialPanel?: () => void;
  snapSettings?: SnapSettings;
  onToggleSnap?: () => void;
  onOpenSnapSettings?: () => void;
  bookmarks: CameraBookmark[];
  onSelectFocalLength: (f: LensFocalLength) => void;
  onToggleOrtho: () => void;
  onSetViewPreset: (preset: 'front' | 'side' | 'top' | 'perspective' | 'isometric') => void;
  onResetView: () => void;
  onSaveBookmark: () => void;
  onSelectBookmark: (b: CameraBookmark) => void;
  onTogglePlaneGrid: () => void;
  onToggleGroundGrid: () => void;
  onSelectPlane: (planeId: string) => void;
  onOpenPlaneManager: () => void;
  onOpenHelp: () => void;
  onResetToDemo: () => void;
  onClearAll: () => void;
  onExportImage: () => void;
  onExportJson: () => void;
  lang: 'fa' | 'en';
  onToggleLang: () => void;
}

const FOCAL_LENGTHS: LensFocalLength[] = [17, 24, 35, 50, 85];

export const TopBar: React.FC<TopBarProps> = ({
  focalLength,
  isOrtho,
  activePlane,
  planes,
  showPlaneGrid,
  showGroundGrid,
  onToggleAllGrids,
  shadingMode,
  onToggleShadingMode,
  isMaterialPanelOpen = false,
  onToggleMaterialPanel,
  snapSettings,
  onToggleSnap,
  onOpenSnapSettings,
  bookmarks,
  onSelectFocalLength,
  onToggleOrtho,
  onSetViewPreset,
  onResetView,
  onSaveBookmark,
  onSelectBookmark,
  onTogglePlaneGrid,
  onToggleGroundGrid,
  onSelectPlane,
  onOpenPlaneManager,
  onOpenHelp,
  onResetToDemo,
  onClearAll,
  onExportImage,
  onExportJson,
  lang,
  onToggleLang,
}) => {
  const [showLensMenu, setShowLensMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showPlaneDropdown, setShowPlaneDropdown] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const isFa = lang === 'fa';

  return (
    <header
      id="top-bar-container"
      className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none"
      dir={isFa ? 'rtl' : 'ltr'}
    >
      {/* Left: App Title & Active Drawing Plane Badge */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-2.5 bg-slate-900/60 backdrop-blur-xl px-4 py-2 rounded-2xl shadow-2xl border border-white/10 text-slate-100">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-indigo-500/25">
            3D
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold tracking-tight leading-none text-white flex items-center gap-1">
              <span>{isFa ? 'اسکیس سه‌بعدی' : 'SKETCH'}</span>
              <span className="text-indigo-400 font-mono">3D</span>
            </h1>
            <span className="text-[10px] text-slate-400 leading-none">
              {isFa ? 'طراحی فضایی معماری' : 'Spatial Architectural Sketching'}
            </span>
          </div>
        </div>

        {/* Active Plane Switcher Pill */}
        <div className="relative">
          <button
            id="active-plane-selector-btn"
            onClick={() => setShowPlaneDropdown(!showPlaneDropdown)}
            className="flex items-center gap-2 bg-slate-900/60 backdrop-blur-xl px-3.5 py-2 rounded-2xl shadow-xl border border-white/10 hover:bg-white/10 text-slate-200 transition-all hover:border-indigo-500/40"
            title={isFa ? 'انتخاب بوم سه‌بعدی برای ترسیم' : 'Select Active 3D Plane'}
          >
            <span
              className="w-2.5 h-2.5 rounded-full ring-2 ring-white/20"
              style={{ backgroundColor: activePlane?.color || '#6366f1' }}
            />
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-slate-400 leading-tight">
                {isFa ? 'بوم فعال:' : 'Active Canvas:'}
              </span>
              <span className="text-xs font-semibold text-slate-100 leading-tight">
                {isFa ? activePlane?.nameFa || activePlane?.name : activePlane?.name}
              </span>
            </div>
          </button>

          {showPlaneDropdown && (
            <div className="absolute top-full mt-2 left-0 w-64 bg-slate-900/90 backdrop-blur-2xl rounded-2xl p-2 shadow-2xl border border-white/15 z-30 space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-400">
                {isFa ? 'بوم‌های طراحی موجود:' : 'Available Drawing Planes:'}
              </div>
              {planes.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectPlane(p.id);
                    setShowPlaneDropdown(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                    p.id === activePlane?.id
                      ? 'bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span>{isFa ? p.nameFa || p.name : p.name}</span>
                  </div>
                  {p.id === activePlane?.id && (
                    <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded border border-indigo-500/30">
                      {isFa ? 'فعال' : 'Active'}
                    </span>
                  )}
                </button>
              ))}

              <div className="pt-1 border-t border-white/10">
                <button
                  onClick={() => {
                    setShowPlaneDropdown(false);
                    onOpenPlaneManager();
                  }}
                  className="w-full text-center py-1.5 text-xs text-indigo-400 font-medium hover:bg-indigo-500/10 rounded-xl transition-colors"
                >
                  {isFa ? 'مدیریت و افزودن بوم جدید...' : 'Manage & Add New Plane...'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center: Lens Focal Length Pill (Exact matching "17mm" badge in photo) */}
      <div className="pointer-events-auto relative hidden sm:block">
        <button
          id="focal-length-pill"
          onClick={() => setShowLensMenu(!showLensMenu)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-semibold px-4 py-2 rounded-full shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 border border-indigo-400/30 backdrop-blur-md"
          title={isFa ? 'زاویه دید لنز دوربین' : 'Camera Lens Focal Length'}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>{focalLength}mm</span>
          {isOrtho && <span className="text-[9px] bg-indigo-900 px-1.5 py-0.5 rounded text-indigo-200">Ortho</span>}
        </button>

        {showLensMenu && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-2xl rounded-2xl p-2.5 shadow-2xl border border-white/15 w-48 z-30">
            <div className="text-[11px] font-semibold text-slate-400 mb-1.5 px-2">
              {isFa ? 'فاصله کانونی لنز' : 'Lens Focal Length'}
            </div>
            <div className="grid grid-cols-2 gap-1 mb-2">
              {FOCAL_LENGTHS.map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    onSelectFocalLength(f);
                    setShowLensMenu(false);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-mono transition-colors text-center ${
                    focalLength === f
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {f}mm
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  onToggleOrtho();
                  setShowLensMenu(false);
                }}
                className={`w-full py-1.5 px-2 rounded-xl text-xs text-center transition-colors ${
                  isOrtho
                    ? 'bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30'
                    : 'text-slate-400 hover:bg-white/10'
                }`}
              >
                {isFa ? 'پرسپکتیو / ایزومتریک' : 'Toggle Ortho View'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Controls: View Presets, Grids, Export, Guide */}
      <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/60 backdrop-blur-xl p-1.5 rounded-2xl shadow-2xl border border-white/10 text-slate-200">
        {/* Camera Preset Angles Menu */}
        <div className="relative">
          <button
            id="camera-presets-btn"
            onClick={() => setShowViewMenu(!showViewMenu)}
            className="p-2 text-slate-300 hover:text-indigo-400 hover:bg-white/10 rounded-xl transition-colors"
            title={isFa ? 'زوایای استاندارد دوربین' : 'Camera View Presets'}
          >
            <Compass className="w-4 h-4" />
          </button>

          {showViewMenu && (
            <div className="absolute top-full mt-2 right-0 w-52 bg-slate-900/90 backdrop-blur-2xl rounded-2xl p-2 shadow-2xl border border-white/15 z-30 space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-400">
                {isFa ? 'زوایای دید استاندارد:' : 'Standard View Angles:'}
              </div>
              <button
                onClick={() => {
                  onSetViewPreset('perspective');
                  setShowViewMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors"
              >
                {isFa ? 'پرسپکتیو ۳/۴ (مانند عکس)' : 'Perspective 3/4 (Like Photo)'}
              </button>
              <button
                onClick={() => {
                  onSetViewPreset('front');
                  setShowViewMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors"
              >
                {isFa ? 'نمای روبرو (Front Elevation)' : 'Front Elevation'}
              </button>
              <button
                onClick={() => {
                  onSetViewPreset('side');
                  setShowViewMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors"
              >
                {isFa ? 'نمای جانبی (Side View)' : 'Side View'}
              </button>
              <button
                onClick={() => {
                  onSetViewPreset('top');
                  setShowViewMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors"
              >
                {isFa ? 'پلان از بالا (Top Plan)' : 'Top Plan View'}
              </button>
              <button
                onClick={() => {
                  onSetViewPreset('isometric');
                  setShowViewMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors"
              >
                {isFa ? 'دید آگزونومتریک (Isometric)' : 'Isometric Axonometric'}
              </button>

              {bookmarks.length > 0 && (
                <>
                  <div className="pt-1 border-t border-white/10 px-2 py-1 text-[11px] font-semibold text-slate-400">
                    {isFa ? 'دیدهای ذخیره شده:' : 'Saved Bookmarks:'}
                  </div>
                  {bookmarks.map((bm) => (
                    <button
                      key={bm.id}
                      onClick={() => {
                        onSelectBookmark(bm);
                        setShowViewMenu(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-slate-400 hover:bg-white/10 hover:text-slate-200"
                    >
                      {bm.name}
                    </button>
                  ))}
                </>
              )}

              <div className="pt-1 border-t border-white/10">
                <button
                  onClick={() => {
                    onSaveBookmark();
                    setShowViewMenu(false);
                  }}
                  className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-colors"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>{isFa ? 'ذخیره دید فعلی' : 'Bookmark View'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* All Grids & Helper Planes Toggle (G) */}
        <button
          id="toggle-all-grids-btn"
          onClick={onToggleAllGrids || onTogglePlaneGrid}
          className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-medium border ${
            showPlaneGrid || showGroundGrid
              ? 'text-indigo-200 bg-indigo-500/20 border-indigo-500/40 shadow-sm'
              : 'text-slate-400 bg-white/5 border-white/10 hover:text-slate-200 hover:bg-white/10'
          }`}
          title={isFa ? 'نمایش/پنهان‌سازی تمام گریدها و صفحات کمکی (کلید G)' : 'Toggle all grids & helper planes (Key G)'}
        >
          <Grid className="w-4 h-4" />
          <span className="hidden sm:inline">{isFa ? 'گریدها (G)' : 'Grids (G)'}</span>
        </button>

        {/* 3ds Max Style 3D Snap-to-Grid Toggle & Settings */}
        {snapSettings && (
          <div className="flex items-center bg-slate-900/60 rounded-xl border border-white/10 p-0.5 shadow-sm">
            <button
              id="toggle-snap-grid-btn"
              onClick={onToggleSnap}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium ${
                snapSettings.enabled
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/10'
              }`}
              title={
                isFa
                  ? `آهنربا و اسنپ سه‌بعدی به گرید و رئوس (Shift+S) - ${snapSettings.enabled ? 'فعال' : 'غیرفعال'}`
                  : `3D Snap to Grid & Vertices (Shift+S) - ${snapSettings.enabled ? 'ON' : 'OFF'}`
              }
            >
              <Magnet className={`w-3.5 h-3.5 ${snapSettings.enabled ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">{isFa ? 'اسنپ' : 'Snap'}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  snapSettings.enabled ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-slate-600'
                }`}
              />
            </button>

            {onOpenSnapSettings && (
              <button
                id="open-snap-settings-btn"
                onClick={onOpenSnapSettings}
                className="p-1.5 text-slate-400 hover:text-emerald-300 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title={isFa ? 'تنظیمات گرید و آهنربای سه‌بعدی (3ds Max Snaps)' : 'Grid & Snap Settings'}
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Shading Mode (Shaded / Solid vs Wireframe) Toggle */}
        <button
          id="toggle-shading-mode-btn"
          onClick={onToggleShadingMode}
          className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-medium border ${
            shadingMode === 'shaded'
              ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/40 shadow-sm'
              : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
          }`}
          title={
            isFa
              ? (shadingMode === 'shaded' ? 'نمایش توپر و سایه‌روشن فعال است (برای تغییر به خطی کلیک کنید)' : 'نمایش خطی وایرفریم فعال است (برای تغییر به توپر کلیک کنید)')
              : (shadingMode === 'shaded' ? 'Shaded mode active (Click to switch to Wireframe)' : 'Wireframe mode active (Click to switch to Shaded)')
          }
        >
          <Box className={`w-4 h-4 ${shadingMode === 'shaded' ? 'text-indigo-400' : 'text-slate-400'}`} />
          <span>{isFa ? (shadingMode === 'shaded' ? 'حالت توپر (Shade)' : 'حالت خطی (Wire)') : (shadingMode === 'shaded' ? 'Shaded' : 'Wireframe')}</span>
        </button>

        {/* Materials & Textures Panel Toggle */}
        {onToggleMaterialPanel && (
          <button
            id="toggle-material-panel-btn"
            onClick={onToggleMaterialPanel}
            className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-medium border cursor-pointer ${
              isMaterialPanelOpen
                ? 'bg-amber-600/30 text-amber-200 border-amber-500/40 shadow-sm'
                : 'bg-white/5 text-slate-400 border-white/10 hover:text-amber-300 hover:bg-white/10'
            }`}
            title={isFa ? 'پنل بافت و متریال احجام (بتن، شیشه، چوب، فلز)' : 'Materials & Textures Panel (Concrete, Glass, Wood, Metal)'}
          >
            <Palette className={`w-4 h-4 ${isMaterialPanelOpen ? 'text-amber-400' : 'text-amber-300/70'}`} />
            <span className="hidden md:inline">{isFa ? 'متریال‌ها' : 'Materials'}</span>
          </button>
        )}

        {/* Reset Camera View */}
        <button
          onClick={onResetView}
          className="p-2 text-slate-300 hover:text-indigo-400 hover:bg-white/10 rounded-xl transition-colors"
          title={isFa ? 'بازنشانی زاویه دید دوربین' : 'Reset Camera View'}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="p-2 text-slate-300 hover:text-indigo-400 hover:bg-white/10 rounded-xl transition-colors"
            title={isFa ? 'خروجی تصویر و پروژه' : 'Export'}
          >
            <Download className="w-4 h-4" />
          </button>

          {showExportMenu && (
            <div className="absolute top-full mt-2 right-0 w-48 bg-slate-900/90 backdrop-blur-2xl rounded-2xl p-2 shadow-2xl border border-white/15 z-30 space-y-1">
              <button
                onClick={() => {
                  onExportImage();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors"
              >
                {isFa ? 'ذخیره تصویر (PNG)' : 'Export Image (PNG)'}
              </button>
              <button
                onClick={() => {
                  onExportJson();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors"
              >
                {isFa ? 'ذخیره پروژه سه‌بعدی (JSON)' : 'Save Project (JSON)'}
              </button>
              <div className="pt-1 border-t border-white/10">
                <button
                  onClick={() => {
                    onResetToDemo();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-amber-400 hover:bg-amber-500/10 transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{isFa ? 'بارگذاری مجدد مدل نمونه' : 'Reload Demo Sketch'}</span>
                </button>
                <button
                  onClick={() => {
                    onClearAll();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  {isFa ? 'پاک کردن کل بوم' : 'Clear All Strokes'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Language Toggle */}
        <button
          onClick={onToggleLang}
          className="p-2 text-slate-300 hover:text-indigo-400 hover:bg-white/10 rounded-xl transition-colors font-mono text-xs font-semibold"
          title={isFa ? 'تغییر به زبان انگلیسی' : 'Switch to Persian'}
        >
          {isFa ? 'EN' : 'فا'}
        </button>

        {/* Grid & Snap Settings */}
        {onOpenSnapSettings && (
          <button
            id="topbar-settings-btn"
            onClick={onOpenSnapSettings}
            className="p-2 text-slate-300 hover:text-emerald-400 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title={isFa ? 'تنظیمات گرید، آهنربا و اسنپ (3ds Max Snaps)' : 'Grid & Snap Settings'}
          >
            <Settings className="w-4 h-4" />
          </button>
        )}

        {/* Help Guide */}
        <button
          onClick={onOpenHelp}
          className="p-2 text-slate-300 hover:text-indigo-400 hover:bg-white/10 rounded-xl transition-colors"
          title={isFa ? 'راهنمای کار با اپلیکیشن' : 'How to Use'}
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
