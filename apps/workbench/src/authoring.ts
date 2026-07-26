import type {
  AssetDefinition,
  AssetPart,
  MaterialDefinition,
  PrimitiveDefinition,
  Recipe,
  SceneInstance,
  Transform,
} from '@cgawe/schema';

export type PrimitiveType = PrimitiveDefinition['type'];

const materialColors = ['#5fc5c9', '#d58555', '#c4a7e7', '#e0bd64', '#74b985', '#d9778c'];

function recipeIds(recipe: Recipe): string[] {
  return [
    ...recipe.materialDefinitions.map((item) => item.id),
    ...recipe.assetDefinitions.map((item) => item.id),
    ...recipe.assetDefinitions.flatMap((asset) => asset.parts.map((part) => part.id)),
    ...recipe.variantSets.map((item) => item.id),
    ...recipe.sceneInstances.map((item) => item.id),
    ...recipe.splineDefinitions.map((item) => item.id),
    ...recipe.roomDefinitions.map((item) => item.id),
    ...recipe.socketDefinitions.map((item) => item.id),
    ...recipe.placementRules.map((item) => item.id),
  ];
}

function slug(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

export function uniqueAuthoringId(recipe: Recipe, prefix: string, label: string): string {
  const used = new Set(recipeIds(recipe));
  const base = `${prefix}-${slug(label)}`;
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function identityTransform(position: Transform['position'] = [0, 0, 0]): Transform {
  return { position: [...position], rotation: [0, 0, 0], scale: [1, 1, 1] };
}

function defaultPrimitive(type: PrimitiveType): PrimitiveDefinition {
  if (type === 'cylinder') return { type, radiusTop: 0.42, radiusBottom: 0.5, height: 1.4, radialSegments: 24 };
  if (type === 'plane') return { type, size: [1.6, 1.6] };
  if (type === 'sphere') return { type, radius: 0.58, widthSegments: 24, heightSegments: 16 };
  return { type, size: [1.4, 1, 1] };
}

function defaultPartPosition(type: PrimitiveType): Transform['position'] {
  if (type === 'plane') return [0, 0.02, 0];
  if (type === 'sphere') return [0, 0.58, 0];
  if (type === 'cylinder') return [0, 0.7, 0];
  return [0, 0.5, 0];
}

export function createMaterialDraft(recipe: Recipe, requestedName: string): MaterialDefinition {
  const name = requestedName.trim() || 'New Material';
  return {
    id: uniqueAuthoringId(recipe, 'mat', name),
    name,
    color: materialColors[recipe.materialDefinitions.length % materialColors.length]!,
    roughness: 0.58,
    metalness: 0.08,
  };
}

export function createPartDraft(
  recipe: Recipe,
  asset: AssetDefinition,
  type: PrimitiveType,
  materialId: string,
): AssetPart {
  const typeCount = asset.parts.filter((part) => part.primitive.type === type).length + 1;
  const name = `${type[0]!.toUpperCase()}${type.slice(1)} ${typeCount}`;
  return {
    id: uniqueAuthoringId(recipe, 'part', `${asset.name}-${name}`),
    name,
    primitive: defaultPrimitive(type),
    materialId,
    transform: identityTransform(defaultPartPosition(type)),
  };
}

export function createAssetDraft(recipe: Recipe, requestedName: string): {
  asset: AssetDefinition;
  fallbackMaterial?: MaterialDefinition;
} {
  const name = requestedName.trim() || 'New Asset';
  const fallbackMaterial = recipe.materialDefinitions[0] ? undefined : createMaterialDraft(recipe, 'Default Material');
  const materialId = recipe.materialDefinitions[0]?.id ?? fallbackMaterial!.id;
  const shell: AssetDefinition = {
    id: uniqueAuthoringId(recipe, 'asset', name),
    name,
    parts: [],
  };
  shell.parts.push(createPartDraft(recipe, shell, 'box', materialId));
  return { asset: shell, fallbackMaterial };
}

export function duplicatePartDraft(recipe: Recipe, asset: AssetDefinition, source: AssetPart): AssetPart {
  const duplicate = structuredClone(source);
  duplicate.name = `${source.name} Copy`;
  duplicate.id = uniqueAuthoringId(recipe, 'part', `${asset.name}-${duplicate.name}`);
  duplicate.transform.position[0] += 0.35;
  return duplicate;
}

export function createInstanceDraft(recipe: Recipe, asset: AssetDefinition): SceneInstance {
  const instanceNumber = recipe.sceneInstances.filter((item) => item.assetId === asset.id).length + 1;
  const name = `${asset.name} ${instanceNumber}`;
  return {
    id: uniqueAuthoringId(recipe, 'instance', name),
    name,
    assetId: asset.id,
    transform: identityTransform(),
    partOverrides: {},
  };
}

export function duplicateInstanceDraft(recipe: Recipe, source: SceneInstance): SceneInstance {
  const duplicate = structuredClone(source);
  duplicate.name = `${source.name} Copy`;
  duplicate.id = uniqueAuthoringId(recipe, 'instance', duplicate.name);
  duplicate.transform.position[0] += 0.75;
  return duplicate;
}

export function assetDeleteBlockers(recipe: Recipe, assetId: string): string[] {
  const blockers: string[] = [];
  const instances = recipe.sceneInstances.filter((item) => item.assetId === assetId).length;
  const placements = recipe.placementRules.filter((item) => item.assetId === assetId).length;
  const variants = recipe.variantSets.filter((item) => item.assetId === assetId).length;
  if (instances > 0) blockers.push(`${instances} scene instance${instances === 1 ? '' : 's'}`);
  if (placements > 0) blockers.push(`${placements} placement rule${placements === 1 ? '' : 's'}`);
  if (variants > 0) blockers.push(`${variants} variant set${variants === 1 ? '' : 's'}`);
  return blockers;
}

export function removePartReferences(recipe: Recipe, assetId: string, partId: string): void {
  for (const variant of recipe.variantSets) {
    if (variant.assetId === assetId) variant.partIds = variant.partIds.filter((id) => id !== partId);
  }
  for (const instance of recipe.sceneInstances) {
    if (instance.assetId === assetId && instance.partOverrides) delete instance.partOverrides[partId];
  }
}
