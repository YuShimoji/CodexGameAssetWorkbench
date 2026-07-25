import type {
  AssetDefinition,
  AssetPart,
  Recipe,
  Vec3,
} from '@cgawe/schema';
import {
  createPartMesh,
  stableStringify,
} from '@cgawe/core';
import {
  RUNTIME_BUNDLE_CONTRACT_VERSION,
  buildRuntimeBundle,
  type RuntimeBundle,
  type RuntimeBundleNode,
  type RuntimeBundleRights,
} from './runtime-bundle.js';

export const LOWPASS_ASSET_PACK_SCHEMA_VERSION = 'lowpass-runtime-asset-pack-1.0.0';
export const LOWPASS_ASSET_DEFINITION_SCHEMA_VERSION = 'lowpass-runtime-asset-definition-1.0.0';

export type LowpassAssetRole =
  | 'hostile-needle'
  | 'hostile-watcher'
  | 'allied-porter'
  | 'push-cart'
  | 'field-terminal';

export type LowpassAnchorKind =
  | 'scan'
  | 'lock-on'
  | 'carry'
  | 'interaction'
  | 'communication'
  | 'handle'
  | 'load';

export type LowpassFeatureKind = 'wheel' | 'screen' | 'visual-center';

export interface LowpassAnchorDefinition {
  id: string;
  kind: LowpassAnchorKind;
  partId: string;
}

export interface LowpassFeatureDefinition {
  id: string;
  kind: LowpassFeatureKind;
  partId: string;
}

export interface LowpassAssetDefinition {
  assetId: string;
  assetKey: string;
  instanceId: string;
  role: LowpassAssetRole;
  faction: 'hostile' | 'allied' | 'neutral';
  forwardAxis: '-Z';
  visualPartIds: string[];
  collisionProxyPartIds: string[];
  anchors: LowpassAnchorDefinition[];
  features: LowpassFeatureDefinition[];
}

export interface LowpassAssetPackDefinition {
  schemaVersion: typeof LOWPASS_ASSET_DEFINITION_SCHEMA_VERSION;
  assetPackId: string;
  generatorVersion: string;
  unitScaleMeters: 1;
  sourceRecipe: string;
  assets: LowpassAssetDefinition[];
  budgets: {
    maxTrianglesPerAsset: number;
    maxMaterialsPerAsset: number;
    maxTextureDimension: number;
  };
  rights: RuntimeBundleRights;
  provenance: {
    authoringTool: string;
    sourceType: 'project-owned-procedural-recipe';
    externalNetworkDependency: false;
    notice: string;
  };
}

export interface LowpassAssetContractIssue {
  code: string;
  assetId: string | null;
  path: string;
  message: string;
}

export class LowpassAssetContractError extends Error {
  readonly issues: LowpassAssetContractIssue[];

  constructor(issues: LowpassAssetContractIssue[]) {
    super(`LOWPASS asset pack blocked by ${issues.length} contract error${issues.length === 1 ? '' : 's'}.`);
    this.name = 'LowpassAssetContractError';
    this.issues = issues;
  }
}

