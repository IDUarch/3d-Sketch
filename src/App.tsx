import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import {
  Stroke,
  Layer,
  DrawingPlane,
  ToolType,
  InteractionMode,
  LensFocalLength,
  CameraBookmark,
  BoxDimensions,
  BoxSubSelection,
  SubObjectMode,
  BoxMaterial,
  SnapSettings,
  DEFAULT_SNAP_SETTINGS,
} from './types';
import { INITIAL_PLANES, INITIAL_LAYERS, generateDemoStrokes } from './data/sampleSketch';
import { Viewport3D } from './components/Viewport3D';
import { Toolbar } from './components/Toolbar';
import { TopBar } from './components/TopBar';
import { LayerPanel } from './components/LayerPanel';
import { PlaneManager } from './components/PlaneManager';
import { HelpGuideModal } from './components/HelpGuideModal';
import { SnapSettingsModal } from './components/SnapSettingsModal';
import { SurfaceController } from './components/SurfaceController';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { BoxDimensionHUD } from './components/BoxDimensionHUD';
import { SelectionHUD } from './components/SelectionHUD';
import { MaterialPanel } from './components/MaterialPanel';
import {
  createBoxFromDimensions,
  translateStrokes,
  translateBoxSubElements,
  extrudeBoxFace,
  carveBoxFace,
  extrudePolygonHeight,
  BOX_FACE_NAMES,
  BOX_FACE_NAMES_FA,
} from './utils/threeHelpers';

// Layout-independent key matcher: checks hardware physical code (e.code) AND character key aliases (Persian/English/etc.)
const isKeyMatch = (e: KeyboardEvent, code: string, ...aliases: string[]): boolean => {
  if (e.code && e.code.toLowerCase() === code.toLowerCase()) return true;
  const k = e.key ? e.key.toLowerCase() : '';
  if (!k) return false;
  return aliases.some((a) => a.toLowerCase() === k);
};

