import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseRecipe } from '@cgawe/schema';
import {
  addSplineKeyframe, appendSplineControlPoint, estimateSplineSegments, generateSplineMesh,
  insertSplineControlPoint, isValidMesh, moveSplineControlPoint, removeSplineControlPoint,
  recipeHash, removeSplineKeyframe, reorderSplineControlPoint, updateSplineKeyframe, validateRecipe,
} from '../src/index.js';

const fixture = parseRecipe(JSON.parse(readFileSync(new URL('../../../samples/starter-project/recipe.json', import.meta.url), 'utf8')));
const spline = fixture.splineDefinitions[0]!;

describe('spline editing operations', () => {
  it('preserves the schema 0.1.0 golden semantic hash', () => {
    const golden = parseRecipe(JSON.parse(readFileSync(new URL('../../schema/test/fixtures/recipe-0.1.0.golden.json', import.meta.url), 'utf8')));
    expect(recipeHash(golden)).toBe('fnv1a-3a095d6f');
  });

  it('adds, inserts, moves, reorders and removes control points without mutating the source', () => {
    const appended = appendSplineControlPoint(spline, [6, 0.5, 3]);
    const inserted = insertSplineControlPoint(appended, 1);
    const moved = moveSplineControlPoint(inserted, 2, [0.25, 1.5, 1.75]);
    const reordered = reorderSplineControlPoint(moved, 2, 3);
    const removed = removeSplineControlPoint(reordered, 3);
    expect(spline.controlPoints).toHaveLength(5);
    expect(appended.controlPoints).toHaveLength(6);
    expect(inserted.controlPoints).toHaveLength(7);
    expect(removed.controlPoints).toHaveLength(6);
    expect(isValidMesh(generateSplineMesh(removed))).toBe(true);
  });

  it('prevents deleting below the minimum control point count', () => {
    const twoPoint = { ...spline, controlPoints: spline.controlPoints.slice(0, 2) };
    expect(() => removeSplineControlPoint(twoPoint, 0)).toThrow(/at least two/);
  });

  it('adds, updates and removes sorted profile keyframes', () => {
    const added = addSplineKeyframe(spline, 'widthKeyframes', { t: 0.25, value: 2.1 });
    const addedIndex = added.widthKeyframes.findIndex((frame) => frame.t === 0.25);
    const updated = updateSplineKeyframe(added, 'widthKeyframes', addedIndex, { t: 0.3, value: 2.3 });
    const updatedIndex = updated.widthKeyframes.findIndex((frame) => frame.t === 0.3);
    const removed = removeSplineKeyframe(updated, 'widthKeyframes', updatedIndex);
    expect(added.widthKeyframes.map((frame) => frame.t)).toEqual([...added.widthKeyframes.map((frame) => frame.t)].sort((a, b) => a - b));
    expect(updated.widthKeyframes.some((frame) => frame.value === 2.3)).toBe(true);
    expect(removed.widthKeyframes).toHaveLength(spline.widthKeyframes.length);
    expect(spline.widthKeyframes.some((frame) => frame.t === 0.25)).toBe(false);
  });

  it('rejects conflicting or invalid keyframes', () => {
    expect(() => addSplineKeyframe(spline, 'widthKeyframes', { t: 0, value: 1 })).toThrow(/already exists/);
    expect(() => addSplineKeyframe(spline, 'widthKeyframes', { t: 1.2, value: 1 })).toThrow(/0\.\.1/);
    expect(() => addSplineKeyframe(spline, 'widthKeyframes', { t: 0.4, value: 0 })).toThrow(/greater than zero/);
  });

  it('keeps adaptive sampling deterministic and responds to curvature/profile changes', () => {
    expect(estimateSplineSegments(spline)).toBe(estimateSplineSegments(structuredClone(spline)));
    expect(generateSplineMesh(spline)).toEqual(generateSplineMesh(structuredClone(spline)));
    const changed = structuredClone(spline);
    changed.controlPoints[2]![1] += 4;
    changed.widthKeyframes.splice(1, 0, { t: 0.45, value: 4 });
    expect(estimateSplineSegments(changed)).toBeGreaterThan(estimateSplineSegments(spline));
  });

  it('reports duplicate points and conflicting keyframes', () => {
    const recipe = structuredClone(fixture);
    recipe.splineDefinitions[0]!.controlPoints[1] = [...recipe.splineDefinitions[0]!.controlPoints[0]!];
    recipe.splineDefinitions[0]!.widthKeyframes.push({ ...recipe.splineDefinitions[0]!.widthKeyframes[0]! });
    const issues = validateRecipe(recipe);
    expect(issues.some((issue) => issue.code === 'SPLINE_DEGENERATE_SEGMENT')).toBe(true);
    expect(issues.some((issue) => issue.code === 'SPLINE_KEYFRAME_POSITION_CONFLICT')).toBe(true);
  });
});