export interface LowpassRuntimeAssetManifest {
  schemaVersion: typeof LOWPASS_ASSET_PACK_SCHEMA_VERSION;
  assetPackId: string;
  assetKey: string;
  recipeHash: string;
  generatorVersion: string;
  sourceRuntimeBundleContractVersion: typeof RUNTIME_BUNDLE_CONTRACT_VERSION;
  coordinateSystem: {
    handedness: 'right';
    upAxis: '+Y';
    forwardAxis: '-Z';
  };
  unitScaleMeters: 1;
  files: {
    glb: {
      name: string;
      mediaType: 'model/gltf-binary';
      bytes: number;
      sha256: string;
    };
    manifest: {
      name: string;
      mediaType: 'application/json';
    };
    readback: {
      name: string;
      mediaType: 'application/json';
    };
    visualProofs: Array<{
      name: string;
      mode: 'ps1-off' | 'ps1-on';
      mediaType: 'image/png';
    }>;
  };
  stableNodeMap: RuntimeBundleNode[];
  meshNodeIds: string[];
  materialIds: string[];
  socketIds: string[];
  collisionProxyIds: string[];
  interactionAnchorIds: string[];
  assets: Array<{
    assetId: string;
    assetKey: string;
    instanceId: string;
    rootNodeId: string;
    role: LowpassAssetRole;
    faction: LowpassAssetDefinition['faction'];
    forwardAxis: '-Z';
    stableNodeIds: string[];
    meshNodeIds: string[];
    visualNodeIds: string[];
    materialIds: string[];
    socketIds: string[];
    collisionProxyIds: string[];
    interactionAnchorIds: string[];
    anchors: Array<LowpassAnchorDefinition & { nodeId: string }>;
    features: Array<LowpassFeatureDefinition & { nodeId: string }>;
    bounds: {
      min: Vec3;
      max: Vec3;
    };
    triangleCount: number;
    vertexCount: number;
    materialCount: number;
    textureDimensions: Array<{ width: number; height: number }>;
    lods: Array<{
      level: 0;
      nodeIds: string[];
      maxDistanceMeters: null;
    }>;
    sourceProvenance: {
      sourceRecipe: string;
      generatedFromPrimitives: true;
      rightsStatus: RuntimeBundleRights['status'];
    };
  }>;
  bounds: {
    min: Vec3;
    max: Vec3;
  };
  triangleCount: number;
  vertexCount: number;
  materialCount: number;
  textureDimensions: Array<{ width: number; height: number }>;
  lods: Array<{ level: 0; assetIds: string[]; maxDistanceMeters: null }>;
  budgets: LowpassAssetPackDefinition['budgets'];
  sourceProvenance: LowpassAssetPackDefinition['provenance'] & {
    sourceRecipe: string;
    recipeSchemaVersion: Recipe['schemaVersion'];
  };
  license: RuntimeBundleRights;
  deterministicBuildReadback: {
    generationSeed: number;
    recipeSha256: string;
    glbSha256: string;
    canonicalManifest: true;
    timestampFree: true;
    localPathFree: true;
  };
  textureStage: {
    status: 'UNAVAILABLE_NO_BLENDER';
    uvPresent: false;
    textureCount: 0;
    productionTexturingComplete: false;
    note: string;
  };
}

export interface LowpassRuntimeAssetPack {
  glb: ArrayBuffer;
  manifest: LowpassRuntimeAssetManifest;
  manifestText: string;
  sourceBundle: RuntimeBundle;
}

const REQUIRED_ANCHORS: Record<LowpassAssetRole, LowpassAnchorKind[]> = {
  'hostile-needle': ['scan', 'lock-on'],
  'hostile-watcher': ['scan'],
  'allied-porter': ['carry', 'interaction', 'communication'],
  'push-cart': ['handle', 'load'],
  'field-terminal': ['interaction'],
};

const REQUIRED_FEATURES: Partial<Record<LowpassAssetRole, LowpassFeatureKind[]>> = {
  'push-cart': ['wheel'],
  'field-terminal': ['screen'],
  'hostile-watcher': ['visual-center'],
};

function nodeToken(value: string): string {
  return [...value].map((character) => (
    /[A-Za-z0-9_-]/.test(character)
      ? character
      : `_u${character.codePointAt(0)?.toString(16) ?? '0'}_`
  )).join('');
}

function scenePartNodeId(instanceId: string, partId: string): string {
  return `scene-part--${nodeToken(instanceId)}--${nodeToken(partId)}`;
}