export default function App() {
  // Localization: Persian (fa) default as user requested in Persian
  const [lang, setLang] = useState<'fa' | 'en'>('fa');

  // Drawing & Scene State
  const [planes, setPlanes] = useState<DrawingPlane[]>(INITIAL_PLANES);
  const [activePlaneId, setActivePlaneId] = useState<string>('plane-facade');

  const [layers, setLayers] = useState<Layer[]>(INITIAL_LAYERS);
  const [activeLayerId, setActiveLayerId] = useState<string>('layer-facade');

  const [strokes, setStrokes] = useState<Stroke[]>(() => generateDemoStrokes());

  // History for Undo / Redo
  const [history, setHistory] = useState<Stroke[][]>([strokes]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Tools & Brushes
  const [tool, setTool] = useState<ToolType>('pen');
  const [mode, setMode] = useState<InteractionMode>('draw');
  const [strokeColor, setStrokeColor] = useState<string>('#FFFFFF');
  const [strokeSize, setStrokeSize] = useState<number>(3);
  const [strokeOpacity, setStrokeOpacity] = useState<number>(1.0);
  const [boxDimensions, setBoxDimensions] = useState<BoxDimensions>({
    width: 2.0,
    height: 2.5,
    depth: 2.0,
  });

  // Selection & Visibility State
  const [selectedStrokeIds, setSelectedStrokeIds] = useState<string[]>([]);
  const [boxSubSelection, setBoxSubSelection] = useState<BoxSubSelection | null>(null);
  const [lastHiddenStrokeIds, setLastHiddenStrokeIds] = useState<string[]>([]);

  // Camera & Optics (default 17mm wide angle like in tablet photo)
  const [focalLength, setFocalLength] = useState<LensFocalLength>(17);
  const [isOrtho, setIsOrtho] = useState<boolean>(false);
  const [showPlaneGrid, setShowPlaneGrid] = useState<boolean>(true);
  const [showGroundGrid, setShowGroundGrid] = useState<boolean>(true);
  const [showAxes, setShowAxes] = useState<boolean>(false);
  const [shadingMode, setShadingMode] = useState<'shaded' | 'wireframe'>('shaded');

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<CameraBookmark[]>([
    {
      id: 'bm-photo-view',
      name: 'دید تبلت (پرسپکتیو)',
      position: { x: 3.4, y: 4.0, z: 5.8 },
      target: { x: 0.5, y: 2.0, z: 0.8 },
      fov: 94,
    },
    {
      id: 'bm-facade-front',
      name: 'نمای روبروی ورودی',
      position: { x: 0.2, y: 2.8, z: 6.8 },
      target: { x: 0.2, y: 2.8, z: 0 },
      fov: 74,
    },
    {
      id: 'bm-cafe-view',
      name: 'نمای تراس و کافه',
      position: { x: 4.5, y: 2.2, z: 3.5 },
      target: { x: 2.0, y: 1.0, z: 2.0 },
      fov: 74,
    },
  ]);

  // Modals
  const [isPlaneManagerOpen, setIsPlaneManagerOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isSnapSettingsOpen, setIsSnapSettingsOpen] = useState<boolean>(false);

  // 3ds Max Style 3D Snap-to-Grid & Precision Settings
  const [snapSettings, setSnapSettings] = useState<SnapSettings>(DEFAULT_SNAP_SETTINGS);

  // Right-side unified drawer coordinator ('surfaces' | 'layers' | 'selection' | 'materials' | null)
  const [activeRightDrawer, setActiveRightDrawer] = useState<'surfaces' | 'layers' | 'selection' | 'materials' | null>('surfaces');

  // Automatically switch to selection panel when objects are selected, and back to surfaces when cleared
  useEffect(() => {
    if (selectedStrokeIds.length > 0) {
      setActiveRightDrawer('selection');
    } else if (activeRightDrawer === 'selection') {
      setActiveRightDrawer('surfaces');
    }
  }, [selectedStrokeIds.length]);

  // Camera animation target ref
  const cameraTargetRef = useRef<{
    position: THREE.Vector3;
    target: THREE.Vector3;
    animating: boolean;
  }>({
    position: new THREE.Vector3(3.4, 4.0, 5.8),
    target: new THREE.Vector3(0.5, 2.0, 0.8),
    animating: false,
  });

  // Current camera position tracker
  const currentCamPos = useRef<THREE.Vector3>(new THREE.Vector3(3.4, 4.0, 5.8));
  const currentCamTarget = useRef<THREE.Vector3>(new THREE.Vector3(0.5, 2.0, 0.8));

  // Sync refs for strokes and selection to ensure keyboard hotkeys have immediate access to latest state
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  const selectedStrokeIdsRef = useRef(selectedStrokeIds);
  selectedStrokeIdsRef.current = selectedStrokeIds;

  const boxSubSelectionRef = useRef(boxSubSelection);
  boxSubSelectionRef.current = boxSubSelection;

  // Immediate visual feedback toast for keyboard shortcuts
  const [actionToast, setActionToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setActionToast(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setActionToast(null);
    }, 1500);
  }, []);

  // Compute stroke count per layer
  const strokeCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    strokes.forEach((s) => {
      counts[s.layerId] = (counts[s.layerId] || 0) + 1;
    });
    return counts;
  }, [strokes]);

  // Push new history state
  const pushHistory = useCallback(
    (newStrokes: Stroke[]) => {
      const updatedHistory = history.slice(0, historyIndex + 1);
      updatedHistory.push(newStrokes);
      // Cap history to 30 steps
      if (updatedHistory.length > 30) {
        updatedHistory.shift();
      }
      setHistory(updatedHistory);
      setHistoryIndex(updatedHistory.length - 1);
      setStrokes(newStrokes);
    },
    [history, historyIndex]
  );

  // Add Stroke
  const handleAddStroke = useCallback(
    (stroke: Stroke) => {
      const nextStrokes = [...strokes, stroke];
      pushHistory(nextStrokes);
    },
    [strokes, pushHistory]
  );

  // Erase Stroke
  const handleEraseStroke = useCallback(
    (strokeId: string) => {
      const nextStrokes = strokes.filter((s) => s.id !== strokeId);
      if (nextStrokes.length !== strokes.length) {
        pushHistory(nextStrokes);
      }
    },
    [strokes, pushHistory]
  );

  // Insert 3D Box with precise dimensions
  const handleInsertBox = useCallback(() => {
    const activePlane = planes.find((p) => p.id === activePlaneId) || planes[0];
    const { boxData, points } = createBoxFromDimensions(boxDimensions, activePlane.origin, activePlane);

    const newStroke: Stroke = {
      id: `box-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      layerId: activeLayerId,
      planeId: activePlaneId,
      points,
      boxData,
      color: strokeColor,
      size: strokeSize,
      opacity: strokeOpacity,
      tool: 'box',
      createdAt: Date.now(),
    };

    handleAddStroke(newStroke);
  }, [boxDimensions, activePlaneId, planes, activeLayerId, strokeColor, strokeSize, strokeOpacity, handleAddStroke]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setStrokes(history[nextIndex]);
    }
  }, [history, historyIndex]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setStrokes(history[nextIndex]);
    }
  }, [history, historyIndex]);

  // Selection & Visibility Operations
  const handleSelectStroke = useCallback((strokeId: string, isShift: boolean, initialSubSel?: BoxSubSelection | null) => {
    setSelectedStrokeIds((prev) => {
      const next = isShift
        ? (prev.includes(strokeId) ? prev.filter((id) => id !== strokeId) : [...prev, strokeId])
        : [strokeId];
      if (initialSubSel !== undefined) {
        setBoxSubSelection(initialSubSel);
      } else if (next.length === 1) {
        const hit = strokesRef.current.find((s) => s.id === next[0]);
        if (hit && (hit.tool === 'box' || hit.boxData)) {
          setBoxSubSelection({
            boxId: hit.id,
            mode: 'object',
            vertexIndices: [],
            edgeIndices: [],
            faceIndices: [],
          });
        } else {
          setBoxSubSelection(null);
        }
      } else {
        setBoxSubSelection(null);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedStrokeIds([]);
    setBoxSubSelection(null);
  }, []);

  const handleSelectAll = useCallback(() => {
    // Select all strokes from visible and unlocked layers
    const layerMap = new Map<string, Layer>(layers.map((l) => [l.id, l]));
    const selectable = strokes.filter((s) => {
      const l = layerMap.get(s.layerId);
      return l && l.visible && !l.locked;
    });
    setSelectedStrokeIds(selectable.map((s) => s.id));
    setBoxSubSelection(null);
  }, [strokes, layers]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedStrokeIds.length === 0) return;
    const selectedSet = new Set(selectedStrokeIds);
    const nextStrokes = strokes.filter((s) => !selectedSet.has(s.id));
    pushHistory(nextStrokes);
    setSelectedStrokeIds([]);
    setBoxSubSelection(null);
  }, [selectedStrokeIds, strokes, pushHistory]);

  const handleToggleHideSelected = useCallback(() => {
    if (selectedStrokeIds.length > 0) {
      const selectedSet = new Set(selectedStrokeIds);
      const selectedStrokes = strokes.filter((s) => selectedSet.has(s.id));
      const hasVisible = selectedStrokes.some((s) => !s.hidden);

      const nextStrokes = strokes.map((s) => {
        if (selectedSet.has(s.id)) {
          return { ...s, hidden: hasVisible };
        }
        return s;
      });

      if (hasVisible) {
        setLastHiddenStrokeIds(selectedStrokeIds);
      }
      pushHistory(nextStrokes);
      return;
    }

    // If no active selection, check if any strokes are hidden to reveal them
    const anyHidden = strokes.some((s) => s.hidden);
    if (anyHidden) {
      const nextStrokes = strokes.map((s) => (s.hidden ? { ...s, hidden: false } : s));
      pushHistory(nextStrokes);
    }
  }, [selectedStrokeIds, strokes, pushHistory]);

  const handleUnhideAll = useCallback(() => {
    const anyHidden = strokes.some((s) => s.hidden);
    if (anyHidden) {
      const nextStrokes = strokes.map((s) => (s.hidden ? { ...s, hidden: false } : s));
      pushHistory(nextStrokes);
    }
  }, [strokes, pushHistory]);

  // Coordinate Axis Movement for Selected Lines, 3D Volumes, and Sub-Objects (Vertices, Edges, Polygons)
  const handleMoveSelectedStrokes = useCallback(
    (delta: { x: number; y: number; z: number }, commitToHistory = false) => {
      const currentSelected = selectedStrokeIdsRef.current;
      if (currentSelected.length === 0) return;

      const subSel = boxSubSelectionRef.current;
      // If sub-element (vertex, edge, polygon) is active on a selected box, deform the box geometry!
      if (subSel && subSel.mode !== 'object' && currentSelected.includes(subSel.boxId)) {
        const targetBox = strokesRef.current.find((s) => s.id === subSel.boxId);
        if (targetBox) {
          const updatedBox = translateBoxSubElements(targetBox, subSel, delta);
          const next = strokesRef.current.map((s) => (s.id === targetBox.id ? updatedBox : s));
          if (commitToHistory) {
            pushHistory(next);
          } else {
            setStrokes(next);
          }
          return;
        }
      }

      // Default: move whole objects/strokes
      const next = translateStrokes(strokesRef.current, currentSelected, delta);
      if (commitToHistory) {
        pushHistory(next);
      } else {
        setStrokes(next);
      }
    },
    [pushHistory]
  );

  const handleCommitMoveSelectedStrokes = useCallback(() => {
    pushHistory(strokesRef.current);
  }, [pushHistory]);

  // Architectural Extrude (Shift+Drag or Button): creates new attached volume module with shared segments
  const handleExtrudeBoxFace = useCallback(
    (boxId: string, faceIndex: number, distance: number) => {
      const targetBox = strokesRef.current.find((s) => s.id === boxId);
      if (!targetBox) return;

      const { newBox, outerFaceIndex } = extrudeBoxFace(targetBox, faceIndex, distance);
      const nextStrokes = [...strokesRef.current, newBox];
      pushHistory(nextStrokes);

      // Select newly extruded volume and its outer face for continuous seamless modeling!
      setSelectedStrokeIds([newBox.id]);
      setBoxSubSelection({
        boxId: newBox.id,
        mode: 'polygon',
        vertexIndices: [],
        edgeIndices: [],
        faceIndices: [outerFaceIndex],
      });

      showToast(
        lang === 'fa'
          ? `ایجاد حجم متصل جدید با سگمنت‌های جدید (+${distance}m)`
          : `Extruded new connected volume with new segments (+${distance}m)`
      );
    },
    [pushHistory, lang]
  );

  // Extrude Command: Give height to selected Polygon face
  const handleExtrudeSelectedPolygon = useCallback(
    (boxId: string, faceIndex: number, height: number = 0.5) => {
      const targetBox = strokesRef.current.find((s) => s.id === boxId);
      if (!targetBox) return;

      const subSel = boxSubSelectionRef.current || {
        boxId,
        mode: 'polygon' as SubObjectMode,
        vertexIndices: [],
        edgeIndices: [],
        faceIndices: [faceIndex],
      };

      const updatedBox = extrudePolygonHeight(targetBox, subSel, height);
      const nextStrokes = strokesRef.current.map((s) => (s.id === boxId ? updatedBox : s));
      pushHistory(nextStrokes);

      const sign = height >= 0 ? '+' : '';
      showToast(
        lang === 'fa'
          ? `دستور Extrude اعمال شد: تغییر ارتفاع Polygon (${sign}${height}m)`
          : `Extrude applied: Polygon height (${sign}${height}m)`
      );
    },
    [pushHistory, lang]
  );

  // Toggle All Grids & Helper Planes: G key (ground grid, active plane grid, ghost coordinate frames)
  const lastGridsStateRef = useRef<{ ground: boolean; plane: boolean }>({ ground: true, plane: true });

  const handleToggleAllGrids = useCallback(() => {
    if (showGroundGrid || showPlaneGrid) {
      lastGridsStateRef.current = { ground: showGroundGrid, plane: showPlaneGrid };
      setShowGroundGrid(false);
      setShowPlaneGrid(false);
      showToast(
        lang === 'fa'
          ? 'پنهان‌سازی تمام گریدها و صفحات کمکی (کلید G)'
          : 'All grids and planes hidden (Key G)'
      );
    } else {
      const prev = lastGridsStateRef.current;
      setShowGroundGrid(prev.ground ?? true);
      setShowPlaneGrid(prev.plane ?? true);
      showToast(
        lang === 'fa'
          ? 'نمایش تمام گریدها و صفحات کمکی (کلید G)'
          : 'All grids and planes restored (Key G)'
      );
    }
  }, [showGroundGrid, showPlaneGrid, lang]);

  // Architectural Carve / Void: hollows out or recedes volume from selected face
  const handleCarveBoxFace = useCallback(
    (
      boxId: string,
      faceIndex: number,
      depth: number,
      carveType: 'recess' | 'courtyard' | 'step_cutout' | 'hollow_shell' = 'recess'
    ) => {
      const targetBox = strokesRef.current.find((s) => s.id === boxId);
      if (!targetBox) return;

      const { updatedStrokes, newSelectedBoxId, newSelectedFaceIndex } = carveBoxFace(
        targetBox,
        faceIndex,
        depth,
        carveType
      );

      const updatedMap = new Map(updatedStrokes.map((s) => [s.id, s]));
      const newItems = updatedStrokes.filter(
        (s) => !strokesRef.current.some((existing) => existing.id === s.id)
      );
      const nextStrokes = [
        ...strokesRef.current.map((s) => (updatedMap.has(s.id) ? updatedMap.get(s.id)! : s)),
        ...newItems,
      ];

      pushHistory(nextStrokes);

      setSelectedStrokeIds([newSelectedBoxId]);
      setBoxSubSelection({
        boxId: newSelectedBoxId,
        mode: 'polygon',
        vertexIndices: [],
        edgeIndices: [],
        faceIndices: [newSelectedFaceIndex],
      });

      const carveNameFa =
        carveType === 'courtyard'
          ? 'پاسیو و حیاط مرکزی'
          : carveType === 'step_cutout'
          ? 'برش پله‌ای تراس'
          : 'فرورفتگی/بالکن معمارانه';
      showToast(
        lang === 'fa'
          ? `خالی کردن حجم: ${carveNameFa} (-${depth}m)`
          : `Carved volume: ${carveType} (-${depth}m)`
      );
    },
    [pushHistory, lang]
  );

  // Camera Presets
  const setCameraView = useCallback((pos: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }) => {
    cameraTargetRef.current = {
      position: new THREE.Vector3(pos.x, pos.y, pos.z),
      target: new THREE.Vector3(target.x, target.y, target.z),
      animating: true,
    };
  }, []);

  // Update Plane Offset
  const handleUpdatePlaneOffset = useCallback((planeId: string, deltaOffset: number) => {
    setPlanes((prev) =>
      prev.map((p) => {
        if (p.id !== planeId) return p;
        return {
          ...p,
          origin: {
            x: p.origin.x + p.normal.x * deltaOffset,
            y: p.origin.y + p.normal.y * deltaOffset,
            z: p.origin.z + p.normal.z * deltaOffset,
          },
        };
      })
    );
  }, []);

  const handleSetPlaneAbsoluteOffset = useCallback((planeId: string, axis: 'x' | 'y' | 'z', value: number) => {
    setPlanes((prev) =>
      prev.map((p) => {
        if (p.id !== planeId) return p;
        return {
          ...p,
          origin: {
            ...p.origin,
            [axis]: value,
          },
        };
      })
    );
  }, []);

  // Align camera perpendicular to plane surface
  const handleAlignCameraToPlane = useCallback((plane: DrawingPlane) => {
    const target = { x: plane.origin.x, y: plane.origin.y, z: plane.origin.z };
    const dist = 5.8;
    const pos = {
      x: plane.origin.x + plane.normal.x * dist,
      y: plane.origin.y + plane.normal.y * dist,
      z: plane.origin.z + plane.normal.z * dist,
    };
    setCameraView(pos, target);
  }, [setCameraView]);

  // Material Texture Handlers
  const handleApplyMaterial = useCallback(
    (strokeIds: string[], material: BoxMaterial) => {
      const next = strokes.map((s) => {
        if (strokeIds.includes(s.id)) {
          return {
            ...s,
            material,
          };
        }
        return s;
      });
      pushHistory(next);
      showToast(lang === 'fa' ? 'متریال با موفقیت اعمال شد' : 'Material applied successfully');
    },
    [strokes, pushHistory, lang]
  );

  const handleResetMaterial = useCallback(
    (strokeIds: string[]) => {
      const next = strokes.map((s) => {
        if (strokeIds.includes(s.id)) {
          const { material, ...rest } = s;
          return rest;
        }
        return s;
      });
      pushHistory(next);
      showToast(lang === 'fa' ? 'متریال بازنشانی شد' : 'Material reset to default');
    },
    [strokes, pushHistory, lang]
  );

  // 3D Snap-to-Grid Handlers
  const handleToggleSnap = useCallback(() => {
    setSnapSettings((prev) => {
      const next = !prev.enabled;
      showToast(
        lang === 'fa'
          ? next
            ? 'آهنربای سه‌بعدی فعال شد (Snap-to-Grid ON)'
            : 'آهنربای سه‌بعدی غیرفعال شد (Snap-to-Grid OFF)'
          : next
            ? '3D Snap-to-Grid Enabled'
            : '3D Snap-to-Grid Disabled'
      );
      return { ...prev, enabled: next };
    });
  }, [lang]);

  const handleUpdateSnapSettings = useCallback((newSettings: Partial<SnapSettings>) => {
    setSnapSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Keyboard Shortcuts (Layout-independent: supports Persian, English, and all layouts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering when focused on input/textarea/editable elements
      const target = e.target as HTMLElement | null;
      if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) {
        return;
      }

      // 1. Select All: Ctrl + A / Cmd + A
      if ((e.ctrlKey || e.metaKey) && isKeyMatch(e, 'KeyA', 'a', 'ش')) {
        e.preventDefault();
        handleSelectAll();
        showToast(lang === 'fa' ? 'انتخاب همه خطوط و احجام (Ctrl+A)' : 'Select All (Ctrl+A)');
        return;
      }

      // 2. Undo / Redo: Ctrl + Z / Ctrl + Y
      if ((e.ctrlKey || e.metaKey) && isKeyMatch(e, 'KeyZ', 'z', 'ظ', 'ژ')) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
          showToast(lang === 'fa' ? 'انجام مجدد (Redo)' : 'Redo');
        } else {
          handleUndo();
          showToast(lang === 'fa' ? 'بازگشت به مرحله قبل (Undo)' : 'Undo');
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && isKeyMatch(e, 'KeyY', 'y', 'غ')) {
        e.preventDefault();
        handleRedo();
        showToast(lang === 'fa' ? 'انجام مجدد (Redo)' : 'Redo');
        return;
      }

      // 3. Delete Selected: Delete / Backspace
      if (e.code === 'Delete' || e.key === 'Delete' || e.code === 'Backspace' || e.key === 'Backspace') {
        if (selectedStrokeIdsRef.current.length > 0) {
          e.preventDefault();
          handleDeleteSelected();
          showToast(lang === 'fa' ? 'عناصر انتخاب‌شده حذف شدند' : 'Deleted selected items');
          return;
        }
      }

      // 4. Escape: Deselect all
      if (e.code === 'Escape' || e.key === 'Escape') {
        e.preventDefault();
        handleClearSelection();
        showToast(lang === 'fa' ? 'لغو انتخاب عناصر (Esc)' : 'Deselect (Esc)');
        return;
      }

      // 5. Hide / Unhide: H / ا
      if (!e.ctrlKey && !e.metaKey && !e.altKey && isKeyMatch(e, 'KeyH', 'h', 'ا')) {
        e.preventDefault();
        handleToggleHideSelected();
        showToast(lang === 'fa' ? 'تغییر وضعیت نمایش/پنهان‌سازی (H)' : 'Toggle Hide / Show (H)');
        return;
      }

      // 5b. Toggle All Grids & Helper Planes: G / ل (matching 3ds Max / Blender)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && isKeyMatch(e, 'KeyG', 'g', 'ل')) {
        e.preventDefault();
        handleToggleAllGrids();
        return;
      }

      const hasSelection = selectedStrokeIdsRef.current.length > 0;
      const currentSelectedIds = selectedStrokeIdsRef.current;
      const activeBox = currentSelectedIds.length > 0
        ? strokesRef.current.find((s) => (s.tool === 'box' || s.boxData) && currentSelectedIds.includes(s.id))
        : null;

      // 6. Sub-Object Mode Switching (1: Vertex, 2: Edge, 3: Polygon, 4: Object, Tab: Cycle) when 3D Box is selected
      if (activeBox) {
        if (isKeyMatch(e, 'Digit1', '1', '۱') || e.code === 'Numpad1') {
          e.preventDefault();
          const currentVerts = boxSubSelectionRef.current?.vertexIndices && boxSubSelectionRef.current.vertexIndices.length > 0
            ? boxSubSelectionRef.current.vertexIndices
            : [5];
          setBoxSubSelection({
            boxId: activeBox.id,
            mode: 'vertex',
            vertexIndices: currentVerts,
            edgeIndices: [],
            faceIndices: [],
          });
          showToast(lang === 'fa' ? 'حالت ویرایش نقاط مکعب (Vertex) - کلید ۱' : 'Vertex Edit Mode (Key 1)');
          return;
        }
        if (isKeyMatch(e, 'Digit2', '2', '۲') || e.code === 'Numpad2') {
          e.preventDefault();
          const currentEdges = boxSubSelectionRef.current?.edgeIndices && boxSubSelectionRef.current.edgeIndices.length > 0
            ? boxSubSelectionRef.current.edgeIndices
            : [4];
          setBoxSubSelection({
            boxId: activeBox.id,
            mode: 'edge',
            vertexIndices: [],
            edgeIndices: currentEdges,
            faceIndices: [],
          });
          showToast(lang === 'fa' ? 'حالت ویرایش سگمنت‌ها/لبه‌ها (Edge) - کلید ۲' : 'Edge Edit Mode (Key 2)');
          return;
        }
        if (isKeyMatch(e, 'Digit3', '3', '۳') || e.code === 'Numpad3') {
          e.preventDefault();
          const currentFaces = boxSubSelectionRef.current?.faceIndices && boxSubSelectionRef.current.faceIndices.length > 0
            ? boxSubSelectionRef.current.faceIndices
            : [5];
          setBoxSubSelection({
            boxId: activeBox.id,
            mode: 'polygon',
            vertexIndices: [],
            edgeIndices: [],
            faceIndices: currentFaces,
          });
          showToast(lang === 'fa' ? 'حالت ویرایش سطوح مکعب (Polygon) - کلید ۳' : 'Polygon Edit Mode (Key 3)');
          return;
        }
        if (isKeyMatch(e, 'Digit4', '4', '۴') || e.code === 'Numpad4') {
          e.preventDefault();
          setBoxSubSelection({
            boxId: activeBox.id,
            mode: 'object',
            vertexIndices: [],
            edgeIndices: [],
            faceIndices: [],
          });
          showToast(lang === 'fa' ? 'حالت کل حجم مکعب (Object) - کلید ۴' : 'Object Edit Mode (Key 4)');
          return;
        }
        // Tab key: Cycle through sub-elements
        if (e.code === 'Tab' || e.key === 'Tab') {
          e.preventDefault();
          const cur = boxSubSelectionRef.current;
          if (cur && cur.mode === 'vertex') {
            const nextIdx = ((cur.vertexIndices[0] ?? 0) + 1) % 8;
            setBoxSubSelection({ ...cur, vertexIndices: [nextIdx] });
            showToast(lang === 'fa' ? `انتخاب نقطه شماره ${nextIdx + 1}` : `Selected Vertex ${nextIdx + 1}`);
            return;
          } else if (cur && cur.mode === 'edge') {
            const nextIdx = ((cur.edgeIndices[0] ?? 0) + 1) % 12;
            setBoxSubSelection({ ...cur, edgeIndices: [nextIdx] });
            showToast(lang === 'fa' ? `انتخاب سگمنت شماره ${nextIdx + 1}` : `Selected Edge ${nextIdx + 1}`);
            return;
          } else if (cur && cur.mode === 'polygon') {
            const curFace = cur.faceIndices[0] ?? 5;
            const nextIdx = (curFace + 1) % 6;
            setBoxSubSelection({
              ...cur,
              faceIndices: [nextIdx],
            });
            showToast(
              lang === 'fa'
                ? `انتخاب وجه شماره ${nextIdx + 1} (${BOX_FACE_NAMES_FA[nextIdx] || ''})`
                : `Selected Face ${nextIdx + 1} (${BOX_FACE_NAMES[nextIdx] || ''})`
            );
            return;
          }
        }

        // Extrude (E for Polygon Height, Shift+E for Connected Volume) when in Polygon Sub-Object Mode
        if (boxSubSelectionRef.current?.mode === 'polygon' && (isKeyMatch(e, 'KeyE', 'e', 'ث') && !e.ctrlKey)) {
          e.preventDefault();
          const faceIdx = boxSubSelectionRef.current.faceIndices[0] ?? 1;
          if (e.shiftKey) {
            handleExtrudeBoxFace(boxSubSelectionRef.current.boxId, faceIdx, 1.0);
          } else {
            handleExtrudeSelectedPolygon(boxSubSelectionRef.current.boxId, faceIdx, 0.5);
          }
          return;
        }

        // Carve / Hollow (Shift+C or C) when in Polygon Sub-Object Mode
        if (boxSubSelectionRef.current?.mode === 'polygon' && (isKeyMatch(e, 'KeyC', 'c', 'ز') && (e.shiftKey || !e.ctrlKey))) {
          e.preventDefault();
          const faceIdx = boxSubSelectionRef.current.faceIndices[0] ?? 1;
          handleCarveBoxFace(boxSubSelectionRef.current.boxId, faceIdx, 0.5, 'recess');
          return;
        }
      }

      // 7. Movement via WASD or Arrow Keys for Selected Elements / Sub-Objects
      const isLeft = e.code === 'ArrowLeft' || e.key === 'ArrowLeft' || isKeyMatch(e, 'KeyA', 'a', 'ش');
      const isRight = e.code === 'ArrowRight' || e.key === 'ArrowRight' || isKeyMatch(e, 'KeyD', 'd', 'ی', 'ي', 'ى');
      const isUp = e.code === 'ArrowUp' || e.key === 'ArrowUp' || isKeyMatch(e, 'KeyW', 'w', 'ص');
      // If elements are selected, S moves down on the Y axis (-Y or +Z with Shift)
      const isDown = e.code === 'ArrowDown' || e.key === 'ArrowDown' || (hasSelection && isKeyMatch(e, 'KeyS', 's', 'س'));
      const isPageUp = e.code === 'PageUp' || e.key === 'PageUp';
      const isPageDown = e.code === 'PageDown' || e.key === 'PageDown';

      if (hasSelection && (isLeft || isRight || isUp || isDown || isPageUp || isPageDown)) {
        e.preventDefault();
        const step = e.altKey ? 0.05 : (e.ctrlKey || e.metaKey) ? 1.0 : 0.2;
        const isSub = boxSubSelectionRef.current && boxSubSelectionRef.current.mode !== 'object';
        const targetName = isSub
          ? (boxSubSelectionRef.current?.mode === 'vertex'
              ? (lang === 'fa' ? 'نقطه' : 'Vertex')
              : boxSubSelectionRef.current?.mode === 'edge'
              ? (lang === 'fa' ? 'سگمنت' : 'Segment')
              : (lang === 'fa' ? 'سطح' : 'Polygon'))
          : (lang === 'fa' ? 'عنصر' : 'Item');

        if (isLeft) {
          handleMoveSelectedStrokes({ x: -step, y: 0, z: 0 }, true);
          showToast(lang === 'fa' ? `جابجایی ${targetName} روی محور X به چپ (-${step}m)` : `Move ${targetName} X Left (-${step}m)`);
        } else if (isRight) {
          handleMoveSelectedStrokes({ x: step, y: 0, z: 0 }, true);
          showToast(lang === 'fa' ? `جابجایی ${targetName} روی محور X به راست (+${step}m)` : `Move ${targetName} X Right (+${step}m)`);
        } else if (isUp) {
          if (e.shiftKey) {
            handleMoveSelectedStrokes({ x: 0, y: 0, z: -step }, true);
            showToast(lang === 'fa' ? `جابجایی ${targetName} روی محور Z به عمق (-${step}m)` : `Depth Z (-${step}m)`);
          } else {
            handleMoveSelectedStrokes({ x: 0, y: step, z: 0 }, true);
            showToast(lang === 'fa' ? `جابجایی ${targetName} روی محور Y به بالا (+${step}m)` : `Height Y Up (+${step}m)`);
          }
        } else if (isDown) {
          if (e.shiftKey) {
            handleMoveSelectedStrokes({ x: 0, y: 0, z: step }, true);
            showToast(lang === 'fa' ? `جابجایی ${targetName} روی محور Z به جلو (+${step}m)` : `Depth Z Forward (+${step}m)`);
          } else {
            handleMoveSelectedStrokes({ x: 0, y: -step, z: 0 }, true);
            showToast(lang === 'fa' ? `جابجایی ${targetName} روی محور Y به پایین (-${step}m)` : `Height Y Down (-${step}m)`);
          }
        } else if (isPageUp) {
          handleMoveSelectedStrokes({ x: 0, y: 0, z: -step }, true);
          showToast(lang === 'fa' ? `جابجایی ${targetName} روی محور Z به عمق (-${step}m)` : `Depth Z (-${step}m)`);
        } else if (isPageDown) {
          handleMoveSelectedStrokes({ x: 0, y: 0, z: step }, true);
          showToast(lang === 'fa' ? `جابجایی ${targetName} روی محور Z به جلو (+${step}m)` : `Depth Z (+${step}m)`);
        }
        return;
      }

      // If nothing was selected and user presses A, D, or W, auto-select the latest volume or stroke!
      if (!hasSelection && (isKeyMatch(e, 'KeyA', 'a', 'ش') || isKeyMatch(e, 'KeyD', 'd', 'ی', 'ي', 'ى') || isKeyMatch(e, 'KeyW', 'w', 'ص'))) {
        const lastStroke = [...strokesRef.current].reverse().find((s) => !s.hidden);
        if (lastStroke) {
          e.preventDefault();
          setSelectedStrokeIds([lastStroke.id]);
          if (lastStroke.tool === 'box' || lastStroke.boxData) {
            setBoxSubSelection({
              boxId: lastStroke.id,
              mode: 'object',
              vertexIndices: [],
              edgeIndices: [],
              faceIndices: [],
            });
          }
          showToast(lang === 'fa' ? 'عنصر برای جابجایی انتخاب شد (A/W/D)' : 'Element selected for movement');
          return;
        }
      }

      // 3D Snap-to-Grid: Shift+S - toggles 3ds Max style 3D Snap
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && isKeyMatch(e, 'KeyS', 's', 'س')) {
        e.preventDefault();
        handleToggleSnap();
        return;
      }

      // Snap Settings Dialog: Shift+G
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && isKeyMatch(e, 'KeyG', 'g', 'ل')) {
        e.preventDefault();
        setIsSnapSettingsOpen((prev) => !prev);
        return;
      }

      // 8. Select Tool: S (or V) - activates select tool
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && (isKeyMatch(e, 'KeyS', 's', 'س') || isKeyMatch(e, 'KeyV', 'v', 'ر'))) {
        e.preventDefault();
        setTool('select');
        setMode('draw');
        showToast(lang === 'fa' ? 'ابزار انتخاب خطوط و احجام (S)' : 'Select Objects tool (S)');
        return;
      }

      // 9. Line Tool: L (or م) - activates straight line tool
      if (!e.ctrlKey && !e.metaKey && !e.altKey && isKeyMatch(e, 'KeyL', 'l', 'م')) {
        e.preventDefault();
        setTool('line');
        setMode('draw');
        showToast(lang === 'fa' ? 'ابزار خط‌کش مستقیم (L)' : 'Straight Line tool (L)');
        return;
      }

      // 10. Pen Tool: P (or ح) - activates ink pen tool
      if (!e.ctrlKey && !e.metaKey && !e.altKey && isKeyMatch(e, 'KeyP', 'p', 'ح')) {
        e.preventDefault();
        setTool('pen');
        setMode('draw');
        showToast(lang === 'fa' ? 'ابزار قلم نوری (P)' : 'Pen tool (P)');
        return;
      }

      // 11. Eraser Tool: E (or ث)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && isKeyMatch(e, 'KeyE', 'e', 'ث')) {
        e.preventDefault();
        setTool('eraser');
        setMode('draw');
        showToast(lang === 'fa' ? 'پاک‌کن فضایی (E)' : 'Eraser (E)');
        return;
      }

      // 12. 3D Measure & Tape Tool: M (or پ)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && isKeyMatch(e, 'KeyM', 'm', 'پ')) {
        e.preventDefault();
        setTool('measure');
        setMode('draw');
        showToast(lang === 'fa' ? 'ابزار متر و اندازه‌گیری سه‌بعدی (M)' : '3D Tape Measure (M)');
        return;
      }

      // 13. 3D Box Tool: B (or ذ)
      if (!e.ctrlKey && !e.metaKey && !e.altKey && isKeyMatch(e, 'KeyB', 'b', 'ذ')) {
        e.preventDefault();
        setTool('box');
        setMode('draw');
        showToast(lang === 'fa' ? 'ترسیم مکعب سه‌بعدی (B)' : '3D Box tool (B)');
        return;
      }

      // 14. Space: Toggle Draw <-> Orbit mode
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        setMode((prev) => {
          const next = prev === 'draw' ? 'orbit' : 'draw';
          showToast(next === 'draw' ? (lang === 'fa' ? 'حالت ترسیم (Space)' : 'Draw Mode (Space)') : (lang === 'fa' ? 'حالت چرخش ۳بعدی (Space)' : '3D Orbit Mode (Space)'));
          return next;
        });
        return;
      }

      // 15. 3D Planes: 1, 2, 3 (When NO box is selected)
      if (isKeyMatch(e, 'Digit1', '1', '۱') || e.code === 'Numpad1') {
        const p = planes.find((pl) => pl.surfaceType === 'xoy') || planes[0];
        if (p) {
          setActivePlaneId(p.id);
          showToast(lang === 'fa' ? 'صفحه کف XOY (کلید ۱)' : 'Floor Plane XOY (Key 1)');
        }
        return;
      }
      if (isKeyMatch(e, 'Digit2', '2', '۲') || e.code === 'Numpad2') {
        const p = planes.find((pl) => pl.surfaceType === 'xoz') || planes[1];
        if (p) {
          setActivePlaneId(p.id);
          showToast(lang === 'fa' ? 'صفحه روبرو XOZ (کلید ۲)' : 'Front Plane XOZ (Key 2)');
        }
        return;
      }
      if (isKeyMatch(e, 'Digit3', '3', '۳') || e.code === 'Numpad3') {
        const p = planes.find((pl) => pl.surfaceType === 'yoz') || planes[2];
        if (p) {
          setActivePlaneId(p.id);
          showToast(lang === 'fa' ? 'صفحه جانبی YOZ (کلید ۳)' : 'Side Plane YOZ (Key 3)');
        }
        return;
      }

      // 16. Plane offset: [ / ]
      if (isKeyMatch(e, 'BracketLeft', '[', 'ج')) {
        handleUpdatePlaneOffset(activePlaneId, -0.2);
        showToast(lang === 'fa' ? 'جابجایی عمق صفحه (-0.2m)' : 'Shift Plane Offset (-0.2m)');
        return;
      }
      if (isKeyMatch(e, 'BracketRight', ']', 'چ')) {
        handleUpdatePlaneOffset(activePlaneId, 0.2);
        showToast(lang === 'fa' ? 'جابجایی عمق صفحه (+0.2m)' : 'Shift Plane Offset (+0.2m)');
        return;
      }

      // 16. Align Camera to Plane: F (or ب)
      if (isKeyMatch(e, 'KeyF', 'f', 'ب')) {
        const curr = planes.find((p) => p.id === activePlaneId);
        if (curr) {
          handleAlignCameraToPlane(curr);
          showToast(lang === 'fa' ? 'تراز دوربین بر صفحه (F)' : 'Align Camera (F)');
        }
        return;
      }

      // 17. Toggle Shading Mode: F3 (Standard 3ds Max shortcut)
      if (e.key === 'F3' || e.code === 'F3') {
        e.preventDefault();
        setShadingMode((prev) => {
          const next = prev === 'shaded' ? 'wireframe' : 'shaded';
          showToast(
            next === 'shaded'
              ? (lang === 'fa' ? 'حالت سایه‌دار و توپر فعال شد (F3)' : 'Shaded Solid Mode (F3)')
              : (lang === 'fa' ? 'حالت خطی وایرفریم فعال شد (F3)' : 'Wireframe Mode (F3)')
          );
          return next;
        });
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleUndo,
    handleRedo,
    planes,
    activePlaneId,
    handleUpdatePlaneOffset,
    handleAlignCameraToPlane,
    handleSelectAll,
    handleDeleteSelected,
    handleToggleHideSelected,
    handleClearSelection,
    handleMoveSelectedStrokes,
    showToast,
    lang,
  ]);

  // Layer Management
  const handleToggleLayerVisibility = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l))
    );
  };

  const handleToggleLayerLock = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, locked: !l.locked } : l))
    );
  };

  const handleChangeLayerOpacity = (layerId: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, opacity } : l))
    );
  };

  const handleAddLayer = () => {
    const newId = `layer-${Date.now()}`;
    const colors = ['#2563EB', '#059669', '#DC2626', '#D97706', '#7C3AED', '#DB2777', '#0891B2'];
    const colorTag = colors[layers.length % colors.length];
    const newLayer: Layer = {
      id: newId,
      name: `Layer ${layers.length + 1}`,
      nameFa: `لایه ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1.0,
      colorTag,
    };
    setLayers((prev) => [newLayer, ...prev]);
    setActiveLayerId(newId);
  };

  const handleDeleteLayer = (layerId: string) => {
    if (layers.length <= 1) return;
    const nextLayers = layers.filter((l) => l.id !== layerId);
    setLayers(nextLayers);
    if (activeLayerId === layerId) {
      setActiveLayerId(nextLayers[0].id);
    }
    // Also remove strokes of this layer
    const nextStrokes = strokes.filter((s) => s.layerId !== layerId);
    pushHistory(nextStrokes);
  };

  const handleRenameLayer = (layerId: string, name: string) => {
    setLayers((prev) =>
      prev.map((l) =>
        l.id === layerId ? { ...l, name, nameFa: name } : l
      )
    );
  };

  // Plane Management
  const handleAddPlane = (newPlane: DrawingPlane) => {
    setPlanes((prev) => [...prev, newPlane]);
    setActivePlaneId(newPlane.id);
  };

  const handleSetViewPreset = (preset: 'front' | 'side' | 'top' | 'perspective' | 'isometric') => {
    if (preset === 'perspective') {
      setCameraView({ x: 3.4, y: 4.0, z: 5.8 }, { x: 0.5, y: 2.0, z: 0.8 });
    } else if (preset === 'front') {
      setCameraView({ x: 0.2, y: 2.8, z: 6.8 }, { x: 0.2, y: 2.8, z: 0 });
    } else if (preset === 'side') {
      setCameraView({ x: 6.8, y: 2.5, z: 1.2 }, { x: 0.2, y: 2.2, z: 1.2 });
    } else if (preset === 'top') {
      setCameraView({ x: 0.5, y: 8.5, z: 1.2 }, { x: 0.5, y: 0, z: 1.2 });
    } else if (preset === 'isometric') {
      setCameraView({ x: 5.0, y: 5.0, z: 5.0 }, { x: 0.5, y: 1.5, z: 0.5 });
    }
  };

  const handleResetView = () => {
    handleSetViewPreset('perspective');
  };

  const handleSaveBookmark = () => {
    const newBm: CameraBookmark = {
      id: `bm-${Date.now()}`,
      name: lang === 'fa' ? `دید دوربین ${bookmarks.length + 1}` : `Viewpoint ${bookmarks.length + 1}`,
      position: {
        x: currentCamPos.current.x,
        y: currentCamPos.current.y,
        z: currentCamPos.current.z,
      },
      target: {
        x: currentCamTarget.current.x,
        y: currentCamTarget.current.y,
        z: currentCamTarget.current.z,
      },
      fov: focalLength,
    };
    setBookmarks((prev) => [...prev, newBm]);
  };

  const handleSelectBookmark = (b: CameraBookmark) => {
    setCameraView(b.position, b.target);
  };

  // Reset to Demo Model (The cafe & facade from the photo)
  const handleResetToDemo = () => {
    const demo = generateDemoStrokes();
    setStrokes(demo);
    setLayers(INITIAL_LAYERS);
    setPlanes(INITIAL_PLANES);
    setActiveLayerId('layer-facade');
    setActivePlaneId('plane-facade');
    pushHistory(demo);
    handleResetView();
  };

  // Clear All
  const handleClearAll = () => {
    if (window.confirm(lang === 'fa' ? 'آیا از پاک کردن تمام خطوط اطمینان دارید؟' : 'Clear all strokes?')) {
      pushHistory([]);
    }
  };

  // Export Screenshot PNG
  const handleExportImage = () => {
    const canvas = document.querySelector('#viewport-3d-container canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `3d-sketch-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Export Project JSON
  const handleExportJson = () => {
    const data = {
      version: '1.0',
      planes,
      layers,
      strokes,
      createdAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `3d-sketch-project-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activePlane = planes.find((p) => p.id === activePlaneId) || planes[0];

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-[#0f172a] text-slate-100 font-sans antialiased select-none"
      style={{ background: 'radial-gradient(circle at 0% 0%, #1e293b 0%, #0f172a 100%)' }}
    >
      {/* 3D WebGL Spatial Canvas */}
      <Viewport3D
        strokes={strokes}
        layers={layers}
        activeLayerId={activeLayerId}
        planes={planes}
        activePlaneId={activePlaneId}
        tool={tool}
        mode={mode}
        strokeColor={strokeColor}
        strokeSize={strokeSize}
        strokeOpacity={strokeOpacity}
        focalLength={focalLength}
        isOrtho={isOrtho}
        showPlaneGrid={showPlaneGrid}
        showGroundGrid={showGroundGrid}
        showAxes={showAxes}
        shadingMode={shadingMode}
        snapSettings={snapSettings}
        onAddStroke={handleAddStroke}
        onEraseStroke={handleEraseStroke}
        onLiveBoxDimensionsChange={setBoxDimensions}
        selectedStrokeIds={selectedStrokeIds}
        boxSubSelection={boxSubSelection}
        onUpdateBoxSubSelection={setBoxSubSelection}
        onSelectStroke={handleSelectStroke}
        onClearSelection={handleClearSelection}
        onMoveSelectedStrokes={(delta) => handleMoveSelectedStrokes(delta, false)}
        onCommitMoveSelectedStrokes={handleCommitMoveSelectedStrokes}
        onExtrudeBoxFace={handleExtrudeBoxFace}
        onCarveBoxFace={handleCarveBoxFace}
        lang={lang}
        cameraTargetRef={cameraTargetRef}
        onCameraChange={(pos, target) => {
          currentCamPos.current.set(pos.x, pos.y, pos.z);
          currentCamTarget.current.set(target.x, target.y, target.z);
        }}
      />

      {/* Top Header Bar */}
      <TopBar
        focalLength={focalLength}
        isOrtho={isOrtho}
        activePlane={activePlane}
        planes={planes}
        showPlaneGrid={showPlaneGrid}
        showGroundGrid={showGroundGrid}
        shadingMode={shadingMode}
        onToggleShadingMode={() => setShadingMode((prev) => (prev === 'shaded' ? 'wireframe' : 'shaded'))}
        bookmarks={bookmarks}
        onSelectFocalLength={setFocalLength}
        onToggleOrtho={() => setIsOrtho(!isOrtho)}
        onSetViewPreset={handleSetViewPreset}
        onResetView={handleResetView}
        onSaveBookmark={handleSaveBookmark}
        onSelectBookmark={handleSelectBookmark}
        onTogglePlaneGrid={() => setShowPlaneGrid(!showPlaneGrid)}
        onToggleGroundGrid={() => setShowGroundGrid(!showGroundGrid)}
        onToggleAllGrids={handleToggleAllGrids}
        onSelectPlane={setActivePlaneId}
        onOpenPlaneManager={() => setIsPlaneManagerOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onResetToDemo={handleResetToDemo}
        onClearAll={handleClearAll}
        onExportImage={handleExportImage}
        onExportJson={handleExportJson}
        lang={lang}
        onToggleLang={() => setLang((prev) => (prev === 'fa' ? 'en' : 'fa'))}
        isMaterialPanelOpen={activeRightDrawer === 'materials'}
        onToggleMaterialPanel={() =>
          setActiveRightDrawer((prev) => (prev === 'materials' ? 'surfaces' : 'materials'))
        }
        snapSettings={snapSettings}
        onToggleSnap={handleToggleSnap}
        onOpenSnapSettings={() => setIsSnapSettingsOpen(true)}
      />

      {/* Left Toolstrip (Pens, Eraser, Size, Color, Undo/Redo) */}
      <Toolbar
        tool={tool}
        mode={mode}
        strokeColor={strokeColor}
        strokeSize={strokeSize}
        strokeOpacity={strokeOpacity}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onSelectTool={setTool}
        onSelectMode={setMode}
        onChangeColor={setStrokeColor}
        onChangeSize={setStrokeSize}
        onChangeOpacity={setStrokeOpacity}
        onUndo={handleUndo}
        onRedo={handleRedo}
        lang={lang}
      />

      {/* 3D Box HUD: Live numeric dimension inputs & Insert button */}
      {tool === 'box' && (
        <BoxDimensionHUD
          dimensions={boxDimensions}
          onChangeDimensions={setBoxDimensions}
          onInsertBox={handleInsertBox}
          lang={lang}
          activePlaneName={lang === 'fa' ? activePlane.nameFa || activePlane.name : activePlane.name}
        />
      )}

      {/* Selection HUD: Delete, Hide/Unhide, Select All, Items Count, Coordinate Movement */}
      <SelectionHUD
        selectedStrokeIds={selectedStrokeIds}
        strokes={strokes}
        boxSubSelection={boxSubSelection}
        onUpdateBoxSubSelection={setBoxSubSelection}
        onDeleteSelected={handleDeleteSelected}
        onToggleHideSelected={handleToggleHideSelected}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onUnhideAll={handleUnhideAll}
        onMoveSelected={handleMoveSelectedStrokes}
        onExtrudeBoxFace={handleExtrudeBoxFace}
        onCarveBoxFace={handleCarveBoxFace}
        onExtrudeSelectedPolygon={handleExtrudeSelectedPolygon}
        lang={lang}
        isOpen={activeRightDrawer === 'selection'}
        onToggleOpen={(open) => setActiveRightDrawer(open ? 'selection' : null)}
        activePanelTab={activeRightDrawer || 'selection'}
        onSelectPanelTab={(tab) => setActiveRightDrawer(tab)}
      />

      {/* Right Layer Stack (Visibility, Lock, Opacity, Add/Delete Layer) */}
      <LayerPanel
        layers={layers}
        activeLayerId={activeLayerId}
        onSelectLayer={setActiveLayerId}
        onToggleVisibility={handleToggleLayerVisibility}
        onToggleLock={handleToggleLayerLock}
        onChangeOpacity={handleChangeLayerOpacity}
        onAddLayer={handleAddLayer}
        onDeleteLayer={handleDeleteLayer}
        onRenameLayer={handleRenameLayer}
        strokeCounts={strokeCounts}
        lang={lang}
        isOpen={activeRightDrawer === 'layers'}
        onToggleOpen={(open) => setActiveRightDrawer(open ? 'layers' : null)}
        activePanelTab={activeRightDrawer || 'layers'}
        onSelectPanelTab={(tab) => setActiveRightDrawer(tab)}
        hasSelection={selectedStrokeIds.length > 0}
      />

      {/* Modals */}
      <PlaneManager
        isOpen={isPlaneManagerOpen}
        onClose={() => setIsPlaneManagerOpen(false)}
        planes={planes}
        activePlaneId={activePlaneId}
        onSelectPlane={setActivePlaneId}
        onAddPlane={handleAddPlane}
        onUpdatePlaneOffset={handleUpdatePlaneOffset}
        lang={lang}
      />

      <HelpGuideModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        lang={lang}
      />

      <SnapSettingsModal
        isOpen={isSnapSettingsOpen}
        onClose={() => setIsSnapSettingsOpen(false)}
        settings={snapSettings}
        onUpdateSettings={handleUpdateSnapSettings}
        lang={lang}
      />

      {/* 3D Surface & Axes Controller (XOY, XOZ, YOZ) */}
      <SurfaceController
        planes={planes}
        activePlane={activePlane}
        onSelectPlane={setActivePlaneId}
        onUpdatePlaneOffset={handleUpdatePlaneOffset}
        onSetPlaneAbsoluteOffset={handleSetPlaneAbsoluteOffset}
        onAlignCameraToPlane={handleAlignCameraToPlane}
        showAxes={showAxes}
        onToggleAxes={() => setShowAxes(!showAxes)}
        lang={lang}
        isOpen={activeRightDrawer === 'surfaces'}
        onToggleOpen={(open) => setActiveRightDrawer(open ? 'surfaces' : null)}
        activePanelTab={activeRightDrawer || 'surfaces'}
        onSelectPanelTab={(tab) => setActiveRightDrawer(tab)}
        hasSelection={selectedStrokeIds.length > 0}
      />

      {/* Material & Texture Library Panel */}
      <MaterialPanel
        selectedStrokeIds={selectedStrokeIds}
        strokes={strokes}
        onApplyMaterial={handleApplyMaterial}
        onResetMaterial={handleResetMaterial}
        lang={lang}
        isOpen={activeRightDrawer === 'materials'}
        onToggleOpen={(open) => setActiveRightDrawer(open ? 'materials' : null)}
        activePanelTab={activeRightDrawer || 'materials'}
        onSelectPanelTab={(tab) => setActiveRightDrawer(tab)}
      />

      {/* Quick Visual Feedback Toast for Shortcuts and Actions */}
      {actionToast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 animate-in fade-in zoom-in-95"
          dir={lang === 'fa' ? 'rtl' : 'ltr'}
        >
          <div className="px-4 py-2 bg-slate-900/90 backdrop-blur-xl border border-indigo-500/40 text-indigo-200 text-xs font-semibold rounded-full shadow-[0_10px_25px_-5px_rgba(99,102,241,0.4)] flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span>{actionToast}</span>
          </div>
        </div>
      )}

      {/* Persistent Keyboard Shortcuts Component near the bottom UI */}
      <div
        className="absolute bottom-4 right-4 z-20"
        dir={lang === 'fa' ? 'rtl' : 'ltr'}
      >
        <KeyboardShortcuts lang={lang} />
      </div>

      {/* Bottom Floating Hint Bar */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        dir={lang === 'fa' ? 'rtl' : 'ltr'}
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 text-slate-200 text-xs px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse" />
            <span className="font-medium">
              {mode === 'draw'
                ? lang === 'fa'
                  ? 'حالت ترسیم فعال: کلیک چپ برای کشیدن خط روی بوم، کلیک راست برای چرخش سه‌بعدی'
                  : 'Draw mode active: Left-click to draw on plane, Right-click to orbit'
                : lang === 'fa'
                  ? 'حالت چرخش فعال: کلیک و درگ برای چرخش سه‌بعدی ۳۶۰ درجه'
                  : 'Orbit mode active: Drag to rotate camera in 3D'}
            </span>
          </span>
          <span className="text-slate-400 text-[11px] hidden md:inline">
            {lang === 'fa' ? '(کلید Space برای تغییر حالت)' : '(Press Space to toggle)'}
          </span>
        </div>
      </div>
    </div>
  );
}
