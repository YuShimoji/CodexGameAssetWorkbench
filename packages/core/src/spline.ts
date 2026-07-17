import type { DimensionKeyframe, SplineDefinition, Vec3 } from '@cgawe/schema';
import { recalculateNormals, vec, type MeshData } from './mesh.js';

export interface SplineFrame {
  t: number;
  position: Vec3;
  tangent: Vec3;
  normal: Vec3;
  binormal: Vec3;
}

function pointAt(points: Vec3[], t: number, interpolation: SplineDefinition['interpolation'], closed: boolean): Vec3 {
  if (points.length === 0) return [0, 0, 0];
  if (points.length === 1) return [...points[0]!] as Vec3;
  const segments = closed ? points.length : points.length - 1;
  const scaled = Math.min(t, 0.999999) * segments;
  const segment = Math.floor(scaled);
  const localT = scaled - segment;
  const index = (value: number): number => closed ? ((value % points.length) + points.length) % points.length : Math.max(0, Math.min(points.length - 1, value));
  const p1 = points[index(segment)] ?? [0, 0, 0];
  const p2 = points[index(segment + 1)] ?? p1;
  if (interpolation === 'linear') return vec.lerp(p1, p2, localT);
  const p0 = points[index(segment - 1)] ?? p1;
  const p3 = points[index(segment + 2)] ?? p2;
  const t2 = localT * localT; const t3 = t2 * localT;
  return [0, 1, 2].map((axis) => 0.5 * (
    2 * (p1[axis] ?? 0)
    + (-(p0[axis] ?? 0) + (p2[axis] ?? 0)) * localT
    + (2 * (p0[axis] ?? 0) - 5 * (p1[axis] ?? 0) + 4 * (p2[axis] ?? 0) - (p3[axis] ?? 0)) * t2
    + (-(p0[axis] ?? 0) + 3 * (p1[axis] ?? 0) - 3 * (p2[axis] ?? 0) + (p3[axis] ?? 0)) * t3
  )) as Vec3;
}

export function valueAt(keyframes: DimensionKeyframe[], t: number, fallback: number): number {
  if (keyframes.length === 0) return fallback;
  const sorted = [...keyframes].sort((a, b) => a.t - b.t);
  if (t <= (sorted[0]?.t ?? 0)) return sorted[0]?.value ?? fallback;
  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1]; const next = sorted[i];
    if (previous && next && t <= next.t) {
      const span = next.t - previous.t || 1;
      return previous.value + (next.value - previous.value) * ((t - previous.t) / span);
    }
  }
  return sorted.at(-1)?.value ?? fallback;
}

export function estimateSplineSegments(spline: SplineDefinition): number {
  const samples = Array.from({ length: 25 }, (_, index) => pointAt(spline.controlPoints, index / 24, spline.interpolation, spline.closed));
  let length = 0; let curvature = 0;
  for (let i = 1; i < samples.length; i += 1) length += vec.length(vec.sub(samples[i] ?? [0,0,0], samples[i - 1] ?? [0,0,0]));
  for (let i = 2; i < samples.length; i += 1) {
    const a = vec.normalize(vec.sub(samples[i - 1] ?? [0,0,0], samples[i - 2] ?? [0,0,0]));
    const b = vec.normalize(vec.sub(samples[i] ?? [0,0,0], samples[i - 1] ?? [0,0,0]));
    curvature += Math.acos(Math.max(-1, Math.min(1, vec.dot(a, b))));
  }
  const dimensionFrames = [...spline.radiusKeyframes, ...spline.widthKeyframes, ...spline.heightKeyframes];
  const dimensionChange = dimensionFrames.reduce((sum, frame, index, source) => index === 0 ? sum : sum + Math.abs(frame.value - (source[index - 1]?.value ?? frame.value)), 0);
  const requested = Math.ceil(length * spline.resolutionPolicy.segmentsPerUnit + curvature * spline.resolutionPolicy.curvatureWeight + dimensionChange * spline.resolutionPolicy.dimensionChangeWeight);
  return Math.max(spline.resolutionPolicy.minSegments, Math.min(spline.resolutionPolicy.maxSegments, requested));
}

