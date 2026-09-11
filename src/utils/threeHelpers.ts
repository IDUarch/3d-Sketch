import * as THREE from 'three';
import { Point3D, DrawingPlane, Stroke, LensFocalLength, Layer, BoxSubSelection, SubObjectMode, FaceInset, InsetPartType, BoxFaceExtrusion } from '../types';
import { createBoxStandardMaterial } from './materials';

export function focalLengthToFov(focalLength: LensFocalLength): number {
  // 35mm film sensor height is 24mm, vertical FOV calculation:
  // fov = 2 * atan(12 / focalLength) * (180 / PI)
  return Math.round(2 * Math.atan(12 / focalLength) * (180 / Math.PI));
}

export function createThreePlane(plane: DrawingPlane): THREE.Plane {
  const normal = new THREE.Vector3(plane.normal.x, plane.normal.y, plane.normal.z).normalize();
  const point = new THREE.Vector3(plane.origin.x, plane.origin.y, plane.origin.z);
  return new THREE.Plane().setFromNormalAndCoplanarPoint(normal, point);
}

export function intersectActivePlane(
  ndcX: number,
  ndcY: number,
  camera: THREE.Camera,
  plane: DrawingPlane
): Point3D | null {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const threePlane = createThreePlane(plane);
  const target = new THREE.Vector3();
  const hit = raycaster.ray.intersectPlane(threePlane, target);
  if (!hit) return null;
  return { x: hit.x, y: hit.y, z: hit.z };
}

// Build a ribbon mesh or line for a 3D stroke
export function buildStrokeObject(
  stroke: Stroke,
  plane?: DrawingPlane,
  shadingMode: 'shaded' | 'wireframe' = 'shaded'
): THREE.Object3D {
  if (stroke.tool === 'box') {
    return buildBoxObject(stroke, shadingMode);
  }

  if (stroke.points.length < 2) {
    return new THREE.Group();
  }

  const group = new THREE.Group();
  group.name = stroke.id;

  // Use plane normal if available, or default to camera-friendly normal
  const normal = plane
    ? new THREE.Vector3(plane.normal.x, plane.normal.y, plane.normal.z).normalize()
    : new THREE.Vector3(0, 1, 0);

  // Width in world units based on stroke size
  const halfWidth = Math.max(0.008, (stroke.size * 0.006) / 2);

  // If marker, make it thicker and transparent
  const finalHalfWidth = stroke.tool === 'marker' ? halfWidth * 2.2 : halfWidth;

  // Create ribbon geometry to give strokes thickness in 3D
  const vertices: number[] = [];
  const indices: number[] = [];
  const colors: number[] = [];

  const baseColor = new THREE.Color(stroke.color);
  const points = stroke.points;

  for (let i = 0; i < points.length; i++) {
    const current = new THREE.Vector3(points[i].x, points[i].y, points[i].z);
    let tangent = new THREE.Vector3();

    if (i < points.length - 1) {
      const next = new THREE.Vector3(points[i + 1].x, points[i + 1].y, points[i + 1].z);
      tangent.subVectors(next, current).normalize();
    } else if (i > 0) {
      const prev = new THREE.Vector3(points[i - 1].x, points[i - 1].y, points[i - 1].z);
      tangent.subVectors(current, prev).normalize();
    } else {
      tangent.set(1, 0, 0);
    }

    // Perpendicular vector lying on the plane
    const side = new THREE.Vector3().crossVectors(tangent, normal).normalize();
    if (side.lengthSq() < 0.0001) {
      side.set(1, 0, 0);
    }

    const pLeft = new THREE.Vector3().copy(current).addScaledVector(side, finalHalfWidth);
    const pRight = new THREE.Vector3().copy(current).addScaledVector(side, -finalHalfWidth);

    vertices.push(pLeft.x, pLeft.y, pLeft.z);
    vertices.push(pRight.x, pRight.y, pRight.z);

    colors.push(baseColor.r, baseColor.g, baseColor.b);
    colors.push(baseColor.r, baseColor.g, baseColor.b);

    if (i < points.length - 1) {
      const baseIdx = i * 2;
      indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
      indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const isTransparent = stroke.opacity < 0.99 || stroke.tool === 'marker';
  const effectiveOpacity = stroke.tool === 'marker' ? stroke.opacity * 0.55 : stroke.opacity;

  const material = new THREE.MeshBasicMaterial({
    color: baseColor,
    side: THREE.DoubleSide,
    transparent: isTransparent,
    opacity: effectiveOpacity,
    depthWrite: !isTransparent,
  });

  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  // Also add a centerline for crisp line rendering at sharp oblique angles
  const linePositions: number[] = [];
  points.forEach((p) => linePositions.push(p.x, p.y, p.z));
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  const lineMat = new THREE.LineBasicMaterial({
    color: baseColor,
    transparent: isTransparent,
    opacity: effectiveOpacity,
  });
  const lineObj = new THREE.Line(lineGeo, lineMat);
  group.add(lineObj);

  return group;
}

// Build visual representation of the active drawing plane
export function buildPlaneHelper(plane: DrawingPlane, isActive: boolean = true): THREE.Group {
  const group = new THREE.Group();
  group.name = `plane-helper-${plane.id}`;

  const planeNormal = new THREE.Vector3(plane.normal.x, plane.normal.y, plane.normal.z).normalize();
  const planeUp = new THREE.Vector3(plane.up.x, plane.up.y, plane.up.z).normalize();
  const planeRight = new THREE.Vector3().crossVectors(planeUp, planeNormal).normalize();

  const halfW = plane.width / 2;
  const halfH = plane.height / 2;
  const origin = new THREE.Vector3(plane.origin.x, plane.origin.y, plane.origin.z);

  // Bounding rectangle corners
  const p1 = new THREE.Vector3().copy(origin).addScaledVector(planeRight, -halfW).addScaledVector(planeUp, -halfH);
  const p2 = new THREE.Vector3().copy(origin).addScaledVector(planeRight, halfW).addScaledVector(planeUp, -halfH);
  const p3 = new THREE.Vector3().copy(origin).addScaledVector(planeRight, halfW).addScaledVector(planeUp, halfH);
  const p4 = new THREE.Vector3().copy(origin).addScaledVector(planeRight, -halfW).addScaledVector(planeUp, halfH);

  const planeColor = new THREE.Color(plane.color || '#818cf8');

  // Outline border
  const borderPoints = [p1, p2, p3, p4, p1];
  const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPoints);
  const borderMat = new THREE.LineBasicMaterial({
    color: isActive ? planeColor : 0x475569,
    linewidth: isActive ? 2 : 1,
    transparent: true,
    opacity: isActive ? 0.95 : 0.35,
  });
  const border = new THREE.Line(borderGeo, borderMat);
  group.add(border);

  // Semitransparent plane fill surface
  const planeGeo = new THREE.PlaneGeometry(plane.width, plane.height);
  const planeMat = new THREE.MeshBasicMaterial({
    color: isActive ? planeColor : 0x334155,
    transparent: true,
    opacity: isActive ? 0.08 : 0.02,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const planeMesh = new THREE.Mesh(planeGeo, planeMat);
  planeMesh.position.copy(origin);

  // Precise orientation using orthonormal basis
  const matrix = new THREE.Matrix4();
  matrix.makeBasis(planeRight, planeUp, planeNormal);
  planeMesh.quaternion.setFromRotationMatrix(matrix);
  group.add(planeMesh);

  // Internal subtle grid lines on the active plane
  if (isActive) {
    const gridPositions: number[] = [];
    const divisions = 8;
    for (let i = 1; i < divisions; i++) {
      const u = -halfW + (plane.width * i) / divisions;
      const startV = new THREE.Vector3().copy(origin).addScaledVector(planeRight, u).addScaledVector(planeUp, -halfH);
      const endV = new THREE.Vector3().copy(origin).addScaledVector(planeRight, u).addScaledVector(planeUp, halfH);
      gridPositions.push(startV.x, startV.y, startV.z, endV.x, endV.y, endV.z);

      const v = -halfH + (plane.height * i) / divisions;
      const startH = new THREE.Vector3().copy(origin).addScaledVector(planeRight, -halfW).addScaledVector(planeUp, v);
      const endH = new THREE.Vector3().copy(origin).addScaledVector(planeRight, halfW).addScaledVector(planeUp, v);
      gridPositions.push(startH.x, startH.y, startH.z, endH.x, endH.y, endH.z);
    }

    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPositions, 3));
    const gridMat = new THREE.LineBasicMaterial({
      color: planeColor,
      transparent: true,
      opacity: 0.35,
    });
    const gridMesh = new THREE.LineSegments(gridGeo, gridMat);
    group.add(gridMesh);

    // Normal vector indicator arrow showing the plane's drawing direction
    const arrowLength = 0.6;
    const arrowHelper = new THREE.ArrowHelper(planeNormal, origin, arrowLength, planeColor.getHex(), 0.15, 0.08);
    group.add(arrowHelper);
  }

  return group;
}

// Build 3D Coordinate Reference Axes (X=Red, Y=Green, Z=Blue)
export function buildCoordinateAxesHelper(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'coordinate-axes-trihedron';

  const axisLength = 2.5;

  // Origin point
  const originGeo = new THREE.SphereGeometry(0.04, 16, 16);
  const originMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const originMesh = new THREE.Mesh(originGeo, originMat);
  group.add(originMesh);

  // X Axis (+X, Red)
  const xArrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, 0),
    axisLength,
    0xef4444,
    0.2,
    0.1
  );
  group.add(xArrow);

  // Y Axis (+Y, Green)
  const yArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 0),
    axisLength,
    0x10b981,
    0.2,
    0.1
  );
  group.add(yArrow);

  // Z Axis (+Z, Blue)
  const zArrow = new THREE.ArrowHelper(
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, 0),
    axisLength,
    0x38bdf8,
    0.2,
    0.1
  );
  group.add(zArrow);

  return group;
}

// Build Ghost Wireframes for inactive coordinate surfaces
export function buildGhostSurfacesHelper(activePlaneId: string, planes: DrawingPlane[]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ghost-surfaces';

  planes.forEach((p) => {
    if (p.id === activePlaneId) return;
    // Only show ghost helpers for principal coordinate planes (xoy, xoz, yoz)
    if (p.surfaceType && ['xoy', 'xoz', 'yoz'].includes(p.surfaceType)) {
      const helper = buildPlaneHelper(p, false);
      group.add(helper);
    }
  });

  return group;
}

// 3D Box Topology Definitions (Matches 3ds Max / Editable Poly)
export const BOX_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0], // Bottom face 4 edges (indices 0..3)
  [4, 5], [5, 6], [6, 7], [7, 4], // Top face 4 edges (indices 4..7)
  [0, 4], [1, 5], [2, 6], [3, 7], // 4 Vertical pillars (indices 8..11)
];

export const BOX_FACES: number[][] = [
  [0, 3, 2, 1], // 0: Bottom (-Y)
  [4, 5, 6, 7], // 1: Top (+Y)
  [0, 1, 5, 4], // 2: Front (-Z)
  [2, 3, 7, 6], // 3: Back (+Z)
  [3, 0, 4, 7], // 4: Left (-X)
  [1, 2, 6, 5], // 5: Right (+X)
];

export const BOX_FACE_NAMES = ['Bottom (-Y)', 'Top (+Y)', 'Front (-Z)', 'Back (+Z)', 'Left (-X)', 'Right (+X)'];
export const BOX_FACE_NAMES_FA = ['کف (پایین)', 'سقف (بالا)', 'روبرو (جلو)', 'پشت (عقب)', 'چپ', 'راست'];

export const BOX_EDGE_NAMES_FA = [
  'کف - جلو', 'کف - راست', 'کف - پشت', 'کف - چپ',
  'سقف - جلو', 'سقف - راست', 'سقف - پشت', 'سقف - چپ',
  'ستون جلو-چپ', 'ستون جلو-راست', 'ستون عقب-راست', 'ستون عقب-چپ',
];

// Extract or generate the 8 corner vertices for a box stroke
export function getBoxPoints(stroke: Stroke): Point3D[] {
  if (stroke.points && stroke.points.length === 8) {
    return stroke.points;
  }
  let minX = -0.5, maxX = 0.5, minY = 0, maxY = 1, minZ = -0.5, maxZ = 0.5;
  if (stroke.boxData) {
    const hw = Math.max(0.05, stroke.boxData.width / 2);
    const hh = Math.max(0.05, stroke.boxData.height / 2);
    const hd = Math.max(0.05, stroke.boxData.depth / 2);
    const c = stroke.boxData.center;
    minX = c.x - hw; maxX = c.x + hw;
    minY = c.y - hh; maxY = c.y + hh;
    minZ = c.z - hd; maxZ = c.z + hd;
  } else if (stroke.points && stroke.points.length >= 2) {
    minX = Math.min(...stroke.points.map((p) => p.x));
    maxX = Math.max(...stroke.points.map((p) => p.x));
    minY = Math.min(...stroke.points.map((p) => p.y));
    maxY = Math.max(...stroke.points.map((p) => p.y));
    minZ = Math.min(...stroke.points.map((p) => p.z));
    maxZ = Math.max(...stroke.points.map((p) => p.z));
  }
  return [
    { x: minX, y: minY, z: minZ }, // 0: Bottom Front Left
    { x: maxX, y: minY, z: minZ }, // 1: Bottom Front Right
    { x: maxX, y: minY, z: maxZ }, // 2: Bottom Back Right
    { x: minX, y: minY, z: maxZ }, // 3: Bottom Back Left
    { x: minX, y: maxY, z: minZ }, // 4: Top Front Left
    { x: maxX, y: maxY, z: minZ }, // 5: Top Front Right
    { x: maxX, y: maxY, z: maxZ }, // 6: Top Back Right
    { x: minX, y: maxY, z: maxZ }, // 7: Top Back Left
  ];
}

// Normal vector for a standard 3D Box face
export function getBoxFaceNormal(faceIndex: number): Point3D {
  switch (faceIndex) {
    case 0: return { x: 0, y: -1, z: 0 }; // Bottom
    case 1: return { x: 0, y: 1, z: 0 };  // Top
    case 2: return { x: 0, y: 0, z: -1 }; // Front
    case 3: return { x: 0, y: 0, z: 1 };  // Back
    case 4: return { x: -1, y: 0, z: 0 }; // Left
    case 5: return { x: 1, y: 0, z: 0 };  // Right
    default: return { x: 0, y: 1, z: 0 };
  }
}

// Get the 4 recessed back-floor vertices of an Inset (calculated or user-deformed)
export function getInsetRecessPoints(inset: FaceInset, stroke: Stroke): Point3D[] {
  if (inset.recessPoints && inset.recessPoints.length === 4) {
    return inset.recessPoints;
  }
  const norm = getBoxFaceNormal(inset.faceIndex);
  const dep = inset.depth || 0;
  const I0 = inset.innerPoints[0];
  const I1 = inset.innerPoints[1];
  const I2 = inset.innerPoints[2];
  const I3 = inset.innerPoints[3];
  return [
    { x: Number((I0.x - norm.x * dep).toFixed(4)), y: Number((I0.y - norm.y * dep).toFixed(4)), z: Number((I0.z - norm.z * dep).toFixed(4)) },
    { x: Number((I1.x - norm.x * dep).toFixed(4)), y: Number((I1.y - norm.y * dep).toFixed(4)), z: Number((I1.z - norm.z * dep).toFixed(4)) },
    { x: Number((I2.x - norm.x * dep).toFixed(4)), y: Number((I2.y - norm.y * dep).toFixed(4)), z: Number((I2.z - norm.z * dep).toFixed(4)) },
    { x: Number((I3.x - norm.x * dep).toFixed(4)), y: Number((I3.y - norm.y * dep).toFixed(4)), z: Number((I3.z - norm.z * dep).toFixed(4)) },
  ];
}