function sceneRootNodeId(instanceId: string): string {
  return `scene-instance--${nodeToken(instanceId)}`;
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function validateDefinition(recipe: Recipe, definition: LowpassAssetPackDefinition): LowpassAssetContractIssue[] {
  const issues: LowpassAssetContractIssue[] = [];
  const push = (code: string, assetId: string | null, path: string, message: string): void => {
    issues.push({ code, assetId, path, message });
  };
  if (definition.schemaVersion !== LOWPASS_ASSET_DEFINITION_SCHEMA_VERSION) {
    push('LOWPASS_DEFINITION_VERSION_UNSUPPORTED', null, '$.schemaVersion', 'Unsupported LOWPASS asset definition version.');
  }
  if (definition.assetPackId !== recipe.projectId) {
    push('LOWPASS_PACK_ID_MISMATCH', null, '$.assetPackId', 'assetPackId must equal Recipe projectId.');
  }
  if (definition.unitScaleMeters !== 1) {
    push('LOWPASS_UNIT_SCALE_UNSUPPORTED', null, '$.unitScaleMeters', 'LOWPASS canary assets must use one meter units.');
  }
  const assetKeys = new Set<string>();
  const declaredAssetIds = new Set<string>();
  for (const [index, contractAsset] of definition.assets.entries()) {
    const basePath = `$.assets[${index}]`;
    if (declaredAssetIds.has(contractAsset.assetId)) {
      push('LOWPASS_DUPLICATE_ASSET_ID', contractAsset.assetId, `${basePath}.assetId`, 'assetId must be unique.');
    }
    declaredAssetIds.add(contractAsset.assetId);
    if (assetKeys.has(contractAsset.assetKey)) {
      push('LOWPASS_DUPLICATE_ASSET_KEY', contractAsset.assetId, `${basePath}.assetKey`, 'assetKey must be unique.');
    }
    assetKeys.add(contractAsset.assetKey);
    const recipeAsset = recipe.assetDefinitions.find((asset) => asset.id === contractAsset.assetId);
    if (!recipeAsset) {
      push('LOWPASS_ASSET_MISSING', contractAsset.assetId, `${basePath}.assetId`, 'Referenced Recipe asset is missing.');
      continue;
    }
    const instance = recipe.sceneInstances.find((candidate) => candidate.id === contractAsset.instanceId);
    if (!instance || instance.assetId !== contractAsset.assetId) {
      push('LOWPASS_INSTANCE_MISSING', contractAsset.assetId, `${basePath}.instanceId`, 'Referenced scene instance is missing or uses another asset.');
    }
    const partIds = new Set(recipeAsset.parts.map((part) => part.id));
    const referencedPartIds = [
      ...contractAsset.visualPartIds,
      ...contractAsset.collisionProxyPartIds,
      ...contractAsset.anchors.map((anchor) => anchor.partId),
      ...contractAsset.features.map((feature) => feature.partId),
    ];
    for (const partId of referencedPartIds) {
      if (!partIds.has(partId)) {
        push('LOWPASS_PART_MISSING', contractAsset.assetId, basePath, `Semantic part ${partId} is missing from Recipe asset.`);
      }
    }
    const anchorKinds = new Set(contractAsset.anchors.map((anchor) => anchor.kind));
    for (const required of REQUIRED_ANCHORS[contractAsset.role]) {
      if (!anchorKinds.has(required)) {
        push('LOWPASS_REQUIRED_ANCHOR_MISSING', contractAsset.assetId, `${basePath}.anchors`, `${contractAsset.role} requires a ${required} anchor.`);
      }
    }
    if (contractAsset.role === 'hostile-watcher' && anchorKinds.has('lock-on')) {
      push('LOWPASS_WATCHER_LOCK_ON_FORBIDDEN', contractAsset.assetId, `${basePath}.anchors`, 'Watcher must not expose a lock-on anchor.');
    }
    for (const required of REQUIRED_FEATURES[contractAsset.role] ?? []) {
      if (!contractAsset.features.some((feature) => feature.kind === required)) {
        push('LOWPASS_REQUIRED_FEATURE_MISSING', contractAsset.assetId, `${basePath}.features`, `${contractAsset.role} requires a ${required} feature.`);
      }
    }
    if (contractAsset.role === 'push-cart' && contractAsset.features.filter((feature) => feature.kind === 'wheel').length < 2) {
      push('LOWPASS_CART_WHEELS_INSUFFICIENT', contractAsset.assetId, `${basePath}.features`, 'Cart requires at least two stable wheel nodes.');
    }
    if (contractAsset.collisionProxyPartIds.length === 0) {
      push('LOWPASS_COLLISION_PROXY_MISSING', contractAsset.assetId, `${basePath}.collisionProxyPartIds`, 'Each runtime asset requires an explicit collision proxy.');
    }
  }
  for (const asset of recipe.assetDefinitions) {
    if (!declaredAssetIds.has(asset.id)) {
      push('LOWPASS_RECIPE_ASSET_UNDECLARED', asset.id, '$.assets', 'Every Recipe asset must have a LOWPASS runtime declaration.');
    }
  }
  return issues;
}

function partStats(parts: AssetPart[]): { vertices: number; triangles: number } {
  let vertices = 0;
  let triangles = 0;
  for (const part of parts) {
    const mesh = createPartMesh(part);
    vertices += mesh.positions.length / 3;
    triangles += mesh.indices.length / 3;
  }
  return { vertices, triangles };
}

function partBounds(parts: AssetPart[]): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const max: Vec3 = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (const part of parts) {
    const mesh = createPartMesh(part);
    for (let index = 0; index < mesh.positions.length; index += 3) {
      for (let axis = 0; axis < 3; axis += 1) {
        const value = mesh.positions[index + axis] ?? 0;
        min[axis] = Math.min(min[axis] ?? Number.POSITIVE_INFINITY, value);
        max[axis] = Math.max(max[axis] ?? Number.NEGATIVE_INFINITY, value);
      }
    }
  }
  if (parts.length === 0) return { min: [0, 0, 0], max: [0, 0, 0] };
  return { min, max };
}

