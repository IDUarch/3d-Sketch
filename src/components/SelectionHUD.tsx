import React, { useState } from 'react';
import {
  Trash2,
  Eye,
  EyeOff,
  MousePointer,
  X,
  CheckSquare,
  Move,
  Box as BoxIcon,
  CircleDot,
  Minus,
  Square,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Sliders,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  CornerDownLeft,
  Palette,
} from 'lucide-react';
import { Stroke, BoxSubSelection, SubObjectMode } from '../types';
import { BOX_EDGE_NAMES_FA } from '../utils/threeHelpers';

interface SelectionHUDProps {
  selectedStrokeIds: string[];
  strokes: Stroke[];
  boxSubSelection?: BoxSubSelection | null;
  onUpdateBoxSubSelection?: (subSel: BoxSubSelection | null) => void;
  onDeleteSelected: () => void;
  onToggleHideSelected: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onUnhideAll: () => void;
  onMoveSelected?: (delta: { x: number; y: number; z: number }, commit?: boolean) => void;
  onExtrudeBoxFace?: (boxId: string, faceIndex: number, distance: number) => void;
  onCarveBoxFace?: (boxId: string, faceIndex: number, depth: number, carveType: 'recess' | 'courtyard' | 'step_cutout' | 'hollow_shell') => void;
  onExtrudeSelectedPolygon?: (boxId: string, faceIndex: number, height: number) => void;
  lang: 'fa' | 'en';
  isOpen?: boolean;
  onToggleOpen?: (open: boolean) => void;
  activePanelTab?: 'surfaces' | 'layers' | 'selection' | 'materials';
  onSelectPanelTab?: (tab: 'surfaces' | 'layers' | 'selection' | 'materials') => void;
}

