import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseRecipe, type Recipe } from '@cgawe/schema';
import {
  applyVariant, generatePlacements, generateSplineMesh, isValidMesh, recipeHash,
  resolveInstanceAsset, validateRecipe,
} from '../src/index.js';

const fixture = parseRecipe(JSON.parse(readFileSync(new URL('../../../samples/starter-project/recipe.json', import.meta.url), 'utf8')));

describe('recipe core', () => {
  it('round-trips without changing meaning', () => {
    const roundTripped = parseRecipe(JSON.parse(JSON.stringify(fixture)));
    expect(recipeHash(roundTripped)).toBe(recipeHash(fixture));
  });

  it('uses deterministic placements and changes with a different seed', () => {
    const rule = fixture.placementRules[0]!;
    expect(generatePlacements(fixture, rule)).toEqual(generatePlacements(fixture, rule));
    const changed: Recipe = { ...fixture, generationSeed: fixture.generationSeed + 1 };
    expect(generatePlacements(changed, rule)).not.toEqual(generatePlacements(fixture, rule));
  });

  it.each(['rod', 'road', 'corridor'] as const)('generates valid %s sweep meshes', (sweepType) => {
    const spline = { ...fixture.splineDefinitions[0]!, sweepType };
    expect(isValidMesh(generateSplineMesh(spline))).toBe(true);
  });

  it('applies variants without mutating source material', () => {
    const material = fixture.materialDefinitions.find((item) => item.id === 'mat-clay')!;
    const before = structuredClone(material);
    const part = fixture.assetDefinitions.find((item) => item.id === 'asset-marker')!.parts[1]!;
    const result = applyVariant(material, fixture.variantSets[0], part, 9);
    expect(material).toEqual(before);
    expect(result).not.toEqual(before);
  });

  it('keeps definition and instance overrides separated', () => {
    const recipe = structuredClone(fixture);
    recipe.sceneInstances[0]!.partOverrides = { 'part-top': { materialId: 'mat-clay' } };
    const resolved = resolveInstanceAsset(recipe, recipe.sceneInstances[0]!);
    expect(resolved.parts[0]!.materialId).toBe('mat-clay');
    expect(recipe.assetDefinitions[0]!.parts[0]!.materialId).toBe('mat-walnut');
    expect(resolveInstanceAsset(recipe, { ...recipe.sceneInstances[0]!, partOverrides: {} }).parts[0]!.materialId).toBe('mat-walnut');
  });

  it('detects missing socket references and unknown schema versions', () => {
    const recipe = structuredClone(fixture);
    recipe.socketDefinitions[0]!.roomId = 'room-missing';
    expect(validateRecipe(recipe).some((issue) => issue.code === 'SOCKET_ROOM_REF_MISSING')).toBe(true);
    expect(() => parseRecipe({ ...fixture, schemaVersion: '9.0.0' })).toThrow(/Unsupported schemaVersion/);
  });

  it('rejects malformed nested primitive values through JSON Schema', () => {
    const recipe = structuredClone(fixture);
    const marker = recipe.assetDefinitions.find((asset) => asset.id === 'asset-marker')!;
    const orb = marker.parts.find((part) => part.id === 'part-marker-orb')!;
    if (orb.primitive.type === 'sphere') orb.primitive.radius = -1;
    expect(() => parseRecipe(recipe)).toThrow(/schema validation failed/i);
  });
});
