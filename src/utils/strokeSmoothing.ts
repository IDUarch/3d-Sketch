import * as THREE from 'three';
import { Point3D } from '../types';

interface SmoothingOptions {
  subdivisionFactor?: number;
  minDistance?: number;
  tension?: number;
  curveType?: 'centripetal' | 'chordal' | 'catmullrom';
}

/**
 * Smooths 3D stroke points using centripetal Catmull-Rom interpolation.
 * Centripetal parameterization prevents unwanted cusps and self-intersections
 * at sharp angles, producing fluid, architectural curves.
 */
export function smoothStrokePoints(
  points: Point3D[],
  options: SmoothingOptions = {}
): Point3D[] {
  if (!points || points.length < 3) {
    return points ? [...points] : [];
  }

  const minDistance = options.minDistance ?? 0.008;
  const subdivisionFactor = options.subdivisionFactor ?? 3;
  const curveType = options.curveType ?? 'centripetal';
  const tension = options.tension ?? 0.5;

  // 1. Filter out redundant consecutive jitter points
  const vectors: THREE.Vector3[] = [];
  const first = points[0];
  vectors.push(new THREE.Vector3(first.x, first.y, first.z));

  let totalPolylineLength = 0;

  for (let i = 1; i < points.length; i++) {
    const pt = points[i];
    const curr = new THREE.Vector3(pt.x, pt.y, pt.z);
    const prev = vectors[vectors.length - 1];
    const dist = prev.distanceTo(curr);

    // Keep point if distance exceeds minimal jitter threshold, or if it's the last point
    if (dist >= minDistance || i === points.length - 1) {
      totalPolylineLength += dist;
      vectors.push(curr);
    }
  }

  if (vectors.length < 3) {
    return points.map((p) => ({ ...p }));
  }

  try {
    const curve = new THREE.CatmullRomCurve3(vectors, false, curveType, tension);

    // Adaptive sample count based on curve length and initial node count
    // A point every ~0.025 world units gives silky smooth lines without over-tessellation
    const calculatedPoints = Math.round(totalPolylineLength / 0.025);
    const targetCount = Math.min(
      320,
      Math.max(vectors.length * subdivisionFactor, Math.max(18, calculatedPoints))
    );

    const sampled = curve.getPoints(targetCount);

    const result: Point3D[] = sampled.map((v) => ({
      x: Number(v.x.toFixed(5)),
      y: Number(v.y.toFixed(5)),
      z: Number(v.z.toFixed(5)),
    }));

    // Pin absolute original endpoints
    if (result.length > 0) {
      result[0] = { ...points[0] };
      result[result.length - 1] = { ...points[points.length - 1] };
    }

    return result;
  } catch {
    return points.map((p) => ({ ...p }));
  }
}

/**
 * Lightweight real-time smoother for live stroke preview while dragging stylus/mouse.
 * Applies cubic Bézier / Catmull-Rom smoothing to the most recent segment for zero-latency feedback.
 */
export function smoothLiveStroke(points: Point3D[]): Point3D[] {
  if (points.length < 4) return points;
  return smoothStrokePoints(points, { subdivisionFactor: 2, minDistance: 0.01 });
}
