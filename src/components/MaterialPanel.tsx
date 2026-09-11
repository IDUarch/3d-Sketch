import React, { useState } from 'react';
import {
  Palette,
  X,
  Layers,
  Compass,
  Box as BoxIcon,
  Sparkles,
  Sliders,
  RotateCcw,
  Check,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Stroke, BoxMaterial, MaterialPresetId } from '../types';
import { MATERIAL_PRESETS, MaterialPresetDefinition } from '../utils/materials';

interface MaterialPanelProps {
  strokes: Stroke[];
  selectedStrokeIds: string[];
  onApplyMaterial: (strokeIds: string[], material: BoxMaterial) => void;
  onResetMaterial: (strokeIds: string[]) => void;
  lang: 'fa' | 'en';
  isOpen?: boolean;
  onToggleOpen?: (open: boolean) => void;
  activePanelTab?: 'surfaces' | 'layers' | 'selection' | 'materials';
  onSelectPanelTab?: (tab: 'surfaces' | 'layers' | 'selection' | 'materials') => void;
}

const COLOR_SWATCHES = [
  { hex: '#94a3b8', nameFa: 'بتنی', nameEn: 'Concrete' },
  { hex: '#93c5fd', nameFa: 'شیشه آبی', nameEn: 'Ice Blue' },
  { hex: '#b45309', nameFa: 'چوب بلوط', nameEn: 'Warm Oak' },
  { hex: '#e2e8f0', nameFa: 'آلومینیوم', nameEn: 'Aluminum' },
  { hex: '#b91c1c', nameFa: 'آجر سرخ', nameEn: 'Brick Red' },
  { hex: '#f8fafc', nameFa: 'سفید مرمر', nameEn: 'Carrara' },
  { hex: '#1e293b', nameFa: 'فولاد تیره', nameEn: 'Dark Steel' },
  { hex: '#8b5cf6', nameFa: 'بنفش استودیو', nameEn: 'Studio Tint' },
];

