import * as THREE from 'three';
import { Point3D, DrawingPlane, Stroke, SnapSettings } from '../types';
import { getAllBoxVertices, getAllBoxEdges, createThreePlane } from './threeHelpers';

export type SnapTargetType = 'grid' | 'vertex' | 'edge';

export interface SnapResult {
  point: Point3D;
  rawPoint: Point3D;
  type: SnapTargetType;
  screenX: number;
  screenY: number;
  label: string;
  labelFa: string;
  boxId?: string;
  vertexIndex?: number;
  distance2D: number;
}

/**
 * Calculates the nearest reference grid intersection point on the specified 3D drawing plane
 */
export function calculatePlaneGridIntersection(
  rawHit: Point3D,
  plane: DrawingPlane,
  gridSize: number
): Point3D {
  const planeNormal = new THREE.Vector3(plane.normal.x, plane.normal.y, plane.normal.z).normalize();
  const planeUp = new THREE.Vector3(plane.up.x, plane.up.y, plane.up.z).normalize();
  const planeRight = new THREE.Vector3().crossVectors(planeUp, planeNormal).normalize();

  const offset = new THREE.Vector3(
    rawHit.x - plane.origin.x,
    rawHit.y - plane.origin.y,
    rawHit.z - plane.origin.z
  );

  const u = offset.dot(planeRight);
  const v = offset.dot(planeUp);

  const step = Math.max(0.01, gridSize);
  const snappedU = Math.round(u / step) * step;
  const snappedV = Math.round(v / step) * step;

  const snappedVec = new THREE.Vector3(plane.origin.x, plane.origin.y, plane.origin.z)
    .addScaledVector(planeRight, snappedU)
    .addScaledVector(planeUp, snappedV);

  return {
    x: Number(snappedVec.x.toFixed(4)),
    y: Number(snappedVec.y.toFixed(4)),
    z: Number(snappedVec.z.toFixed(4)),
  };
}

/**
 * 3ds Max Style Snap Engine:
 * Intercepts 3D cursor position and determines whether it should align with:
 * 1. Vertex of created volumes/boxes (highest magnetic priority)
 * 2. Edge / Midpoint of created volumes
 * 3. Nearest Grid Intersection points on the active drawing plane
 */