export interface BoxMeshVertex {
  index: number;
  point: Point3D;
  type: 'box' | 'inset_rim' | 'inset_recess';
  insetId?: string;
  subIndex: number;
  labelFa: string;
  labelEn: string;
}

export function getAllBoxVertices(stroke: Stroke): BoxMeshVertex[] {
  const pts = getBoxPoints(stroke);
  const result: BoxMeshVertex[] = [];

  // 8 Base Box Vertices
  for (let i = 0; i < 8; i++) {
    result.push({
      index: i,
      point: pts[i],
      type: 'box',
      subIndex: i,
      labelFa: `نقطه گوشه باکس ${i + 1}`,
      labelEn: `Box Vertex ${i + 1}`,
    });
  }

  // Vertices created by Face Insets & Cavities
  let nextIdx = 8;
  if (stroke.insets && stroke.insets.length > 0) {
    stroke.insets.forEach((ins) => {
      if (ins.innerPoints && ins.innerPoints.length === 4) {
        // 4 Outer Rim vertices on the face plane
        for (let k = 0; k < 4; k++) {
          result.push({
            index: nextIdx,
            point: ins.innerPoints[k],
            type: 'inset_rim',
            insetId: ins.id,
            subIndex: k,
            labelFa: `نقطه لبه بیرونی Inset ${k + 1}`,
            labelEn: `Inset Rim Vertex ${k + 1}`,
          });
          nextIdx++;
        }

        // 4 Inner Cavity / Recessed Back Floor vertices
        const recessPts = getInsetRecessPoints(ins, stroke);
        for (let k = 0; k < 4; k++) {
          result.push({
            index: nextIdx,
            point: recessPts[k],
            type: 'inset_recess',
            insetId: ins.id,
            subIndex: k,
            labelFa: `نقطه داخلی عمق حفره ${k + 1}`,
            labelEn: `Cavity Floor Vertex ${k + 1}`,
          });
          nextIdx++;
        }
      }
    });
  }

  return result;
}

export interface BoxMeshEdge {
  index: number;
  pA: Point3D;
  pB: Point3D;
  vA_idx: number;
  vB_idx: number;
  type: 'box' | 'miter' | 'rim' | 'cavity_corner' | 'recess_floor';
  insetId?: string;
  labelFa: string;
  labelEn: string;
}

export function getAllBoxEdges(stroke: Stroke): BoxMeshEdge[] {
  const allVerts = getAllBoxVertices(stroke);
  const vertMap = new Map<number, Point3D>();
  allVerts.forEach((v) => vertMap.set(v.index, v.point));

  const result: BoxMeshEdge[] = [];

  // 1. 12 Base Box Edges
  for (let i = 0; i < BOX_EDGES.length; i++) {
    const [iA, iB] = BOX_EDGES[i];
    const pA = vertMap.get(iA) || { x: 0, y: 0, z: 0 };
    const pB = vertMap.get(iB) || { x: 0, y: 0, z: 0 };
    result.push({
      index: i,
      pA,
      pB,
      vA_idx: iA,
      vB_idx: iB,
      type: 'box',
      labelFa: BOX_EDGE_NAMES_FA[i] || `سگمنت ${i + 1}`,
      labelEn: `Box Edge ${i + 1}`,
    });
  }

  // 2. Inset & Cavity Edges
  let edgeIdx = 12;
  let rimBaseVert = 8;
  if (stroke.insets && stroke.insets.length > 0) {
    stroke.insets.forEach((ins) => {
      if (ins.innerPoints && ins.innerPoints.length === 4) {
        const faceVerts = BOX_FACES[ins.faceIndex];
        const recessBaseVert = rimBaseVert + 4;

        // 4 Miter edges (outer box corners to rim corners)
        for (let k = 0; k < 4; k++) {
          const vA = faceVerts[k];
          const vB = rimBaseVert + k;
          const pA = vertMap.get(vA) || { x: 0, y: 0, z: 0 };
          const pB = vertMap.get(vB) || { x: 0, y: 0, z: 0 };
          result.push({
            index: edgeIdx++,
            pA,
            pB,
            vA_idx: vA,
            vB_idx: vB,
            type: 'miter',
            insetId: ins.id,
            labelFa: `سگمنت پخ Inset ${k + 1}`,
            labelEn: `Miter Crease Edge ${k + 1}`,
          });
        }

        // 4 Rim edges (perimeter loop of inset opening)
        for (let k = 0; k < 4; k++) {
          const vA = rimBaseVert + k;
          const vB = rimBaseVert + ((k + 1) % 4);
          const pA = vertMap.get(vA) || { x: 0, y: 0, z: 0 };
          const pB = vertMap.get(vB) || { x: 0, y: 0, z: 0 };
          result.push({
            index: edgeIdx++,
            pA,
            pB,
            vA_idx: vA,
            vB_idx: vB,
            type: 'rim',
            insetId: ins.id,
            labelFa: `سگمنت لبه دهانه ${k + 1}`,
            labelEn: `Rim Edge ${k + 1}`,
          });
        }

        // 4 Cavity corner depth edges (from rim down to recess floor)
        for (let k = 0; k < 4; k++) {
          const vA = rimBaseVert + k;
          const vB = recessBaseVert + k;
          const pA = vertMap.get(vA) || { x: 0, y: 0, z: 0 };
          const pB = vertMap.get(vB) || { x: 0, y: 0, z: 0 };
          result.push({
            index: edgeIdx++,
            pA,
            pB,
            vA_idx: vA,
            vB_idx: vB,
            type: 'cavity_corner',
            insetId: ins.id,
            labelFa: `سگمنت عمق دیواره داخلی ${k + 1}`,
            labelEn: `Cavity Depth Edge ${k + 1}`,
          });
        }

        // 4 Recess floor perimeter edges
        for (let k = 0; k < 4; k++) {
          const vA = recessBaseVert + k;
          const vB = recessBaseVert + ((k + 1) % 4);
          const pA = vertMap.get(vA) || { x: 0, y: 0, z: 0 };
          const pB = vertMap.get(vB) || { x: 0, y: 0, z: 0 };
          result.push({
            index: edgeIdx++,
            pA,
            pB,
            vA_idx: vA,
            vB_idx: vB,
            type: 'recess_floor',
            insetId: ins.id,
            labelFa: `سگمنت پیرامون کف فرورفتگی ${k + 1}`,
            labelEn: `Cavity Floor Edge ${k + 1}`,
          });
        }

        rimBaseVert += 8;
      }
    });
  }

  return result;
}

// Get active 4 corner vertices for a box face (respecting 3D extrusions if present)
export function getActiveFaceQuad(stroke: Stroke, faceIndex: number): Point3D[] {
  const faceExts = (stroke.extrusions || []).filter((e) => e.faceIndex === faceIndex);
  if (faceExts.length > 0) {
    return faceExts[faceExts.length - 1].capPoints;
  }
  const pts = getBoxPoints(stroke);
  const faceVerts = BOX_FACES[faceIndex];
  return [pts[faceVerts[0]], pts[faceVerts[1]], pts[faceVerts[2]], pts[faceVerts[3]]];
}