function buildAssetManifest(
  recipeAsset: AssetDefinition,
  contractAsset: LowpassAssetDefinition,
  definition: LowpassAssetPackDefinition,
): LowpassRuntimeAssetManifest['assets'][number] {
  const partById = new Map(recipeAsset.parts.map((part) => [part.id, part]));
  const allNodeIds = recipeAsset.parts.map((part) => scenePartNodeId(contractAsset.instanceId, part.id));
  const visualParts = contractAsset.visualPartIds
    .map((partId) => partById.get(partId))
    .filter((part): part is AssetPart => Boolean(part));
  const stats = partStats(recipeAsset.parts);
  const visualNodeIds = contractAsset.visualPartIds.map((partId) => scenePartNodeId(contractAsset.instanceId, partId));
  const materialIds = unique(visualParts.map((part) => part.materialId));
  const anchors = contractAsset.anchors.map((anchor) => ({
    ...structuredClone(anchor),
    nodeId: scenePartNodeId(contractAsset.instanceId, anchor.partId),
  }));
  const features = contractAsset.features.map((feature) => ({
    ...structuredClone(feature),
    nodeId: scenePartNodeId(contractAsset.instanceId, feature.partId),
  }));
  return {
    assetId: contractAsset.assetId,
    assetKey: contractAsset.assetKey,
    instanceId: contractAsset.instanceId,
    rootNodeId: sceneRootNodeId(contractAsset.instanceId),
    role: contractAsset.role,
    faction: contractAsset.faction,
    forwardAxis: contractAsset.forwardAxis,
    stableNodeIds: [sceneRootNodeId(contractAsset.instanceId), ...allNodeIds],
    meshNodeIds: allNodeIds,
    visualNodeIds,
    materialIds,
    socketIds: anchors.map((anchor) => anchor.id),
    collisionProxyIds: contractAsset.collisionProxyPartIds.map((partId) => scenePartNodeId(contractAsset.instanceId, partId)),
    interactionAnchorIds: anchors
      .filter((anchor) => ['interaction', 'handle', 'load', 'carry'].includes(anchor.kind))
      .map((anchor) => anchor.nodeId),
    anchors,
    features,
    bounds: partBounds(visualParts),
    triangleCount: stats.triangles,
    vertexCount: stats.vertices,
    materialCount: materialIds.length,
    textureDimensions: [],
    lods: [{ level: 0, nodeIds: visualNodeIds, maxDistanceMeters: null }],
    sourceProvenance: {
      sourceRecipe: definition.sourceRecipe,
      generatedFromPrimitives: true,
      rightsStatus: definition.rights.status,
    },
  };
}

function canonicalManifestText(manifest: LowpassRuntimeAssetManifest): string {
  return `${JSON.stringify(JSON.parse(stableStringify(manifest)), null, 2)}\n`;
}

