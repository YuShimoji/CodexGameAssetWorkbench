import type {
  AssetDefinition, AssetPart, MaterialDefinition, Recipe, RecipeInspection, SceneInstance,
  ValidationIssue, VariantSet,
} from '@cgawe/schema';
import { validateRecipeShape } from '@cgawe/schema';
import { getMeshStats, isValidMesh, type MeshData, type MeshStats } from './mesh.js';
import { createAssetMeshes } from './primitives.js';
import { SeededRng } from './rng.js';
import { generateSplineMesh, sampleSpline } from './spline.js';

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function recipeHash(recipe: Recipe): string {
  const text = stableStringify(recipe);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function inspectRecipe(recipe: Recipe): RecipeInspection {
  return {
    projectId: recipe.projectId,
    schemaVersion: recipe.schemaVersion,
    seed: recipe.generationSeed,
    assetCount: recipe.assetDefinitions.length,
    partCount: recipe.assetDefinitions.reduce((sum, asset) => sum + asset.parts.length, 0),
    materialCount: recipe.materialDefinitions.length,
    splineCount: recipe.splineDefinitions.length,
    roomCount: recipe.roomDefinitions.length,
    socketCount: recipe.socketDefinitions.length,
    instanceCount: recipe.sceneInstances.length,
    placementRuleCount: recipe.placementRules.length,
  };
}

function uniqueIdIssues(recipe: Recipe): ValidationIssue[] {
  const groups: Array<[string, Array<{ id: string }>]> = [
    ['assetDefinitions', recipe.assetDefinitions], ['materialDefinitions', recipe.materialDefinitions],
    ['variantSets', recipe.variantSets], ['sceneInstances', recipe.sceneInstances],
    ['splineDefinitions', recipe.splineDefinitions], ['roomDefinitions', recipe.roomDefinitions],
    ['socketDefinitions', recipe.socketDefinitions], ['placementRules', recipe.placementRules],
  ];
  const issues: ValidationIssue[] = [];
  for (const [path, values] of groups) {
    const seen = new Set<string>();
    values.forEach((value, index) => {
      if (seen.has(value.id)) issues.push({ severity: 'error', code: 'DUPLICATE_STABLE_ID', assetId: null, recipePath: `/${path}/${index}/id`, message: `Stable ID ${value.id} is duplicated.` });
      seen.add(value.id);
    });
  }
  return issues;
}

export function validateRecipe(recipe: Recipe): ValidationIssue[] {
  const shapeIssues = validateRecipeShape(recipe);
  if (shapeIssues.length) return shapeIssues;
  const issues = uniqueIdIssues(recipe);
  const materials = new Set(recipe.materialDefinitions.map((item) => item.id));
  const assets = new Set(recipe.assetDefinitions.map((item) => item.id));
  const splines = new Set(recipe.splineDefinitions.map((item) => item.id));
  const rooms = new Set(recipe.roomDefinitions.map((item) => item.id));
  const variants = new Set(recipe.variantSets.map((item) => item.id));
  recipe.assetDefinitions.forEach((asset, assetIndex) => asset.parts.forEach((part, partIndex) => {
    if (!materials.has(part.materialId)) issues.push({ severity: 'error', code: 'MATERIAL_REF_MISSING', assetId: asset.id, recipePath: `/assetDefinitions/${assetIndex}/parts/${partIndex}/materialId`, message: `Material ${part.materialId} does not exist.` });
  }));
  recipe.sceneInstances.forEach((instance, index) => {
    if (!assets.has(instance.assetId)) issues.push({ severity: 'error', code: 'ASSET_REF_MISSING', assetId: instance.assetId, recipePath: `/sceneInstances/${index}/assetId`, message: `Asset ${instance.assetId} does not exist.` });
    if (instance.variantSetId && !variants.has(instance.variantSetId)) issues.push({ severity: 'error', code: 'VARIANT_REF_MISSING', assetId: instance.assetId, recipePath: `/sceneInstances/${index}/variantSetId`, message: `Variant ${instance.variantSetId} does not exist.` });
  });
  recipe.socketDefinitions.forEach((socket, index) => {
    if (!rooms.has(socket.roomId)) issues.push({ severity: 'error', code: 'SOCKET_ROOM_REF_MISSING', assetId: null, recipePath: `/socketDefinitions/${index}/roomId`, message: `Socket ${socket.id} references missing room ${socket.roomId}.` });
  });
  recipe.placementRules.forEach((rule, index) => {
    if (!assets.has(rule.assetId)) issues.push({ severity: 'error', code: 'PLACEMENT_ASSET_REF_MISSING', assetId: rule.assetId, recipePath: `/placementRules/${index}/assetId`, message: `Placement asset ${rule.assetId} does not exist.` });
    if (rule.type === 'spline' && (!rule.splineId || !splines.has(rule.splineId))) issues.push({ severity: 'error', code: 'PLACEMENT_SPLINE_REF_MISSING', assetId: rule.assetId, recipePath: `/placementRules/${index}/splineId`, message: 'Spline placement requires a valid splineId.' });
  });
  recipe.splineDefinitions.forEach((spline, index) => {
    if (spline.controlPoints.length < 2) issues.push({ severity: 'error', code: 'SPLINE_POINTS_INSUFFICIENT', assetId: null, recipePath: `/splineDefinitions/${index}/controlPoints`, message: 'A spline requires at least two control points.' });
    if (!materials.has(spline.materialId)) issues.push({ severity: 'error', code: 'SPLINE_MATERIAL_REF_MISSING', assetId: null, recipePath: `/splineDefinitions/${index}/materialId`, message: `Material ${spline.materialId} does not exist.` });
    const mesh = generateSplineMesh(spline);
    if (!isValidMesh(mesh)) issues.push({ severity: 'error', code: 'SPLINE_MESH_INVALID', assetId: null, recipePath: `/splineDefinitions/${index}`, message: 'Spline sweep produced invalid geometry.' });
    if (mesh.indices.length / 3 > 100_000) issues.push({ severity: 'warning', code: 'SPLINE_TRIANGLE_BUDGET_HIGH', assetId: null, recipePath: `/splineDefinitions/${index}/resolutionPolicy`, message: `Estimated triangle count ${mesh.indices.length / 3} exceeds the v0 review budget.` });
    const channels = [
      ['radiusKeyframes', spline.radiusKeyframes], ['widthKeyframes', spline.widthKeyframes], ['heightKeyframes', spline.heightKeyframes],
    ] as const;
    for (const [channelName, keyframes] of channels) {
      const seen = new Set<string>();
      keyframes.forEach((keyframe, keyframeIndex) => {
        const path = `/splineDefinitions/${index}/${channelName}/${keyframeIndex}`;
        if (!Number.isFinite(keyframe.t) || keyframe.t < 0 || keyframe.t > 1) issues.push({ severity: 'error', code: 'SPLINE_KEYFRAME_POSITION_INVALID', assetId: null, recipePath: `${path}/t`, message: 'Profile keyframe position must be within 0..1.' });
        if (!Number.isFinite(keyframe.value) || keyframe.value <= 0) issues.push({ severity: 'error', code: 'SPLINE_KEYFRAME_VALUE_INVALID', assetId: null, recipePath: `${path}/value`, message: 'Profile keyframe value must be finite and greater than zero.' });
        const key = keyframe.t.toFixed(6);
        if (seen.has(key)) issues.push({ severity: 'error', code: 'SPLINE_KEYFRAME_POSITION_CONFLICT', assetId: null, recipePath: `${path}/t`, message: `Multiple ${channelName} keyframes share t=${keyframe.t}.` });
        seen.add(key);
      });
    }
    for (let pointIndex = 1; pointIndex < spline.controlPoints.length; pointIndex += 1) {
      const previous = spline.controlPoints[pointIndex - 1]; const current = spline.controlPoints[pointIndex];
      if (previous && current && Math.hypot(current[0] - previous[0], current[1] - previous[1], current[2] - previous[2]) < 1e-5) {
        issues.push({ severity: 'warning', code: 'SPLINE_DEGENERATE_SEGMENT', assetId: null, recipePath: `/splineDefinitions/${index}/controlPoints/${pointIndex}`, message: 'Adjacent spline points overlap; the local frame may be unstable.' });
      }
    }
    const frames = sampleSpline(spline);
    if (frames.some((frame, frameIndex) => frameIndex > 0 && vecDot(frame.normal, frames[frameIndex - 1]?.normal ?? frame.normal) < 0.15)) {
      issues.push({ severity: 'warning', code: 'SPLINE_FRAME_INSTABILITY_SUSPECTED', assetId: null, recipePath: `/splineDefinitions/${index}/controlPoints`, message: 'Rapid frame rotation may produce an unstable section orientation.' });
    }
  });
  return issues;
}

function vecDot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function resolveInstanceAsset(recipe: Recipe, instance: SceneInstance): AssetDefinition {
  const source = recipe.assetDefinitions.find((asset) => asset.id === instance.assetId);
  if (!source) throw new Error(`Asset ${instance.assetId} not found.`);
  const asset = structuredClone(source);
  for (const part of asset.parts) {
    const override = instance.partOverrides?.[part.id];
    if (!override) continue;
    if (override.materialId) part.materialId = override.materialId;
    if (override.transform) part.transform = {
      position: override.transform.position ?? part.transform.position,
      rotation: override.transform.rotation ?? part.transform.rotation,
      scale: override.transform.scale ?? part.transform.scale,
    };
  }
  return asset;
}

function rgbToHsl(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(clean.slice(offset, offset + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const lightness = (max + min) / 2;
  if (max === min) return [0, 0, lightness];
  const delta = max - min; const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = max === r ? (g - b) / delta + (g < b ? 6 : 0) : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  hue /= 6;
  return [hue, saturation, lightness];
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const channel = (p: number, q: number, value: number): number => {
    let t = value; if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  const channels = saturation === 0 ? [lightness, lightness, lightness] : [channel(p, q, hue + 1 / 3), channel(p, q, hue), channel(p, q, hue - 1 / 3)];
  return `#${channels.map((value) => Math.round(value * 255).toString(16).padStart(2, '0')).join('')}`;
}

export function applyVariant(material: MaterialDefinition, variant: VariantSet | undefined, part: AssetPart, seed: number): MaterialDefinition {
  const result = structuredClone(material);
  if (!variant || !variant.partIds.includes(part.id)) return result;
  const rng = new SeededRng(`${variant.seed}:${seed}:${part.id}`);
  const sample = (range: { min: number; max: number } | undefined): number => range ? range.min + rng.next() * (range.max - range.min) : 0;
  const [h, s, l] = rgbToHsl(result.color);
  result.color = hslToHex((h + sample(variant.hue) + 1) % 1, Math.max(0, Math.min(1, s + sample(variant.saturation))), Math.max(0, Math.min(1, l + sample(variant.brightness))));
  if (variant.materialOverride?.color) result.color = variant.materialOverride.color;
  if (variant.materialOverride?.roughness !== undefined) result.roughness = variant.materialOverride.roughness;
  if (variant.materialOverride?.metalness !== undefined) result.metalness = variant.materialOverride.metalness;
  return result;
}

export function generateRecipeMeshes(recipe: Recipe): MeshData[] {
  return [
    ...recipe.assetDefinitions.flatMap(createAssetMeshes),
    ...recipe.splineDefinitions.map(generateSplineMesh),
  ];
}

export function recipeStats(recipe: Recipe): MeshStats {
  return getMeshStats(generateRecipeMeshes(recipe));
}

export interface RecipeSummary extends RecipeInspection {
  recipeHash: string;
  triangleCount: number;
  vertexCount: number;
  boundingBox: MeshStats['boundingBox'];
  validation: { errors: number; warnings: number };
}

export function summarizeRecipe(recipe: Recipe): RecipeSummary {
  const inspection = inspectRecipe(recipe);
  const stats = recipeStats(recipe);
  const issues = validateRecipe(recipe);
  return {
    ...inspection,
    recipeHash: recipeHash(recipe),
    triangleCount: stats.triangleCount,
    vertexCount: stats.vertexCount,
    boundingBox: stats.boundingBox,
    validation: {
      errors: issues.filter((issue) => issue.severity === 'error').length,
      warnings: issues.filter((issue) => issue.severity === 'warning').length,
    },
  };
}

export interface RecipeDiffEntry { path: string; before: unknown; after: unknown }

export function diffRecipes(before: unknown, after: unknown, path = ''): RecipeDiffEntry[] {
  if (stableStringify(before) === stableStringify(after)) return [];
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return [{ path: path || '/', before, after }];
  const beforeObject = before as Record<string, unknown>; const afterObject = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(beforeObject), ...Object.keys(afterObject)]);
  return [...keys].sort().flatMap((key) => diffRecipes(beforeObject[key], afterObject[key], `${path}/${key}`));
}