// Extrude a face outward creating a new 3D segment with distinct visible boundary
export function extrudeFaceNewSegment(
  stroke: Stroke,
  faceIndex: number,
  height: number
): Stroke {
  const normal = getBoxFaceNormal(faceIndex);
  const baseQuad = getActiveFaceQuad(stroke, faceIndex);
  const newCap: Point3D[] = baseQuad.map((p) => ({
    x: Number((p.x + normal.x * height).toFixed(4)),
    y: Number((p.y + normal.y * height).toFixed(4)),
    z: Number((p.z + normal.z * height).toFixed(4)),
  }));

  const newExt: BoxFaceExtrusion = {
    id: `ext_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    faceIndex,
    distance: height,
    capPoints: newCap,
    createdAt: Date.now(),
  };

  return {
    ...stroke,
    extrusions: [...(stroke.extrusions || []), newExt],
  };
}

// Build 3D Deformable Architectural Box Mesh directly from its 8 vertices
export function buildBoxObject(
  stroke: Stroke,
  shadingMode: 'shaded' | 'wireframe' = 'shaded'
): THREE.Object3D {
  const group = new THREE.Group();
  group.name = stroke.id;

  const pts = getBoxPoints(stroke);
  const isShaded = shadingMode === 'shaded';

  // 1. Build polygonal faces using custom indexed BufferGeometry (with face inset and sequential extrusion segments)
  const positions: number[] = [];
  pts.forEach((p) => positions.push(p.x, p.y, p.z));

  const indices: number[] = [];
  const edgePositions: number[] = [];
  const seamPositions: number[] = [];

  // Standard 12 box edges
  BOX_EDGES.forEach(([iA, iB]) => {
    const pA = pts[iA];
    const pB = pts[iB];
    edgePositions.push(pA.x, pA.y, pA.z, pB.x, pB.y, pB.z);
  });

  // Build each of the 6 faces, incorporating multi-level insets and sequential extrusion segments
  for (let f = 0; f < 6; f++) {
    const faceVerts = BOX_FACES[f];
    const faceInsets = (stroke.insets || []).filter((i) => i.faceIndex === f);
    const faceExts = (stroke.extrusions || []).filter((e) => e.faceIndex === f);

    // Sequential 3D Extrusion segments: creates distinct segments with visible boundary loops
    if (faceExts.length > 0) {
      let prevQuad = [pts[faceVerts[0]], pts[faceVerts[1]], pts[faceVerts[2]], pts[faceVerts[3]]];

      for (let k = 0; k < faceExts.length; k++) {
        const ext = faceExts[k];
        const curCap = ext.capPoints;

        // 1. Distinct boundary seam loop edges between previous surface and new segment
        for (let m = 0; m < 4; m++) {
          const next = (m + 1) % 4;
          const pA = prevQuad[m];
          const pB = prevQuad[next];
          edgePositions.push(pA.x, pA.y, pA.z, pB.x, pB.y, pB.z);
          seamPositions.push(pA.x, pA.y, pA.z, pB.x, pB.y, pB.z);
        }

        // 2. 4 Side Walls of this extrusion segment (crisp flat boundary faces)
        for (let m = 0; m < 4; m++) {
          const next = (m + 1) % 4;
          const pA = prevQuad[m];
          const pB = prevQuad[next];
          const cA = curCap[m];
          const cB = curCap[next];

          const sideBase = positions.length / 3;
          positions.push(
            pA.x, pA.y, pA.z,
            pB.x, pB.y, pB.z,
            cB.x, cB.y, cB.z,
            cA.x, cA.y, cA.z
          );
          indices.push(
            sideBase, sideBase + 1, sideBase + 2,
            sideBase, sideBase + 2, sideBase + 3
          );

          // Longitudinal corner edge
          edgePositions.push(pA.x, pA.y, pA.z, cA.x, cA.y, cA.z);
        }

        // Advance to next segment
        prevQuad = curCap;
      }

      // 4. Outermost active cap face at the end of the extrusion chain
      const capBase = positions.length / 3;
      positions.push(
        prevQuad[0].x, prevQuad[0].y, prevQuad[0].z,
        prevQuad[1].x, prevQuad[1].y, prevQuad[1].z,
        prevQuad[2].x, prevQuad[2].y, prevQuad[2].z,
        prevQuad[3].x, prevQuad[3].y, prevQuad[3].z
      );
      indices.push(
        capBase, capBase + 1, capBase + 2,
        capBase, capBase + 2, capBase + 3
      );
      // Cap boundary edges
      for (let m = 0; m < 4; m++) {
        const next = (m + 1) % 4;
        edgePositions.push(prevQuad[m].x, prevQuad[m].y, prevQuad[m].z, prevQuad[next].x, prevQuad[next].y, prevQuad[next].z);
      }

      continue;
    }

    if (faceInsets.length === 0) {
      // Standard Quad Face as 2 Triangles
      indices.push(
        faceVerts[0], faceVerts[1], faceVerts[2],
        faceVerts[0], faceVerts[2], faceVerts[3]
      );
    } else {
      // Face has one or more Insets! (Multi-level recursive subdivision)
      let prevIndices = [faceVerts[0], faceVerts[1], faceVerts[2], faceVerts[3]];
      let prevQuad = [pts[faceVerts[0]], pts[faceVerts[1]], pts[faceVerts[2]], pts[faceVerts[3]]];

      for (let k = 0; k < faceInsets.length; k++) {
        const inset = faceInsets[k];
        const I0 = inset.innerPoints[0];
        const I1 = inset.innerPoints[1];
        const I2 = inset.innerPoints[2];
        const I3 = inset.innerPoints[3];

        const curBaseIdx = positions.length / 3;
        positions.push(
          I0.x, I0.y, I0.z,
          I1.x, I1.y, I1.z,
          I2.x, I2.y, I2.z,
          I3.x, I3.y, I3.z
        );
        const c0 = curBaseIdx;
        const c1 = curBaseIdx + 1;
        const c2 = curBaseIdx + 2;
        const c3 = curBaseIdx + 3;
        const curIndices = [c0, c1, c2, c3];

        // 4 Perimeter Trapezoids between prevIndices and curIndices (supporting individual polygon extrusions)
        const norm = getBoxFaceNormal(f);
        const trapConfigs: Array<{
          part: InsetPartType;
          pA_idx: number; pB_idx: number; cA_idx: number; cB_idx: number;
          pA: Point3D; pB: Point3D; cA: Point3D; cB: Point3D;
          extrudeDist: number;
        }> = [
          {
            part: 'bottom',
            pA_idx: prevIndices[0], pB_idx: prevIndices[1], cA_idx: c1, cB_idx: c0,
            pA: prevQuad[0], pB: prevQuad[1], cA: I1, cB: I0,
            extrudeDist: inset.extrusions?.bottom || 0,
          },
          {
            part: 'right',
            pA_idx: prevIndices[1], pB_idx: prevIndices[2], cA_idx: c2, cB_idx: c1,
            pA: prevQuad[1], pB: prevQuad[2], cA: I2, cB: I1,
            extrudeDist: inset.extrusions?.right || 0,
          },
          {
            part: 'top',
            pA_idx: prevIndices[2], pB_idx: prevIndices[3], cA_idx: c3, cB_idx: c2,
            pA: prevQuad[2], pB: prevQuad[3], cA: I3, cB: I2,
            extrudeDist: inset.extrusions?.top || 0,
          },
          {
            part: 'left',
            pA_idx: prevIndices[3], pB_idx: prevIndices[0], cA_idx: c0, cB_idx: c3,
            pA: prevQuad[3], pB: prevQuad[0], cA: I0, cB: I3,
            extrudeDist: inset.extrusions?.left || 0,
          },
        ];

        trapConfigs.forEach((tc) => {
          if (tc.extrudeDist <= 0.001) {
            // Flat trapezoid on the face
            indices.push(
              tc.pA_idx, tc.pB_idx, tc.cA_idx,
              tc.pA_idx, tc.cA_idx, tc.cB_idx
            );
          } else {
            // Extruded 3D solid sub-volume! (Matching video 00:25 bottom shelf & 00:28 top canopy)
            const d = tc.extrudeDist;
            const E_pA = { x: tc.pA.x + norm.x * d, y: tc.pA.y + norm.y * d, z: tc.pA.z + norm.z * d };
            const E_pB = { x: tc.pB.x + norm.x * d, y: tc.pB.y + norm.y * d, z: tc.pB.z + norm.z * d };
            const E_cA = { x: tc.cA.x + norm.x * d, y: tc.cA.y + norm.y * d, z: tc.cA.z + norm.z * d };
            const E_cB = { x: tc.cB.x + norm.x * d, y: tc.cB.y + norm.y * d, z: tc.cB.z + norm.z * d };

            const eBase = positions.length / 3;
            positions.push(
              E_pA.x, E_pA.y, E_pA.z, // eBase + 0
              E_pB.x, E_pB.y, E_pB.z, // eBase + 1
              E_cA.x, E_cA.y, E_cA.z, // eBase + 2
              E_cB.x, E_cB.y, E_cB.z  // eBase + 3
            );
            const ep0 = eBase;
            const ep1 = eBase + 1;
            const ep2 = eBase + 2;
            const ep3 = eBase + 3;

            // Extruded cap polygon
            indices.push(
              ep0, ep1, ep2,
              ep0, ep2, ep3
            );

            // 4 side connecting walls
            indices.push(
              tc.pA_idx, tc.pB_idx, ep1,   tc.pA_idx, ep1, ep0, // Outer wall
              tc.pB_idx, tc.cA_idx, ep2,   tc.pB_idx, ep2, ep1, // Side A
              tc.cA_idx, tc.cB_idx, ep3,   tc.cA_idx, ep3, ep2, // Inner ledge wall
              tc.cB_idx, tc.pA_idx, ep0,   tc.cB_idx, ep0, ep3  // Side B
            );

            // Perimeter lines of the extruded cap
            edgePositions.push(
              E_pA.x, E_pA.y, E_pA.z, E_pB.x, E_pB.y, E_pB.z,
              E_pB.x, E_pB.y, E_pB.z, E_cA.x, E_cA.y, E_cA.z,
              E_cA.x, E_cA.y, E_cA.z, E_cB.x, E_cB.y, E_cB.z,
              E_cB.x, E_cB.y, E_cB.z, E_pA.x, E_pA.y, E_pA.z
            );

            // Corner pillar edges
            edgePositions.push(
              tc.pA.x, tc.pA.y, tc.pA.z, E_pA.x, E_pA.y, E_pA.z,
              tc.pB.x, tc.pB.y, tc.pB.z, E_pB.x, E_pB.y, E_pB.z,
              tc.cA.x, tc.cA.y, tc.cA.z, E_cA.x, E_cA.y, E_cA.z,
              tc.cB.x, tc.cB.y, tc.cB.z, E_cB.x, E_cB.y, E_cB.z
            );
          }
        });

        // 4 Corner Miter Edges connecting prevQuad corners to this inset's corners
        edgePositions.push(
          prevQuad[0].x, prevQuad[0].y, prevQuad[0].z, I0.x, I0.y, I0.z,
          prevQuad[1].x, prevQuad[1].y, prevQuad[1].z, I1.x, I1.y, I1.z,
          prevQuad[2].x, prevQuad[2].y, prevQuad[2].z, I2.x, I2.y, I2.z,
          prevQuad[3].x, prevQuad[3].y, prevQuad[3].z, I3.x, I3.y, I3.z
        );

        // Inset loop boundary edges
        edgePositions.push(
          I0.x, I0.y, I0.z, I1.x, I1.y, I1.z,
          I1.x, I1.y, I1.z, I2.x, I2.y, I2.z,
          I2.x, I2.y, I2.z, I3.x, I3.y, I3.z,
          I3.x, I3.y, I3.z, I0.x, I0.y, I0.z
        );

        prevIndices = curIndices;
        prevQuad = [I0, I1, I2, I3];
      }

      // Close the innermost polygon face
      const lastInset = faceInsets[faceInsets.length - 1];
      if (!lastInset.depth || lastInset.depth <= 0) {
        // Flat Inset (inner polygon sits on the face surface)
        indices.push(
          prevIndices[0], prevIndices[1], prevIndices[2],
          prevIndices[0], prevIndices[2], prevIndices[3]
        );
      } else {
        // Recessed cavity on the innermost polygon (matching video 00:29)
        const I0 = prevQuad[0];
        const I1 = prevQuad[1];
        const I2 = prevQuad[2];
        const I3 = prevQuad[3];
        const [B0, B1, B2, B3] = getInsetRecessPoints(lastInset, stroke);

        const b0 = positions.length / 3;
        positions.push(
          B0.x, B0.y, B0.z,
          B1.x, B1.y, B1.z,
          B2.x, B2.y, B2.z,
          B3.x, B3.y, B3.z
        );
        const b1 = b0 + 1;
        const b2 = b0 + 2;
        const b3 = b0 + 3;

        // 4 Vertical Inner Walls
        const i0 = prevIndices[0];
        const i1 = prevIndices[1];
        const i2 = prevIndices[2];
        const i3 = prevIndices[3];
        indices.push(
          i0, i1, b1,  i0, b1, b0,
          i1, i2, b2,  i1, b2, b1,
          i2, i3, b3,  i2, b3, b2,
          i3, i0, b0,  i3, b0, b3
        );

        // Sunken Floor
        indices.push(b0, b1, b2,  b0, b2, b3);

        // Recessed rim lines, vertical corner creases, and sunken floor perimeter
        edgePositions.push(I0.x, I0.y, I0.z, B0.x, B0.y, B0.z);
        edgePositions.push(I1.x, I1.y, I1.z, B1.x, B1.y, B1.z);
        edgePositions.push(I2.x, I2.y, I2.z, B2.x, B2.y, B2.z);
        edgePositions.push(I3.x, I3.y, I3.z, B3.x, B3.y, B3.z);

        edgePositions.push(B0.x, B0.y, B0.z, B1.x, B1.y, B1.z);
        edgePositions.push(B1.x, B1.y, B1.z, B2.x, B2.y, B2.z);
        edgePositions.push(B2.x, B2.y, B2.z, B3.x, B3.y, B3.z);
        edgePositions.push(B3.x, B3.y, B3.z, B0.x, B0.y, B0.z);
      }
    }
  }

  const rawFaceGeo = new THREE.BufferGeometry();
  rawFaceGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  rawFaceGeo.setIndex(indices);
  // Convert to non-indexed BufferGeometry so each face triangle has its own independent face normal
  const flatFaceGeo = rawFaceGeo.toNonIndexed();
  flatFaceGeo.computeVertexNormals();
  rawFaceGeo.dispose();

  // Compute planar/triplanar UV coordinates so material textures (concrete, wood, brick, etc.) wrap seamlessly
  const posAttr = flatFaceGeo.getAttribute('position');
  const normAttr = flatFaceGeo.getAttribute('normal');
  const uvs: number[] = [];
  if (posAttr && normAttr) {
    for (let i = 0; i < posAttr.count; i++) {
      const px = posAttr.getX(i);
      const py = posAttr.getY(i);
      const pz = posAttr.getZ(i);
      const nx = Math.abs(normAttr.getX(i));
      const ny = Math.abs(normAttr.getY(i));
      const nz = Math.abs(normAttr.getZ(i));

      if (nx >= ny && nx >= nz) {
        uvs.push(pz, py);
      } else if (ny >= nx && ny >= nz) {
        uvs.push(px, pz);
      } else {
        uvs.push(px, py);
      }
    }
    flatFaceGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  }

  // 1. Configured standard material with surface appearance textures (concrete, wood, glass, metal, marble, etc.)
  const faceMat = createBoxStandardMaterial(stroke.material, stroke.color, isShaded);
  const faceMesh = new THREE.Mesh(flatFaceGeo, faceMat);
  faceMesh.name = `box-mesh-${stroke.id}`;
  group.add(faceMesh);

  // 2. Crisp architectural wireframe outlines (Edged Faces - F4 in 3ds Max)
  const edgesGeo = new THREE.BufferGeometry();
  edgesGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
  const edgeMat = new THREE.LineBasicMaterial({
    color: isShaded ? 0xffffff : new THREE.Color(stroke.color),
    linewidth: isShaded ? 1.5 : Math.max(1, stroke.size),
    transparent: true,
    opacity: isShaded ? 0.95 : Math.max(0.75, stroke.opacity),
  });
  const edgeLines = new THREE.LineSegments(edgesGeo, edgeMat);
  edgeLines.name = `box-edges-${stroke.id}`;
  edgeLines.renderOrder = 998;
  group.add(edgeLines);

  // Distinct boundary seam edge loops between segments ("مرز سطح جدید با قبلی مشخص شود")
  if (seamPositions.length > 0) {
    const seamGeo = new THREE.BufferGeometry();
    seamGeo.setAttribute('position', new THREE.Float32BufferAttribute(seamPositions, 3));
    const seamMat = new THREE.LineBasicMaterial({
      color: 0xffffff, // Crisp pure white boundary seam line matching edged faces
      linewidth: 2,
      transparent: true,
      opacity: 1.0,
      depthTest: true,
    });
    const seamLines = new THREE.LineSegments(seamGeo, seamMat);
    seamLines.name = `box-seams-${stroke.id}`;
    seamLines.renderOrder = 999;
    group.add(seamLines);
  }

  return group;
}

// Compute 3D Box geometry from interactive mouse drag on active plane
export function calculateBoxFromDrag(
  pStart: Point3D,
  pCurrent: Point3D,
  plane?: DrawingPlane
): { boxData: { width: number; height: number; depth: number; center: Point3D }; points: Point3D[] } {
  const isXOY = plane && Math.abs(plane.normal.y) > 0.8; // Floor / Plan
  const isXOZ = plane && Math.abs(plane.normal.z) > 0.8; // Front
  const isYOZ = plane && Math.abs(plane.normal.x) > 0.8; // Side profile

  let minX = Math.min(pStart.x, pCurrent.x);
  let maxX = Math.max(pStart.x, pCurrent.x);
  let minY = Math.min(pStart.y, pCurrent.y);
  let maxY = Math.max(pStart.y, pCurrent.y);
  let minZ = Math.min(pStart.z, pCurrent.z);
  let maxZ = Math.max(pStart.z, pCurrent.z);

  let width = maxX - minX;
  let height = maxY - minY;
  let depth = maxZ - minZ;

  if (isXOY) {
    // Floor plane: drag in X and Z. Extrude height along +Y
    width = Math.max(0.2, width);
    depth = Math.max(0.2, depth);
    const extrudeH = Math.max(0.5, Math.hypot(width, depth) * 0.75);
    height = extrudeH;
    minY = pStart.y;
    maxY = pStart.y + extrudeH;
  } else if (isXOZ) {
    // Front plane: drag in X and Y. Extrude depth along +Z
    width = Math.max(0.2, width);
    height = Math.max(0.2, height);
    const extrudeD = Math.max(0.5, Math.hypot(width, height) * 0.75);
    depth = extrudeD;
    minZ = pStart.z;
    maxZ = pStart.z + extrudeD;
  } else if (isYOZ) {
    // Side plane: drag in Y and Z. Extrude width along +X
    depth = Math.max(0.2, depth);
    height = Math.max(0.2, height);
    const extrudeW = Math.max(0.5, Math.hypot(depth, height) * 0.75);
    width = extrudeW;
    minX = pStart.x;
    maxX = pStart.x + extrudeW;
  } else {
    width = Math.max(0.3, width);
    height = Math.max(0.3, height);
    depth = Math.max(0.3, depth);
  }

  const center = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: (minZ + maxZ) / 2,
  };

  const points: Point3D[] = [
    { x: minX, y: minY, z: minZ },
    { x: maxX, y: minY, z: minZ },
    { x: maxX, y: minY, z: maxZ },
    { x: minX, y: minY, z: maxZ },
    { x: minX, y: maxY, z: minZ },
    { x: maxX, y: maxY, z: minZ },
    { x: maxX, y: maxY, z: maxZ },
    { x: minX, y: maxY, z: maxZ },
  ];

  return {
    boxData: {
      width: Number(width.toFixed(2)),
      height: Number(height.toFixed(2)),
      depth: Number(depth.toFixed(2)),
      center,
    },
    points,
  };
}

// Create 3D Box data from explicit numerical dimensions
export function createBoxFromDimensions(
  dimensions: { width: number; height: number; depth: number },
  origin: Point3D,
  plane?: DrawingPlane
): { boxData: { width: number; height: number; depth: number; center: Point3D }; points: Point3D[] } {
  const width = Math.max(0.1, dimensions.width);
  const height = Math.max(0.1, dimensions.height);
  const depth = Math.max(0.1, dimensions.depth);

  const isXOY = plane && Math.abs(plane.normal.y) > 0.8;
  const isXOZ = plane && Math.abs(plane.normal.z) > 0.8;
  const isYOZ = plane && Math.abs(plane.normal.x) > 0.8;

  let center = { x: origin.x, y: origin.y, z: origin.z };

  if (isXOY) {
    center = { x: origin.x, y: origin.y + height / 2, z: origin.z };
  } else if (isXOZ) {
    center = { x: origin.x, y: origin.y, z: origin.z + depth / 2 };
  } else if (isYOZ) {
    center = { x: origin.x + width / 2, y: origin.y, z: origin.z };
  } else {
    center = { x: origin.x, y: origin.y + height / 2, z: origin.z };
  }

  const minX = center.x - width / 2;
  const maxX = center.x + width / 2;
  const minY = center.y - height / 2;
  const maxY = center.y + height / 2;
  const minZ = center.z - depth / 2;
  const maxZ = center.z + depth / 2;

  const points: Point3D[] = [
    { x: minX, y: minY, z: minZ },
    { x: maxX, y: minY, z: minZ },
    { x: maxX, y: minY, z: maxZ },
    { x: minX, y: minY, z: maxZ },
    { x: minX, y: maxY, z: minZ },
    { x: maxX, y: maxY, z: minZ },
    { x: maxX, y: maxY, z: maxZ },
    { x: minX, y: maxY, z: maxZ },
  ];

  return {
    boxData: {
      width: Number(width.toFixed(2)),
      height: Number(height.toFixed(2)),
      depth: Number(depth.toFixed(2)),
      center,
    },
    points,
  };
}

// Raycast and identify clicked stroke (supports freehand lines, straight lines, rectangles, and 3D boxes)
export function findHitStroke(
  ndcX: number,
  ndcY: number,
  camera: THREE.Camera,
  strokes: Stroke[],
  layers: Layer[]
): string | null {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const ray = raycaster.ray;

  const layerMap = new Map(layers.map((l) => [l.id, l]));
  let closestId: string | null = null;
  let minDistance = Infinity;

  // Search backwards so topmost/recently created strokes get picked first
  for (let sIdx = strokes.length - 1; sIdx >= 0; sIdx--) {
    const s = strokes[sIdx];
    const layer = layerMap.get(s.layerId);
    if (!layer || !layer.visible || layer.locked) continue;
    if (s.hidden) continue;

    // 1. Check 3D Box / Volume intersection
    if (s.boxData) {
      const hw = Math.max(0.1, s.boxData.width / 2);
      const hh = Math.max(0.1, s.boxData.height / 2);
      const hd = Math.max(0.1, s.boxData.depth / 2);
      const bMin = new THREE.Vector3(s.boxData.center.x - hw, s.boxData.center.y - hh, s.boxData.center.z - hd);
      const bMax = new THREE.Vector3(s.boxData.center.x + hw, s.boxData.center.y + hh, s.boxData.center.z + hd);
      const bbox = new THREE.Box3(bMin, bMax);
      const target = new THREE.Vector3();
      const hitPt = ray.intersectBox(bbox, target);
      if (hitPt) {
        const distToCam = camera.position.distanceTo(hitPt);
        if (distToCam < minDistance) {
          minDistance = distToCam;
          closestId = s.id;
        }
      }
    }

    // 2. Check Stroke points and polyline segments
    if (s.points && s.points.length > 0) {
      const pA = new THREE.Vector3();
      const pB = new THREE.Vector3();
      let strokeHit = false;
      let strokeDist = Infinity;

      for (let i = 0; i < s.points.length; i++) {
        pA.set(s.points[i].x, s.points[i].y, s.points[i].z);
        const distToRay = ray.distanceToPoint(pA);
        const distToCam = camera.position.distanceTo(pA);
        // Adaptive hit tolerance in meters
        const tolerance = Math.max(0.14, 0.18 + distToCam * 0.018);

        if (distToRay < tolerance) {
          if (distToCam < strokeDist) {
            strokeDist = distToCam;
            strokeHit = true;
          }
        }

        // Test line segment between consecutive points
        if (i < s.points.length - 1) {
          pB.set(s.points[i + 1].x, s.points[i + 1].y, s.points[i + 1].z);
          const segDist = ray.distanceSqToSegment(pA, pB);
          if (segDist !== undefined && segDist < tolerance * tolerance) {
            const midCamDist = camera.position.distanceTo(pA);
            if (midCamDist < strokeDist) {
              strokeDist = midCamDist;
              strokeHit = true;
            }
          }
        }
      }

      if (strokeHit && strokeDist < minDistance) {
        minDistance = strokeDist;
        closestId = s.id;
      }
    }
  }

  return closestId;
}

// Get all vertex indices (0..7) affected by a sub-selection
export function getAffectedVertexIndices(subSel: BoxSubSelection): number[] {
  const { mode, vertexIndices, edgeIndices, faceIndices } = subSel;
  const set = new Set<number>();
  if (mode === 'vertex') {
    vertexIndices.forEach((i) => set.add(i));
  } else if (mode === 'edge') {
    edgeIndices.forEach((eIdx) => {
      if (BOX_EDGES[eIdx]) {
        set.add(BOX_EDGES[eIdx][0]);
        set.add(BOX_EDGES[eIdx][1]);
      }
    });
  } else if (mode === 'polygon') {
    faceIndices.forEach((fIdx) => {
      if (BOX_FACES[fIdx]) {
        BOX_FACES[fIdx].forEach((v) => set.add(v));
      }
    });
  } else if (mode === 'object') {
    for (let i = 0; i < 8; i++) set.add(i);
  }
  return Array.from(set);
}

// Extract the 4 3D corner vertices of a specific polygon in an Inset (center, cavity walls, or outer bevel frame)
export function getInsetPartQuad(
  stroke: Stroke,
  inset: FaceInset,
  part: InsetPartType = 'center'
): Point3D[] {
  const f = inset.faceIndex;
  const faceVerts = BOX_FACES[f];
  const pts = getBoxPoints(stroke);

  const faceInsets = (stroke.insets || []).filter((i) => i.faceIndex === f);
  const curIdx = faceInsets.findIndex((i) => i.id === inset.id);
  const prevQuad = (curIdx > 0 && faceInsets[curIdx - 1]?.innerPoints?.length === 4)
    ? faceInsets[curIdx - 1].innerPoints
    : [pts[faceVerts[0]], pts[faceVerts[1]], pts[faceVerts[2]], pts[faceVerts[3]]];

  const I0 = inset.innerPoints[0];
  const I1 = inset.innerPoints[1];
  const I2 = inset.innerPoints[2];
  const I3 = inset.innerPoints[3];
  const norm = getBoxFaceNormal(f);

  const [B0, B1, B2, B3] = getInsetRecessPoints(inset, stroke);

  if (part === 'center') {
    return [B0, B1, B2, B3];
  }

  // Cavity side walls inside the recess
  if (part === 'cavity_bottom') {
    return [I0, I1, B1, B0];
  }
  if (part === 'cavity_right') {
    return [I1, I2, B2, B1];
  }
  if (part === 'cavity_top') {
    return [I2, I3, B3, B2];
  }
  if (part === 'cavity_left') {
    return [I3, I0, B0, B3];
  }

  // Outer bevel frame
  let base: Point3D[] = [];
  let extrudeDist = 0;
  if (part === 'bottom') {
    base = [prevQuad[0], prevQuad[1], I1, I0];
    extrudeDist = inset.extrusions?.bottom || 0;
  } else if (part === 'right') {
    base = [prevQuad[1], prevQuad[2], I2, I1];
    extrudeDist = inset.extrusions?.right || 0;
  } else if (part === 'top') {
    base = [prevQuad[2], prevQuad[3], I3, I2];
    extrudeDist = inset.extrusions?.top || 0;
  } else if (part === 'left') {
    base = [prevQuad[3], prevQuad[0], I0, I3];
    extrudeDist = inset.extrusions?.left || 0;
  }

  if (extrudeDist > 0.001) {
    return base.map((p) => ({
      x: p.x + norm.x * extrudeDist,
      y: p.y + norm.y * extrudeDist,
      z: p.z + norm.z * extrudeDist,
    }));
  }
  return base;
}

// Calculate the geometric centroid of active sub-selection for positioning the 3D Gizmo
export function getBoxSubSelectionCentroid(stroke: Stroke, subSel: BoxSubSelection): Point3D {
  // Vertex Mode: centroid of selected vertices (including inset rim & cavity recess vertices!)
  if (subSel.mode === 'vertex' && subSel.vertexIndices.length > 0) {
    const allVerts = getAllBoxVertices(stroke);
    const selVerts = allVerts.filter((v) => subSel.vertexIndices.includes(v.index));
    if (selVerts.length > 0) {
      let sx = 0, sy = 0, sz = 0;
      selVerts.forEach((v) => { sx += v.point.x; sy += v.point.y; sz += v.point.z; });
      return {
        x: Number((sx / selVerts.length).toFixed(4)),
        y: Number((sy / selVerts.length).toFixed(4)),
        z: Number((sz / selVerts.length).toFixed(4)),
      };
    }
  }

  // Edge Mode: midpoint of selected edges (including inset miter, rim, cavity depth, cavity floor edges!)
  if (subSel.mode === 'edge' && subSel.edgeIndices.length > 0) {
    const allEdges = getAllBoxEdges(stroke);
    const selEdges = allEdges.filter((e) => subSel.edgeIndices.includes(e.index));
    if (selEdges.length > 0) {
      let sx = 0, sy = 0, sz = 0;
      selEdges.forEach((e) => {
        sx += (e.pA.x + e.pB.x) * 0.5;
        sy += (e.pA.y + e.pB.y) * 0.5;
        sz += (e.pA.z + e.pB.z) * 0.5;
      });
      return {
        x: Number((sx / selEdges.length).toFixed(4)),
        y: Number((sy / selEdges.length).toFixed(4)),
        z: Number((sz / selEdges.length).toFixed(4)),
      };
    }
  }

  // Polygon Mode: check Inset parts or sequential extrusions
  if (subSel.mode === 'polygon' && subSel.faceIndices.length > 0) {
    const fIdx = subSel.faceIndices[0];

    // Check Inset parts
    if (stroke.insets && stroke.insets.length > 0) {
      const faceInsets = stroke.insets.filter((i) => i.faceIndex === fIdx);
      if (faceInsets.length > 0) {
        const inset = subSel.selectedInsetId
          ? faceInsets.find((i) => i.id === subSel.selectedInsetId) || faceInsets[faceInsets.length - 1]
          : faceInsets[faceInsets.length - 1];
        if (inset && inset.innerPoints && inset.innerPoints.length === 4) {
          const partsToAverage = (subSel.selectedParts && subSel.selectedParts.length > 0)
            ? subSel.selectedParts
            : [subSel.insetPart || 'center'];

          let totalPts = 0;
          let sx = 0, sy = 0, sz = 0;
          partsToAverage.forEach((part) => {
            const quad = getInsetPartQuad(stroke, inset, part);
            quad.forEach((p) => {
              sx += p.x; sy += p.y; sz += p.z;
              totalPts++;
            });
          });
          if (totalPts > 0) {
            return {
              x: Number((sx / totalPts).toFixed(4)),
              y: Number((sy / totalPts).toFixed(4)),
              z: Number((sz / totalPts).toFixed(4)),
            };
          }
        }
      }
    }

    // Check Extruded segment cap (position Gizmo directly on the extruded face cap, matching Image 2!)
    const faceExts = (stroke.extrusions || []).filter((e) => e.faceIndex === fIdx);
    if (faceExts.length > 0) {
      const cap = faceExts[faceExts.length - 1].capPoints;
      let sx = 0, sy = 0, sz = 0;
      cap.forEach((p) => { sx += p.x; sy += p.y; sz += p.z; });
      return {
        x: Number((sx / 4).toFixed(4)),
        y: Number((sy / 4).toFixed(4)),
        z: Number((sz / 4).toFixed(4)),
      };
    }
  }

  const pts = getBoxPoints(stroke);
  const affected = getAffectedVertexIndices(subSel);
  if (affected.length === 0) {
    if (stroke.boxData) return stroke.boxData.center;
    let sx = 0, sy = 0, sz = 0;
    pts.forEach((p) => { sx += p.x; sy += p.y; sz += p.z; });
    return { x: sx / 8, y: sy / 8, z: sz / 8 };
  }
  let sx = 0, sy = 0, sz = 0;
  affected.forEach((idx) => {
    sx += pts[idx].x;
    sy += pts[idx].y;
    sz += pts[idx].z;
  });
  return {
    x: sx / affected.length,
    y: sy / affected.length,
    z: sz / affected.length,
  };
}

// Translate sub-elements of a 3D box (vertices, edges, polygons, or Inset surfaces) along coordinate axes
export function translateBoxSubElements(
  stroke: Stroke,
  subSel: BoxSubSelection,
  delta: { x: number; y: number; z: number }
): Stroke {
  // 1. Vertex Mode: translate selected vertices (including inset rim & cavity floor vertices!)
  if (subSel.mode === 'vertex' && subSel.vertexIndices.length > 0) {
    const allVerts = getAllBoxVertices(stroke);
    const selVertIndices = new Set(subSel.vertexIndices);

    // Check if any base box vertices (0..7) are selected
    let newPts = getBoxPoints(stroke);
    let ptsChanged = false;
    for (let i = 0; i < 8; i++) {
      if (selVertIndices.has(i)) {
        ptsChanged = true;
        newPts = newPts.map((p, idx) => {
          if (idx !== i) return p;
          return {
            x: Number((p.x + delta.x).toFixed(4)),
            y: Number((p.y + delta.y).toFixed(4)),
            z: Number((p.z + delta.z).toFixed(4)),
          };
        });
      }
    }

    // Check if any inset rim or recess vertices are selected
    let updatedInsets = stroke.insets;
    if (stroke.insets && stroke.insets.length > 0) {
      updatedInsets = stroke.insets.map((ins) => {
        let insRim = [...ins.innerPoints];
        let insRecess = [...getInsetRecessPoints(ins, stroke)];
        let insModified = false;

        allVerts.forEach((v) => {
          if (v.insetId === ins.id && selVertIndices.has(v.index)) {
            insModified = true;
            if (v.type === 'inset_rim') {
              insRim[v.subIndex] = {
                x: Number((insRim[v.subIndex].x + delta.x).toFixed(4)),
                y: Number((insRim[v.subIndex].y + delta.y).toFixed(4)),
                z: Number((insRim[v.subIndex].z + delta.z).toFixed(4)),
              };
            } else if (v.type === 'inset_recess') {
              insRecess[v.subIndex] = {
                x: Number((insRecess[v.subIndex].x + delta.x).toFixed(4)),
                y: Number((insRecess[v.subIndex].y + delta.y).toFixed(4)),
                z: Number((insRecess[v.subIndex].z + delta.z).toFixed(4)),
              };
            }
          }
        });

        if (insModified) {
          return {
            ...ins,
            innerPoints: insRim,
            recessPoints: insRecess,
          };
        }
        return ins;
      });
    }

    return {
      ...stroke,
      points: ptsChanged ? newPts : stroke.points,
      insets: updatedInsets,
    };
  }

  // 2. Edge Mode: translate endpoint vertices of all selected edges
  if (subSel.mode === 'edge' && subSel.edgeIndices.length > 0) {
    const allEdges = getAllBoxEdges(stroke);
    const vertIndicesToMove = new Set<number>();
    subSel.edgeIndices.forEach((eIdx) => {
      const edge = allEdges.find((e) => e.index === eIdx);
      if (edge) {
        vertIndicesToMove.add(edge.vA_idx);
        vertIndicesToMove.add(edge.vB_idx);
      }
    });

    if (vertIndicesToMove.size > 0) {
      return translateBoxSubElements(
        stroke,
        { ...subSel, mode: 'vertex', vertexIndices: Array.from(vertIndicesToMove) },
        delta
      );
    }
  }

  // 3. Polygon Mode: check Inset surfaces (recess cavity floor, cavity side walls, or outer bevels)
  if (subSel.mode === 'polygon' && subSel.faceIndices.length > 0 && subSel.isInsetPolygon !== false) {
    const fIdx = subSel.faceIndices[0];
    const faceInsets = (stroke.insets || []).filter((i) => i.faceIndex === fIdx);

    const targetInset = subSel.selectedInsetId
      ? faceInsets.find((i) => i.id === subSel.selectedInsetId) || faceInsets[faceInsets.length - 1]
      : (faceInsets.length > 0 ? faceInsets[faceInsets.length - 1] : null);

    if (targetInset && targetInset.innerPoints && targetInset.innerPoints.length === 4) {
      const partsToMove = (subSel.selectedParts && subSel.selectedParts.length > 0)
        ? subSel.selectedParts
        : [subSel.insetPart || 'center'];
      const normal = getBoxFaceNormal(fIdx);

      const updatedInsets = (stroke.insets || []).map((ins) => {
        if (ins.id === targetInset.id) {
          let curRecess = [...getInsetRecessPoints(ins, stroke)];
          let curRim = [...ins.innerPoints];
          let curExt = { ...(ins.extrusions || {}) };

          partsToMove.forEach((part) => {
            if (part === 'center') {
              // Move all 4 cavity floor vertices along delta
              curRecess = curRecess.map((p) => ({
                x: Number((p.x + delta.x).toFixed(4)),
                y: Number((p.y + delta.y).toFixed(4)),
                z: Number((p.z + delta.z).toFixed(4)),
              }));
            } else if (part === 'cavity_bottom') {
              // Deform bottom cavity wall (innerPoints 0,1 and recess 0,1)
              curRecess[0] = { x: Number((curRecess[0].x + delta.x).toFixed(4)), y: Number((curRecess[0].y + delta.y).toFixed(4)), z: Number((curRecess[0].z + delta.z).toFixed(4)) };
              curRecess[1] = { x: Number((curRecess[1].x + delta.x).toFixed(4)), y: Number((curRecess[1].y + delta.y).toFixed(4)), z: Number((curRecess[1].z + delta.z).toFixed(4)) };
            } else if (part === 'cavity_right') {
              curRecess[1] = { x: Number((curRecess[1].x + delta.x).toFixed(4)), y: Number((curRecess[1].y + delta.y).toFixed(4)), z: Number((curRecess[1].z + delta.z).toFixed(4)) };
              curRecess[2] = { x: Number((curRecess[2].x + delta.x).toFixed(4)), y: Number((curRecess[2].y + delta.y).toFixed(4)), z: Number((curRecess[2].z + delta.z).toFixed(4)) };
            } else if (part === 'cavity_top') {
              curRecess[2] = { x: Number((curRecess[2].x + delta.x).toFixed(4)), y: Number((curRecess[2].y + delta.y).toFixed(4)), z: Number((curRecess[2].z + delta.z).toFixed(4)) };
              curRecess[3] = { x: Number((curRecess[3].x + delta.x).toFixed(4)), y: Number((curRecess[3].y + delta.y).toFixed(4)), z: Number((curRecess[3].z + delta.z).toFixed(4)) };
            } else if (part === 'cavity_left') {
              curRecess[3] = { x: Number((curRecess[3].x + delta.x).toFixed(4)), y: Number((curRecess[3].y + delta.y).toFixed(4)), z: Number((curRecess[3].z + delta.z).toFixed(4)) };
              curRecess[0] = { x: Number((curRecess[0].x + delta.x).toFixed(4)), y: Number((curRecess[0].y + delta.y).toFixed(4)), z: Number((curRecess[0].z + delta.z).toFixed(4)) };
            } else {
              // Outer bevel frame extrusion
              const proj = delta.x * normal.x + delta.y * normal.y + delta.z * normal.z;
              const curVal = curExt[part] || 0;
              curExt[part] = Math.max(0, Number((curVal + proj).toFixed(4)));
            }
          });

          return {
            ...ins,
            innerPoints: curRim,
            recessPoints: curRecess,
            extrusions: curExt,
          };
        }
        return ins;
      });

      return {
        ...stroke,
        insets: updatedInsets,
      };
    }
  }

  // 4. Polygon Mode: check sequential 3D extrusions cap
  if (subSel.mode === 'polygon' && subSel.faceIndices.length > 0) {
    const fIdx = subSel.faceIndices[0];
    const faceExts = (stroke.extrusions || []).filter((e) => e.faceIndex === fIdx);
    if (faceExts.length > 0) {
      const lastExt = faceExts[faceExts.length - 1];
      const updatedExtrusions = (stroke.extrusions || []).map((e) => {
        if (e.id === lastExt.id) {
          return {
            ...e,
            capPoints: e.capPoints.map((p) => ({
              x: Number((p.x + delta.x).toFixed(4)),
              y: Number((p.y + delta.y).toFixed(4)),
              z: Number((p.z + delta.z).toFixed(4)),
            })),
          };
        }
        return e;
      });
      return {
        ...stroke,
        extrusions: updatedExtrusions,
      };
    }
  }

  // 5. Base box vertices translation (vertices, edges, or full base faces)
  const affected = new Set(getAffectedVertexIndices(subSel));
  const pts = getBoxPoints(stroke);
  const newPts = pts.map((p, idx) => {
    if (!affected.has(idx)) return p;
    return {
      x: Number((p.x + delta.x).toFixed(4)),
      y: Number((p.y + delta.y).toFixed(4)),
      z: Number((p.z + delta.z).toFixed(4)),
    };
  });

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  let sx = 0, sy = 0, sz = 0;
  newPts.forEach((p) => {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
    sx += p.x; sy += p.y; sz += p.z;
  });

  // If a whole face's vertices moved, also translate any insets belonging to that face
  let updatedInsets = stroke.insets;
  if (subSel.mode === 'polygon' && stroke.insets && stroke.insets.length > 0) {
    const movedFace = subSel.faceIndices[0];
    updatedInsets = stroke.insets.map((ins) => {
      if (ins.faceIndex === movedFace) {
        return {
          ...ins,
          innerPoints: ins.innerPoints.map((p) => ({
            x: Number((p.x + delta.x).toFixed(4)),
            y: Number((p.y + delta.y).toFixed(4)),
            z: Number((p.z + delta.z).toFixed(4)),
          })),
        };
      }
      return ins;
    });
  }

  return {
    ...stroke,
    points: newPts,
    insets: updatedInsets,
    boxData: {
      width: Number((maxX - minX).toFixed(2)),
      height: Number((maxY - minY).toFixed(2)),
      depth: Number((maxZ - minZ).toFixed(2)),
      center: {
        x: Number((sx / 8).toFixed(4)),
        y: Number((sy / 8).toFixed(4)),
        z: Number((sz / 8).toFixed(4)),
      },
    },
  };
}

// Extrude / give height to the selected polygon along its normal vector
export function extrudePolygonHeight(
  targetBox: Stroke,
  subSel: BoxSubSelection,
  height: number
): Stroke {
  const fIdx = subSel.faceIndices[0] ?? 1;
  const normal = getBoxFaceNormal(fIdx);

  const faceInsets = (targetBox.insets || []).filter((i) => i.faceIndex === fIdx);
  const targetInset = subSel.selectedInsetId
    ? faceInsets.find((i) => i.id === subSel.selectedInsetId) || faceInsets[faceInsets.length - 1]
    : (faceInsets.length > 0 ? faceInsets[faceInsets.length - 1] : null);

  if (targetInset && subSel.isInsetPolygon !== false && targetInset.innerPoints && targetInset.innerPoints.length === 4) {
    const part = subSel.insetPart || 'center';

    const updatedInsets = (targetBox.insets || []).map((ins) => {
      if (ins.id === targetInset.id) {
        if (part === 'center') {
          const delta = {
            x: Number((normal.x * height).toFixed(4)),
            y: Number((normal.y * height).toFixed(4)),
            z: Number((normal.z * height).toFixed(4)),
          };
          return {
            ...ins,
            innerPoints: ins.innerPoints.map((p) => ({
              x: Number((p.x + delta.x).toFixed(4)),
              y: Number((p.y + delta.y).toFixed(4)),
              z: Number((p.z + delta.z).toFixed(4)),
            })),
            height: Number(((ins.height || 0) + height).toFixed(2)),
          };
        } else {
          // Perimeter polygon: bottom, top, left, right (Matching video 00:25 and 00:28)
          const currentExtrusions = ins.extrusions || {};
          const curVal = currentExtrusions[part] || 0;
          const nextVal = Math.max(0, Number((curVal + height).toFixed(2)));
          return {
            ...ins,
            extrusions: {
              ...currentExtrusions,
              [part]: nextVal,
            },
          };
        }
      }
      return ins;
    });

    return {
      ...targetBox,
      insets: updatedInsets,
    };
  }

  // Standard face Extrude: creates a new 3D segment with distinct visible boundary seam, matching Image 2!
  return extrudeFaceNewSegment(targetBox, fIdx, height);
}

// Extrude an architectural box face outward, creating a new connected volume module with shared segment lines (Matches 3ds Max Shift-Extrude)
export function extrudeBoxFace(
  targetBox: Stroke,
  faceIndex: number,
  distance: number
): { newBox: Stroke; outerFaceIndex: number } {
  const pts = getBoxPoints(targetBox);
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  pts.forEach((p) => {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  });

  const d = Math.max(0.05, Math.abs(distance));
  let nMinX = minX, nMaxX = maxX;
  let nMinY = minY, nMaxY = maxY;
  let nMinZ = minZ, nMaxZ = maxZ;

  if (faceIndex === 5) {
    // Right (+X)
    nMinX = maxX;
    nMaxX = maxX + d;
  } else if (faceIndex === 4) {
    // Left (-X)
    nMinX = minX - d;
    nMaxX = minX;
  } else if (faceIndex === 1) {
    // Top (+Y)
    nMinY = maxY;
    nMaxY = maxY + d;
  } else if (faceIndex === 0) {
    // Bottom (-Y)
    nMinY = minY - d;
    nMaxY = minY;
  } else if (faceIndex === 2) {
    // Front (-Z)
    nMinZ = minZ - d;
    nMaxZ = minZ;
  } else if (faceIndex === 3) {
    // Back (+Z)
    nMinZ = maxZ;
    nMaxZ = maxZ + d;
  }

  const width = Number((nMaxX - nMinX).toFixed(2));
  const height = Number((nMaxY - nMinY).toFixed(2));
  const depth = Number((nMaxZ - nMinZ).toFixed(2));
  const center = {
    x: Number(((nMinX + nMaxX) / 2).toFixed(4)),
    y: Number(((nMinY + nMaxY) / 2).toFixed(4)),
    z: Number(((nMinZ + nMaxZ) / 2).toFixed(4)),
  };

  const newPts: Point3D[] = [
    { x: nMinX, y: nMinY, z: nMinZ }, // 0
    { x: nMaxX, y: nMinY, z: nMinZ }, // 1
    { x: nMaxX, y: nMinY, z: nMaxZ }, // 2
    { x: nMinX, y: nMinY, z: nMaxZ }, // 3
    { x: nMinX, y: nMaxY, z: nMinZ }, // 4
    { x: nMaxX, y: nMaxY, z: nMinZ }, // 5
    { x: nMaxX, y: nMaxY, z: nMaxZ }, // 6
    { x: nMinX, y: nMaxY, z: nMaxZ }, // 7
  ];

  const newBox: Stroke = {
    id: `box-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    layerId: targetBox.layerId,
    planeId: targetBox.planeId,
    points: newPts,
    boxData: { width, height, depth, center },
    color: targetBox.color,
    size: targetBox.size,
    opacity: targetBox.opacity,
    tool: 'box',
    createdAt: Date.now(),
  };

  return { newBox, outerFaceIndex: faceIndex };
}

