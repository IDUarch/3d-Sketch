import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { Square, Ruler, X, ArrowRight } from 'lucide-react';
import {
  Stroke,
  Layer,
  DrawingPlane,
  ToolType,
  InteractionMode,
  LensFocalLength,
  Point3D,
  BoxDimensions,
  BoxData,
  BoxSubSelection,
  ShadingMode,
  ActiveMeasurement,
  SnapSettings,
} from '../types';
import {
  findMeasurementSnapPoint,
  formatMeasurement,
  buildMeasurementGroup,
  SnapResult,
} from '../utils/measureHelpers';
import { evaluate3dSnap, SnapResult as MaxSnapResult } from '../utils/snapEngine';
import { SnapIndicator } from './SnapIndicator';
import {
  focalLengthToFov,
  intersectActivePlane,
  buildStrokeObject,
  buildPlaneHelper,
  buildCoordinateAxesHelper,
  buildGhostSurfacesHelper,
  calculateBoxFromDrag,
  findHitStroke,
  findHitBoxSubElement,
  buildSelectionHighlight,
  getSelectionCentroid,
  getBoxSubSelectionCentroid,
  buildTransformGizmo,
  extrudeBoxFace,
  carveBoxFace,
  getBoxFaceNormal,
  BoxSubHit,
} from '../utils/threeHelpers';
import { smoothStrokePoints, smoothLiveStroke } from '../utils/strokeSmoothing';

interface Viewport3DProps {
  strokes: Stroke[];
  layers: Layer[];
  activeLayerId: string;
  planes: DrawingPlane[];
  activePlaneId: string;
  tool: ToolType;
  mode: InteractionMode;
  strokeColor: string;
  strokeSize: number;
  strokeOpacity: number;
  focalLength: LensFocalLength;
  isOrtho: boolean;
  showPlaneGrid: boolean;
  showGroundGrid: boolean;
  showAxes: boolean;
  shadingMode?: ShadingMode;
  snapSettings?: SnapSettings;
  onAddStroke: (stroke: Stroke) => void;
  onEraseStroke: (strokeId: string) => void;
  onLiveBoxDimensionsChange?: (dims: BoxDimensions) => void;
  selectedStrokeIds?: string[];
  boxSubSelection?: BoxSubSelection | null;
  onUpdateBoxSubSelection?: (subSel: BoxSubSelection | null) => void;
  onSelectStroke?: (strokeId: string, isShift: boolean, initialSubSel?: BoxSubSelection | null) => void;
  onClearSelection?: () => void;
  onMoveSelectedStrokes?: (delta: { x: number; y: number; z: number }) => void;
  onCommitMoveSelectedStrokes?: () => void;
  onExtrudeBoxFace?: (boxId: string, faceIndex: number, distance: number) => void;
  onCarveBoxFace?: (boxId: string, faceIndex: number, depth: number, carveType: 'recess' | 'courtyard' | 'step_cutout' | 'hollow_shell') => void;
  lang?: 'en' | 'fa';
  cameraTargetRef: React.MutableRefObject<{
    position: THREE.Vector3;
    target: THREE.Vector3;
    animating: boolean;
  }>;
  onCameraChange?: (pos: Point3D, target: Point3D) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  strokes,
  layers,
  activeLayerId,
  planes,
  activePlaneId,
  tool,
  mode,
  strokeColor,
  strokeSize,
  strokeOpacity,
  focalLength,
  isOrtho,
  showPlaneGrid,
  showGroundGrid,
  showAxes,
  shadingMode = 'shaded' as ShadingMode,
  snapSettings,
  onAddStroke,
  onEraseStroke,
  onLiveBoxDimensionsChange,
  selectedStrokeIds = [],
  boxSubSelection = null,
  onUpdateBoxSubSelection,
  onSelectStroke,
  onClearSelection,
  onMoveSelectedStrokes,
  onCommitMoveSelectedStrokes,
  onExtrudeBoxFace,
  onCarveBoxFace,
  lang = 'fa',
  cameraTargetRef,
  onCameraChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | THREE.OrthographicCamera | null>(null);
  const strokesGroupRef = useRef<THREE.Group | null>(null);
  const selectionGroupRef = useRef<THREE.Group | null>(null);
  const helpersGroupRef = useRef<THREE.Group | null>(null);
  const livePreviewRef = useRef<THREE.Group | null>(null);
  const currentBoxDataRef = useRef<BoxData | null>(null);

  // 3D Transform Gizmo Dragging State
  const isGizmoDraggingRef = useRef(false);
  const activeGizmoAxisRef = useRef<'x' | 'y' | 'z' | 'center' | null>(null);
  const gizmoCentroidRef = useRef<Point3D>({ x: 0, y: 0, z: 0 });

  // Shift-Extrude & Carve State (Matching 3ds Max Editable Poly)
  const isShiftExtrudeActiveRef = useRef(false);
  const shiftExtrudeTargetBoxIdRef = useRef<string | null>(null);
  const shiftExtrudeFaceIndexRef = useRef<number>(1);
  const shiftExtrudeAccumDistanceRef = useRef<number>(0);

