import type { DimensionKeyframe, MaterialDefinition, SplineDefinition, Vec3 } from '@cgawe/schema';

export type SplineKeyframeChannel = 'radiusKeyframes' | 'widthKeyframes' | 'heightKeyframes';

function cloneSpline(spline: SplineDefinition): SplineDefinition {
  return structuredClone(spline);
}

function assertFinitePoint(point: Vec3): void {
  if (!point.every(Number.isFinite)) throw new Error('Control point coordinates must be finite.');
}

function assertPointIndex(spline: SplineDefinition, index: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= spline.controlPoints.length) throw new Error(`Control point index ${index} is out of range.`);
}

function assertKeyframe(keyframe: DimensionKeyframe): void {
  if (!Number.isFinite(keyframe.t) || keyframe.t < 0 || keyframe.t > 1) throw new Error('Keyframe position must be within 0..1.');
  if (!Number.isFinite(keyframe.value) || keyframe.value <= 0) throw new Error('Keyframe value must be finite and greater than zero.');
}

function sortKeyframes(keyframes: DimensionKeyframe[]): void {
  keyframes.sort((a, b) => a.t - b.t);
}

function assertNoKeyframeConflict(keyframes: DimensionKeyframe[], t: number, ignoredIndex = -1): void {
  if (keyframes.some((frame, index) => index !== ignoredIndex && Math.abs(frame.t - t) < 1e-6)) {
    throw new Error(`A keyframe already exists at t=${t}.`);
  }
}

export function createSplineDefinition(options: {
  id: string;
  name: string;
  controlPoints: Vec3[];
  material: MaterialDefinition;
  seed: number;
}): SplineDefinition {
  if (options.controlPoints.length < 2) throw new Error('A spline requires at least two control points.');
  options.controlPoints.forEach(assertFinitePoint);
  return {
    id: options.id,
    name: options.name,
    controlPoints: structuredClone(options.controlPoints),
    closed: false,
    interpolation: 'catmull-rom',
    sweepType: 'road',
    radiusKeyframes: [{ t: 0, value: 0.25 }, { t: 1, value: 0.25 }],
    widthKeyframes: [{ t: 0, value: 1.2 }, { t: 1, value: 1.2 }],
    heightKeyframes: [{ t: 0, value: 2.4 }, { t: 1, value: 2.4 }],
    resolutionPolicy: {
      minSegments: 12,
      maxSegments: 160,
      segmentsPerUnit: 3,
      curvatureWeight: 10,
      dimensionChangeWeight: 5,
    },
    materialId: options.material.id,
    seed: options.seed,
  };
}

export function appendSplineControlPoint(spline: SplineDefinition, point?: Vec3): SplineDefinition {
  const next = cloneSpline(spline);
  const last = next.controlPoints.at(-1) ?? [0, 0, 0];
  const previous = next.controlPoints.at(-2) ?? [last[0] - 1, last[1], last[2]];
  const appended: Vec3 = point ?? [last[0] + (last[0] - previous[0]), last[1] + (last[1] - previous[1]), last[2] + (last[2] - previous[2])];
  assertFinitePoint(appended);
  next.controlPoints.push([...appended]);
  return next;
}

export function insertSplineControlPoint(spline: SplineDefinition, segmentIndex: number, point?: Vec3): SplineDefinition {
  const next = cloneSpline(spline);
  if (!Number.isInteger(segmentIndex) || segmentIndex < 0 || segmentIndex >= next.controlPoints.length - 1) throw new Error(`Segment index ${segmentIndex} is out of range.`);
  const start = next.controlPoints[segmentIndex]!;
  const end = next.controlPoints[segmentIndex + 1]!;
  const inserted: Vec3 = point ?? [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2];
  assertFinitePoint(inserted);
  next.controlPoints.splice(segmentIndex + 1, 0, [...inserted]);
  return next;
}

export function moveSplineControlPoint(spline: SplineDefinition, index: number, point: Vec3): SplineDefinition {
  assertPointIndex(spline, index);
  assertFinitePoint(point);
  const next = cloneSpline(spline);
  next.controlPoints[index] = [...point];
  return next;
}

export function removeSplineControlPoint(spline: SplineDefinition, index: number): SplineDefinition {
  assertPointIndex(spline, index);
  if (spline.controlPoints.length <= 2) throw new Error('A spline must keep at least two control points.');
  const next = cloneSpline(spline);
  next.controlPoints.splice(index, 1);
  return next;
}

export function reorderSplineControlPoint(spline: SplineDefinition, from: number, to: number): SplineDefinition {
  assertPointIndex(spline, from);
  assertPointIndex(spline, to);
  const next = cloneSpline(spline);
  const [point] = next.controlPoints.splice(from, 1);
  if (point) next.controlPoints.splice(to, 0, point);
  return next;
}

export function addSplineKeyframe(spline: SplineDefinition, channel: SplineKeyframeChannel, keyframe: DimensionKeyframe): SplineDefinition {
  assertKeyframe(keyframe);
  const next = cloneSpline(spline);
  assertNoKeyframeConflict(next[channel], keyframe.t);
  next[channel].push({ ...keyframe });
  sortKeyframes(next[channel]);
  return next;
}

export function updateSplineKeyframe(spline: SplineDefinition, channel: SplineKeyframeChannel, index: number, keyframe: DimensionKeyframe): SplineDefinition {
  assertKeyframe(keyframe);
  if (!Number.isInteger(index) || index < 0 || index >= spline[channel].length) throw new Error(`Keyframe index ${index} is out of range.`);
  const next = cloneSpline(spline);
  assertNoKeyframeConflict(next[channel], keyframe.t, index);
  next[channel][index] = { ...keyframe };
  sortKeyframes(next[channel]);
  return next;
}

export function removeSplineKeyframe(spline: SplineDefinition, channel: SplineKeyframeChannel, index: number): SplineDefinition {
  if (!Number.isInteger(index) || index < 0 || index >= spline[channel].length) throw new Error(`Keyframe index ${index} is out of range.`);
  if (spline[channel].length <= 1) throw new Error('A profile channel must keep at least one keyframe.');
  const next = cloneSpline(spline);
  next[channel].splice(index, 1);
  return next;
}

export function activeSplineChannels(sweepType: SplineDefinition['sweepType']): SplineKeyframeChannel[] {
  if (sweepType === 'rod') return ['radiusKeyframes'];
  if (sweepType === 'road') return ['widthKeyframes'];
  return ['widthKeyframes', 'heightKeyframes'];
}

export function findLargestKeyframeGap(keyframes: DimensionKeyframe[]): number {
  const positions = [0, ...keyframes.map((frame) => frame.t), 1].sort((a, b) => a - b);
  let gapStart = 0; let gapSize = -1;
  for (let index = 1; index < positions.length; index += 1) {
    const start = positions[index - 1] ?? 0; const end = positions[index] ?? 1;
    if (end - start > gapSize) { gapStart = start; gapSize = end - start; }
  }
  return Number((gapStart + gapSize / 2).toFixed(4));
}