// Extract local-space transformation matrix and canonical planar coordinates for a face quad
// ensuring consistent behavior regardless of 3D box translation, rotation, or scaling.
export function getFaceLocalTransform(quad: Point3D[], faceIndex: number): {
  localMatrix: THREE.Matrix4;
  invLocalMatrix: THREE.Matrix4;
  spanLocalX: number;
  spanLocalY: number;
  minLocalX: number;
  maxLocalX: number;
  minLocalY: number;
  maxLocalY: number;
  localPoints: THREE.Vector3[];
  normal: Point3D;
} {
  // 1. Face centroid in 3D space
  const cx = (quad[0].x + quad[1].x + quad[2].x + quad[3].x) * 0.25;
  const cy = (quad[0].y + quad[1].y + quad[2].y + quad[3].y) * 0.25;
  const cz = (quad[0].z + quad[1].z + quad[2].z + quad[3].z) * 0.25;
  const centerVec = new THREE.Vector3(cx, cy, cz);

  // 2. Face normal
  const e1 = new THREE.Vector3(quad[1].x - quad[0].x, quad[1].y - quad[0].y, quad[1].z - quad[0].z);
  const e2 = new THREE.Vector3(quad[3].x - quad[0].x, quad[3].y - quad[0].y, quad[3].z - quad[0].z);
  let normalVec = new THREE.Vector3().crossVectors(e1, e2);
  const nominal = getBoxFaceNormal(faceIndex);
  const nominalVec = new THREE.Vector3(nominal.x, nominal.y, nominal.z);

  if (normalVec.lengthSq() < 1e-6) {
    normalVec.copy(nominalVec);
  } else {
    normalVec.normalize();
    if (normalVec.dot(nominalVec) < 0) {
      normalVec.negate();
    }
  }

  // 3. Local tangent U (along bottom edge quad[1] - quad[0])
  let uVec = new THREE.Vector3(quad[1].x - quad[0].x, quad[1].y - quad[0].y, quad[1].z - quad[0].z);
  if (uVec.lengthSq() < 1e-6) {
    const fallback = Math.abs(normalVec.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    uVec.crossVectors(normalVec, fallback);
  }
  uVec.normalize();

  // 4. Local bitangent V (in-plane orthogonal to U and normal)
  const vVec = new THREE.Vector3().crossVectors(normalVec, uVec).normalize();

  // 5. Build local transformation matrix & its inverse
  // Basis columns: U, V, normalVec, and translation: centerVec
  const localMatrix = new THREE.Matrix4().makeBasis(uVec, vVec, normalVec).setPosition(centerVec);
  const invLocalMatrix = localMatrix.clone().invert();

  // 6. Project quad points into local face coordinates
  const localPoints = quad.map((p) => new THREE.Vector3(p.x, p.y, p.z).applyMatrix4(invLocalMatrix));

  let minLocalX = Infinity, maxLocalX = -Infinity;
  let minLocalY = Infinity, maxLocalY = -Infinity;
  localPoints.forEach((lp) => {
    minLocalX = Math.min(minLocalX, lp.x);
    maxLocalX = Math.max(maxLocalX, lp.x);
    minLocalY = Math.min(minLocalY, lp.y);
    maxLocalY = Math.max(maxLocalY, lp.y);
  });

  const spanLocalX = Math.max(0.01, maxLocalX - minLocalX);
  const spanLocalY = Math.max(0.01, maxLocalY - minLocalY);

  return {
    localMatrix,
    invLocalMatrix,
    spanLocalX,
    spanLocalY,
    minLocalX,
    maxLocalX,
    minLocalY,
    maxLocalY,
    localPoints,
    normal: { x: normalVec.x, y: normalVec.y, z: normalVec.z },
  };
}

// Temporary wireframe visualizer for manual Inset using EdgesGeometry
export function buildInsetFaceWireframe(
  baseQuad: Point3D[],
  innerQuad: Point3D[]
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'inset-face-wireframe-visualizer';

  const positions: number[] = [];

  // 4 perimeter trapezoids connecting baseQuad to innerQuad
  for (let i = 0; i < 4; i++) {
    const next = (i + 1) % 4;
    const b0 = baseQuad[i];
    const b1 = baseQuad[next];
    const i1 = innerQuad[next];
    const i0 = innerQuad[i];

    positions.push(b0.x, b0.y, b0.z, b1.x, b1.y, b1.z, i1.x, i1.y, i1.z);
    positions.push(b0.x, b0.y, b0.z, i1.x, i1.y, i1.z, i0.x, i0.y, i0.z);
  }

  // Center inner quad
  const c0 = innerQuad[0];
  const c1 = innerQuad[1];
  const c2 = innerQuad[2];
  const c3 = innerQuad[3];
  positions.push(c0.x, c0.y, c0.z, c1.x, c1.y, c1.z, c2.x, c2.y, c2.z);
  positions.push(c0.x, c0.y, c0.z, c2.x, c2.y, c2.z, c3.x, c3.y, c3.z);

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();

  // EdgesGeometry clearly delineates outer face boundary, miter lines, and inner inset rim!
  const edgesGeom = new THREE.EdgesGeometry(geom, 1);
  const edgesMat = new THREE.LineBasicMaterial({
    color: 0x10b981, // Emerald green
    linewidth: 2,
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });
  const lineSegments = new THREE.LineSegments(edgesGeom, edgesMat);
  lineSegments.renderOrder = 2000;
  group.add(lineSegments);

  // Subtle translucent green overlay on the face being inset
  const fillMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthTest: false,
  });
  const fillMesh = new THREE.Mesh(geom, fillMat);
  fillMesh.renderOrder = 1999;
  group.add(fillMesh);

  return group;
}

