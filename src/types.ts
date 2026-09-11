export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export type ToolType = 'select' | 'pen' | 'pencil' | 'marker' | 'line' | 'rect' | 'box' | 'eraser' | 'measure';
export type InteractionMode = 'draw' | 'orbit' | 'pan';

export type MaterialPresetId =
  | 'default'
  | 'concrete'
  | 'glass'
  | 'wood'
  | 'metal'
  | 'brick'
  | 'marble'
  | 'plaster'
  | 'dark_steel';

export interface BoxMaterial {
  preset: MaterialPresetId;
  name?: string;
  nameFa?: string;
  color?: string;
  roughness: number;    // 0..1
  metalness: number;    // 0..1
  opacity: number;      // 0..1
  transparent: boolean;
  textureScale?: number;// 0.5 .. 4.0
}

export interface ActiveMeasurement {
  start: Point3D;
  end: Point3D;
  distance: number;
  deltaX: number;
  deltaY: number;
  deltaZ: number;
  isFinished: boolean;
  unit?: 'm' | 'cm' | 'ft';
}

export type SubObjectMode = 'object' | 'vertex' | 'edge' | 'polygon';

export type InsetPartType =
  | 'center'
  | 'bottom'
  | 'top'
  | 'left'
  | 'right'
  | 'cavity_bottom'
  | 'cavity_top'
  | 'cavity_left'
  | 'cavity_right';

export interface InsetExtrusionMap {
  bottom?: number;
  top?: number;
  left?: number;
  right?: number;
}

export interface FaceInset {
  id: string;
  faceIndex: number; // 0..5 which face of the box was inset
  level?: number;    // 0, 1, 2... nesting depth of inset on this face
  offset: number;    // Inset offset distance in meters (e.g. 0.2m)
  innerPoints: Point3D[]; // 4 corner points of the inner polygon / rim
  recessPoints?: Point3D[]; // 4 corner points of the recessed inner floor
  depth?: number;    // Inward recess depth (positive number = recessed into the box)
  height?: number;   // Outward elevation / extrusion height (meters)
  extrusions?: InsetExtrusionMap; // Extrusions of individual perimeter polygons (bottom shelf, top canopy, sides)
  extrudedBoxId?: string; // If extruded outward into an attached box
  createdAt: number;
}

export interface BoxFaceExtrusion {
  id: string;
  faceIndex: number; // 0..5 (0: Bottom, 1: Top, 2: Front, 3: Back, 4: Left, 5: Right)
  distance: number;  // distance of this extrusion step in meters
  capPoints: Point3D[]; // 4 corner points of the outer quad
  createdAt: number;
}

export interface BoxSubSelection {
  boxId: string;
  mode: SubObjectMode;
  vertexIndices: number[]; // 0..7 (box) or 8..11 (inset rim) or 12..15 (recessed floor)
  edgeIndices: number[];   // 0..11 (box) or 12..27 (inset edges)
  faceIndices: number[];   // 0..5
  selectedInsetId?: string;
  insetPart?: InsetPartType; // Which specific polygon of the inset is selected
  selectedParts?: InsetPartType[]; // Multiple selected parts (matching Video 1)
  isInsetPolygon?: boolean; // Whether the active selection is specifically an Inset polygon surface
}

export interface BoxDimensions {
  width: number;  // X / horizontal span in meters
  height: number; // Y / height span in meters
  depth: number;  // Z / depth span in meters
}

export interface BoxData {
  width: number;
  height: number;
  depth: number;
  center: Point3D;
}

export interface Stroke {
  id: string;
  layerId: string;
  planeId: string;
  points: Point3D[];
  color: string;
  size: number;
  opacity: number;
  tool: ToolType;
  createdAt: number;
  boxData?: BoxData;
  material?: BoxMaterial;
  insets?: FaceInset[];
  extrusions?: BoxFaceExtrusion[];
  hidden?: boolean;
}

export interface Layer {
  id: string;
  name: string;
  nameFa?: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0 to 1
  colorTag: string;
}

export interface DrawingPlane {
  id: string;
  name: string;
  nameFa?: string;
  origin: Point3D;
  normal: Point3D;
  up: Point3D;
  width: number;
  height: number;
  color: string;
  surfaceType?: 'xoy' | 'xoz' | 'yoz' | 'custom';
}

export interface CameraBookmark {
  id: string;
  name: string;
  nameFa?: string;
  position: Point3D;
  target: Point3D;
  fov: number;
}

export type LensFocalLength = 17 | 24 | 35 | 50 | 85;

export type ShadingMode = 'shaded' | 'wireframe';

export interface SnapSettings {
  enabled: boolean;          // Snap-to-Grid global toggle (like 3ds Max 'S')
  gridIntersection: boolean; // Snap to reference grid intersection points of active plane
  volumeVertex: boolean;     // Snap to vertices of created volumes/boxes
  volumeEdge: boolean;       // Snap to edges and midpoints of volumes
  gridSize: number;          // Grid snap spacing in meters (e.g. 0.1, 0.25, 0.5, 1.0, 2.0)
  magneticRadius: number;    // Screen pixel magnetic snap threshold (default 24px)
  showSnapGlyph: boolean;    // Show 3ds Max style snap indicator at cursor
}

export const DEFAULT_SNAP_SETTINGS: SnapSettings = {
  enabled: false,
  gridIntersection: true,
  volumeVertex: true,
  volumeEdge: true,
  gridSize: 0.5,
  magneticRadius: 24,
  showSnapGlyph: true,
};

export interface AppState {
  layers: Layer[];
  activeLayerId: string;
  planes: DrawingPlane[];
  activePlaneId: string;
  strokes: Stroke[];
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
  shadingMode: ShadingMode;
  snapSettings: SnapSettings;
  lang: 'fa' | 'en';
}