export const SelectionHUD: React.FC<SelectionHUDProps> = ({
  selectedStrokeIds,
  strokes,
  boxSubSelection,
  onUpdateBoxSubSelection,
  onDeleteSelected,
  onToggleHideSelected,
  onSelectAll,
  onClearSelection,
  onUnhideAll,
  onMoveSelected,
  onExtrudeBoxFace,
  onCarveBoxFace,
  onExtrudeSelectedPolygon,
  lang,
  isOpen,
  onToggleOpen,
  activePanelTab = 'selection',
  onSelectPanelTab,
}) => {
  const isFa = lang === 'fa';
  const selectedCount = selectedStrokeIds.length;
  const hiddenCount = strokes.filter((s) => s.hidden).length;

  // Drawer open state (collapsible to the right side)
  const [internalDrawerOpen, setInternalDrawerOpen] = useState<boolean>(true);
  const isDrawerOpen = isOpen !== undefined ? isOpen : internalDrawerOpen;
  const setDrawerOpen = (open: boolean) => {
    setInternalDrawerOpen(open);
    onToggleOpen?.(open);
  };
  const [stepSize, setStepSize] = useState<number>(0.5); // Default 0.5m
  const [showMoveSection, setShowMoveSection] = useState<boolean>(true);
  const [customDelta, setCustomDelta] = useState<{ x: string; y: string; z: string }>({
    x: '0.5',
    y: '0.0',
    z: '0.0',
  });

  const [extrudeInputValue, setExtrudeInputValue] = useState<string>('0.5');

  // Breakdown of selected items
  const selectedStrokes = strokes.filter((s) => selectedStrokeIds.includes(s.id));
  const boxStrokes = selectedStrokes.filter((s) => s.tool === 'box' || s.boxData);
  const boxCount = boxStrokes.length;
  const lineCount = selectedCount - boxCount;
  const allSelectedAreHidden = selectedCount > 0 && selectedStrokes.every((s) => s.hidden);

  // Active targeted box for sub-object modeling
  const targetedBox = boxStrokes.length > 0
    ? (boxSubSelection ? boxStrokes.find((b) => b.id === boxSubSelection.boxId) || boxStrokes[0] : boxStrokes[0])
    : null;

  const activeSubMode: SubObjectMode = boxSubSelection && targetedBox && boxSubSelection.boxId === targetedBox.id
    ? boxSubSelection.mode
    : 'object';

  const setSubMode = (mode: SubObjectMode) => {
    if (!targetedBox) return;
    if (mode === 'object') {
      onUpdateBoxSubSelection?.({
        boxId: targetedBox.id,
        mode: 'object',
        vertexIndices: [],
        edgeIndices: [],
        faceIndices: [],
      });
    } else if (mode === 'vertex') {
      const currentVerts = boxSubSelection?.vertexIndices && boxSubSelection.vertexIndices.length > 0
        ? boxSubSelection.vertexIndices
        : [5]; // Default top-right vertex
      onUpdateBoxSubSelection?.({
        boxId: targetedBox.id,
        mode: 'vertex',
        vertexIndices: currentVerts,
        edgeIndices: [],
        faceIndices: [],
      });
    } else if (mode === 'edge') {
      const currentEdges = boxSubSelection?.edgeIndices && boxSubSelection.edgeIndices.length > 0
        ? boxSubSelection.edgeIndices
        : [4]; // Default top edge
      onUpdateBoxSubSelection?.({
        boxId: targetedBox.id,
        mode: 'edge',
        vertexIndices: [],
        edgeIndices: currentEdges,
        faceIndices: [],
      });
    } else if (mode === 'polygon') {
      const currentFaces = boxSubSelection?.faceIndices && boxSubSelection.faceIndices.length > 0
        ? boxSubSelection.faceIndices
        : [5]; // Default face
      onUpdateBoxSubSelection?.({
        boxId: targetedBox.id,
        mode: 'polygon',
        vertexIndices: [],
        edgeIndices: [],
        faceIndices: currentFaces,
      });
    }
  };

  const cycleVertex = (direction: 1 | -1) => {
    if (!targetedBox) return;
    const current = boxSubSelection?.vertexIndices[0] ?? 0;
    const next = (current + direction + 8) % 8;
    onUpdateBoxSubSelection?.({
      boxId: targetedBox.id,
      mode: 'vertex',
      vertexIndices: [next],
      edgeIndices: [],
      faceIndices: [],
    });
  };

  const cycleEdge = (direction: 1 | -1) => {
    if (!targetedBox) return;
    const current = boxSubSelection?.edgeIndices[0] ?? 0;
    const next = (current + direction + 12) % 12;
    onUpdateBoxSubSelection?.({
      boxId: targetedBox.id,
      mode: 'edge',
      vertexIndices: [],
      edgeIndices: [next],
      faceIndices: [],
    });
  };

  const selectVertex = (vIdx: number) => {
    if (!targetedBox) return;
    onUpdateBoxSubSelection?.({
      boxId: targetedBox.id,
      mode: 'vertex',
      vertexIndices: [vIdx],
      edgeIndices: [],
      faceIndices: [],
    });
  };

  const handleStepMove = (axis: 'x' | 'y' | 'z', sign: 1 | -1) => {
    const delta = { x: 0, y: 0, z: 0 };
    delta[axis] = sign * stepSize;
    onMoveSelected?.(delta, true);
  };

  const handleApplyCustomDelta = (e: React.FormEvent) => {
    e.preventDefault();
    const dx = parseFloat(customDelta.x) || 0;
    const dy = parseFloat(customDelta.y) || 0;
    const dz = parseFloat(customDelta.z) || 0;
    if (dx === 0 && dy === 0 && dz === 0) return;
    onMoveSelected?.({ x: dx, y: dy, z: dz }, true);
  };

  // If nothing is selected and no items are hidden, render nothing
  if (selectedCount === 0 && hiddenCount === 0) {
    return null;
  }

  // If only hidden items exist without an active selection, render a minimal unhide pill
  if (selectedCount === 0 && hiddenCount > 0) {
    return (
      <div
        id="unhide-floating-pill"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 backdrop-blur-xl border border-amber-500/40 rounded-full shadow-2xl text-amber-200 text-xs"
        dir={isFa ? 'rtl' : 'ltr'}
      >
        <EyeOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span>
          <strong className="text-white font-mono">{hiddenCount}</strong> {isFa ? 'مورد پنهان است' : 'hidden'}
        </span>
        <button
          id="unhide-all-btn"
          onClick={onUnhideAll}
          className="px-2.5 py-0.5 bg-amber-500/25 hover:bg-amber-500/40 text-amber-100 rounded-full text-[11px] font-semibold transition-colors cursor-pointer"
          title={isFa ? 'نمایش مجدد همه عناصر پنهان شده (کلید H)' : 'Unhide all elements (H key)'}
        >
          {isFa ? 'ظاهر کردن همه (H)' : 'Show All (H)'}
        </button>
      </div>
    );
  }

  // COLLAPSED DRAWER BUTTON (Docked on Right Edge)
  if (!isDrawerOpen) {
    return (
      <button
        id="open-modeling-drawer-btn"
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="fixed top-48 right-0 z-30 flex items-center gap-2 px-3 py-2.5 bg-slate-950/90 backdrop-blur-xl border-y border-l border-rose-500/40 rounded-l-2xl shadow-2xl text-slate-200 hover:text-white hover:bg-slate-900/95 transition-all cursor-pointer group animate-in fade-in slide-in-from-right-2 duration-150"
        dir={isFa ? 'rtl' : 'ltr'}
        title={isFa ? 'باز کردن پنل مدلسازی و ویرایش حجم' : 'Open 3D Modeling & Sub-Object Panel'}
      >
        <div className="p-1 rounded-lg bg-rose-500/25 text-rose-300">
          <BoxIcon className="w-4 h-4" />
        </div>
        <div className="flex flex-col items-start leading-tight">
          <span className="text-xs font-bold">{isFa ? 'مدلسازی و ویرایش حجم' : 'Modeling & Sub-Objects'}</span>
          <span className="text-[10px] text-slate-400 font-mono">
            {targetedBox
              ? (isFa ? 'حجم فعال' : 'Box Active')
              : `${selectedCount} ${isFa ? 'انتخاب' : 'selected'}`}
          </span>
        </div>
        <ChevronLeft className="w-3.5 h-3.5 text-rose-400 group-hover:-translate-x-0.5 transition-transform rtl:rotate-180" />
      </button>
    );
  }

  // EXPANDED SLIDING DRAWER (Right Side, Elegant & Architectural Layout)
  return (
    <div
      id="selection-modeling-drawer"
      className="fixed top-20 right-3 sm:right-5 z-30 w-72 sm:w-80 max-h-[calc(100vh-6.5rem)] overflow-y-auto bg-slate-950/94 backdrop-blur-2xl border border-rose-500/35 rounded-2xl shadow-2xl p-3 text-slate-100 flex flex-col gap-2.5 transition-all duration-300 ease-out select-none"
      dir={isFa ? 'rtl' : 'ltr'}
      style={{ scrollbarWidth: 'thin', scrollbarColor: '#e11d48 #0f172a' }}
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

      {/* Header Bar with Title, Count & Collapse Button */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <BoxIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide">
              {isFa ? 'مدلسازی و ویرایش حجم' : 'Sub-Object & Massing'}
            </h3>
            <p className="text-[10px] text-slate-400">
              {targetedBox
                ? (isFa ? 'تنظیمات و اکسترود حجم ۳بعدی' : '3D Box Modifiers & Extrude')
                : `${selectedCount} ${isFa ? 'عنصر انتخاب‌شده' : 'items selected'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Collapse Button */}
          <button
            id="collapse-modeling-drawer-btn"
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title={isFa ? 'بستن کشو (مشاهده تمام‌صفحه مدل)' : 'Collapse panel to edge'}
          >
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
      </div>

      {/* 3DS MAX STYLE SUB-OBJECT CONTROLS (When a 3D Box is selected) */}
      {targetedBox && (
        <div className="flex flex-col gap-2 p-2 bg-slate-900/80 rounded-xl border border-white/10">
          <div className="flex items-center justify-between text-[11px] font-bold text-indigo-300">
            <span>{isFa ? 'ویرایش اجزای مکعب (Sub-Object):' : 'Box Sub-Object Modes:'}</span>
            <span className="text-[10px] text-slate-400 font-mono">1, 2, 3, 4</span>
          </div>

          {/* 4 Mode Buttons in an aesthetic 2x2 Grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {/* 1. Whole Object */}
            <button
              id="submode-object-btn"
              type="button"
              onClick={() => setSubMode('object')}
              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeSubMode === 'object'
                  ? 'bg-indigo-600 text-white shadow-md font-bold'
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title={isFa ? 'مکعب کامل (کلید 4)' : 'Whole Box (Key 4)'}
            >
              <BoxIcon className="w-3.5 h-3.5" />
              <span>{isFa ? 'کل مکعب' : 'Object'}</span>
              <kbd className="px-1 py-0.2 bg-black/40 rounded text-[9px] font-mono text-indigo-200">4</kbd>
            </button>

            {/* 2. Vertex Mode */}
            <button
              id="submode-vertex-btn"
              type="button"
              onClick={() => setSubMode('vertex')}
              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeSubMode === 'vertex'
                  ? 'bg-sky-500 text-white shadow-md font-bold ring-2 ring-sky-300/40'
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title={isFa ? 'نقاط و رئوس مکعب (کلید 1)' : 'Vertices (Key 1)'}
            >
              <CircleDot className="w-3.5 h-3.5 text-sky-300" />
              <span>{isFa ? 'نقاط (Vertex)' : 'Vertex'}</span>
              <kbd className="px-1 py-0.2 bg-black/40 rounded text-[9px] font-mono text-sky-200">1</kbd>
            </button>

            {/* 3. Edge / Segment Mode */}
            <button
              id="submode-edge-btn"
              type="button"
              onClick={() => setSubMode('edge')}
              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeSubMode === 'edge'
                  ? 'bg-rose-600 text-white shadow-md font-bold ring-2 ring-rose-400/40'
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title={isFa ? 'لبه‌ها و سگمنت‌های مکعب (کلید 2)' : 'Segments / Edges (Key 2)'}
            >
              <Minus className="w-3.5 h-3.5 text-rose-300 stroke-[3]" />
              <span>{isFa ? 'سگمنت (Edge)' : 'Edge'}</span>
              <kbd className="px-1 py-0.2 bg-black/40 rounded text-[9px] font-mono text-rose-200">2</kbd>
            </button>

            {/* 4. Polygon / Face Mode */}
            <button
              id="submode-polygon-btn"
              type="button"
              onClick={() => setSubMode('polygon')}
              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeSubMode === 'polygon'
                  ? 'bg-red-600 text-white shadow-md font-bold ring-2 ring-red-400/40'
                  : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title={isFa ? 'سطوح و چندضلعی‌های مکعب (کلید 3)' : 'Polygons / Faces (Key 3)'}
            >
              <Square className="w-3.5 h-3.5 text-red-200 fill-red-400/40" />
              <span>{isFa ? 'سطح (Polygon)' : 'Polygon'}</span>
              <kbd className="px-1 py-0.2 bg-black/40 rounded text-[9px] font-mono text-red-200">3</kbd>
            </button>
          </div>

          {/* Vertex mode direct point cycler */}
          {activeSubMode === 'vertex' && (
            <div className="flex flex-col gap-1 pt-1.5 border-t border-white/10">
              <div className="flex items-center justify-between text-[11px] text-sky-300">
                <span className="font-mono">
                  {isFa ? `نقطه ${(boxSubSelection?.vertexIndices[0] ?? 0) + 1} از ۸` : `Vertex ${(boxSubSelection?.vertexIndices[0] ?? 0) + 1}/8`}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => cycleVertex(-1)}
                    className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white cursor-pointer"
                    title={isFa ? 'نقطه قبلی' : 'Previous vertex'}
                  >
                    <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => cycleVertex(1)}
                    className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white cursor-pointer"
                    title={isFa ? 'نقطه بعدی' : 'Next vertex'}
                  >
                    <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-8 gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => selectVertex(v)}
                    className={`h-5 rounded text-[10px] font-mono flex items-center justify-center transition-all cursor-pointer ${
                      boxSubSelection?.vertexIndices.includes(v)
                        ? 'bg-amber-400 text-slate-950 font-bold scale-105'
                        : 'bg-white/10 text-slate-400 hover:bg-white/20'
                    }`}
                  >
                    {v + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Edge mode cycler */}
          {activeSubMode === 'edge' && (
            <div className="flex items-center justify-between pt-1.5 border-t border-white/10 text-[11px] text-rose-300">
              <span className="font-mono">
                {isFa
                  ? `${BOX_EDGE_NAMES_FA[boxSubSelection?.edgeIndices[0] ?? 0] || 'سگمنت'}`
                  : `Edge ${(boxSubSelection?.edgeIndices[0] ?? 0) + 1}/12`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => cycleEdge(-1)}
                  className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white cursor-pointer"
                  title={isFa ? 'لبه قبلی' : 'Previous edge'}
                >
                  <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() => cycleEdge(1)}
                  className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white cursor-pointer"
                  title={isFa ? 'لبه بعدی' : 'Next edge'}
                >
                  <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                </button>
              </div>
            </div>
          )}

          {/* Polygon Mode */}
          {activeSubMode === 'polygon' && (() => {
            const activeFaceIndex = boxSubSelection?.faceIndices[0] ?? 1;

            const handleCommitExtrude = () => {
              const val = parseFloat(extrudeInputValue);
              if (!isNaN(val) && targetedBox) {
                onExtrudeSelectedPolygon?.(targetedBox.id, activeFaceIndex, val);
              }
            };

            return (
              <div className="flex flex-col gap-2 pt-1 border-t border-white/10">
                {/* Polygon Multi-Selection Helper Banner */}
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-red-950/40 border border-red-500/30 rounded-lg text-[11px] text-red-200">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Square className="w-3.5 h-3.5 text-red-400 fill-red-400/30" />
                    <span>
                      {boxSubSelection?.faceIndices && boxSubSelection.faceIndices.length > 1
                        ? (isFa ? `${boxSubSelection.faceIndices.length} چندضلعی (Polygon) انتخاب شده` : `${boxSubSelection.faceIndices.length} Polygons Selected`)
                        : (isFa ? 'انتخاب چندضلعی‌ها با کلید Ctrl' : 'Multi-Select Polygons with Ctrl')}
                    </span>
                  </span>
                  <kbd className="px-1.5 py-0.5 bg-black/50 border border-white/10 rounded text-[9px] font-mono text-slate-300">
                    Ctrl + Click
                  </kbd>
                </div>

                {/* Extrude Section (دستور اکسترود - ارتفاع دادن به Polygon انتخابی) */}
                <div className="flex flex-col gap-2 p-2.5 bg-amber-950/40 border border-amber-500/30 rounded-xl shadow-sm">
                  {/* Header */}
                  <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                    <span className="flex items-center gap-1.5">
                      <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isFa ? 'دستور اکسترود (Extrude):' : 'Extrude Polygon:'}</span>
                    </span>
                    <span className="text-[10px] text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
                      {isFa ? 'وجه مکعب' : 'Box Face'}
                    </span>
                  </div>

                  {/* Subtitle explaining what is targeted */}
                  <p className="text-[10px] text-amber-200/80 leading-normal">
                    {isFa
                      ? 'ارتفاع دادن به سطح انتخابی مکعب در راستای نرمال (کلید E)'
                      : 'Extrude selected polygon along surface normal (Key E)'}
                  </p>

                  {/* Numeric Input + Enter Apply */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] text-slate-300 flex items-center justify-between">
                      <span>{isFa ? 'ارتفاع اکسترود (متر):' : 'Extrude Height (m):'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">کلید E یا Enter</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="0.1"
                          value={extrudeInputValue}
                          onChange={(e) => setExtrudeInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCommitExtrude();
                            }
                          }}
                          placeholder="0.5"
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-amber-500/40 focus:border-amber-400 rounded-lg text-amber-200 font-mono text-xs focus:outline-none text-left"
                          dir="ltr"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-amber-400/60 pointer-events-none">
                          m
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleCommitExtrude}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer shadow flex items-center gap-1 active:scale-95 whitespace-nowrap"
                        title={isFa ? 'اعمال ارتفاع به Polygon انتخابی' : 'Apply Extrude Height (Enter)'}
                      >
                        <CornerDownLeft className="w-3.5 h-3.5" />
                        <span>{isFa ? 'اعمال اکسترود' : 'Extrude'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Segment count and guidance */}
                  {targetedBox && (
                    <div className="pt-1.5 border-t border-amber-500/20 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        <span>{isFa ? 'ایجاد سگمنت و مرز سه‌بعدی جدید' : 'Creates new 3D segment & boundary'}</span>
                      </span>
                      {(() => {
                        const exts = (targetedBox.extrusions || []).filter((e) => e.faceIndex === activeFaceIndex);
                        return exts.length > 0 ? (
                          <span className="font-mono text-amber-300 text-[10px] bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                            {isFa ? `${exts.length} سگمنت فعال` : `${exts.length} active segments`}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  )}

                  {/* Connected Volume Module Option (Shift+E) */}
                  <div className="pt-1.5 border-t border-amber-500/20 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        const dist = parseFloat(extrudeInputValue) || 1.0;
                        if (targetedBox) {
                          onExtrudeBoxFace?.(targetedBox.id, activeFaceIndex, dist);
                        }
                      }}
                      className="w-full py-1.5 px-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-lg text-xs font-medium cursor-pointer transition-all flex items-center justify-center gap-1.5"
                      title={isFa ? 'ایجاد بلوک حجم متصل جدید با سگمنت‌های مجزا (Shift+E)' : 'Extrude connected block module (Shift+E)'}
                    >
                      <BoxIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isFa ? 'اکسترود حجم متصل جدید (Shift+E)' : 'Extrude New Connected Block'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 3D AXIS MOVEMENT & COORDINATES PANEL */}
      <div className="flex flex-col gap-2 p-2 bg-slate-900/80 rounded-xl border border-white/10">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowMoveSection(!showMoveSection)}
            className="flex items-center gap-1.5 text-xs font-bold text-sky-200 cursor-pointer hover:text-white transition-colors"
          >
            <Move className="w-3.5 h-3.5 text-sky-400" />
            <span>
              {activeSubMode === 'vertex'
                ? isFa ? 'جابجایی نقطه روی محورها:' : 'Move Vertex:'
                : activeSubMode === 'edge'
                ? isFa ? 'جابجایی سگمنت روی محورها:' : 'Move Edge:'
                : activeSubMode === 'polygon'
                ? isFa ? 'جابجایی سطح روی محورها:' : 'Move Polygon:'
                : isFa ? 'جابجایی روی محورها:' : 'Move on Axes:'}
            </span>
            {showMoveSection ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
          </button>

          {/* Step Selector Pills */}
          <div className="flex items-center gap-0.5 bg-black/40 p-0.5 rounded-lg border border-white/10">
            {[0.1, 0.5, 1.0].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStepSize(s)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                  stepSize === s
                    ? 'bg-sky-500 text-white font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {s}m
              </button>
            ))}
          </div>
        </div>

        {showMoveSection && (
          <div className="flex flex-col gap-1.5 pt-1 border-t border-white/10 animate-in fade-in duration-100">
            {/* X Axis Control (Red) */}
            <div className="flex items-center justify-between bg-rose-500/10 border border-rose-500/30 rounded-lg px-2 py-1">
              <span className="text-xs font-bold text-rose-300 font-mono">X</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleStepMove('x', -1)}
                  className="px-2 py-0.5 hover:bg-rose-500/30 text-rose-200 hover:text-white rounded text-xs font-mono transition-colors cursor-pointer"
                  title={isFa ? `چپ (-${stepSize}m)` : `-X`}
                >
                  -{stepSize}m
                </button>
                <button
                  type="button"
                  onClick={() => handleStepMove('x', 1)}
                  className="px-2 py-0.5 hover:bg-rose-500/30 text-rose-200 hover:text-white rounded text-xs font-mono transition-colors cursor-pointer"
                  title={isFa ? `راست (+${stepSize}m)` : `+X`}
                >
                  +{stepSize}m
                </button>
              </div>
            </div>

            {/* Y Axis Control (Green / Height) */}
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2 py-1">
              <span className="text-xs font-bold text-emerald-300 font-mono">Y</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleStepMove('y', -1)}
                  className="px-2 py-0.5 hover:bg-emerald-500/30 text-emerald-200 hover:text-white rounded text-xs font-mono transition-colors cursor-pointer"
                  title={isFa ? `پایین (-${stepSize}m)` : `-Y`}
                >
                  -{stepSize}m
                </button>
                <button
                  type="button"
                  onClick={() => handleStepMove('y', 1)}
                  className="px-2 py-0.5 hover:bg-emerald-500/30 text-emerald-200 hover:text-white rounded text-xs font-mono transition-colors cursor-pointer"
                  title={isFa ? `بالا (+${stepSize}m)` : `+Y`}
                >
                  +{stepSize}m
                </button>
              </div>
            </div>

            {/* Z Axis Control (Blue / Depth) */}
            <div className="flex items-center justify-between bg-sky-500/10 border border-sky-500/30 rounded-lg px-2 py-1">
              <span className="text-xs font-bold text-sky-300 font-mono">Z</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleStepMove('z', -1)}
                  className="px-2 py-0.5 hover:bg-sky-500/30 text-sky-200 hover:text-white rounded text-xs font-mono transition-colors cursor-pointer"
                  title={isFa ? `عمق (-${stepSize}m)` : `-Z`}
                >
                  -{stepSize}m
                </button>
                <button
                  type="button"
                  onClick={() => handleStepMove('z', 1)}
                  className="px-2 py-0.5 hover:bg-sky-500/30 text-sky-200 hover:text-white rounded text-xs font-mono transition-colors cursor-pointer"
                  title={isFa ? `جلو (+${stepSize}m)` : `+Z`}
                >
                  +{stepSize}m
                </button>
              </div>
            </div>

            {/* Precise Numeric Input Form */}
            <form onSubmit={handleApplyCustomDelta} className="flex items-center justify-between gap-1 pt-1 border-t border-white/10 text-[11px] font-mono">
              <div className="flex items-center gap-1">
                <span className="text-rose-400">X:</span>
                <input
                  type="number"
                  step="0.1"
                  value={customDelta.x}
                  onChange={(e) => setCustomDelta({ ...customDelta, x: e.target.value })}
                  className="w-10 px-1 py-0.5 bg-black/50 border border-white/20 rounded text-center text-white text-[10px]"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-emerald-400">Y:</span>
                <input
                  type="number"
                  step="0.1"
                  value={customDelta.y}
                  onChange={(e) => setCustomDelta({ ...customDelta, y: e.target.value })}
                  className="w-10 px-1 py-0.5 bg-black/50 border border-white/20 rounded text-center text-white text-[10px]"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sky-400">Z:</span>
                <input
                  type="number"
                  step="0.1"
                  value={customDelta.z}
                  onChange={(e) => setCustomDelta({ ...customDelta, z: e.target.value })}
                  className="w-10 px-1 py-0.5 bg-black/50 border border-white/20 rounded text-center text-white text-[10px]"
                />
              </div>
              <button
                type="submit"
                className="px-2 py-0.5 bg-sky-500/30 hover:bg-sky-500 text-sky-100 rounded text-[10px] font-semibold cursor-pointer transition-colors"
              >
                {isFa ? 'اعمال' : 'Apply'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Quick Link to Material Texture Panel */}
      {onSelectPanelTab && (
        <button
          type="button"
          onClick={() => onSelectPanelTab('materials')}
          className="w-full py-1.5 px-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
        >
          <Palette className="w-3.5 h-3.5 text-amber-300" />
          <span>{isFa ? 'اعمال بافت و متریال (بتن، شیشه، چوب، فلز)' : 'Apply Material & Textures'}</span>
        </button>
      )}

      {/* QUICK SELECTION ACTIONS (Hide, Delete, Select All, Deselect) */}
      <div className="flex items-center justify-between gap-1 pt-2 border-t border-white/10">
        {/* Hide/Show */}
        <button
          id="hide-selected-btn"
          onClick={onToggleHideSelected}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/40 rounded-xl text-xs font-medium transition-colors cursor-pointer shadow-sm"
          title={isFa ? 'پنهان / ظاهر کردن انتخاب‌ها (کلید H)' : 'Hide / Show selected (H key)'}
        >
          {allSelectedAreHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{allSelectedAreHidden ? (isFa ? 'ظاهر' : 'Show') : (isFa ? 'پنهان' : 'Hide')}</span>
          <kbd className="px-1 py-0.2 bg-black/40 rounded text-[9px] font-mono text-amber-200">H</kbd>
        </button>

        {/* Delete */}
        <button
          id="delete-selected-btn"
          onClick={onDeleteSelected}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-medium transition-colors cursor-pointer shadow-sm"
          title={isFa ? 'حذف انتخاب‌ها (Delete)' : 'Delete selected (Delete)'}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{isFa ? 'حذف' : 'Delete'}</span>
          <kbd className="px-1 py-0.2 bg-black/40 rounded text-[9px] font-mono text-rose-200">Del</kbd>
        </button>

        {/* Select All */}
        <button
          id="select-all-btn"
          onClick={onSelectAll}
          className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-xl transition-colors cursor-pointer"
          title={isFa ? 'انتخاب همه (Ctrl+A)' : 'Select All (Ctrl+A)'}
        >
          <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
        </button>

        {/* Deselect / Clear selection */}
        <button
          id="clear-selection-btn"
          onClick={onClearSelection}
          className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 rounded-xl transition-colors cursor-pointer"
          title={isFa ? 'لغو انتخاب (Esc)' : 'Deselect (Esc)'}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Hidden Items Badge */}
      {hiddenCount > 0 && (
        <div className="flex items-center justify-between px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs">
          <div className="flex items-center gap-1.5">
            <EyeOff className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>
              <strong className="text-white font-mono">{hiddenCount}</strong> {isFa ? 'پنهان' : 'hidden'}
            </span>
          </div>
          <button
            id="unhide-all-drawer-btn"
            onClick={onUnhideAll}
            className="px-2 py-0.5 bg-amber-500/25 hover:bg-amber-500/40 text-amber-100 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
          >
            {isFa ? 'ظاهر کردن همه' : 'Show All'}
          </button>
        </div>
      )}
    </div>
  );
};