// Calculate Inset geometry using local-space transformation matrices rather than world AABB coordinates
export function calculateFaceInset(
  targetBox: Stroke,
  faceIndex: number,
  offset: number = 0.2
): FaceInset {
  const existingFaceInsets = (targetBox.insets || []).filter((i) => i.faceIndex === faceIndex);

  // Use the active face quad (respects extrusions and position!) or innermost nested inset polygon
  const baseQuad = existingFaceInsets.length > 0
    ? existingFaceInsets[existingFaceInsets.length - 1].innerPoints
    : getActiveFaceQuad(targetBox, faceIndex);

  const {
    localMatrix,
    spanLocalX,
    spanLocalY,
    minLocalX,
    maxLocalX,
    minLocalY,
    maxLocalY,
    localPoints,
  } = getFaceLocalTransform(baseQuad, faceIndex);

  const maxOffset = Math.max(0.01, Math.min(spanLocalX, spanLocalY) * 0.46);
  const off = Math.max(0.01, Math.min(offset, maxOffset));

  const midX = (minLocalX + maxLocalX) * 0.5;
  const midY = (minLocalY + maxLocalY) * 0.5;

  const innerPoints: Point3D[] = localPoints.map((lp) => {
    const signX = lp.x >= midX ? 1 : -1;
    const signY = lp.y >= midY ? 1 : -1;
    const innerLocalX = lp.x - signX * off;
    const innerLocalY = lp.y - signY * off;
    // Map local 2D face point back to 3D world space using local transformation matrix
    const worldPt = new THREE.Vector3(innerLocalX, innerLocalY, 0).applyMatrix4(localMatrix);
    return {
      x: Number(worldPt.x.toFixed(4)),
      y: Number(worldPt.y.toFixed(4)),
      z: Number(worldPt.z.toFixed(4)),
    };
  });

  const level = existingFaceInsets.length;

  return {
    id: `inset-${targetBox.id}-${faceIndex}-${level}-${Date.now()}`,
    faceIndex,
    level,
    offset: Number(off.toFixed(2)),
    innerPoints,
    depth: 0,
    createdAt: Date.now(),
  };
}

