import React, { useState } from 'react';
import { Layer } from '../types';
import {
  Layers,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Sparkles,
  Compass,
  Box as BoxIcon,
  Palette,
} from 'lucide-react';

interface LayerPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onSelectLayer: (layerId: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
  onChangeOpacity: (layerId: string, opacity: number) => void;
  onAddLayer: () => void;
  onDeleteLayer: (layerId: string) => void;
  onRenameLayer: (layerId: string, name: string) => void;
  strokeCounts: Record<string, number>;
  lang: 'fa' | 'en';
  isOpen?: boolean;
  onToggleOpen?: (open: boolean) => void;
  activePanelTab?: 'surfaces' | 'layers' | 'selection' | 'materials';
  onSelectPanelTab?: (tab: 'surfaces' | 'layers' | 'selection' | 'materials') => void;
  hasSelection?: boolean;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  activeLayerId,
  onSelectLayer,
  onToggleVisibility,
  onToggleLock,
  onChangeOpacity,
  onAddLayer,
  onDeleteLayer,
  onRenameLayer,
  strokeCounts,
  lang,
  isOpen,
  onToggleOpen,
  activePanelTab = 'layers',
  onSelectPanelTab,
  hasSelection = false,
}) => {
  const [internalDrawerOpen, setInternalDrawerOpen] = useState(true);
  const isDrawerOpen = isOpen !== undefined ? isOpen : internalDrawerOpen;
  const setDrawerOpen = (open: boolean) => {
    setInternalDrawerOpen(open);
    onToggleOpen?.(open);
  };

  const [collapsed, setCollapsed] = useState(false);
  const [expandedSettingsId, setExpandedSettingsId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const isFa = lang === 'fa';

  const startRename = (layer: Layer) => {
    setEditingId(layer.id);
    setEditingName(isFa ? layer.nameFa || layer.name : layer.name);
  };

  const finishRename = (layerId: string) => {
    if (editingName.trim()) {
      onRenameLayer(layerId, editingName.trim());
    }
    setEditingId(null);
  };

  if (!isDrawerOpen) {
    return (
      <button
        id="open-layer-drawer-btn"
        onClick={() => setDrawerOpen(true)}
        className="fixed top-20 right-0 z-30 flex items-center gap-2 px-3 py-2.5 bg-slate-900/85 backdrop-blur-xl border-y border-l border-white/15 rounded-l-2xl shadow-2xl text-slate-200 hover:text-white hover:bg-slate-800/90 transition-all cursor-pointer group"
        title={isFa ? 'باز کردن کشوی مدیریت لایه‌ها' : 'Open Layers Drawer'}
        dir={isFa ? 'rtl' : 'ltr'}
      >
        <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-300">
          <Layers className="w-4 h-4" />
        </div>
        <span className="text-xs font-semibold">{isFa ? 'مدیریت لایه‌ها' : 'Layers'}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-indigo-300 font-mono font-bold">
          {layers.length}
        </span>
        <ChevronLeft className="w-3.5 h-3.5 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
      </button>
    );
  }

  return (
    <div
      id="layer-panel-container"
      className={`fixed top-20 right-3 sm:right-5 z-30 w-72 sm:w-80 max-h-[calc(100vh-6.5rem)] overflow-y-auto bg-slate-950/94 backdrop-blur-2xl rounded-2xl shadow-2xl border border-indigo-500/35 transition-all duration-300 text-slate-100 ${
        isFa ? 'font-[Vazirmatn]' : 'font-sans'
      }`}
      dir={isFa ? 'rtl' : 'ltr'}
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#6366f1 #0f172a' }}
    >
      {/* Optional Top Right-Panel Tab Bar */}
      {onSelectPanelTab && (
        <div className="p-2 pb-0">
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
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              {isFa ? 'مدیریت لایه‌ها' : 'Layers'}
            </h2>
            <span className="text-[11px] text-slate-400">
              {layers.length} {isFa ? 'لایه فعال' : 'active'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="add-layer-button"
            onClick={onAddLayer}
            className="p-1.5 text-slate-300 hover:text-indigo-300 hover:bg-indigo-500/20 rounded-lg transition-colors"
            title={isFa ? 'افزودن لایه جدید' : 'Add New Layer'}
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            id="collapse-layers-button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/10 rounded-lg transition-colors"
            title={collapsed ? (isFa ? 'بزرگ کردن' : 'Expand') : (isFa ? 'کوچک کردن' : 'Collapse')}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            id="retract-layers-button"
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-0.5"
            title={isFa ? 'بستن کشو و بازگشت به کناره' : 'Retract drawer to edge'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Layer List */}
      {!collapsed && (
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1.5">
          {layers.map((layer) => {
            const isActive = layer.id === activeLayerId;
            const count = strokeCounts[layer.id] || 0;
            const isSettingsOpen = expandedSettingsId === layer.id;

            return (
              <div
                key={layer.id}
                id={`layer-item-${layer.id}`}
                className={`group rounded-xl p-2.5 transition-all border ${
                  isActive
                    ? 'bg-indigo-500/20 border-indigo-500/40 shadow-sm'
                    : 'bg-white/5 hover:bg-white/10 border-white/5'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  {/* Active Indicator & Color Tag */}
                  <div
                    onClick={() => onSelectLayer(layer.id)}
                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs ring-1 ring-white/20"
                      style={{ backgroundColor: layer.colorTag }}
                    />

                    {editingId === layer.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => finishRename(layer.id)}
                        onKeyDown={(e) => e.key === 'Enter' && finishRename(layer.id)}
                        autoFocus
                        className="text-xs px-2 py-1 border border-indigo-400 rounded-lg bg-slate-800 text-white w-full outline-none"
                      />
                    ) : (
                      <div className="flex flex-col truncate" onDoubleClick={() => startRename(layer)}>
                        <span
                          className={`text-xs font-medium truncate ${
                            isActive ? 'text-indigo-200 font-semibold' : 'text-slate-200'
                          }`}
                        >
                          {isFa ? layer.nameFa || layer.name : layer.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {count} {isFa ? 'خط ترسیم' : 'strokes'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    {/* Settings / Opacity toggle */}
                    <button
                      onClick={() => setExpandedSettingsId(isSettingsOpen ? null : layer.id)}
                      className={`p-1 rounded-md transition-colors ${
                        isSettingsOpen ? 'text-indigo-300 bg-indigo-500/30' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={isFa ? 'شفافیت و تنظیمات' : 'Opacity & Settings'}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>

                    {/* Visibility */}
                    <button
                      onClick={() => onToggleVisibility(layer.id)}
                      className={`p-1 rounded-md transition-colors ${
                        layer.visible ? 'text-slate-300 hover:text-white' : 'text-slate-600'
                      }`}
                      title={layer.visible ? (isFa ? 'مخفی کردن' : 'Hide') : (isFa ? 'نمایش' : 'Show')}
                    >
                      {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>

                    {/* Lock */}
                    <button
                      onClick={() => onToggleLock(layer.id)}
                      className={`p-1 rounded-md transition-colors ${
                        layer.locked ? 'text-amber-400 bg-amber-400/20' : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={layer.locked ? (isFa ? 'قفل باز شود' : 'Unlock') : (isFa ? 'قفل کردن' : 'Lock')}
                    >
                      {layer.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>

                    {/* Delete layer (if more than 1 layer) */}
                    {layers.length > 1 && (
                      <button
                        onClick={() => onDeleteLayer(layer.id)}
                        className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 transition-colors opacity-0 group-hover:opacity-100"
                        title={isFa ? 'حذف لایه' : 'Delete Layer'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Opacity Slider */}
                {isSettingsOpen && (
                  <div className="mt-2 pt-2 border-t border-white/10 px-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
                      <span>{isFa ? 'شفافیت لایه' : 'Opacity'}</span>
                      <span className="font-mono text-indigo-400">{Math.round(layer.opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={layer.opacity}
                      onChange={(e) => onChangeOpacity(layer.id, parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Info */}
      <div className="px-4 py-2.5 bg-white/5 border-t border-white/10 rounded-b-2xl flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          {isFa ? 'طراحی سه‌بعدی روی بوم فعال' : '3D sketch on active plane'}
        </span>
        <button
          onClick={() => {
            const active = layers.find((l) => l.id === activeLayerId);
            if (active) startRename(active);
          }}
          className="text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
        >
          {isFa ? 'تغییر نام' : 'Rename'}
        </button>
      </div>
    </div>
  );
};