export function sampleSpline(spline: SplineDefinition): SplineFrame[] {
  const segments = estimateSplineSegments(spline);
  const count = spline.closed ? segments : segments + 1;
  const positions = Array.from({ length: count }, (_, index) => pointAt(spline.controlPoints, index / segments, spline.interpolation, spline.closed));
  const frames: SplineFrame[] = [];
  let previousNormal: Vec3 | undefined;
  for (let i = 0; i < positions.length; i += 1) {
    const previous = positions[Math.max(0, i - 1)] ?? positions[i] ?? [0,0,0];
    const next = positions[Math.min(positions.length - 1, i + 1)] ?? positions[i] ?? [0,0,0];
    const tangent = vec.normalize(vec.sub(next, previous));
    let normal: Vec3;
    if (!previousNormal) {
      const reference: Vec3 = Math.abs(vec.dot(tangent, [0, 1, 0])) > 0.92 ? [1, 0, 0] : [0, 1, 0];
      normal = vec.normalize(vec.cross(reference, tangent));
    } else {
      const projected = vec.sub(previousNormal, vec.scale(tangent, vec.dot(previousNormal, tangent)));
      normal = vec.length(projected) < 1e-6 ? vec.normalize(vec.cross([1, 0, 0], tangent)) : vec.normalize(projected);
      if (vec.dot(normal, previousNormal) < 0) normal = vec.scale(normal, -1);
    }
    const binormal = vec.normalize(vec.cross(tangent, normal));
    frames.push({ t: i / Math.max(1, count - 1), position: positions[i] ?? [0,0,0], tangent, normal, binormal });
    previousNormal = normal;
  }
  return frames;
}

function addPoint(positions: number[], center: Vec3, normal: Vec3, binormal: Vec3, x: number, y: number): void {
  const point = vec.add(center, vec.add(vec.scale(normal, x), vec.scale(binormal, y)));
  positions.push(...point);
}

export function generateSplineMesh(spline: SplineDefinition): MeshData {
  const frames = sampleSpline(spline);
  const positions: number[] = [];
  const indices: number[] = [];
  if (spline.sweepType === 'rod') {
    const sides = 10;
    for (const frame of frames) {
      const radius = valueAt(spline.radiusKeyframes, frame.t, 0.25);
      for (let side = 0; side < sides; side += 1) {
        const angle = (side / sides) * Math.PI * 2;
        addPoint(positions, frame.position, frame.normal, frame.binormal, Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
    }
    for (let ring = 0; ring < frames.length - 1; ring += 1) {
      for (let side = 0; side < sides; side += 1) {
        const nextSide = (side + 1) % sides;
        const a = ring * sides + side; const b = ring * sides + nextSide;
        const c = (ring + 1) * sides + side; const d = (ring + 1) * sides + nextSide;
        indices.push(a, c, b, b, c, d);
      }
    }
  } else if (spline.sweepType === 'road') {
    for (const frame of frames) {
      const halfWidth = valueAt(spline.widthKeyframes, frame.t, 1) / 2;
      addPoint(positions, frame.position, frame.normal, frame.binormal, -halfWidth, 0);
      addPoint(positions, frame.position, frame.normal, frame.binormal, halfWidth, 0);
    }
    for (let ring = 0; ring < frames.length - 1; ring += 1) {
      const a = ring * 2; const b = a + 1; const c = a + 2; const d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
  } else {
    for (const frame of frames) {
      const halfWidth = valueAt(spline.widthKeyframes, frame.t, 1) / 2;
      const height = valueAt(spline.heightKeyframes, frame.t, 2.4);
      addPoint(positions, frame.position, frame.normal, frame.binormal, -halfWidth, 0);
      addPoint(positions, frame.position, frame.normal, frame.binormal, halfWidth, 0);
      addPoint(positions, frame.position, frame.normal, frame.binormal, halfWidth, height);
      addPoint(positions, frame.position, frame.normal, frame.binormal, -halfWidth, height);
    }
    for (let ring = 0; ring < frames.length - 1; ring += 1) {
      const current = ring * 4; const next = (ring + 1) * 4;
      for (const [a, b] of [[0,1], [1,2], [2,3], [3,0]] as Array<[number, number]>) {
        indices.push(current + a, next + a, current + b, current + b, next + a, next + b);
      }
    }
  }
  return { id: spline.id, materialId: spline.materialId, positions, indices, normals: recalculateNormals(positions, indices) };
}