// Calculate the maximum allowable Inset offset using local-space transformation matrices
export function getMaxFaceInsetOffset(stroke: Stroke, faceIndex: number): number {
  const existingFaceInsets = (stroke.insets || []).filter((i) => i.faceIndex === faceIndex);
  const baseQuad = existingFaceInsets.length > 0
    ? existingFaceInsets[existingFaceInsets.length - 1].innerPoints
    : getActiveFaceQuad(stroke, faceIndex);

  const { spanLocalX, spanLocalY } = getFaceLocalTransform(baseQuad, faceIndex);
  return Math.max(0.02, Number((Math.min(spanLocalX, spanLocalY) * 0.46).toFixed(2)));
}

// Apply or update Inset on a selected box face using local-space transformation matrices
export function applyFaceInset(
  targetBox: Stroke,
  faceIndex: number,
  offset: number = 0.2,
  replaceLast: boolean = false
): { updatedBox: Stroke; inset: FaceInset } {
  const existingInsets = targetBox.insets || [];
  const faceInsets = existingInsets.filter((i) => i.faceIndex === faceIndex);

  if (replaceLast && faceInsets.length > 0) {
    // Replace the latest inset level (used during continuous mouse dragging)
    const oldInset = faceInsets[faceInsets.length - 1];
    const baseInsets = existingInsets.filter((i) => i.id !== oldInset.id);
    const tempBox: Stroke = { ...targetBox, insets: baseInsets };
    const inset = calculateFaceInset(tempBox, faceIndex, offset);
    // Preserve original id and any recess/extrusion attributes during continuous drag
    inset.id = oldInset.id;
    if (oldInset.depth !== undefined) {
      inset.depth = oldInset.depth;
      const norm = getBoxFaceNormal(faceIndex);
      const dep = oldInset.depth;
      inset.recessPoints = inset.innerPoints.map((p) => ({
        x: Number((p.x - norm.x * dep).toFixed(4)),
        y: Number((p.y - norm.y * dep).toFixed(4)),
        z: Number((p.z - norm.z * dep).toFixed(4)),
      }));
    } else if (oldInset.recessPoints) {
      inset.recessPoints = oldInset.recessPoints;
    }
    if (oldInset.extrusions) inset.extrusions = oldInset.extrusions;
    const updatedBox: Stroke = {
      ...targetBox,
      insets: [...baseInsets, inset],
    };
    return { updatedBox, inset };
  }

  // Append as a new nested Inset level!
  const inset = calculateFaceInset(targetBox, faceIndex, offset);
  const updatedBox: Stroke = {
    ...targetBox,
    insets: [...existingInsets, inset],
  };
  return { updatedBox, inset };
}

// Remove the last Inset level from a box face (Undo Inset)
export function removeFaceInset(targetBox: Stroke, faceIndex: number): Stroke {
  const insets = targetBox.insets || [];
  const faceInsets = insets.filter((i) => i.faceIndex === faceIndex);
  if (faceInsets.length === 0) return targetBox;
  const lastInset = faceInsets[faceInsets.length - 1];
  return {
    ...targetBox,
    insets: insets.filter((i) => i.id !== lastInset.id),
  };
}

// Clear all Inset levels from a box face
export function clearAllFaceInsets(targetBox: Stroke, faceIndex: number): Stroke {
  return {
    ...targetBox,
    insets: (targetBox.insets || []).filter((i) => i.faceIndex !== faceIndex),
  };
}

// Extrude an Inset face outward, creating a new connected architectural volume module (Matching video 00:05, 00:15, 00:20)
export function extrudeInsetFace(
  targetBox: Stroke,
  inset: FaceInset,
  distance: number = 1.0
): { newBox: Stroke; updatedTargetBox: Stroke; outerFaceIndex: number } {
  const d = Math.max(0.05, Math.abs(distance));
  const pts = inset.innerPoints;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  pts.forEach((p) => {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  });

  let nMinX = minX, nMaxX = maxX;
  let nMinY = minY, nMaxY = maxY;
  let nMinZ = minZ, nMaxZ = maxZ;

  if (inset.faceIndex === 5) {
    // Right (+X)
    nMinX = maxX;
    nMaxX = maxX + d;
  } else if (inset.faceIndex === 4) {
    // Left (-X)
    nMinX = minX - d;
    nMaxX = minX;
  } else if (inset.faceIndex === 1) {
    // Top (+Y)
    nMinY = maxY;
    nMaxY = maxY + d;
  } else if (inset.faceIndex === 0) {
    // Bottom (-Y)
    nMinY = minY - d;
    nMaxY = minY;
  } else if (inset.faceIndex === 2) {
    // Front (-Z)
    nMinZ = minZ - d;
    nMaxZ = minZ;
  } else if (inset.faceIndex === 3) {
    // Back (+Z)
    nMinZ = maxZ;
    nMaxZ = maxZ + d;
  }

  const width = Number((nMaxX - nMinX).toFixed(2));
  const height = Number((nMaxY - nMinY).toFixed(2));
  const depth = Number((nMaxZ - nMinZ).toFixed(2));
  const center = {
    x: Number(((nMinX + nMaxX) / 2).toFixed(4)),
    y: Number(((nMinY + nMaxY) / 2).toFixed(4)),
    z: Number(((nMinZ + nMaxZ) / 2).toFixed(4)),
  };

  const newPts: Point3D[] = [
    { x: nMinX, y: nMinY, z: nMinZ }, // 0
    { x: nMaxX, y: nMinY, z: nMinZ }, // 1
    { x: nMaxX, y: nMinY, z: nMaxZ }, // 2
    { x: nMinX, y: nMinY, z: nMaxZ }, // 3
    { x: nMinX, y: nMaxY, z: nMinZ }, // 4
    { x: nMaxX, y: nMaxY, z: nMinZ }, // 5
    { x: nMaxX, y: nMaxY, z: nMaxZ }, // 6
    { x: nMinX, y: nMaxY, z: nMaxZ }, // 7
  ];

  const newBox: Stroke = {
    id: `box-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    layerId: targetBox.layerId,
    planeId: targetBox.planeId,
    points: newPts,
    boxData: { width, height, depth, center },
    color: targetBox.color,
    size: targetBox.size,
    opacity: targetBox.opacity,
    tool: 'box',
    createdAt: Date.now(),
  };

  const updatedInsets = (targetBox.insets || []).map((i) =>
    i.id === inset.id ? { ...i, extrudedBoxId: newBox.id } : i
  );
  const updatedTargetBox: Stroke = {
    ...targetBox,
    insets: updatedInsets,
  };

  return { newBox, updatedTargetBox, outerFaceIndex: inset.faceIndex };
}

// Recess / Push an Inset face inward into the volume, creating a sunken terrace/basin/window recess (Matching video 00:29)
export function recessInsetFace(
  targetBox: Stroke,
  inset: FaceInset,
  depth: number = 0.5
): Stroke {
  const d = Math.max(0.05, Math.abs(depth));
  const updatedInsets = (targetBox.insets || []).map((i) =>
    i.id === inset.id ? { ...i, depth: Number(d.toFixed(2)) } : i
  );
  return {
    ...targetBox,
    insets: updatedInsets,
  };
}

// Carve or hollow out an architectural volume from a selected face (خالی کردن حجم / عقب‌نشینی / پاسیو / تراس)
export function carveBoxFace(
  targetBox: Stroke,
  faceIndex: number,
  depth: number,
  carveType: 'recess' | 'courtyard' | 'step_cutout' | 'hollow_shell' = 'recess'
): { updatedStrokes: Stroke[]; newSelectedBoxId: string; newSelectedFaceIndex: number } {
  const pts = getBoxPoints(targetBox);
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  pts.forEach((p) => {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  });

  const d = Math.max(0.1, Math.abs(depth));
  const w = maxX - minX;
  const dep = maxZ - minZ;

  if (carveType === 'recess') {
    // Recess / Loggia / Inset Balcony: Indent the selected face inward into the volume
    const normal = getBoxFaceNormal(faceIndex);
    const subSel: BoxSubSelection = {
      boxId: targetBox.id,
      mode: 'polygon',
      vertexIndices: [],
      edgeIndices: [],
      faceIndices: [faceIndex],
    };
    const delta = {
      x: -normal.x * d,
      y: -normal.y * d,
      z: -normal.z * d,
    };
    const modified = translateBoxSubElements(targetBox, subSel, delta);
    return {
      updatedStrokes: [modified],
      newSelectedBoxId: modified.id,
      newSelectedFaceIndex: faceIndex,
    };
  }

  if (carveType === 'step_cutout') {
    // Subtractive Step / Terraced Cutout:
    // Shrinks the volume in the face direction by d, carving away that section to form a step/terrace
    let nMinX = minX, nMaxX = maxX;
    let nMinY = minY, nMaxY = maxY;
    let nMinZ = minZ, nMaxZ = maxZ;

    if (faceIndex === 5) nMaxX = Math.max(minX + 0.2, maxX - d);
    else if (faceIndex === 4) nMinX = Math.min(maxX - 0.2, minX + d);
    else if (faceIndex === 1) nMaxY = Math.max(minY + 0.2, maxY - d);
    else if (faceIndex === 0) nMinY = Math.min(maxY - 0.2, minY + d);
    else if (faceIndex === 2) nMinZ = Math.min(maxZ - 0.2, minZ + d);
    else if (faceIndex === 3) nMaxZ = Math.max(minZ + 0.2, maxZ - d);

    const newW = Number((nMaxX - nMinX).toFixed(2));
    const newH = Number((nMaxY - nMinY).toFixed(2));
    const newD = Number((nMaxZ - nMinZ).toFixed(2));
    const newC = {
      x: Number(((nMinX + nMaxX) / 2).toFixed(4)),
      y: Number(((nMinY + nMaxY) / 2).toFixed(4)),
      z: Number(((nMinZ + nMaxZ) / 2).toFixed(4)),
    };
    const newPts: Point3D[] = [
      { x: nMinX, y: nMinY, z: nMinZ },
      { x: nMaxX, y: nMinY, z: nMinZ },
      { x: nMaxX, y: nMinY, z: nMaxZ },
      { x: nMinX, y: nMinY, z: nMaxZ },
      { x: nMinX, y: nMaxY, z: nMinZ },
      { x: nMaxX, y: nMaxY, z: nMinZ },
      { x: nMaxX, y: nMaxY, z: nMaxZ },
      { x: nMinX, y: nMaxY, z: nMaxZ },
    ];
    const modified: Stroke = {
      ...targetBox,
      points: newPts,
      boxData: { width: newW, height: newH, depth: newD, center: newC },
    };
    return {
      updatedStrokes: [modified],
      newSelectedBoxId: modified.id,
      newSelectedFaceIndex: faceIndex,
    };
  }

  if (carveType === 'courtyard') {
    // Courtyard / Skywell Atrium:
    // Carves an inner void box in the center of the massing
    const courtInsetX = Math.min(0.8, w * 0.25);
    const courtInsetZ = Math.min(0.8, dep * 0.25);
    const cMinX = minX + courtInsetX;
    const cMaxX = maxX - courtInsetX;
    const cMinZ = minZ + courtInsetZ;
    const cMaxZ = maxZ - courtInsetZ;
    const cMinY = minY + 0.02;
    const cMaxY = maxY + 0.02;

    const voidBoxPts: Point3D[] = [
      { x: cMinX, y: cMinY, z: cMinZ },
      { x: cMaxX, y: cMinY, z: cMinZ },
      { x: cMaxX, y: cMinY, z: cMaxZ },
      { x: cMinX, y: cMinY, z: cMaxZ },
      { x: cMinX, y: cMaxY, z: cMinZ },
      { x: cMaxX, y: cMaxY, z: cMinZ },
      { x: cMaxX, y: cMaxY, z: cMaxZ },
      { x: cMinX, y: cMaxY, z: cMaxZ },
    ];
    const voidBox: Stroke = {
      id: `court-void-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      layerId: targetBox.layerId,
      planeId: targetBox.planeId,
      points: voidBoxPts,
      boxData: {
        width: Number((cMaxX - cMinX).toFixed(2)),
        height: Number((cMaxY - cMinY).toFixed(2)),
        depth: Number((cMaxZ - cMinZ).toFixed(2)),
        center: {
          x: Number(((cMinX + cMaxX) / 2).toFixed(4)),
          y: Number(((cMinY + cMaxY) / 2).toFixed(4)),
          z: Number(((cMinZ + cMaxZ) / 2).toFixed(4)),
        },
      },
      color: '#0284c7', // Sky-blue courtyard atrium opening
      size: Math.max(1, targetBox.size),
      opacity: 0.9,
      tool: 'box',
      createdAt: Date.now(),
    };
    return {
      updatedStrokes: [targetBox, voidBox],
      newSelectedBoxId: voidBox.id,
      newSelectedFaceIndex: 1,
    };
  }

  // Default: recess
  return {
    updatedStrokes: [targetBox],
    newSelectedBoxId: targetBox.id,
    newSelectedFaceIndex: faceIndex,
  };
}

export interface BoxSubHit {
  type: 'vertex' | 'edge' | 'polygon';
  index: number;
  distance: number;
  insetId?: string;
  insetPart?: InsetPartType;
  isInset?: boolean;
}