export async function buildLowpassRuntimeAssetPack(
  recipe: Recipe,
  definition: LowpassAssetPackDefinition,
): Promise<LowpassRuntimeAssetPack> {
  const issues = validateDefinition(recipe, definition);
  if (issues.length > 0) throw new LowpassAssetContractError(issues);
  const sourceBundle = await buildRuntimeBundle(recipe, {
    rights: definition.rights,
    preserveMaterialIds: true,
    reuseMaterials: true,
  });
  const assets = definition.assets
    .map((contractAsset) => {
      const recipeAsset = recipe.assetDefinitions.find((asset) => asset.id === contractAsset.assetId);
      if (!recipeAsset) throw new Error(`Validated LOWPASS asset ${contractAsset.assetId} disappeared.`);
      return buildAssetManifest(recipeAsset, contractAsset, definition);
    })
    .sort((left, right) => left.assetKey.localeCompare(right.assetKey));
  const manifestName = `${definition.assetPackId}.manifest.json`;
  const readbackName = `${definition.assetPackId}.readback.json`;
  const manifest: LowpassRuntimeAssetManifest = {
    schemaVersion: LOWPASS_ASSET_PACK_SCHEMA_VERSION,
    assetPackId: definition.assetPackId,
    assetKey: `lowpass:${definition.assetPackId}`,
    recipeHash: sourceBundle.manifest.source.recipeHash,
    generatorVersion: definition.generatorVersion,
    sourceRuntimeBundleContractVersion: RUNTIME_BUNDLE_CONTRACT_VERSION,
    coordinateSystem: {
      handedness: 'right',
      upAxis: '+Y',
      forwardAxis: '-Z',
    },
    unitScaleMeters: definition.unitScaleMeters,
    files: {
      glb: structuredClone(sourceBundle.manifest.files.glb),
      manifest: { name: manifestName, mediaType: 'application/json' },
      readback: { name: readbackName, mediaType: 'application/json' },
      visualProofs: [
        { name: `${definition.assetPackId}.ps1-off.png`, mode: 'ps1-off', mediaType: 'image/png' },
        { name: `${definition.assetPackId}.ps1-on.png`, mode: 'ps1-on', mediaType: 'image/png' },
      ],
    },
    stableNodeMap: structuredClone(sourceBundle.manifest.nodeMap),
    meshNodeIds: unique(assets.flatMap((asset) => asset.meshNodeIds)),
    materialIds: unique(assets.flatMap((asset) => asset.materialIds)),
    socketIds: unique(assets.flatMap((asset) => asset.socketIds)),
    collisionProxyIds: unique(assets.flatMap((asset) => asset.collisionProxyIds)),
    interactionAnchorIds: unique(assets.flatMap((asset) => asset.interactionAnchorIds)),
    assets,
    bounds: structuredClone(sourceBundle.manifest.bounds),
    triangleCount: sourceBundle.manifest.counts.triangles,
    vertexCount: sourceBundle.manifest.counts.vertices,
    materialCount: sourceBundle.manifest.counts.materials,
    textureDimensions: [],
    lods: [{ level: 0, assetIds: assets.map((asset) => asset.assetId), maxDistanceMeters: null }],
    budgets: structuredClone(definition.budgets),
    sourceProvenance: {
      ...structuredClone(definition.provenance),
      sourceRecipe: definition.sourceRecipe,
      recipeSchemaVersion: recipe.schemaVersion,
    },
    license: structuredClone(definition.rights),
    deterministicBuildReadback: {
      generationSeed: recipe.generationSeed,
      recipeSha256: sourceBundle.manifest.source.recipeSha256,
      glbSha256: sourceBundle.manifest.files.glb.sha256,
      canonicalManifest: true,
      timestampFree: true,
      localPathFree: true,
    },
    textureStage: {
      status: 'UNAVAILABLE_NO_BLENDER',
      uvPresent: false,
      textureCount: 0,
      productionTexturingComplete: false,
      note: 'Blender was not available on PATH; this canary proves geometry, stable semantics, materials, and runtime packaging only.',
    },
  };
  return {
    glb: sourceBundle.glb,
    manifest,
    manifestText: canonicalManifestText(manifest),
    sourceBundle,
  };
}
