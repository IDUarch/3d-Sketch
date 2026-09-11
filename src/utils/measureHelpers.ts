import * as THREE from 'three';
import { Point3D, Stroke, DrawingPlane, ActiveMeasurement, SnapSettings } from '../types';
import { getAllBoxVertices, getAllBoxEdges } from './threeHelpers';
import { calculatePlaneGridIntersection } from './snapEngine';

export interface SnapResult {
  point: Point3D;
  type: 'vertex' | 'edge' | 'face' | 'plane';
  screenX: number;
  screenY: number;
}

/**
 * Finds magnetic snap point in 3D scene (box vertices, edge midpoints, face surface, or drawing plane)
 */
export function findMeasurementSnapPoint(
  clientX: number,
  clientY: number,
  camera: THREE.Camera,
  containerRect: DOMRect,
  strokes: Stroke[],
  activePlane: DrawingPlane,
  raycastBoxes?: THREE.Object3D[],
  snapSettings?: SnapSettings
): SnapResult | null {
  const width = containerRect.width;
  const height = containerRect.height;
  if (width === 0 || height === 0) return null;

  const mouseRelX = clientX - containerRect.left;
  const mouseRelY = clientY - containerRect.top;

  let bestVertexSnap: { point: Point3D; dist2D: number; screenX: number; screenY: number; type: 'vertex' | 'edge' } | null = null;
  const snapThreshold = 22; // pixels

  // 1. Check all box vertices and edge midpoints
  const visibleBoxes = strokes.filter((s) => (s.tool === 'box' || s.boxData) && !s.hidden);

  for (const box of visibleBoxes) {
    const vertices = getAllBoxVertices(box);
    if (!vertices || vertices.length === 0) continue;

    // Check corners
    for (const v of vertices) {
      const pt = v.point;
      const vec = new THREE.Vector3(pt.x, pt.y, pt.z);
      vec.project(camera);

      // Must be in front of near clipping plane
      if (vec.z < 1.0 && vec.z > -1.0) {
        const sx = ((vec.x + 1) / 2) * width;
        const sy = ((-vec.y + 1) / 2) * height;
        const d = Math.hypot(sx - mouseRelX, sy - mouseRelY);

        if (d < snapThreshold && (!bestVertexSnap || d < bestVertexSnap.dist2D)) {
          bestVertexSnap = {
            point: { x: Number(pt.x.toFixed(3)), y: Number(pt.y.toFixed(3)), z: Number(pt.z.toFixed(3)) },
            dist2D: d,
            screenX: sx + containerRect.left,
            screenY: sy + containerRect.top,
            type: 'vertex',
          };
        }
      }
    }

    // Check edge midpoints
    const edges = getAllBoxEdges(box);
    for (const edge of edges) {
      const mid: Point3D = {
        x: (edge.pA.x + edge.pB.x) / 2,
        y: (edge.pA.y + edge.pB.y) / 2,
        z: (edge.pA.z + edge.pB.z) / 2,
      };

      const vec = new THREE.Vector3(mid.x, mid.y, mid.z);
      vec.project(camera);

      if (vec.z < 1.0 && vec.z > -1.0) {
        const sx = ((vec.x + 1) / 2) * width;
        const sy = ((-vec.y + 1) / 2) * height;
        const d = Math.hypot(sx - mouseRelX, sy - mouseRelY);

        if (d < snapThreshold - 4 && (!bestVertexSnap || d < bestVertexSnap.dist2D)) {
          bestVertexSnap = {
            point: { x: Number(mid.x.toFixed(3)), y: Number(mid.y.toFixed(3)), z: Number(mid.z.toFixed(3)) },
            dist2D: d,
            screenX: sx + containerRect.left,
            screenY: sy + containerRect.top,
            type: 'edge',
          };
        }
      }
    }
  }

  if (bestVertexSnap) {
    return {
      point: bestVertexSnap.point,
      type: bestVertexSnap.type,
      screenX: bestVertexSnap.screenX,
      screenY: bestVertexSnap.screenY,
    };
  }

  // 2. Raycast with box meshes if provided
  const ndcX = (mouseRelX / width) * 2 - 1;
  const ndcY = -(mouseRelY / height) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

  if (raycastBoxes && raycastBoxes.length > 0) {
    const hits = raycaster.intersectObjects(raycastBoxes, true);
    if (hits.length > 0) {
      const hit = hits[0];
      return {
        point: {
          x: Number(hit.point.x.toFixed(3)),
          y: Number(hit.point.y.toFixed(3)),
          z: Number(hit.point.z.toFixed(3)),
        },
        type: 'face',
        screenX: clientX,
        screenY: clientY,
      };
    }
  }

  // 3. Raycast with drawing plane
  const planeNormal = new THREE.Vector3(activePlane.normal.x, activePlane.normal.y, activePlane.normal.z);
  const threePlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
    planeNormal,
    new THREE.Vector3(activePlane.origin.x, activePlane.origin.y, activePlane.origin.z)
  );

  const planeHit = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(threePlane, planeHit)) {
    let finalPt: Point3D = {
      x: Number(planeHit.x.toFixed(3)),
      y: Number(planeHit.y.toFixed(3)),
      z: Number(planeHit.z.toFixed(3)),
    };

    if (snapSettings?.enabled && snapSettings.gridIntersection) {
      finalPt = calculatePlaneGridIntersection(finalPt, activePlane, snapSettings.gridSize);
    }

    return {
      point: finalPt,
      type: 'plane',
      screenX: clientX,
      screenY: clientY,
    };
  }

  return null;
}