// Hit-test vertices, edges, or polygon faces of a 3D Box
export function findHitBoxSubElement(
  ndcX: number,
  ndcY: number,
  camera: THREE.Camera,
  stroke: Stroke,
  preferredMode?: SubObjectMode
): BoxSubHit | null {
  const pts = getBoxPoints(stroke);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const ray = raycaster.ray;
  const camPos = camera.position;

  // 1. Check Vertices (all base box vertices + inset rim vertices + inner cavity recess vertices)
  let bestVertex: { index: number; camDist: number } | null = null;
  const allMeshVerts = getAllBoxVertices(stroke);
  for (let i = 0; i < allMeshVerts.length; i++) {
    const mv = allMeshVerts[i];
    const v = new THREE.Vector3(mv.point.x, mv.point.y, mv.point.z);
    const rayDist = ray.distanceToPoint(v);
    const camDist = camPos.distanceTo(v);
    const tolerance = Math.max(0.12, 0.16 + camDist * 0.015);
    if (rayDist < tolerance) {
      if (!bestVertex || camDist < bestVertex.camDist) {
        bestVertex = { index: mv.index, camDist };
      }
    }
  }

  // 2. Check Edges / Segments (all 12 box edges + inset miter + rim + cavity depth & floor edges)
  let bestEdge: { index: number; camDist: number } | null = null;
  const allMeshEdges = getAllBoxEdges(stroke);
  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  for (let i = 0; i < allMeshEdges.length; i++) {
    const me = allMeshEdges[i];
    pA.set(me.pA.x, me.pA.y, me.pA.z);
    pB.set(me.pB.x, me.pB.y, me.pB.z);
    const segDistSq = ray.distanceSqToSegment(pA, pB);
    const midPoint = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);
    const camDist = camPos.distanceTo(midPoint);
    const tolerance = Math.max(0.12, 0.15 + camDist * 0.015);
    if (segDistSq !== undefined && segDistSq < tolerance * tolerance) {
      if (!bestEdge || camDist < bestEdge.camDist) {
        bestEdge = { index: me.index, camDist };
      }
    }
  }

  // 3. Check Polygons (Faces & Inset Sub-Polygons: center recessed floor, 4 cavity side walls, and outer bevel frame)
  let bestFace: { index: number; camDist: number; insetId?: string; insetPart?: InsetPartType; isInset?: boolean } | null = null;
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const v3 = new THREE.Vector3();
  const hitPt = new THREE.Vector3();

  // 3A. First check Inset polygons (cavity floor, 4 cavity walls inside the recess, and 4 outer bevels)
  if (stroke.insets && stroke.insets.length > 0) {
    const parts: InsetPartType[] = [
      'center',
      'cavity_bottom', 'cavity_right', 'cavity_top', 'cavity_left',
      'bottom', 'top', 'left', 'right'
    ];
    for (let k = stroke.insets.length - 1; k >= 0; k--) {
      const ins = stroke.insets[k];
      if (ins.innerPoints && ins.innerPoints.length === 4) {
        for (const part of parts) {
          const quad = getInsetPartQuad(stroke, ins, part);
          v0.set(quad[0].x, quad[0].y, quad[0].z);
          v1.set(quad[1].x, quad[1].y, quad[1].z);
          v2.set(quad[2].x, quad[2].y, quad[2].z);
          v3.set(quad[3].x, quad[3].y, quad[3].z);

          // Check both diagonal triangulations to ensure robust hit-testing of warped/sloped inner walls
          let hit = ray.intersectTriangle(v0, v1, v2, false, hitPt) || ray.intersectTriangle(v0, v2, v1, false, hitPt);
          if (!hit) {
            hit = ray.intersectTriangle(v0, v2, v3, false, hitPt) || ray.intersectTriangle(v0, v3, v2, false, hitPt);
          }
          if (!hit) {
            hit = ray.intersectTriangle(v0, v1, v3, false, hitPt) || ray.intersectTriangle(v0, v3, v1, false, hitPt);
          }
          if (!hit) {
            hit = ray.intersectTriangle(v1, v2, v3, false, hitPt) || ray.intersectTriangle(v1, v3, v2, false, hitPt);
          }

          if (hit) {
            const camDist = camPos.distanceTo(hitPt);
            if (!bestFace || camDist < bestFace.camDist) {
              bestFace = { index: ins.faceIndex, camDist, insetId: ins.id, insetPart: part, isInset: true };
            }
          }
        }
      }
    }
  }

  // 3B. Next check standard and extruded Box faces
  for (let f = 0; f < BOX_FACES.length; f++) {
    // CRITICAL: If face f has been subdivided by an Inset, the undivided flat outer quad NO LONGER EXISTS!
    // Its 5 constituent polygons (recessed inner floor + 4 inner side walls) were already checked in 3A.
    // Skipping face f here ensures the ray can freely enter the hollow cavity and select internal surfaces
    // without being blocked or overwritten by a phantom outer surface covering the recess.
    const faceInsets = (stroke.insets || []).filter((i) => i.faceIndex === f);
    if (faceInsets.length > 0) {
      continue;
    }

    const faceExts = (stroke.extrusions || []).filter((e) => e.faceIndex === f);

    // 1. Check active outermost cap quad
    const capQuad = getActiveFaceQuad(stroke, f);
    v0.set(capQuad[0].x, capQuad[0].y, capQuad[0].z);
    v1.set(capQuad[1].x, capQuad[1].y, capQuad[1].z);
    v2.set(capQuad[2].x, capQuad[2].y, capQuad[2].z);
    v3.set(capQuad[3].x, capQuad[3].y, capQuad[3].z);

    let hit = ray.intersectTriangle(v0, v1, v2, false, hitPt) || ray.intersectTriangle(v0, v2, v1, false, hitPt);
    if (!hit) {
      hit = ray.intersectTriangle(v0, v2, v3, false, hitPt) || ray.intersectTriangle(v0, v3, v2, false, hitPt);
    }

    // 2. If face has extruded segments, also check side walls
    if (!hit && faceExts.length > 0) {
      const faceVerts = BOX_FACES[f];
      let pQuad = [pts[faceVerts[0]], pts[faceVerts[1]], pts[faceVerts[2]], pts[faceVerts[3]]];
      for (const ext of faceExts) {
        const cQuad = ext.capPoints;
        for (let m = 0; m < 4; m++) {
          const next = (m + 1) % 4;
          v0.set(pQuad[m].x, pQuad[m].y, pQuad[m].z);
          v1.set(pQuad[next].x, pQuad[next].y, pQuad[next].z);
          v2.set(cQuad[next].x, cQuad[next].y, cQuad[next].z);
          v3.set(cQuad[m].x, cQuad[m].y, cQuad[m].z);

          hit = ray.intersectTriangle(v0, v1, v2, false, hitPt) || ray.intersectTriangle(v0, v2, v1, false, hitPt);
          if (!hit) {
            hit = ray.intersectTriangle(v0, v2, v3, false, hitPt) || ray.intersectTriangle(v0, v3, v2, false, hitPt);
          }
          if (hit) break;
        }
        if (hit) break;
        pQuad = cQuad;
      }
    }

    if (hit) {
      const camDist = camPos.distanceTo(hitPt);
      if (!bestFace || camDist < bestFace.camDist) {
        bestFace = {
          index: f,
          camDist,
          isInset: false,
        };
      }
    }
  }

  if (preferredMode === 'vertex') {
    return bestVertex ? { type: 'vertex', index: bestVertex.index, distance: bestVertex.camDist } : null;
  }
  if (preferredMode === 'edge') {
    return bestEdge ? { type: 'edge', index: bestEdge.index, distance: bestEdge.camDist } : null;
  }
  if (preferredMode === 'polygon') {
    return bestFace ? {
      type: 'polygon',
      index: bestFace.index,
      distance: bestFace.camDist,
      insetId: bestFace.insetId,
      insetPart: bestFace.insetPart,
      isInset: bestFace.isInset,
    } : null;
  }

  if (bestVertex) return { type: 'vertex', index: bestVertex.index, distance: bestVertex.camDist };
  if (bestEdge) return { type: 'edge', index: bestEdge.index, distance: bestEdge.camDist };
  if (bestFace) {
    return {
      type: 'polygon',
      index: bestFace.index,
      distance: bestFace.camDist,
      insetId: bestFace.insetId,
      insetPart: bestFace.insetPart,
      isInset: bestFace.isInset,
    };
  }

  return null;
}