export function evaluate3dSnap(
  clientX: number,
  clientY: number,
  camera: THREE.Camera,
  containerRect: DOMRect,
  rawPlaneHit: Point3D | null,
  activePlane: DrawingPlane,
  strokes: Stroke[],
  settings: SnapSettings
): SnapResult | null {
  if (!settings.enabled) return null;

  const width = containerRect.width;
  const height = containerRect.height;
  if (width === 0 || height === 0) return null;

  const mouseRelX = clientX - containerRect.left;
  const mouseRelY = clientY - containerRect.top;
  const magneticRadius = settings.magneticRadius || 24;

  const visibleBoxes = strokes.filter((s) => (s.tool === 'box' || s.boxData) && !s.hidden);

  // 1. Check Vertex Snap (Vertices of all created 3D volumes/boxes)
  if (settings.volumeVertex && visibleBoxes.length > 0) {
    let bestVertex: {
      point: Point3D;
      boxId: string;
      vertexIndex: number;
      labelEn: string;
      labelFa: string;
      screenX: number;
      screenY: number;
      dist2D: number;
    } | null = null;

    for (let bIdx = 0; bIdx < visibleBoxes.length; bIdx++) {
      const box = visibleBoxes[bIdx];
      const vertices = getAllBoxVertices(box);

      for (const v of vertices) {
        const vec = new THREE.Vector3(v.point.x, v.point.y, v.point.z);
        vec.project(camera);

        // Check if inside camera view frustum
        if (vec.z > -1.0 && vec.z < 1.0) {
          const sx = ((vec.x + 1) / 2) * width;
          const sy = ((-vec.y + 1) / 2) * height;
          const d = Math.hypot(sx - mouseRelX, sy - mouseRelY);

          if (d < magneticRadius && (!bestVertex || d < bestVertex.dist2D)) {
            bestVertex = {
              point: v.point,
              boxId: box.id,
              vertexIndex: v.index,
              labelEn: `Vertex ${v.index + 1} (${v.point.x.toFixed(2)}, ${v.point.y.toFixed(2)}, ${v.point.z.toFixed(2)})`,
              labelFa: `نقطه راس ${v.index + 1} (${v.point.x.toFixed(2)}, ${v.point.y.toFixed(2)}, ${v.point.z.toFixed(2)})`,
              screenX: sx + containerRect.left,
              screenY: sy + containerRect.top,
              dist2D: d,
            };
          }
        }
      }
    }

    if (bestVertex) {
      return {
        point: bestVertex.point,
        rawPoint: rawPlaneHit || bestVertex.point,
        type: 'vertex',
        screenX: bestVertex.screenX,
        screenY: bestVertex.screenY,
        label: bestVertex.labelEn,
        labelFa: bestVertex.labelFa,
        boxId: bestVertex.boxId,
        vertexIndex: bestVertex.vertexIndex,
        distance2D: bestVertex.dist2D,
      };
    }
  }

  // 2. Check Edge & Midpoint Snap (Edges of created 3D volumes/boxes)
  if (settings.volumeEdge && visibleBoxes.length > 0) {
    let bestEdge: {
      point: Point3D;
      boxId: string;
      labelEn: string;
      labelFa: string;
      screenX: number;
      screenY: number;
      dist2D: number;
    } | null = null;

    const edgeRadius = Math.max(12, magneticRadius - 4);

    for (const box of visibleBoxes) {
      const edges = getAllBoxEdges(box);

      for (const e of edges) {
        // Test midpoint of edge
        const mid: Point3D = {
          x: (e.pA.x + e.pB.x) / 2,
          y: (e.pA.y + e.pB.y) / 2,
          z: (e.pA.z + e.pB.z) / 2,
        };

        const vec = new THREE.Vector3(mid.x, mid.y, mid.z);
        vec.project(camera);

        if (vec.z > -1.0 && vec.z < 1.0) {
          const sx = ((vec.x + 1) / 2) * width;
          const sy = ((-vec.y + 1) / 2) * height;
          const d = Math.hypot(sx - mouseRelX, sy - mouseRelY);

          if (d < edgeRadius && (!bestEdge || d < bestEdge.dist2D)) {
            bestEdge = {
              point: mid,
              boxId: box.id,
              labelEn: `Edge Midpoint (${mid.x.toFixed(2)}, ${mid.y.toFixed(2)}, ${mid.z.toFixed(2)})`,
              labelFa: `نقطه میانی لبه (${mid.x.toFixed(2)}, ${mid.y.toFixed(2)}, ${mid.z.toFixed(2)})`,
              screenX: sx + containerRect.left,
              screenY: sy + containerRect.top,
              dist2D: d,
            };
          }
        }
      }
    }

    if (bestEdge) {
      return {
        point: bestEdge.point,
        rawPoint: rawPlaneHit || bestEdge.point,
        type: 'edge',
        screenX: bestEdge.screenX,
        screenY: bestEdge.screenY,
        label: bestEdge.labelEn,
        labelFa: bestEdge.labelFa,
        boxId: bestEdge.boxId,
        distance2D: bestEdge.dist2D,
      };
    }
  }

  // 3. Grid Intersection Snap (Align cursor to reference grid intersections on active plane)
  if (settings.gridIntersection && rawPlaneHit) {
    const gridPt = calculatePlaneGridIntersection(rawPlaneHit, activePlane, settings.gridSize);

    const vec = new THREE.Vector3(gridPt.x, gridPt.y, gridPt.z);
    vec.project(camera);

    let screenX = clientX;
    let screenY = clientY;
    if (vec.z > -1.0 && vec.z < 1.0) {
      screenX = ((vec.x + 1) / 2) * width + containerRect.left;
      screenY = ((-vec.y + 1) / 2) * height + containerRect.top;
    }

    const dist = Math.hypot(screenX - clientX, screenY - clientY);

    return {
      point: gridPt,
      rawPoint: rawPlaneHit,
      type: 'grid',
      screenX,
      screenY,
      label: `Grid [${gridPt.x.toFixed(2)}, ${gridPt.y.toFixed(2)}, ${gridPt.z.toFixed(2)}]`,
      labelFa: `تقاطع گرید [${gridPt.x.toFixed(2)}, ${gridPt.y.toFixed(2)}, ${gridPt.z.toFixed(2)}]`,
      distance2D: dist,
    };
  }

  return null;
}