  // Orbit control state (spherical coords around target)
  const orbitTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0.5, 2.0, 0.8));
  const isOrbitingRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Drawing state
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<Point3D[]>([]);
  const startPointRef = useRef<Point3D | null>(null);

  // Touch gesture state for pinch-zoom and two-finger pan
  const touchDistanceRef = useRef<number | null>(null);
  const lastTouchCenterRef = useRef<{ x: number; y: number } | null>(null);

  // Ctrl key detection for polygon selection
  const [isCtrlKeyActive, setIsCtrlKeyActive] = useState(false);

  // 3D Measuring Tool State & Refs
  const measurementGroupRef = useRef<THREE.Group | null>(null);
  const [activeMeasurement, setActiveMeasurement] = useState<ActiveMeasurement | null>(null);
  const [measurementUnit, setMeasurementUnit] = useState<'m' | 'cm' | 'ft'>('m');
  const [snapCandidate, setSnapCandidate] = useState<SnapResult | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlKeyActive(true);
      }
      if (e.key === 'Escape' && activeMeasurement) {
        setActiveMeasurement(null);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlKeyActive(false);
      }
    };
    const handleBlur = () => {
      setIsCtrlKeyActive(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [activeMeasurement]);

  const activePlane = planes.find((p) => p.id === activePlaneId) || planes[0];
  const activeLayer = layers.find((l) => l.id === activeLayerId);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    // Frosted Glass deep space canvas background (#0a0f1d / #0f172a)
    scene.background = new THREE.Color('#0b1120');
    sceneRef.current = scene;

    const aspect = width / height;
    const fov = focalLengthToFov(focalLength);

    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);
    // Matching the wide-angle 3/4 perspective in the user's tablet photo
    camera.position.set(3.4, 4.0, 5.8);
    camera.lookAt(orbitTargetRef.current);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // Groups
    const strokesGroup = new THREE.Group();
    strokesGroup.name = 'all-strokes';
    scene.add(strokesGroup);
    strokesGroupRef.current = strokesGroup;

    const selectionGroup = new THREE.Group();
    selectionGroup.name = 'all-selections';
    scene.add(selectionGroup);
    selectionGroupRef.current = selectionGroup;

    const helpersGroup = new THREE.Group();
    helpersGroup.name = 'all-helpers';
    scene.add(helpersGroup);
    helpersGroupRef.current = helpersGroup;

    const livePreviewGroup = new THREE.Group();
    livePreviewGroup.name = 'live-preview';
    scene.add(livePreviewGroup);
    livePreviewRef.current = livePreviewGroup;

    const measurementGroup = new THREE.Group();
    measurementGroup.name = 'all-measurements';
    scene.add(measurementGroup);
    measurementGroupRef.current = measurementGroup;

    // Ambient & Studio Directional Lighting (3ds Max 2-Light Setup for crisp, legible architectural geometry)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.6);
    keyLight.position.set(8, 12, 10);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.35);
    fillLight.position.set(-8, -6, -10);
    scene.add(fillLight);

    // Render loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth camera transition if flying
      if (cameraTargetRef.current.animating && cameraRef.current) {
        const cam = cameraRef.current;
        const targetPos = cameraTargetRef.current.position;
        const targetLook = cameraTargetRef.current.target;

        cam.position.lerp(targetPos, 0.08);
        orbitTargetRef.current.lerp(targetLook, 0.08);
        cam.lookAt(orbitTargetRef.current);

        if (cam.position.distanceTo(targetPos) < 0.02 && orbitTargetRef.current.distanceTo(targetLook) < 0.02) {
          cam.position.copy(targetPos);
          orbitTargetRef.current.copy(targetLook);
          cameraTargetRef.current.animating = false;
        }
      }

      renderer.render(scene, cameraRef.current!);
    };
    animate();

    // ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0 && cameraRef.current && rendererRef.current) {
          const cam = cameraRef.current;
          if (cam instanceof THREE.PerspectiveCamera) {
            cam.aspect = w / h;
            cam.updateProjectionMatrix();
          }
          rendererRef.current.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  // Update Camera Lens / Focal Length
  useEffect(() => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    if (cam instanceof THREE.PerspectiveCamera) {
      cam.fov = focalLengthToFov(focalLength);
      cam.updateProjectionMatrix();
    }
  }, [focalLength, isOrtho]);

  // Update Scene Helpers (Ground Grid, Active Plane Helper, Axes)
  useEffect(() => {
    if (!helpersGroupRef.current) return;
    const helpers = helpersGroupRef.current;
    helpers.clear();

    // Ground Grid
    if (showGroundGrid) {
      const groundGrid = new THREE.GridHelper(14, 28, 0x6366f1, 0x1e293b);
      groundGrid.position.y = 0;
      helpers.add(groundGrid);
    }

    // Active Plane Frame & Visual Grid
    if (showPlaneGrid && activePlane) {
      const planeHelper = buildPlaneHelper(activePlane, true);
      helpers.add(planeHelper);

      // Ghost wireframes for orthogonal coordinate surfaces (XOY, XOZ, YOZ)
      const ghostSurfaces = buildGhostSurfacesHelper(activePlaneId, planes);
      helpers.add(ghostSurfaces);
    }

    // 3D Coordinate Trihedron Axes (X=Red, Y=Green, Z=Blue)
    if (showAxes) {
      const axesHelper = buildCoordinateAxesHelper();
      helpers.add(axesHelper);
    }
  }, [showGroundGrid, showPlaneGrid, showAxes, activePlane, activePlaneId, planes]);

  // Re-render Strokes when strokes, layers, or planes change
  useEffect(() => {
    if (!strokesGroupRef.current) return;
    const group = strokesGroupRef.current;
    group.clear();

    const layerMap = new Map<string, Layer>(layers.map((l) => [l.id, l]));
    const planeMap = new Map<string, DrawingPlane>(planes.map((p) => [p.id, p]));

    strokes.forEach((stroke) => {
      const layer = layerMap.get(stroke.layerId);
      if (!layer || !layer.visible) return;
      if (stroke.hidden) return;

      const plane = planeMap.get(stroke.planeId);
      const strokeObj = buildStrokeObject(
        {
          ...stroke,
          opacity: stroke.opacity * layer.opacity,
        },
        plane,
        shadingMode
      );
      group.add(strokeObj);
    });
  }, [strokes, layers, planes, shadingMode]);

  // Update 3D Selection Highlights & Coordinate Transform Gizmo
  useEffect(() => {
    if (!selectionGroupRef.current) return;
    const group = selectionGroupRef.current;
    group.clear();

    if (!selectedStrokeIds || selectedStrokeIds.length === 0) return;

    const selectedSet = new Set(selectedStrokeIds);
    const selectedStrokes = strokes.filter((s) => selectedSet.has(s.id) && !s.hidden);
    if (selectedStrokes.length > 0) {
      const highlightMesh = buildSelectionHighlight(selectedStrokes, boxSubSelection);
      group.add(highlightMesh);

      // Add 3D Coordinate Transform Gizmo at selection center (or sub-element centroid)
      let centroid: Point3D;
      const targetBox = selectedStrokes.find((s) => s.id === boxSubSelection?.boxId);
      if (targetBox && boxSubSelection && boxSubSelection.mode !== 'object') {
        centroid = getBoxSubSelectionCentroid(targetBox, boxSubSelection);
      } else {
        centroid = getSelectionCentroid(selectedStrokes);
      }

      gizmoCentroidRef.current = centroid;
      const gizmo = buildTransformGizmo(centroid);
      group.add(gizmo);
    }
  }, [selectedStrokeIds, strokes, boxSubSelection]);

  // Update 3D Measurement Visuals in Scene
  useEffect(() => {
    if (!measurementGroupRef.current) return;
    const group = measurementGroupRef.current;
    group.clear();

    if (activeMeasurement) {
      const visual = buildMeasurementGroup(activeMeasurement);
      group.add(visual);
    }
  }, [activeMeasurement]);

  // Convert screen coordinates to NDC [-1, 1]
  const getNDC = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    return { x, y };
  }, []);

  // 3ds Max Style Live Cursor Snap State
  const [hoverSnapResult, setHoverSnapResult] = useState<MaxSnapResult | null>(null);

  // Calculates candidate snap point or raw plane intersection
  const getEffectiveSnapPoint = useCallback(
    (clientX: number, clientY: number): { point: Point3D | null; snap: MaxSnapResult | null } => {
      if (!cameraRef.current || !containerRef.current) {
        return { point: null, snap: null };
      }
      const rect = containerRef.current.getBoundingClientRect();
      const ndc = getNDC(clientX, clientY);
      const rawHit = intersectActivePlane(ndc.x, ndc.y, cameraRef.current, activePlane);

      if (snapSettings?.enabled) {
        const snap = evaluate3dSnap(
          clientX,
          clientY,
          cameraRef.current,
          rect,
          rawHit,
          activePlane,
          strokes,
          snapSettings
        );
        if (snap) {
          return { point: snap.point, snap };
        }
      }

      return { point: rawHit, snap: null };
    },
    [activePlane, snapSettings, strokes, getNDC]
  );

  // Orbit camera around orbitTargetRef
  const handleOrbit = useCallback((deltaX: number, deltaY: number) => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    const target = orbitTargetRef.current;
    const offset = new THREE.Vector3().subVectors(cam.position, target);

    const spherical = new THREE.Spherical().setFromVector3(offset);
    const rotateSpeed = 0.006;
    spherical.theta -= deltaX * rotateSpeed;
    spherical.phi -= deltaY * rotateSpeed;

    // Constrain phi to prevent camera flipping
    spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi));
    spherical.makeSafe();

    offset.setFromSpherical(spherical);
    cam.position.copy(target).add(offset);
    cam.lookAt(target);

    onCameraChange?.({ x: cam.position.x, y: cam.position.y, z: cam.position.z }, { x: target.x, y: target.y, z: target.z });
  }, [onCameraChange]);

  // Pan camera in view plane
  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    const target = orbitTargetRef.current;

    const distance = cam.position.distanceTo(target);
    const panSpeed = distance * 0.0016;

    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    cam.matrix.extractBasis(right, up, new THREE.Vector3());

    const panOffset = new THREE.Vector3()
      .addScaledVector(right, -deltaX * panSpeed)
      .addScaledVector(up, deltaY * panSpeed);

    cam.position.add(panOffset);
    target.add(panOffset);

    onCameraChange?.({ x: cam.position.x, y: cam.position.y, z: cam.position.z }, { x: target.x, y: target.y, z: target.z });
  }, [onCameraChange]);

  // Zoom camera towards target
  const handleZoom = useCallback((deltaZoom: number) => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    const target = orbitTargetRef.current;
    const offset = new THREE.Vector3().subVectors(cam.position, target);

    const factor = deltaZoom > 0 ? 1.08 : 0.92;
    const newDistance = offset.length() * factor;

    if (newDistance > 0.4 && newDistance < 60) {
      offset.multiplyScalar(factor);
      cam.position.copy(target).add(offset);
      cam.lookAt(target);
    }
  }, []);

  // Update live stroke preview while drawing
  const updateLivePreview = useCallback(
    (points: Point3D[]) => {
      if (!livePreviewRef.current) return;
      const preview = livePreviewRef.current;
      preview.clear();

      if (points.length < 2) return;

      // Smooth live preview for freehand tools (pen, pencil, marker)
      const previewPoints =
        tool !== 'line' && tool !== 'rect' && points.length >= 3
          ? smoothLiveStroke(points)
          : points;

      const tempStroke: Stroke = {
        id: 'preview',
        layerId: activeLayerId,
        planeId: activePlaneId,
        points: previewPoints,
        color: strokeColor,
        size: strokeSize,
        opacity: strokeOpacity,
        tool,
        createdAt: Date.now(),
      };

      const mesh = buildStrokeObject(tempStroke, activePlane);
      preview.add(mesh);
    },
    [activeLayerId, activePlaneId, strokeColor, strokeSize, strokeOpacity, tool, activePlane]
  );

  // Pointer Down (Mouse or Stylus or Touch)
  const onPointerDown = (e: React.PointerEvent) => {
    // Unfocus any active input/textarea so hotkeys (WASD, S, L, H) respond immediately
    if (['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName)) {
      (document.activeElement as HTMLElement)?.blur?.();
    }

    // 0. Check if user clicked on 3D Transform Gizmo handles (X, Y, Z axis arrows)
    if (cameraRef.current && selectionGroupRef.current && selectedStrokeIds.length > 0) {
      const gizmo = selectionGroupRef.current.getObjectByName('transform-gizmo');
      if (gizmo) {
        const ndc = getNDC(e.clientX, e.clientY);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), cameraRef.current);
        const intersects = raycaster.intersectObjects(gizmo.children, true);
        if (intersects.length > 0) {
          const hit = intersects[0].object;
          let axis: 'x' | 'y' | 'z' | 'center' | null = null;
          let curr: THREE.Object3D | null = hit;
          while (curr && curr !== gizmo) {
            if (curr.name.includes('-x')) { axis = 'x'; break; }
            if (curr.name.includes('-y')) { axis = 'y'; break; }
            if (curr.name.includes('-z')) { axis = 'z'; break; }
            if (curr.name.includes('center')) { axis = 'center'; break; }
            curr = curr.parent;
          }

          if (axis) {
            isGizmoDraggingRef.current = true;
            activeGizmoAxisRef.current = axis;
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };

            const isFaceSelected =
              boxSubSelection &&
              boxSubSelection.mode === 'polygon' &&
              boxSubSelection.faceIndices &&
              boxSubSelection.faceIndices.length > 0;

            if (e.shiftKey && isFaceSelected) {
              isShiftExtrudeActiveRef.current = true;
              shiftExtrudeTargetBoxIdRef.current = boxSubSelection.boxId;
              shiftExtrudeFaceIndexRef.current = boxSubSelection.faceIndices[0] ?? 1;
              shiftExtrudeAccumDistanceRef.current = 0;
            } else {
              isShiftExtrudeActiveRef.current = false;
              shiftExtrudeTargetBoxIdRef.current = null;
              shiftExtrudeAccumDistanceRef.current = 0;
            }
            return;
          }
        }
      }
    }

    const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
    const isCtrlHeld = e.ctrlKey || e.metaKey;

    // Middle click or right-click or mode === 'orbit' (unless Ctrl/Meta is held in select tool or measuring)
    const isNavigationClick =
      e.button === 1 ||
      e.button === 2 ||
      (mode === 'orbit' && e.button === 0 && !isMultiSelect && tool !== 'select' && tool !== 'measure');

    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    if (isNavigationClick) {
      if (e.button === 2 || (e.button === 0 && e.shiftKey && tool !== 'select' && tool !== 'measure')) {
        isPanningRef.current = true;
      } else {
        isOrbitingRef.current = true;
      }
      return;
    }

    // Measure Tool Interaction
    if (e.button === 0 && tool === 'measure') {
      if (cameraRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const boxMeshes: THREE.Object3D[] = [];
        if (strokesGroupRef.current) {
          strokesGroupRef.current.traverse((child) => {
            if ((child as THREE.Mesh).isMesh && child.name.includes('box-mesh')) {
              boxMeshes.push(child);
            }
          });
        }

        const snap = findMeasurementSnapPoint(e.clientX, e.clientY, cameraRef.current, rect, strokes, activePlane, boxMeshes);
        if (snap) {
          const pt = snap.point;
          if (!activeMeasurement || activeMeasurement.isFinished) {
            // Click 1: Lock Point A (Start)
            setActiveMeasurement({
              start: pt,
              end: pt,
              distance: 0,
              deltaX: 0,
              deltaY: 0,
              deltaZ: 0,
              isFinished: false,
              unit: measurementUnit,
            });
          } else {
            // Click 2: Lock Point B (End)
            const dx = pt.x - activeMeasurement.start.x;
            const dy = pt.y - activeMeasurement.start.y;
            const dz = pt.z - activeMeasurement.start.z;
            const dist = Math.hypot(dx, dy, dz);
            setActiveMeasurement({
              start: activeMeasurement.start,
              end: pt,
              distance: Number(dist.toFixed(3)),
              deltaX: Number(Math.abs(dx).toFixed(3)),
              deltaY: Number(Math.abs(dy).toFixed(3)),
              deltaZ: Number(Math.abs(dz).toFixed(3)),
              isFinished: true,
              unit: measurementUnit,
            });
          }
        }
      }
      return;
    }

    // Primary button interaction in Draw mode OR when using Select Tool OR when holding Ctrl
    if (e.button === 0 && (mode === 'draw' || tool === 'select' || isCtrlHeld)) {
      // 1. Selection Tool / Ctrl-based Polygon Selection:
      if (tool === 'select' || isCtrlHeld) {
        if (cameraRef.current) {
          const ndc = getNDC(e.clientX, e.clientY);

          // When Ctrl is held, user specifically intends to select/multi-select 3D Polygons
          const preferredSubMode = isCtrlHeld ? 'polygon' : (boxSubSelection?.mode || undefined);

          // All visible boxes in the 3D scene
          const visibleBoxes = strokes.filter(
            (s) => (s.tool === 'box' || s.boxData) && !s.hidden
          );

          // A. Test currently selected box first
          const currentSelectedBox = visibleBoxes.find((s) => selectedStrokeIds.includes(s.id));
          let hitTarget: { box: Stroke; subHit: BoxSubHit } | null = null;

          if (currentSelectedBox) {
            const subHit = findHitBoxSubElement(ndc.x, ndc.y, cameraRef.current, currentSelectedBox, preferredSubMode);
            if (subHit && (!isCtrlHeld || subHit.type === 'polygon')) {
              hitTarget = { box: currentSelectedBox, subHit };
            }
          }

          // B. If no hit on active box (or no box was selected), test all other visible boxes
          if (!hitTarget) {
            let closestDist = Infinity;
            for (const box of visibleBoxes) {
              const subHit = findHitBoxSubElement(ndc.x, ndc.y, cameraRef.current, box, preferredSubMode);
              if (subHit && (!isCtrlHeld || subHit.type === 'polygon')) {
                if (subHit.distance < closestDist) {
                  closestDist = subHit.distance;
                  hitTarget = { box, subHit };
                }
              }
            }
          }

          if (hitTarget) {
            const { box: targetBox, subHit } = hitTarget;

            if (subHit.type === 'polygon') {
              const isSameBox = boxSubSelection?.boxId === targetBox.id && selectedStrokeIds.includes(targetBox.id);
              const prevFaces = (isSameBox && boxSubSelection?.mode === 'polygon') ? (boxSubSelection.faceIndices || []) : [];

              let nextFaces: number[];
              if (isMultiSelect && isSameBox) {
                if (prevFaces.includes(subHit.index)) {
                  nextFaces = prevFaces.filter((i) => i !== subHit.index);
                } else {
                  nextFaces = [...prevFaces, subHit.index];
                }
              } else {
                nextFaces = [subHit.index];
              }

              const newSubSel: BoxSubSelection = {
                boxId: targetBox.id,
                mode: 'polygon',
                vertexIndices: [],
                edgeIndices: [],
                faceIndices: nextFaces,
              };

              if (!selectedStrokeIds.includes(targetBox.id)) {
                onSelectStroke?.(targetBox.id, isMultiSelect, newSubSel);
              } else {
                onUpdateBoxSubSelection?.(newSubSel);
              }
              return;
            } else if (subHit.type === 'vertex') {
              const isSameBox = boxSubSelection?.boxId === targetBox.id && selectedStrokeIds.includes(targetBox.id);
              const prev = (isSameBox && boxSubSelection?.mode === 'vertex') ? (boxSubSelection.vertexIndices || []) : [];
              const nextVerts = isMultiSelect
                ? (prev.includes(subHit.index) ? prev.filter((i) => i !== subHit.index) : [...prev, subHit.index])
                : [subHit.index];
              const newSubSel: BoxSubSelection = {
                boxId: targetBox.id,
                mode: 'vertex',
                vertexIndices: nextVerts,
                edgeIndices: [],
                faceIndices: [],
              };
              if (!selectedStrokeIds.includes(targetBox.id)) {
                onSelectStroke?.(targetBox.id, isMultiSelect, newSubSel);
              } else {
                onUpdateBoxSubSelection?.(newSubSel);
              }
              return;
            } else if (subHit.type === 'edge') {
              const isSameBox = boxSubSelection?.boxId === targetBox.id && selectedStrokeIds.includes(targetBox.id);
              const prev = (isSameBox && boxSubSelection?.mode === 'edge') ? (boxSubSelection.edgeIndices || []) : [];
              const nextEdges = isMultiSelect
                ? (prev.includes(subHit.index) ? prev.filter((i) => i !== subHit.index) : [...prev, subHit.index])
                : [subHit.index];
              const newSubSel: BoxSubSelection = {
                boxId: targetBox.id,
                mode: 'edge',
                vertexIndices: [],
                edgeIndices: nextEdges,
                faceIndices: [],
              };
              if (!selectedStrokeIds.includes(targetBox.id)) {
                onSelectStroke?.(targetBox.id, isMultiSelect, newSubSel);
              } else {
                onUpdateBoxSubSelection?.(newSubSel);
              }
              return;
            }
          }

          const hitId = findHitStroke(ndc.x, ndc.y, cameraRef.current, strokes, layers);
          if (hitId) {
            const hitStroke = strokes.find((s) => s.id === hitId);
            if (hitStroke && (hitStroke.tool === 'box' || hitStroke.boxData)) {
              const initialMode = isCtrlHeld ? 'polygon' : 'object';
              const initialFace = isCtrlHeld ? [1] : [];
              const newSubSel: BoxSubSelection = {
                boxId: hitId,
                mode: initialMode,
                vertexIndices: [],
                edgeIndices: [],
                faceIndices: initialFace,
              };
              onSelectStroke?.(hitId, isMultiSelect, newSubSel);
            } else {
              onSelectStroke?.(hitId, isMultiSelect);
              onUpdateBoxSubSelection?.(null);
            }
          } else {
            if (!isMultiSelect) {
              onClearSelection?.();
              onUpdateBoxSubSelection?.(null);
            }
          }
        }
        return;
      }

      if (!activeLayer || activeLayer.locked || !activeLayer.visible) return;

      const { point: hit, snap } = getEffectiveSnapPoint(e.clientX, e.clientY);

      if (tool === 'eraser') {
        // Find strokes close to intersection point
        if (hit) {
          eraseNearbyStrokes(hit);
        }
        isDrawingRef.current = true;
        return;
      }

      if (hit) {
        isDrawingRef.current = true;
        startPointRef.current = hit;
        currentPointsRef.current = [hit];
        updateLivePreview([hit]);
        if (snapSettings?.enabled && snapSettings.showSnapGlyph) {
          setHoverSnapResult(snap);
        }
      }
    }
  };

  // Erase nearby strokes
  const eraseNearbyStrokes = useCallback(
    (point: Point3D) => {
      const radius = 0.25 * (strokeSize / 3);
      for (const s of strokes) {
        if (s.layerId !== activeLayerId) continue;
        for (const p of s.points) {
          const d = Math.hypot(p.x - point.x, p.y - point.y, p.z - point.z);
          if (d < radius) {
            onEraseStroke(s.id);
            break;
          }
        }
      }
    },
    [strokes, activeLayerId, strokeSize, onEraseStroke]
  );

  // Pointer Move
  const onPointerMove = (e: React.PointerEvent) => {
    const deltaX = e.clientX - lastMousePosRef.current.x;
    const deltaY = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    // 0. Dragging 3D Transform Gizmo along X, Y, or Z coordinate axes
    if (isGizmoDraggingRef.current && activeGizmoAxisRef.current && cameraRef.current) {
      const axis = activeGizmoAxisRef.current;
      const cam = cameraRef.current;
      const camDist = cam.position.distanceTo(
        new THREE.Vector3(gizmoCentroidRef.current.x, gizmoCentroidRef.current.y, gizmoCentroidRef.current.z)
      );
      const factor = Math.max(0.0015, camDist * 0.0022);

      let delta = { x: 0, y: 0, z: 0 };
      if (axis === 'x') {
        delta.x = deltaX * factor;
      } else if (axis === 'y') {
        delta.y = -deltaY * factor;
      } else if (axis === 'z') {
        delta.z = (deltaX - deltaY) * factor * 0.707;
      } else if (axis === 'center') {
        delta.x = deltaX * factor;
        delta.y = -deltaY * factor;
      }

      // Check if Shift-Extrude / Shift-Carve is active
      if (isShiftExtrudeActiveRef.current && shiftExtrudeTargetBoxIdRef.current) {
        const fIdx = shiftExtrudeFaceIndexRef.current;
        const normal = getBoxFaceNormal(fIdx);
        // Project translation along face normal
        const stepDist = delta.x * normal.x + delta.y * normal.y + delta.z * normal.z;
        shiftExtrudeAccumDistanceRef.current += stepDist;

        const targetBox = strokes.find((s) => s.id === shiftExtrudeTargetBoxIdRef.current);
        if (targetBox && livePreviewRef.current) {
          const preview = livePreviewRef.current;
          preview.clear();
          const curDist = shiftExtrudeAccumDistanceRef.current;
          if (Math.abs(curDist) >= 0.04) {
            if (curDist > 0) {
              // Outward extrusion preview
              const { newBox } = extrudeBoxFace(targetBox, fIdx, curDist);
              const previewMesh = buildStrokeObject(newBox, activePlane, shadingMode);
              preview.add(previewMesh);
            } else {
              // Inward carving / recess preview
              const { updatedStrokes } = carveBoxFace(targetBox, fIdx, Math.abs(curDist), 'recess');
              if (updatedStrokes[0]) {
                const previewMesh = buildStrokeObject(updatedStrokes[0], activePlane, shadingMode);
                preview.add(previewMesh);
              }
            }
          }
        }
        return;
      }

      onMoveSelectedStrokes?.(delta);
      return;
    }

    if (isOrbitingRef.current) {
      handleOrbit(deltaX, deltaY);
      return;
    }
    if (isPanningRef.current) {
      handlePan(deltaX, deltaY);
      return;
    }

    // Measure Tool: Snapping candidate calculation and live distance updating
    if (tool === 'measure') {
      if (cameraRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const boxMeshes: THREE.Object3D[] = [];
        if (strokesGroupRef.current) {
          strokesGroupRef.current.traverse((child) => {
            if ((child as THREE.Mesh).isMesh && child.name.includes('box-mesh')) {
              boxMeshes.push(child);
            }
          });
        }

        const snap = findMeasurementSnapPoint(e.clientX, e.clientY, cameraRef.current, rect, strokes, activePlane, boxMeshes, snapSettings);
        setSnapCandidate(snap);

        if (activeMeasurement && !activeMeasurement.isFinished && snap) {
          const pt = snap.point;
          const dx = pt.x - activeMeasurement.start.x;
          const dy = pt.y - activeMeasurement.start.y;
          const dz = pt.z - activeMeasurement.start.z;
          const dist = Math.hypot(dx, dy, dz);
          setActiveMeasurement((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              end: pt,
              distance: Number(dist.toFixed(3)),
              deltaX: Number(Math.abs(dx).toFixed(3)),
              deltaY: Number(Math.abs(dy).toFixed(3)),
              deltaZ: Number(Math.abs(dz).toFixed(3)),
              isFinished: false,
            };
          });
        }
      }
      return;
    }

    if (!isDrawingRef.current || !cameraRef.current) {
      // Real-time 3ds Max style snap indicator tracking while cursor moves in viewport
      if (snapSettings?.enabled && snapSettings.showSnapGlyph && tool !== 'select' && !isCtrlKeyActive) {
        const { snap } = getEffectiveSnapPoint(e.clientX, e.clientY);
        setHoverSnapResult(snap);
      } else if (hoverSnapResult) {
        setHoverSnapResult(null);
      }
      return;
    }

    const { point: hit, snap } = getEffectiveSnapPoint(e.clientX, e.clientY);
    if (!hit) return;

    if (snapSettings?.enabled && snapSettings.showSnapGlyph) {
      setHoverSnapResult(snap);
    }

    if (tool === 'eraser') {
      eraseNearbyStrokes(hit);
      return;
    }

    if (tool === 'line') {
      // Straight architectural ruler line from start point to hit point
      if (startPointRef.current) {
        currentPointsRef.current = [startPointRef.current, hit];
        updateLivePreview(currentPointsRef.current);
      }
    } else if (tool === 'rect') {
      // 2D box on active plane
      if (startPointRef.current) {
        const p0 = startPointRef.current;
        const p2 = hit;
        // Project onto plane basis
        const p1 = { x: p2.x, y: p0.y, z: p0.z + (p2.z - p0.z) * 0.5 };
        const p3 = { x: p0.x, y: p2.y, z: p0.z + (p2.z - p0.z) * 0.5 };
        currentPointsRef.current = [p0, p1, p2, p3, p0];
        updateLivePreview(currentPointsRef.current);
      }
    } else if (tool === 'box') {
      // 3D architectural box / massing volume
      if (startPointRef.current) {
        const { boxData, points } = calculateBoxFromDrag(startPointRef.current, hit, activePlane);
        currentPointsRef.current = points;
        currentBoxDataRef.current = boxData;

        onLiveBoxDimensionsChange?.({
          width: boxData.width,
          height: boxData.height,
          depth: boxData.depth,
        });

        if (livePreviewRef.current) {
          const preview = livePreviewRef.current;
          preview.clear();
          const tempStroke: Stroke = {
            id: 'preview-box',
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
          const mesh = buildStrokeObject(tempStroke, activePlane, shadingMode);
          preview.add(mesh);
        }
      }
    } else {
      // Freehand pen / pencil / marker
      const pts = currentPointsRef.current;
      const lastPt = pts[pts.length - 1];
      if (lastPt) {
        const dist = Math.hypot(hit.x - lastPt.x, hit.y - lastPt.y, hit.z - lastPt.z);
        // Add point if moved slightly (smoothing)
        if (dist > 0.02) {
          pts.push(hit);
          updateLivePreview(pts);
        }
      }
    }
  };

  // Pointer Up
  const onPointerUp = () => {
    isOrbitingRef.current = false;
    isPanningRef.current = false;

    if (tool === 'measure') {
      return;
    }

    if (isGizmoDraggingRef.current) {
      isGizmoDraggingRef.current = false;
      activeGizmoAxisRef.current = null;

      if (isShiftExtrudeActiveRef.current && shiftExtrudeTargetBoxIdRef.current) {
        const dist = shiftExtrudeAccumDistanceRef.current;
        const boxId = shiftExtrudeTargetBoxIdRef.current;
        const fIdx = shiftExtrudeFaceIndexRef.current;

        isShiftExtrudeActiveRef.current = false;
        shiftExtrudeTargetBoxIdRef.current = null;
        shiftExtrudeAccumDistanceRef.current = 0;

        if (livePreviewRef.current) {
          livePreviewRef.current.clear();
        }

        if (dist >= 0.08) {
          onExtrudeBoxFace?.(boxId, fIdx, Number(dist.toFixed(2)));
          return;
        } else if (dist <= -0.08) {
          onCarveBoxFace?.(boxId, fIdx, Number(Math.abs(dist).toFixed(2)), 'recess');
          return;
        }
      }

      onCommitMoveSelectedStrokes?.();
    }

    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      if (livePreviewRef.current) {
        livePreviewRef.current.clear();
      }

      if (tool !== 'eraser' && currentPointsRef.current.length >= 2) {
        if (tool === 'box') {
          const newStroke: Stroke = {
            id: `box-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            layerId: activeLayerId,
            planeId: activePlaneId,
            points: [...currentPointsRef.current],
            boxData: currentBoxDataRef.current || undefined,
            color: strokeColor,
            size: strokeSize,
            opacity: strokeOpacity,
            tool: 'box',
            createdAt: Date.now(),
          };
          onAddStroke(newStroke);
          currentBoxDataRef.current = null;
        } else {
          // Apply Catmull-Rom stroke smoothing to freehand strokes
          const rawPoints = currentPointsRef.current;
          const smoothedPoints =
            tool !== 'line' && tool !== 'rect' && rawPoints.length >= 3
              ? smoothStrokePoints(rawPoints)
              : rawPoints;

          const newStroke: Stroke = {
            id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            layerId: activeLayerId,
            planeId: activePlaneId,
            points: [...smoothedPoints],
            color: strokeColor,
            size: strokeSize,
            opacity: strokeOpacity,
            tool,
            createdAt: Date.now(),
          };
          onAddStroke(newStroke);
        }
      }

      currentPointsRef.current = [];
      startPointRef.current = null;
    }
  };

  // Wheel Zoom
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    handleZoom(e.deltaY);
  };

  // Multi-touch gestures (two fingers pinch-to-zoom & two-finger pan)
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];

      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const center = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };

      if (touchDistanceRef.current !== null) {
        const diff = touchDistanceRef.current - dist;
        handleZoom(diff * 2);
      }
      touchDistanceRef.current = dist;

      if (lastTouchCenterRef.current !== null) {
        const dx = center.x - lastTouchCenterRef.current.x;
        const dy = center.y - lastTouchCenterRef.current.y;
        handlePan(dx * 1.5, dy * 1.5);
      }
      lastTouchCenterRef.current = center;
    }
  };

  const onTouchEnd = () => {
    touchDistanceRef.current = null;
    lastTouchCenterRef.current = null;
  };

  return (
    <div
      id="viewport-3d-container"
      ref={containerRef}
      className={`relative w-full h-full select-none touch-none overflow-hidden ${
        isCtrlKeyActive
          ? 'cursor-pointer'
          : mode === 'orbit'
          ? 'cursor-grab active:cursor-grabbing'
          : tool === 'select'
          ? 'cursor-default'
          : 'cursor-crosshair'
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => {
        onPointerUp();
        setHoverSnapResult(null);
      }}
      onWheel={onWheel}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Multi-selection polygon indicator */}
      {isCtrlKeyActive && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/90 text-white text-xs font-semibold shadow-lg shadow-red-950/40 backdrop-blur-md border border-red-400/40 animate-pulse select-none">
          <Square className="w-3.5 h-3.5 fill-white/80" />
          <span>حالت انتخاب چندگانه Polygon فعال است (کلیک برای انتخاب/افزودن)</span>
          <kbd className="px-1.5 py-0.5 bg-black/40 rounded text-[10px] font-mono">CTRL</kbd>
        </div>
      )}

      {/* 3D Magnetic Snap Reticle when Measure Tool is Hovering */}
      {tool === 'measure' && snapCandidate && (
        <div
          className="pointer-events-none fixed z-40 -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
          style={{ left: snapCandidate.screenX, top: snapCandidate.screenY }}
        >
          {/* Pulsing ring */}
          <div className="relative flex items-center justify-center">
            <div className="w-7 h-7 rounded-full border border-sky-400/80 animate-ping opacity-75" />
            <div className="absolute w-3.5 h-3.5 rounded-full bg-sky-400/30 border border-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
            <div className="absolute w-1 h-1 rounded-full bg-white" />
          </div>
          {/* Coordinates & Snap Type Label */}
          <div className="absolute left-4 top-2 px-2 py-0.5 rounded-md bg-slate-950/90 border border-sky-500/40 text-[10px] text-sky-200 font-mono shadow-lg whitespace-nowrap backdrop-blur-md flex items-center gap-1.5">
            <span className="font-bold text-amber-300">
              {snapCandidate.type === 'vertex'
                ? (lang === 'fa' ? 'راس مکعب' : 'Vertex')
                : snapCandidate.type === 'edge'
                ? (lang === 'fa' ? 'لبه' : 'Edge')
                : snapCandidate.type === 'face'
                ? (lang === 'fa' ? 'سطح وجه' : 'Face')
                : (lang === 'fa' ? 'صفحه' : 'Plane')}
            </span>
            <span className="text-slate-400">|</span>
            <span>[{snapCandidate.point.x.toFixed(2)}, {snapCandidate.point.y.toFixed(2)}, {snapCandidate.point.z.toFixed(2)}]</span>
          </div>
        </div>
      )}

      {/* Real-time 3D Tape Measure HUD Card */}
      {(tool === 'measure' || activeMeasurement) && (
        <div
          id="realtime-measure-hud"
          className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col gap-2 p-3 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-sky-500/40 shadow-2xl shadow-sky-950/40 min-w-[320px] max-w-[440px] text-slate-100 select-none animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header with Title, Units, and Clear */}
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
                <Ruler className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-white tracking-wide">
                {lang === 'fa' ? 'ابزار اندازه‌گیری سه‌بعدی' : '3D Tape Measure'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Unit Switcher */}
              <div className="flex items-center bg-white/10 p-0.5 rounded-lg text-[10px] font-mono">
                {(['m', 'cm', 'ft'] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMeasurementUnit(u);
                    }}
                    className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                      measurementUnit === u ? 'bg-sky-500 text-white font-bold' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>

              {activeMeasurement && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMeasurement(null);
                  }}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={lang === 'fa' ? 'پاک کردن اندازه‌گیری (Esc)' : 'Clear measurement (Esc)'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Primary Real-Time Distance Readout */}
          {activeMeasurement ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between bg-sky-950/40 border border-sky-500/30 rounded-xl px-3 py-2">
                <span className="text-xs text-sky-300 font-medium">
                  {lang === 'fa' ? 'فاصله سه‌بعدی:' : 'Euclidean Distance:'}
                </span>
                <span className="text-xl font-bold font-mono text-emerald-400 tracking-wider">
                  {formatMeasurement(activeMeasurement.distance, measurementUnit)}
                </span>
              </div>

              {/* Axis Deltas Breakdown (ΔX, ΔY, ΔZ) */}
              <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
                  <span className="font-bold">ΔX:</span>
                  <span>{formatMeasurement(activeMeasurement.deltaX, measurementUnit)}</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  <span className="font-bold">ΔY:</span>
                  <span>{formatMeasurement(activeMeasurement.deltaY, measurementUnit)}</span>
                </div>
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300">
                  <span className="font-bold">ΔZ:</span>
                  <span>{formatMeasurement(activeMeasurement.deltaZ, measurementUnit)}</span>
                </div>
              </div>

              {/* Endpoints Coordinates */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-1">
                <span className="text-cyan-300">
                  A: [{activeMeasurement.start.x.toFixed(2)}, {activeMeasurement.start.y.toFixed(2)}, {activeMeasurement.start.z.toFixed(2)}]
                </span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
                <span className={activeMeasurement.isFinished ? 'text-emerald-300' : 'text-amber-300'}>
                  B: [{activeMeasurement.end.x.toFixed(2)}, {activeMeasurement.end.y.toFixed(2)}, {activeMeasurement.end.z.toFixed(2)}]
                </span>
              </div>

              {/* Status Hint */}
              <div className="text-[10px] text-center pt-1 border-t border-white/10 text-slate-400">
                {!activeMeasurement.isFinished ? (
                  <span className="text-amber-300 animate-pulse">
                    {lang === 'fa' ? '● حرکت دهید و برای ثبت نقطه پایان (B) کلیک کنید' : '● Moving... Click to lock End point (B)'}
                  </span>
                ) : (
                  <span className="text-emerald-400">
                    {lang === 'fa' ? '✓ اندازه‌گیری قفل شد (برای اندازه جدید دوباره کلیک کنید)' : '✓ Measurement locked (Click to measure new distance)'}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-2 text-xs text-sky-200/80 leading-relaxed">
              {lang === 'fa'
                ? 'روی هر راس، لبه یا سطح حجم کلیک کنید تا نقطه شروع (A) ثبت شود.'
                : 'Click any vertex, edge, or surface in 3D to place Start point (A).'}
            </div>
          )}
        </div>
      )}

      {/* 3ds Max Style Snap Reticle & Glyphs */}
      <SnapIndicator
        snapResult={hoverSnapResult}
        lang={lang}
        visible={!!(snapSettings?.enabled && snapSettings.showSnapGlyph && hoverSnapResult)}
      />
    </div>
  );
};