/**
 * Formats a measurement distance into specified unit string
 */
export function formatMeasurement(distanceMeters: number, unit: 'm' | 'cm' | 'ft' = 'm'): string {
  if (unit === 'cm') {
    return `${(distanceMeters * 100).toFixed(1)} cm`;
  }
  if (unit === 'ft') {
    const totalInches = distanceMeters * 39.3701;
    const feet = Math.floor(totalInches / 12);
    const inches = (totalInches % 12).toFixed(1);
    return `${feet}' ${inches}" (${(distanceMeters * 3.28084).toFixed(2)} ft)`;
  }
  return `${distanceMeters.toFixed(2)} m`;
}

/**
 * Builds 3D dimension line, endpoints markers, and ticks for Three.js
 */
export function buildMeasurementGroup(measurement: ActiveMeasurement): THREE.Group {
  const group = new THREE.Group();
  group.name = 'dimension-measurement-visual';

  const pA = new THREE.Vector3(measurement.start.x, measurement.start.y, measurement.start.z);
  const pB = new THREE.Vector3(measurement.end.x, measurement.end.y, measurement.end.z);

  // 1. Point A sphere (Start) - Cyan glow
  const sphereGeoA = new THREE.SphereGeometry(0.045, 16, 16);
  const sphereMatA = new THREE.MeshBasicMaterial({ color: 0x06b6d4, depthTest: false });
  const sphereMeshA = new THREE.Mesh(sphereGeoA, sphereMatA);
  sphereMeshA.position.copy(pA);
  sphereMeshA.renderOrder = 999;
  group.add(sphereMeshA);

  // 2. Point B sphere (End) - Emerald glow
  const sphereGeoB = new THREE.SphereGeometry(0.045, 16, 16);
  const sphereMatB = new THREE.MeshBasicMaterial({ color: 0x10b981, depthTest: false });
  const sphereMeshB = new THREE.Mesh(sphereGeoB, sphereMatB);
  sphereMeshB.position.copy(pB);
  sphereMeshB.renderOrder = 999;
  group.add(sphereMeshB);

  // 3. Main Dimension Line (Connecting A to B)
  const lineGeo = new THREE.BufferGeometry().setFromPoints([pA, pB]);
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    linewidth: 3,
    depthTest: false,
  });
  const line = new THREE.Line(lineGeo, lineMat);
  line.renderOrder = 998;
  group.add(line);

  // 4. Perpendicular Ticks at Endpoints
  const dir = new THREE.Vector3().subVectors(pB, pA);
  const len = dir.length();
  if (len > 0.05) {
    dir.normalize();
    // Choose perpendicular vector
    const up = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const perp = new THREE.Vector3().crossVectors(dir, up).normalize().multiplyScalar(0.08);

    // Tick A
    const tickGeoA = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3().subVectors(pA, perp),
      new THREE.Vector3().addVectors(pA, perp),
    ]);
    const tickMatA = new THREE.LineBasicMaterial({ color: 0x06b6d4, depthTest: false });
    const tickA = new THREE.Line(tickGeoA, tickMatA);
    tickA.renderOrder = 999;
    group.add(tickA);

    // Tick B
    const tickGeoB = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3().subVectors(pB, perp),
      new THREE.Vector3().addVectors(pB, perp),
    ]);
    const tickMatB = new THREE.LineBasicMaterial({ color: 0x10b981, depthTest: false });
    const tickB = new THREE.Line(tickGeoB, tickMatB);
    tickB.renderOrder = 999;
    group.add(tickB);
  }

  return group;
}