// Build glowing 3D selection highlights for selected items, with sub-object level support
export function buildSelectionHighlight(
  selectedStrokes: Stroke[],
  boxSubSelection?: BoxSubSelection | null
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'selection-highlights';

  const highlightCyan = new THREE.Color('#38bdf8'); // Radiant Cyan
  const highlightAmber = new THREE.Color('#f59e0b'); // Golden Amber for vertex nodes
  const highlightRed = new THREE.Color('#ef4444');   // Bright Red matching 3ds Max sub-object selection

  selectedStrokes.forEach((stroke) => {
    if (stroke.hidden) return;

    if (stroke.tool === 'box' || stroke.boxData) {
      const pts = getBoxPoints(stroke);
      const isSubObjectTarget = boxSubSelection && boxSubSelection.boxId === stroke.id;
      const subMode = isSubObjectTarget ? boxSubSelection.mode : 'object';

      if (subMode === 'vertex') {
        // Vertex Mode (Matching 3ds Max 00:00 - 00:09)
        // All vertices (8 box corners + 4 inset rim + 4 inner cavity floor) as tactile blue anchor spheres
        const normalSphereGeo = new THREE.SphereGeometry(0.04, 12, 12);
        const normalSphereMat = new THREE.MeshBasicMaterial({
          color: highlightCyan,
          depthTest: false,
          transparent: true,
          opacity: 0.85,
        });

        // Selected vertices with enlarged glowing amber/gold spheres
        const selectedSphereGeo = new THREE.SphereGeometry(0.075, 16, 16);
        const selectedSphereMat = new THREE.MeshBasicMaterial({
          color: highlightAmber,
          depthTest: false,
          transparent: true,
          opacity: 0.95,
        });

        const selectedSet = new Set(boxSubSelection?.vertexIndices ?? []);
        const allMeshVerts = getAllBoxVertices(stroke);

        allMeshVerts.forEach((v) => {
          const isSel = selectedSet.has(v.index);
          const sp = new THREE.Mesh(isSel ? selectedSphereGeo : normalSphereGeo, isSel ? selectedSphereMat : normalSphereMat);
          sp.position.set(v.point.x, v.point.y, v.point.z);
          sp.renderOrder = isSel ? 1002 : 1000;
          group.add(sp);
        });

        // Connect edges with subtle wireframe lines (all 12 box edges + inset & cavity edges)
        const allMeshEdges = getAllBoxEdges(stroke);
        const edgePos: number[] = [];
        allMeshEdges.forEach((e) => {
          edgePos.push(e.pA.x, e.pA.y, e.pA.z, e.pB.x, e.pB.y, e.pB.z);
        });
        const edgeGeo = new THREE.BufferGeometry();
        edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3));
        const edgeMat = new THREE.LineBasicMaterial({
          color: highlightCyan,
          transparent: true,
          opacity: 0.45,
          depthTest: false,
        });
        const edgesObj = new THREE.LineSegments(edgeGeo, edgeMat);
        edgesObj.renderOrder = 999;
        group.add(edgesObj);

      } else if (subMode === 'edge') {
        // Edge / Segment Mode (Matching 3ds Max 00:10 - 00:13)
        // All edges (12 box edges + miter lines + rim edges + vertical cavity depth corners + sunken floor perimeter)
        const allMeshEdges = getAllBoxEdges(stroke);
        const unselectedEdges: number[] = [];
        const selectedEdges: number[] = [];
        const selEdgeSet = new Set(boxSubSelection?.edgeIndices ?? []);

        allMeshEdges.forEach((e) => {
          const targetArr = selEdgeSet.has(e.index) ? selectedEdges : unselectedEdges;
          targetArr.push(e.pA.x, e.pA.y, e.pA.z, e.pB.x, e.pB.y, e.pB.z);
        });

        if (unselectedEdges.length > 0) {
          const unselGeo = new THREE.BufferGeometry();
          unselGeo.setAttribute('position', new THREE.Float32BufferAttribute(unselectedEdges, 3));
          const unselMat = new THREE.LineBasicMaterial({
            color: highlightCyan,
            transparent: true,
            opacity: 0.5,
            depthTest: false,
          });
          const unselLines = new THREE.LineSegments(unselGeo, unselMat);
          unselLines.renderOrder = 999;
          group.add(unselLines);
        }

        // Selected edges highlighted with bold radiant RED line (exactly like 00:10)
        if (selectedEdges.length > 0) {
          const selGeo = new THREE.BufferGeometry();
          selGeo.setAttribute('position', new THREE.Float32BufferAttribute(selectedEdges, 3));
          const selMat = new THREE.LineBasicMaterial({
            color: highlightRed,
            linewidth: 4,
            transparent: true,
            opacity: 1.0,
            depthTest: false,
          });
          const selLines = new THREE.LineSegments(selGeo, selMat);
          selLines.renderOrder = 1002;
          group.add(selLines);

          // Terminal endpoints for selected edges
          const nodeGeo = new THREE.SphereGeometry(0.06, 12, 12);
          const nodeMat = new THREE.MeshBasicMaterial({
            color: highlightRed,
            depthTest: false,
            transparent: true,
            opacity: 0.95,
          });
          allMeshEdges.forEach((e) => {
            if (selEdgeSet.has(e.index)) {
              const spA = new THREE.Mesh(nodeGeo, nodeMat);
              spA.position.set(e.pA.x, e.pA.y, e.pA.z);
              spA.renderOrder = 1003;
              group.add(spA);
              const spB = new THREE.Mesh(nodeGeo, nodeMat);
              spB.position.set(e.pB.x, e.pB.y, e.pB.z);
              spB.renderOrder = 1003;
              group.add(spB);
            }
          });
        }

      } else if (subMode === 'polygon') {
        // Polygon / Face Mode (Matching 3ds Max 00:14 - 00:17)
        // Highlight selected faces or inset parts in radiant semi-transparent RED
        const selFaceSet = new Set(boxSubSelection?.faceIndices ?? []);

        selFaceSet.forEach((fIdx) => {
          const faceVerts = BOX_FACES[fIdx];
          if (!faceVerts) return;

          const faceInsets = (stroke.insets || []).filter((i) => i.faceIndex === fIdx);
          const faceInset = boxSubSelection?.selectedInsetId
            ? faceInsets.find((i) => i.id === boxSubSelection.selectedInsetId) || faceInsets[faceInsets.length - 1]
            : (faceInsets.length > 0 ? faceInsets[faceInsets.length - 1] : null);

          if (faceInset && faceInset.innerPoints && faceInset.innerPoints.length === 4) {
            // Selected face has an Inset: Highlight each active polygon (recess floor, or cavity walls)
            const partsToRender: InsetPartType[] = (boxSubSelection?.selectedParts && boxSubSelection.selectedParts.length > 0)
              ? boxSubSelection.selectedParts
              : [boxSubSelection?.insetPart || 'center'];

            partsToRender.forEach((part) => {
              const polyQuad = getInsetPartQuad(stroke, faceInset, part);
              const ip0 = polyQuad[0];
              const ip1 = polyQuad[1];
              const ip2 = polyQuad[2];
              const ip3 = polyQuad[3];

              const polyPositions = [
                ip0.x, ip0.y, ip0.z,  ip1.x, ip1.y, ip1.z,  ip2.x, ip2.y, ip2.z,
                ip0.x, ip0.y, ip0.z,  ip2.x, ip2.y, ip2.z,  ip3.x, ip3.y, ip3.z,
              ];
              const polyGeo = new THREE.BufferGeometry();
              polyGeo.setAttribute('position', new THREE.Float32BufferAttribute(polyPositions, 3));
              polyGeo.computeVertexNormals();

              const polyMat = new THREE.MeshBasicMaterial({
                color: highlightRed,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide,
                depthTest: false,
              });
              const polyMesh = new THREE.Mesh(polyGeo, polyMat);
              polyMesh.renderOrder = 1001;
              group.add(polyMesh);

              // Glowing outline around the active polygon
              const borderPts = [
                new THREE.Vector3(ip0.x, ip0.y, ip0.z),
                new THREE.Vector3(ip1.x, ip1.y, ip1.z),
                new THREE.Vector3(ip2.x, ip2.y, ip2.z),
                new THREE.Vector3(ip3.x, ip3.y, ip3.z),
                new THREE.Vector3(ip0.x, ip0.y, ip0.z),
              ];
              const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPts);
              const borderMat = new THREE.LineBasicMaterial({
                color: 0xffffff,
                linewidth: 3,
                depthTest: false,
                transparent: true,
                opacity: 0.98,
              });
              const borderLine = new THREE.Line(borderGeo, borderMat);
              borderLine.renderOrder = 1002;
              group.add(borderLine);

              // 4 Corner vertex nodes for the active polygon (Amber spheres)
              const cornerNodeGeo = new THREE.SphereGeometry(0.045, 12, 12);
              const cornerNodeMat = new THREE.MeshBasicMaterial({
                color: highlightAmber,
                depthTest: false,
                transparent: true,
                opacity: 0.95,
              });
              [ip0, ip1, ip2, ip3].forEach((p) => {
                const sp = new THREE.Mesh(cornerNodeGeo, cornerNodeMat);
                sp.position.set(p.x, p.y, p.z);
                sp.renderOrder = 1004;
                group.add(sp);
              });
            });

            // Highlight the corner miter lines in bright cyan if in center mode
            const hasCenter = partsToRender.includes('center');
            if (hasCenter) {
              const rimQuad = faceInset.innerPoints;
              const prevPoints = faceInsets.length > 1
                ? faceInsets[faceInsets.length - 2].innerPoints
                : [pts[faceVerts[0]], pts[faceVerts[1]], pts[faceVerts[2]], pts[faceVerts[3]]];

              const miterPositions: number[] = [];
              for (let m = 0; m < 4; m++) {
                const pA = prevPoints[m];
                const pB = rimQuad[m];
                miterPositions.push(pA.x, pA.y, pA.z, pB.x, pB.y, pB.z);
              }
              const miterGeo = new THREE.BufferGeometry();
              miterGeo.setAttribute('position', new THREE.Float32BufferAttribute(miterPositions, 3));
              const miterMat = new THREE.LineBasicMaterial({
                color: highlightCyan,
                linewidth: 2,
                depthTest: false,
                transparent: true,
                opacity: 0.85,
              });
              const miterLines = new THREE.LineSegments(miterGeo, miterMat);
              miterLines.renderOrder = 1002;
              group.add(miterLines);
            }
          } else {
            // Standard / Extruded Face Selection: use active face quad (respecting 3D extrusions)
            const activeQuad = getActiveFaceQuad(stroke, fIdx);
            const p0 = activeQuad[0];
            const p1 = activeQuad[1];
            const p2 = activeQuad[2];
            const p3 = activeQuad[3];

            // Triangles (0,1,2) and (0,2,3)
            const polyPositions = [
              p0.x, p0.y, p0.z,  p1.x, p1.y, p1.z,  p2.x, p2.y, p2.z,
              p0.x, p0.y, p0.z,  p2.x, p2.y, p2.z,  p3.x, p3.y, p3.z,
            ];
            const polyGeo = new THREE.BufferGeometry();
            polyGeo.setAttribute('position', new THREE.Float32BufferAttribute(polyPositions, 3));
            polyGeo.computeVertexNormals();

            const polyMat = new THREE.MeshBasicMaterial({
              color: highlightRed,
              transparent: true,
              opacity: 0.65,
              side: THREE.DoubleSide,
              depthTest: false,
            });
            const polyMesh = new THREE.Mesh(polyGeo, polyMat);
            polyMesh.renderOrder = 1001;
            group.add(polyMesh);

            // Glowing white border outline around selected polygon
            const borderPts = [
              new THREE.Vector3(p0.x, p0.y, p0.z),
              new THREE.Vector3(p1.x, p1.y, p1.z),
              new THREE.Vector3(p2.x, p2.y, p2.z),
              new THREE.Vector3(p3.x, p3.y, p3.z),
              new THREE.Vector3(p0.x, p0.y, p0.z),
            ];
            const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPts);
            const borderMat = new THREE.LineBasicMaterial({
              color: 0xffffff,
              linewidth: 3,
              depthTest: false,
              transparent: true,
              opacity: 0.95,
            });
            const borderLine = new THREE.Line(borderGeo, borderMat);
            borderLine.renderOrder = 1002;
            group.add(borderLine);

            // 4 tactile corner spheres on active face cap
            const capNodeGeo = new THREE.SphereGeometry(0.045, 12, 12);
            const capNodeMat = new THREE.MeshBasicMaterial({
              color: highlightAmber,
              depthTest: false,
              transparent: true,
              opacity: 0.95,
            });
            [p0, p1, p2, p3].forEach((p) => {
              const sp = new THREE.Mesh(capNodeGeo, capNodeMat);
              sp.position.set(p.x, p.y, p.z);
              sp.renderOrder = 1004;
              group.add(sp);
            });
          }
        });

        // Wireframe for geometry including base edges and segment extrusions
        const edgePos: number[] = [];
        BOX_EDGES.forEach(([iA, iB]) => {
          edgePos.push(pts[iA].x, pts[iA].y, pts[iA].z, pts[iB].x, pts[iB].y, pts[iB].z);
        });

        if (stroke.extrusions && stroke.extrusions.length > 0) {
          for (let f = 0; f < 6; f++) {
            const faceVerts = BOX_FACES[f];
            const fExts = stroke.extrusions.filter((e) => e.faceIndex === f);
            if (fExts.length > 0) {
              let pQuad = [pts[faceVerts[0]], pts[faceVerts[1]], pts[faceVerts[2]], pts[faceVerts[3]]];
              for (const ext of fExts) {
                const cQuad = ext.capPoints;
                for (let m = 0; m < 4; m++) {
                  const next = (m + 1) % 4;
                  edgePos.push(pQuad[m].x, pQuad[m].y, pQuad[m].z, pQuad[next].x, pQuad[next].y, pQuad[next].z);
                  edgePos.push(pQuad[m].x, pQuad[m].y, pQuad[m].z, cQuad[m].x, cQuad[m].y, cQuad[m].z);
                  edgePos.push(cQuad[m].x, cQuad[m].y, cQuad[m].z, cQuad[next].x, cQuad[next].y, cQuad[next].z);
                }
                pQuad = cQuad;
              }
            }
          }
        }

        const edgeGeo = new THREE.BufferGeometry();
        edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3));
        const edgeMat = new THREE.LineBasicMaterial({
          color: highlightCyan,
          transparent: true,
          opacity: 0.45,
          depthTest: false,
        });
        const edgesObj = new THREE.LineSegments(edgeGeo, edgeMat);
        edgesObj.renderOrder = 999;
        group.add(edgesObj);

      } else {
        // Full Object Mode
        const edgePos: number[] = [];
        BOX_EDGES.forEach(([iA, iB]) => {
          edgePos.push(pts[iA].x, pts[iA].y, pts[iA].z, pts[iB].x, pts[iB].y, pts[iB].z);
        });

        if (stroke.extrusions && stroke.extrusions.length > 0) {
          for (let f = 0; f < 6; f++) {
            const faceVerts = BOX_FACES[f];
            const fExts = stroke.extrusions.filter((e) => e.faceIndex === f);
            if (fExts.length > 0) {
              let pQuad = [pts[faceVerts[0]], pts[faceVerts[1]], pts[faceVerts[2]], pts[faceVerts[3]]];
              for (const ext of fExts) {
                const cQuad = ext.capPoints;
                for (let m = 0; m < 4; m++) {
                  const next = (m + 1) % 4;
                  edgePos.push(pQuad[m].x, pQuad[m].y, pQuad[m].z, pQuad[next].x, pQuad[next].y, pQuad[next].z);
                  edgePos.push(pQuad[m].x, pQuad[m].y, pQuad[m].z, cQuad[m].x, cQuad[m].y, cQuad[m].z);
                  edgePos.push(cQuad[m].x, cQuad[m].y, cQuad[m].z, cQuad[next].x, cQuad[next].y, cQuad[next].z);
                }
                pQuad = cQuad;
              }
            }
          }
        }

        const edgesGeo = new THREE.BufferGeometry();
        edgesGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3));
        const lineMat = new THREE.LineBasicMaterial({
          color: highlightCyan,
          linewidth: 3,
          depthTest: false,
          transparent: true,
          opacity: 0.95,
        });
        const wireframe = new THREE.LineSegments(edgesGeo, lineMat);
        wireframe.renderOrder = 999;
        group.add(wireframe);

        // Corner anchor spheres
        const sphereGeo = new THREE.SphereGeometry(0.045, 8, 8);
        const sphereMat = new THREE.MeshBasicMaterial({
          color: highlightAmber,
          depthTest: false,
          transparent: true,
          opacity: 0.95,
        });
        pts.forEach((p) => {
          const sp = new THREE.Mesh(sphereGeo, sphereMat);
          sp.position.set(p.x, p.y, p.z);
          sp.renderOrder = 1000;
          group.add(sp);
        });

        if (stroke.extrusions && stroke.extrusions.length > 0) {
          stroke.extrusions.forEach((ext) => {
            ext.capPoints.forEach((p) => {
              const sp = new THREE.Mesh(sphereGeo, sphereMat);
              sp.position.set(p.x, p.y, p.z);
              sp.renderOrder = 1000;
              group.add(sp);
            });
          });
        }
      }
    } else if (stroke.points && stroke.points.length >= 2) {
      // Highlight for 3D Line/Curve: Glowing line + start/end terminal dots
      const linePoints = stroke.points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
      const lineMat = new THREE.LineBasicMaterial({
        color: highlightCyan,
        linewidth: 3,
        depthTest: false,
        transparent: true,
        opacity: 0.95,
      });
      const highlightLine = new THREE.Line(lineGeo, lineMat);
      highlightLine.renderOrder = 999;
      group.add(highlightLine);

      // Start and end anchor dots
      const startPt = linePoints[0];
      const endPt = linePoints[linePoints.length - 1];
      const dotGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const dotMat = new THREE.MeshBasicMaterial({
        color: highlightAmber,
        depthTest: false,
        transparent: true,
        opacity: 0.95,
      });

      const startMesh = new THREE.Mesh(dotGeo, dotMat);
      startMesh.position.copy(startPt);
      startMesh.renderOrder = 1000;
      group.add(startMesh);

      const endMesh = new THREE.Mesh(dotGeo, dotMat);
      endMesh.position.copy(endPt);
      endMesh.renderOrder = 1000;
      group.add(endMesh);
    }
  });

  return group;
}

// Calculate geometric centroid of selected strokes
export function getSelectionCentroid(selectedStrokes: Stroke[]): Point3D {
  let count = 0;
  let sx = 0;
  let sy = 0;
  let sz = 0;

  selectedStrokes.forEach((stroke) => {
    if (stroke.boxData) {
      sx += stroke.boxData.center.x;
      sy += stroke.boxData.center.y;
      sz += stroke.boxData.center.z;
      count++;
    } else if (stroke.points && stroke.points.length > 0) {
      stroke.points.forEach((p) => {
        sx += p.x;
        sy += p.y;
        sz += p.z;
        count++;
      });
    }
  });

  if (count === 0) return { x: 0, y: 0, z: 0 };
  return { x: sx / count, y: sy / count, z: sz / count };
}

// Translate strokes by delta along X, Y, Z axes
export function translateStrokes(
  strokes: Stroke[],
  strokeIds: string[],
  delta: { x: number; y: number; z: number }
): Stroke[] {
  if (strokeIds.length === 0 || (delta.x === 0 && delta.y === 0 && delta.z === 0)) {
    return strokes;
  }
  const idSet = new Set(strokeIds);
  return strokes.map((s) => {
    if (!idSet.has(s.id)) return s;

    const newPoints = s.points
      ? s.points.map((p) => ({
          x: p.x + delta.x,
          y: p.y + delta.y,
          z: p.z + delta.z,
        }))
      : [];

    const newBoxData = s.boxData
      ? {
          ...s.boxData,
          center: {
            x: s.boxData.center.x + delta.x,
            y: s.boxData.center.y + delta.y,
            z: s.boxData.center.z + delta.z,
          },
        }
      : undefined;

    return {
      ...s,
      points: newPoints,
      boxData: newBoxData,
    };
  });
}

// Build interactive 3D Transform Gizmo with X (Red), Y (Green), Z (Blue) handles and Inset Ring
export function buildTransformGizmo(
  centroid: Point3D,
  hasPolygonMode: boolean = false,
  faceNormal?: Point3D
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'transform-gizmo';
  group.position.set(centroid.x, centroid.y, centroid.z);

  const length = 1.1;
  const shaftRadius = 0.022;
  const coneRadius = 0.07;
  const coneHeight = 0.22;
  const hitRadius = 0.14; // broad hit area for easy grabbing

  // Center Origin Anchor
  const centerGeo = new THREE.SphereGeometry(0.06, 16, 16);
  const centerMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    depthTest: false,
    transparent: true,
    opacity: 0.9,
  });
  const centerMesh = new THREE.Mesh(centerGeo, centerMat);
  centerMesh.name = 'gizmo-handle-center';
  centerMesh.renderOrder = 2000;
  group.add(centerMesh);

  // Inset Ring for Polygon Mode (Direct mouse-based Inset)
  if (hasPolygonMode) {
    const insetGroup = new THREE.Group();
    insetGroup.name = 'gizmo-axis-inset';

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981, // Emerald Green
      depthTest: false,
      transparent: true,
      opacity: 0.95,
    });
    const ringGeo = new THREE.TorusGeometry(0.35, 0.032, 12, 32);
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.name = 'gizmo-mesh-inset';
    ringMesh.renderOrder = 2002;
    insetGroup.add(ringMesh);

    // Hit Torus for easy picking
    const hitTorusGeo = new THREE.TorusGeometry(0.35, 0.14, 8, 24);
    const hitTorusMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitTorusMesh = new THREE.Mesh(hitTorusGeo, hitTorusMat);
    hitTorusMesh.name = 'gizmo-hit-inset';
    insetGroup.add(hitTorusMesh);

    if (faceNormal) {
      const vNorm = new THREE.Vector3(faceNormal.x, faceNormal.y, faceNormal.z).normalize();
      insetGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), vNorm);
    } else {
      insetGroup.rotation.x = Math.PI / 2;
    }

    group.add(insetGroup);
  }

  // Helper to build an axis arrow
  const createAxisArrow = (
    axisName: 'x' | 'y' | 'z',
    colorHex: number
  ) => {
    const axisGroup = new THREE.Group();
    axisGroup.name = `gizmo-axis-${axisName}`;

    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      depthTest: false,
      transparent: true,
      opacity: 0.95,
    });

    // Shaft
    const shaftGeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, length, 8);
    shaftGeo.translate(0, length / 2, 0);
    const shaftMesh = new THREE.Mesh(shaftGeo, mat);
    shaftMesh.name = `gizmo-mesh-${axisName}`;
    shaftMesh.renderOrder = 2000;
    axisGroup.add(shaftMesh);

    // Arrow Cone Tip
    const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 16);
    coneGeo.translate(0, length + coneHeight / 2, 0);
    const coneMesh = new THREE.Mesh(coneGeo, mat);
    coneMesh.name = `gizmo-tip-${axisName}`;
    coneMesh.renderOrder = 2000;
    axisGroup.add(coneMesh);

    // Hit cylinder for easy picking
    const hitGeo = new THREE.CylinderGeometry(hitRadius, hitRadius, length + coneHeight, 8);
    hitGeo.translate(0, (length + coneHeight) / 2, 0);
    const hitMat = new THREE.MeshBasicMaterial({
      visible: false,
    });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.name = `gizmo-hit-${axisName}`;
    axisGroup.add(hitMesh);

    // Rotate group to align with direction (default cylinder is along +Y)
    if (axisName === 'x') {
      axisGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
    } else if (axisName === 'z') {
      axisGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1));
    }

    return axisGroup;
  };

  // X Axis (Red)
  group.add(createAxisArrow('x', 0xef4444));
  // Y Axis (Green)
  group.add(createAxisArrow('y', 0x10b981));
  // Z Axis (Blue)
  group.add(createAxisArrow('z', 0x38bdf8));

  return group;
}