export const MaterialPanel: React.FC<MaterialPanelProps> = ({
  strokes,
  selectedStrokeIds,
  onApplyMaterial,
  onResetMaterial,
  lang,
  isOpen = true,
  onToggleOpen,
  activePanelTab = 'materials',
  onSelectPanelTab,
}) => {
  const isFa = lang === 'fa';

  // Get selected box strokes
  const selectedBoxes = strokes.filter(
    (s) => selectedStrokeIds.includes(s.id) && (s.tool === 'box' || s.boxData)
  );
  const targetBox = selectedBoxes.length > 0 ? selectedBoxes[0] : null;

  // Active or selected preset
  const activePresetId: MaterialPresetId = targetBox?.material?.preset || 'concrete';
  const [selectedPresetId, setSelectedPresetId] = useState<MaterialPresetId>(activePresetId);

  // Custom tuning state
  const presetDef: MaterialPresetDefinition = MATERIAL_PRESETS[selectedPresetId] || MATERIAL_PRESETS.concrete;
  const [roughness, setRoughness] = useState<number>(targetBox?.material?.roughness ?? presetDef.roughness);
  const [metalness, setMetalness] = useState<number>(targetBox?.material?.metalness ?? presetDef.metalness);
  const [opacity, setOpacity] = useState<number>(targetBox?.material?.opacity ?? presetDef.opacity);
  const [textureScale, setTextureScale] = useState<number>(targetBox?.material?.textureScale ?? presetDef.textureScale);
  const [customColor, setCustomColor] = useState<string>(targetBox?.material?.color || presetDef.defaultColor);

  const handleSelectPreset = (presetId: MaterialPresetId) => {
    setSelectedPresetId(presetId);
    const def = MATERIAL_PRESETS[presetId];
    setRoughness(def.roughness);
    setMetalness(def.metalness);
    setOpacity(def.opacity);
    setTextureScale(def.textureScale);
    setCustomColor(def.defaultColor);

    // If one or more boxes are currently selected, immediately apply!
    if (selectedBoxes.length > 0) {
      const mat: BoxMaterial = {
        preset: presetId,
        color: def.defaultColor,
        roughness: def.roughness,
        metalness: def.metalness,
        opacity: def.opacity,
        transparent: def.transparent,
        textureScale: def.textureScale,
      };
      onApplyMaterial(
        selectedBoxes.map((b) => b.id),
        mat
      );
    }
  };

  const handleApplyCurrent = () => {
    const ids = selectedBoxes.length > 0 ? selectedBoxes.map((b) => b.id) : strokes.filter((s) => s.tool === 'box' || s.boxData).map((s) => s.id);
    if (ids.length === 0) return;

    const def = MATERIAL_PRESETS[selectedPresetId];
    const mat: BoxMaterial = {
      preset: selectedPresetId,
      color: customColor,
      roughness,
      metalness,
      opacity,
      transparent: opacity < 1.0 || def.transparent,
      textureScale,
    };
    onApplyMaterial(ids, mat);
  };

  const handleApplyAll = () => {
    const allBoxIds = strokes.filter((s) => s.tool === 'box' || s.boxData).map((s) => s.id);
    if (allBoxIds.length === 0) return;

    const def = MATERIAL_PRESETS[selectedPresetId];
    const mat: BoxMaterial = {
      preset: selectedPresetId,
      color: customColor,
      roughness,
      metalness,
      opacity,
      transparent: opacity < 1.0 || def.transparent,
      textureScale,
    };
    onApplyMaterial(allBoxIds, mat);
  };

  const handleReset = () => {
    if (selectedBoxes.length > 0) {
      onResetMaterial(selectedBoxes.map((b) => b.id));
    } else {
      const allBoxIds = strokes.filter((s) => s.tool === 'box' || s.boxData).map((s) => s.id);
      onResetMaterial(allBoxIds);
    }
  };

  if (!isOpen) {
    return (
      <button
        id="open-material-panel-btn"
        type="button"
        onClick={() => onToggleOpen?.(true)}
        className="fixed top-20 right-3 sm:right-5 z-30 p-2.5 bg-slate-900/90 backdrop-blur-xl border border-amber-500/40 hover:border-amber-400 text-amber-300 rounded-2xl shadow-2xl transition-all flex items-center gap-2 cursor-pointer group"
        title={isFa ? 'باز کردن پنل متریال و بافت (M)' : 'Open Material & Texture Panel'}
      >
        <Palette className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
        <span className="text-xs font-semibold pr-1 hidden sm:inline">
          {isFa ? 'متریال و بافت' : 'Materials'}
        </span>
        {isFa ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <aside
      id="material-texture-panel"
      className="fixed top-20 right-3 sm:right-5 z-30 w-80 sm:w-88 max-h-[calc(100vh-6.5rem)] overflow-y-auto bg-slate-950/95 backdrop-blur-2xl border border-amber-500/35 rounded-2xl shadow-2xl p-3 text-slate-100 flex flex-col gap-2.5 transition-all duration-300 ease-out select-none"
      dir={isFa ? 'rtl' : 'ltr'}
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#d97706 #0f172a' }}
    >
      {/* Top Right-Panel Tab Bar */}
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
            <span>{isFa ? 'صفحات' : 'Planes'}</span>
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
            <span>{isFa ? 'ویرایش' : 'Box'}</span>
          </button>
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
            <span>{isFa ? 'متریال' : 'Material'}</span>
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold tracking-tight text-white leading-tight">
              {isFa ? 'متریال و بافت سطوح' : 'Material & Textures'}
            </h2>
            <p className="text-[10px] text-amber-300/80">
              {isFa ? 'بتن، شیشه، چوب، فلز و سنگ با نورپردازی' : 'Concrete, Glass, Wood, Metal & Stone'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onToggleOpen?.(false)}
          className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          title={isFa ? 'بستن پنل' : 'Close Panel'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Target Volume Selection Status */}
      <div className="p-2 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${selectedBoxes.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400/60'}`} />
          <span className="text-slate-300">
            {selectedBoxes.length > 0
              ? isFa
                ? `${selectedBoxes.length} حجم سه‌بعدی انتخاب‌شده`
                : `${selectedBoxes.length} box volume${selectedBoxes.length > 1 ? 's' : ''} selected`
              : isFa
              ? 'هیچ مکعبی انتخاب نشده (اعمال روی پیش‌فرض)'
              : 'No box selected (applies to all/next)'}
          </span>
        </div>
        {targetBox?.material && (
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200 text-[10px] font-medium">
            {isFa ? MATERIAL_PRESETS[targetBox.material.preset]?.nameFa : MATERIAL_PRESETS[targetBox.material.preset]?.nameEn}
          </span>
        )}
      </div>

      {/* Material Presets Grid */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>{isFa ? 'انتخاب متریال آماده معماری' : 'Architectural Material Presets'}</span>
        </span>

        <div className="grid grid-cols-2 gap-1.5">
          {Object.values(MATERIAL_PRESETS).map((preset) => {
            const isCurrent = (targetBox?.material?.preset || selectedPresetId) === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                id={`mat-btn-${preset.id}`}
                onClick={() => handleSelectPreset(preset.id)}
                className={`p-2 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer flex flex-col gap-1 ${
                  isCurrent
                    ? 'bg-amber-500/15 border-amber-500/70 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
                    : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.08] hover:border-white/20'
                }`}
              >
                {/* Visual texture swatch banner */}
                <div className={`w-full h-8 rounded-lg bg-gradient-to-r ${preset.previewGradient} shadow-inner flex items-center justify-end p-1 relative`}>
                  {isCurrent && (
                    <div className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-[10px] shadow-sm">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-100 group-hover:text-amber-200 transition-colors">
                    {isFa ? preset.nameFa : preset.nameEn}
                  </span>
                  <span className="text-[9px] text-slate-400 line-clamp-1 leading-tight">
                    {isFa ? preset.descriptionFa : preset.descriptionEn}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Surface Appearance Fine-Tuning Section */}
      <div className="p-2.5 rounded-xl bg-black/30 border border-white/10 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
            <Sliders className="w-3 h-3 text-amber-400" />
            <span>{isFa ? 'تنظیمات پیشرفته بافت و بازتاب' : 'Appearance Customization'}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              const def = MATERIAL_PRESETS[selectedPresetId];
              setRoughness(def.roughness);
              setMetalness(def.metalness);
              setOpacity(def.opacity);
              setTextureScale(def.textureScale);
              setCustomColor(def.defaultColor);
            }}
            className="text-[10px] text-slate-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            title={isFa ? 'بازنشانی مقادیر پیش‌فرض متریال' : 'Reset preset defaults'}
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>{isFa ? 'پیش‌فرض' : 'Default'}</span>
          </button>
        </div>

        {/* Color Tint Chips */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400">
            {isFa ? 'ته‌رنگ متریال (Color Tint):' : 'Color Tint:'}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {COLOR_SWATCHES.map((sw) => (
              <button
                key={sw.hex}
                type="button"
                onClick={() => setCustomColor(sw.hex)}
                className={`w-6 h-6 rounded-lg transition-transform cursor-pointer border ${
                  customColor === sw.hex ? 'scale-110 border-white ring-2 ring-amber-400/50' : 'border-white/20 hover:scale-105'
                }`}
                style={{ backgroundColor: sw.hex }}
                title={isFa ? sw.nameFa : sw.nameEn}
              />
            ))}
            <input
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="w-6 h-6 rounded-lg cursor-pointer bg-transparent border border-white/20 p-0 overflow-hidden"
              title={isFa ? 'انتخاب رنگ دلخواه' : 'Custom color'}
            />
          </div>
        </div>

        {/* Roughness Slider */}
        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between text-[10px] text-slate-300">
            <span>{isFa ? 'زبری و ماتی (Roughness)' : 'Roughness (Matte vs Polished)'}</span>
            <span className="font-mono text-amber-300">{Math.round(roughness * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={roughness}
            onChange={(e) => setRoughness(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Metalness Slider */}
        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between text-[10px] text-slate-300">
            <span>{isFa ? 'خاصیت فلزی (Metalness)' : 'Metalness / Specular'}</span>
            <span className="font-mono text-amber-300">{Math.round(metalness * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={metalness}
            onChange={(e) => setMetalness(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Opacity Slider (Glass transparency) */}
        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between text-[10px] text-slate-300">
            <span>{isFa ? 'شفافیت و عبور نور (Opacity)' : 'Opacity / Transparency'}</span>
            <span className="font-mono text-amber-300">{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Texture Tiling / Scale Slider */}
        <div className="flex flex-col gap-0.5">
          <div className="flex justify-between text-[10px] text-slate-300">
            <span>{isFa ? 'تراکم و مقیاس بافت (Texture Tiling)' : 'Texture Scale (Tiling)'}</span>
            <span className="font-mono text-amber-300">{textureScale.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="4.0"
            step="0.25"
            value={textureScale}
            onChange={(e) => setTextureScale(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-1.5 pt-1">
        <button
          type="button"
          id="apply-material-btn"
          onClick={handleApplyCurrent}
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold text-xs shadow-lg shadow-amber-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            {selectedBoxes.length > 0
              ? isFa
                ? `اعمال به ${selectedBoxes.length} حجم انتخابی`
                : `Apply to ${selectedBoxes.length} Selected Box${selectedBoxes.length > 1 ? 'es' : ''}`
              : isFa
              ? 'اعمال به حجم‌های سه‌بعدی'
              : 'Apply to Box Volumes'}
          </span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleApplyAll}
            className="flex-1 py-1.5 px-2 rounded-xl bg-white/[0.06] hover:bg-white/10 text-slate-200 text-[11px] font-medium transition-colors border border-white/10 cursor-pointer text-center"
          >
            {isFa ? 'اعمال به همه مکعب‌ها' : 'Apply to All Boxes'}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="py-1.5 px-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[11px] font-medium transition-colors border border-rose-500/30 cursor-pointer"
            title={isFa ? 'بازنشانی متریال به حالت پیش‌فرض' : 'Reset to default studio tint'}
          >
            {isFa ? 'حذف بافت' : 'Reset'}
          </button>
        </div>
      </div>
    </aside>
  );
};
