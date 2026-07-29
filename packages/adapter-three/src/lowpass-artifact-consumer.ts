import {
  Box3,
  Group,
  type BufferGeometry,
  type Material,
  type Mesh,
  type Object3D,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { LowpassRuntimeAssetManifest } from './lowpass-runtime.js';

export const LOWPASS_ARTIFACT_CONSUMER_CONTRACT_VERSION =
  'cgawe-lowpass-artifact-consumer-1.1.0';
export const SUPPORTED_LOWPASS_ASSET_PACK_SCHEMA_VERSION =
  'lowpass-runtime-asset-pack-1.0.0';
export const SUPPORTED_RUNTIME_BUNDLE_CONTRACT_VERSION =
  'cgawe-runtime-bundle-1.0.0';

export type LowpassArtifactConsumerErrorCode =
  | 'MANIFEST_INVALID'
  | 'UNSUPPORTED_MANIFEST_SCHEMA_VERSION'
  | 'UNSUPPORTED_RUNTIME_BUNDLE_CONTRACT_VERSION'
  | 'GLB_BYTE_COUNT_MISMATCH'
  | 'GLB_HASH_MISMATCH'
  | 'GLB_PARSE_FAILED'
  | 'STABLE_NODE_MISSING'
  | 'STABLE_NODE_AMBIGUOUS'
  | 'COLLISION_PROXY_UNRESOLVED'
  | 'INTERACTION_ANCHOR_UNRESOLVED'
  | 'ASSET_ROOT_UNRESOLVED'
  | 'SEMANTIC_REFERENCE_UNRESOLVED'
  | 'MATERIAL_UNRESOLVED'
  | 'NON_FINITE_TRANSFORM'
  | 'INVALID_BOUNDS'
  | 'COUNT_MISMATCH'
  | 'BUDGET_EXCEEDED'
  | 'RIGHTS_DECLARATION_INVALID'
  | 'UNEXPECTED_ERROR';

export interface LowpassArtifactConsumerError {
  code: LowpassArtifactConsumerErrorCode;
  message: string;
  path: string;
}

export interface LowpassArtifactConsumerDisposal {
  geometries: number;
  materials: number;
  alreadyDisposed: boolean;
}

export interface LowpassResolvedBounds {
  min: [number, number, number];
  max: [number, number, number];
}

export interface LowpassResolvedAsset {
  assetId: string;
  assetKey: string;
  instanceId: string;
  role: LowpassRuntimeAssetManifest['assets'][number]['role'];
  faction: LowpassRuntimeAssetManifest['assets'][number]['faction'];
  root: Object3D;
  stableNodes: ReadonlyMap<string, Object3D>;
  collisionProxies: ReadonlyMap<string, Object3D>;
  interactionAnchors: ReadonlyMap<string, Object3D>;
  semanticAnchors: ReadonlyMap<string, Object3D>;
  materials: ReadonlyMap<string, Material>;
  declaredBounds: LowpassResolvedBounds;
  runtimeBounds: LowpassResolvedBounds;
  meshCount: number;
  triangleCount: number;
  materialCount: number;
}

export interface LowpassArtifactConsumerStats {
  assets: number;
  stableNodes: number;
  meshes: number;
  triangles: number;
  materials: number;
  uniqueMaterials: number;
  collisionProxies: number;
  interactionAnchors: number;
}

export interface LowpassArtifactConsumerResult {
  readonly contractVersion: typeof LOWPASS_ARTIFACT_CONSUMER_CONTRACT_VERSION;
  readonly manifest: LowpassRuntimeAssetManifest;
  readonly group: Group;
  readonly assetsByKey: ReadonlyMap<string, LowpassResolvedAsset>;
  readonly stats: LowpassArtifactConsumerStats;
  readonly disposed: boolean;
  dispose(): LowpassArtifactConsumerDisposal;
}

export interface LowpassArtifactConsumerLoadOptions {
  glb: ArrayBuffer | Uint8Array;
  manifest: unknown;
  target?: Object3D;
  enabled?: boolean;
  replaceExisting?: boolean;
}

export interface LowpassArtifactConsumerLoaded {
  ok: true;
  state: 'loaded' | 'already-attached';
  attached: boolean;
  result: LowpassArtifactConsumerResult;
}

export interface LowpassArtifactConsumerDisabled {
  ok: true;
  state: 'disabled';
  attached: false;
  result: null;
}

export interface LowpassArtifactConsumerFailure {
  ok: false;
  state: 'failed';
  attached: false;
  result: null;
  error: LowpassArtifactConsumerError;
}

export type LowpassArtifactConsumerOutcome =
  | LowpassArtifactConsumerLoaded
  | LowpassArtifactConsumerDisabled
  | LowpassArtifactConsumerFailure;

class ConsumerValidationFailure extends Error {
  readonly detail: LowpassArtifactConsumerError;

  constructor(
    code: LowpassArtifactConsumerErrorCode,
    message: string,
    path: string,
  ) {
    super(message);
    this.name = 'ConsumerValidationFailure';
    this.detail = { code, message, path };
  }
}

class ConsumerResult implements LowpassArtifactConsumerResult {
  readonly contractVersion = LOWPASS_ARTIFACT_CONSUMER_CONTRACT_VERSION;
  readonly manifest: LowpassRuntimeAssetManifest;
  readonly group: Group;
  readonly assetsByKey: ReadonlyMap<string, LowpassResolvedAsset>;
  readonly stats: LowpassArtifactConsumerStats;
  #disposed = false;
  readonly #onDispose: (result: ConsumerResult) => void;

  constructor(
    manifest: LowpassRuntimeAssetManifest,
    group: Group,
    assetsByKey: ReadonlyMap<string, LowpassResolvedAsset>,
    stats: LowpassArtifactConsumerStats,
    onDispose: (result: ConsumerResult) => void,
  ) {
    this.manifest = manifest;
    this.group = group;
    this.assetsByKey = assetsByKey;
    this.stats = stats;
    this.#onDispose = onDispose;
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  dispose(): LowpassArtifactConsumerDisposal {
    if (this.#disposed) {
      return { geometries: 0, materials: 0, alreadyDisposed: true };
    }
    this.group.removeFromParent();
    const disposal = disposeOwnedResources(this.group);
    this.#disposed = true;
    this.#onDispose(this);
    return { ...disposal, alreadyDisposed: false };
  }
}

function fail(
  code: LowpassArtifactConsumerErrorCode,
  message: string,
  path: string,
): never {
  throw new ConsumerValidationFailure(code, message, path);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireArray(
  value: unknown,
  path: string,
): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    fail('MANIFEST_INVALID', `${path} must be an array.`, path);
  }
}

function requireString(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    fail('MANIFEST_INVALID', `${path} must be a non-empty string.`, path);
  }
}

function validateRightsDeclaration(
  value: unknown,
  assets: unknown[],
): void {
  if (!isRecord(value)) {
    fail(
      'RIGHTS_DECLARATION_INVALID',
      '$.license must be a rights declaration object.',
      '$.license',
    );
  }
  if (value.status !== 'NOASSERTION' && value.status !== 'DECLARED') {
    fail(
      'RIGHTS_DECLARATION_INVALID',
      '$.license.status must be NOASSERTION or DECLARED.',
      '$.license.status',
    );
  }
  if (typeof value.notice !== 'string' || value.notice.trim().length === 0) {
    fail(
      'RIGHTS_DECLARATION_INVALID',
      '$.license.notice must be a non-empty rights notice.',
      '$.license.notice',
    );
  }
  if (
    value.status === 'DECLARED' &&
    (typeof value.licenseId !== 'string' || value.licenseId.trim().length === 0)
  ) {
    fail(
      'RIGHTS_DECLARATION_INVALID',
      '$.license.licenseId is required when rights status is DECLARED.',
      '$.license.licenseId',
    );
  }
  assets.forEach((asset, index) => {
    if (!isRecord(asset) || !isRecord(asset.sourceProvenance)) {
      fail(
        'RIGHTS_DECLARATION_INVALID',
        'Each asset must include rights provenance.',
        `$.assets[${index}].sourceProvenance`,
      );
    }
    if (asset.sourceProvenance.rightsStatus !== value.status) {
      fail(
        'RIGHTS_DECLARATION_INVALID',
        'Asset rights status must match the pack-level declaration.',
        `$.assets[${index}].sourceProvenance.rightsStatus`,
      );
    }
  });
}

function validateManifest(value: unknown): LowpassRuntimeAssetManifest {
  if (!isRecord(value)) {
    fail('MANIFEST_INVALID', 'The LOWPASS manifest must be an object.', '$');
  }
  if (value.schemaVersion !== SUPPORTED_LOWPASS_ASSET_PACK_SCHEMA_VERSION) {
    fail(
      'UNSUPPORTED_MANIFEST_SCHEMA_VERSION',
      `Unsupported LOWPASS manifest schema version: ${String(value.schemaVersion)}.`,
      '$.schemaVersion',
    );
  }
  if (
    value.sourceRuntimeBundleContractVersion !==
    SUPPORTED_RUNTIME_BUNDLE_CONTRACT_VERSION
  ) {
    fail(
      'UNSUPPORTED_RUNTIME_BUNDLE_CONTRACT_VERSION',
      `Unsupported Runtime Bundle contract version: ${String(value.sourceRuntimeBundleContractVersion)}.`,
      '$.sourceRuntimeBundleContractVersion',
    );
  }
  if (!isRecord(value.files) || !isRecord(value.files.glb)) {
    fail('MANIFEST_INVALID', '$.files.glb must be an object.', '$.files.glb');
  }
  if (
    !Number.isSafeInteger(value.files.glb.bytes) ||
    (value.files.glb.bytes as number) < 1
  ) {
    fail(
      'MANIFEST_INVALID',
      '$.files.glb.bytes must be a positive integer.',
      '$.files.glb.bytes',
    );
  }
  if (
    typeof value.files.glb.sha256 !== 'string' ||
    !/^sha256:[0-9a-f]{64}$/.test(value.files.glb.sha256)
  ) {
    fail(
      'MANIFEST_INVALID',
      '$.files.glb.sha256 must be a lowercase SHA-256 identity.',
      '$.files.glb.sha256',
    );
  }
  requireArray(value.stableNodeMap, '$.stableNodeMap');
  requireArray(value.meshNodeIds, '$.meshNodeIds');
  requireArray(value.materialIds, '$.materialIds');
  requireArray(value.socketIds, '$.socketIds');
  requireArray(value.collisionProxyIds, '$.collisionProxyIds');
  requireArray(value.interactionAnchorIds, '$.interactionAnchorIds');
  requireArray(value.assets, '$.assets');
  validateRightsDeclaration(value.license, value.assets);
  if (!isRecord(value.budgets)) {
    fail('MANIFEST_INVALID', '$.budgets must be an object.', '$.budgets');
  }
  validateBounds(value.bounds, '$.bounds');
  return value as unknown as LowpassRuntimeAssetManifest;
}

function validateBounds(value: unknown, path: string): LowpassResolvedBounds {
  if (!isRecord(value)) {
    fail('INVALID_BOUNDS', `${path} must be an object.`, path);
  }
  const min = value.min;
  const max = value.max;
  if (
    !Array.isArray(min) ||
    !Array.isArray(max) ||
    min.length !== 3 ||
    max.length !== 3
  ) {
    fail(
      'INVALID_BOUNDS',
      `${path} must contain three-component min and max vectors.`,
      path,
    );
  }
  for (let axis = 0; axis < 3; axis += 1) {
    if (
      !Number.isFinite(min[axis]) ||
      !Number.isFinite(max[axis]) ||
      (min[axis] as number) > (max[axis] as number)
    ) {
      fail(
        'INVALID_BOUNDS',
        `${path} contains non-finite or inverted bounds.`,
        `${path}[${axis}]`,
      );
    }
  }
  return {
    min: [min[0] as number, min[1] as number, min[2] as number],
    max: [max[0] as number, max[1] as number, max[2] as number],
  };
}

function normalizeBytes(input: ArrayBuffer | Uint8Array): Uint8Array {
  return input instanceof Uint8Array
    ? Uint8Array.from(input)
    : new Uint8Array(input.slice(0));
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    Uint8Array.from(bytes).buffer,
  );
  return `sha256:${[...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}

function meshOf(object: Object3D): Mesh | null {
  return (object as Mesh).isMesh ? (object as Mesh) : null;
}

function triangleCount(geometry: BufferGeometry): number {
  const elementCount =
    geometry.index?.count ?? geometry.getAttribute('position')?.count ?? 0;
  return elementCount / 3;
}

function collectObjectNames(root: Object3D): Map<string, Object3D[]> {
  const names = new Map<string, Object3D[]>();
  root.traverse((object) => {
    if (!object.name) return;
    const entries = names.get(object.name) ?? [];
    entries.push(object);
    names.set(object.name, entries);
  });
  return names;
}

function collectMaterialNames(root: Object3D): Map<string, Material> {
  const materials = new Map<string, Material>();
  root.traverse((object) => {
    const mesh = meshOf(object);
    if (!mesh) return;
    const meshMaterials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    meshMaterials.forEach((material) => {
      if (material.name && !materials.has(material.name)) {
        materials.set(material.name, material);
      }
    });
  });
  return materials;
}

function validateFiniteTransforms(root: Object3D): void {
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    const values = [
      ...object.position.toArray(),
      ...object.quaternion.toArray(),
      ...object.scale.toArray(),
      ...object.matrix.elements,
      ...object.matrixWorld.elements,
    ];
    if (!values.every(Number.isFinite)) {
      fail(
        'NON_FINITE_TRANSFORM',
        `GLB node ${object.name || object.uuid} has a non-finite transform.`,
        `$.glb.nodes[${object.name || object.uuid}]`,
      );
    }
  });
}

function runtimeBounds(root: Object3D, path: string): LowpassResolvedBounds {
  const box = new Box3().setFromObject(root);
  const min = box.min.toArray();
  const max = box.max.toArray();
  if (box.isEmpty() || ![...min, ...max].every(Number.isFinite)) {
    fail('INVALID_BOUNDS', `${path} has invalid runtime bounds.`, path);
  }
  return {
    min: [min[0], min[1], min[2]],
    max: [max[0], max[1], max[2]],
  };
}

function collectMeshStats(root: Object3D): {
  meshCount: number;
  triangles: number;
  materials: ReadonlyMap<string, Material>;
} {
  let meshCount = 0;
  let triangles = 0;
  const materials = new Map<string, Material>();
  root.traverse((object) => {
    const mesh = meshOf(object);
    if (!mesh) return;
    meshCount += 1;
    triangles += triangleCount(mesh.geometry);
    const meshMaterials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    meshMaterials.forEach((material) => {
      if (material.name) materials.set(material.name, material);
    });
  });
  return { meshCount, triangles, materials };
}

function disposeOwnedResources(root: Object3D): {
  geometries: number;
  materials: number;
} {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  root.traverse((object) => {
    const mesh = meshOf(object);
    if (!mesh) return;
    geometries.add(mesh.geometry);
    const meshMaterials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    meshMaterials.forEach((material) => materials.add(material));
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  return { geometries: geometries.size, materials: materials.size };
}

function requireStableNode(
  stableNodes: ReadonlyMap<string, Object3D>,
  id: string,
  code: LowpassArtifactConsumerErrorCode,
  path: string,
): Object3D {
  const object = stableNodes.get(id);
  if (!object) {
    fail(code, `Stable node ${id} could not be resolved.`, path);
  }
  return object;
}

function resolveCandidate(
  manifest: LowpassRuntimeAssetManifest,
  parsedScene: Group,
): {
  group: Group;
  assetsByKey: ReadonlyMap<string, LowpassResolvedAsset>;
  stats: LowpassArtifactConsumerStats;
} {
  validateFiniteTransforms(parsedScene);
  const objectsByName = collectObjectNames(parsedScene);
  const materialsByName = collectMaterialNames(parsedScene);
  const stableNodes = new Map<string, Object3D>();

  manifest.stableNodeMap.forEach((entry, index) => {
    requireString(entry.stableId, `$.stableNodeMap[${index}].stableId`);
    requireString(entry.glbNodeName, `$.stableNodeMap[${index}].glbNodeName`);
    if (stableNodes.has(entry.stableId)) {
      fail(
        'MANIFEST_INVALID',
        `Stable node ID ${entry.stableId} is duplicated.`,
        `$.stableNodeMap[${index}].stableId`,
      );
    }
    const matches = objectsByName.get(entry.glbNodeName) ?? [];
    if (matches.length === 0) {
      fail(
        'STABLE_NODE_MISSING',
        `GLB node ${entry.glbNodeName} is missing for stable ID ${entry.stableId}.`,
        `$.stableNodeMap[${index}]`,
      );
    }
    if (matches.length > 1) {
      fail(
        'STABLE_NODE_AMBIGUOUS',
        `GLB node ${entry.glbNodeName} is not unique.`,
        `$.stableNodeMap[${index}]`,
      );
    }
    stableNodes.set(entry.stableId, matches[0] as Object3D);
  });

  manifest.collisionProxyIds.forEach((id, index) => {
    requireStableNode(
      stableNodes,
      id,
      'COLLISION_PROXY_UNRESOLVED',
      `$.collisionProxyIds[${index}]`,
    );
  });
  manifest.interactionAnchorIds.forEach((id, index) => {
    requireStableNode(
      stableNodes,
      id,
      'INTERACTION_ANCHOR_UNRESOLVED',
      `$.interactionAnchorIds[${index}]`,
    );
  });
  manifest.meshNodeIds.forEach((id, index) => {
    const object = requireStableNode(
      stableNodes,
      id,
      'SEMANTIC_REFERENCE_UNRESOLVED',
      `$.meshNodeIds[${index}]`,
    );
    if (!meshOf(object)) {
      fail(
        'SEMANTIC_REFERENCE_UNRESOLVED',
        `Declared mesh node ${id} is not a mesh.`,
        `$.meshNodeIds[${index}]`,
      );
    }
  });
  manifest.materialIds.forEach((id, index) => {
    if (!materialsByName.has(id)) {
      fail(
        'MATERIAL_UNRESOLVED',
        `Declared material ${id} is not present in the GLB.`,
        `$.materialIds[${index}]`,
      );
    }
  });

  const allAnchors = new Map<string, Object3D>();
  manifest.assets.forEach((asset, assetIndex) => {
    asset.anchors.forEach((anchor, anchorIndex) => {
      allAnchors.set(
        anchor.id,
        requireStableNode(
          stableNodes,
          anchor.nodeId,
          'SEMANTIC_REFERENCE_UNRESOLVED',
          `$.assets[${assetIndex}].anchors[${anchorIndex}].nodeId`,
        ),
      );
    });
  });
  manifest.socketIds.forEach((id, index) => {
    if (!allAnchors.has(id)) {
      fail(
        'SEMANTIC_REFERENCE_UNRESOLVED',
        `Declared socket ${id} is not present in semantic anchors.`,
        `$.socketIds[${index}]`,
      );
    }
  });

  const assetsByKey = new Map<string, LowpassResolvedAsset>();
  manifest.assets.forEach((asset, assetIndex) => {
    if (assetsByKey.has(asset.assetKey)) {
      fail(
        'MANIFEST_INVALID',
        `Asset key ${asset.assetKey} is duplicated.`,
        `$.assets[${assetIndex}].assetKey`,
      );
    }
    const root = requireStableNode(
      stableNodes,
      asset.rootNodeId,
      'ASSET_ROOT_UNRESOLVED',
      `$.assets[${assetIndex}].rootNodeId`,
    );
    const declaredBounds = validateBounds(
      asset.bounds,
      `$.assets[${assetIndex}].bounds`,
    );
    const assetStableNodes = new Map<string, Object3D>();
    asset.stableNodeIds.forEach((id, index) => {
      assetStableNodes.set(
        id,
        requireStableNode(
          stableNodes,
          id,
          'SEMANTIC_REFERENCE_UNRESOLVED',
          `$.assets[${assetIndex}].stableNodeIds[${index}]`,
        ),
      );
    });
    asset.meshNodeIds.forEach((id, index) => {
      const object = requireStableNode(
        stableNodes,
        id,
        'SEMANTIC_REFERENCE_UNRESOLVED',
        `$.assets[${assetIndex}].meshNodeIds[${index}]`,
      );
      if (!meshOf(object)) {
        fail(
          'SEMANTIC_REFERENCE_UNRESOLVED',
          `Asset mesh node ${id} is not a mesh.`,
          `$.assets[${assetIndex}].meshNodeIds[${index}]`,
        );
      }
    });
    asset.visualNodeIds.forEach((id, index) => {
      requireStableNode(
        stableNodes,
        id,
        'SEMANTIC_REFERENCE_UNRESOLVED',
        `$.assets[${assetIndex}].visualNodeIds[${index}]`,
      );
    });
    asset.features.forEach((feature, index) => {
      requireStableNode(
        stableNodes,
        feature.nodeId,
        'SEMANTIC_REFERENCE_UNRESOLVED',
        `$.assets[${assetIndex}].features[${index}].nodeId`,
      );
    });
    const collisionProxies = new Map<string, Object3D>();
    asset.collisionProxyIds.forEach((id, index) => {
      collisionProxies.set(
        id,
        requireStableNode(
          stableNodes,
          id,
          'COLLISION_PROXY_UNRESOLVED',
          `$.assets[${assetIndex}].collisionProxyIds[${index}]`,
        ),
      );
    });
    const interactionAnchors = new Map<string, Object3D>();
    asset.interactionAnchorIds.forEach((id, index) => {
      interactionAnchors.set(
        id,
        requireStableNode(
          stableNodes,
          id,
          'INTERACTION_ANCHOR_UNRESOLVED',
          `$.assets[${assetIndex}].interactionAnchorIds[${index}]`,
        ),
      );
    });
    const semanticAnchors = new Map<string, Object3D>();
    asset.anchors.forEach((anchor, index) => {
      semanticAnchors.set(
        anchor.id,
        requireStableNode(
          stableNodes,
          anchor.nodeId,
          'SEMANTIC_REFERENCE_UNRESOLVED',
          `$.assets[${assetIndex}].anchors[${index}].nodeId`,
        ),
      );
    });
    asset.socketIds.forEach((id, index) => {
      if (!semanticAnchors.has(id)) {
        fail(
          'SEMANTIC_REFERENCE_UNRESOLVED',
          `Asset socket ${id} is not present in its semantic anchors.`,
          `$.assets[${assetIndex}].socketIds[${index}]`,
        );
      }
    });
    const assetMaterials = new Map<string, Material>();
    asset.materialIds.forEach((id, index) => {
      const material = materialsByName.get(id);
      if (!material) {
        fail(
          'MATERIAL_UNRESOLVED',
          `Asset material ${id} is not present in the GLB.`,
          `$.assets[${assetIndex}].materialIds[${index}]`,
        );
      }
      assetMaterials.set(id, material);
    });
    const meshStats = collectMeshStats(root);
    if (
      meshStats.triangles !== asset.triangleCount ||
      meshStats.materials.size !== asset.materialCount
    ) {
      fail(
        'COUNT_MISMATCH',
        `Asset ${asset.assetId} runtime counts differ from its manifest.`,
        `$.assets[${assetIndex}]`,
      );
    }
    if (
      meshStats.triangles > manifest.budgets.maxTrianglesPerAsset ||
      meshStats.materials.size > manifest.budgets.maxMaterialsPerAsset ||
      asset.textureDimensions.some(
        ({ width, height }) =>
          width > manifest.budgets.maxTextureDimension ||
          height > manifest.budgets.maxTextureDimension,
      )
    ) {
      fail(
        'BUDGET_EXCEEDED',
        `Asset ${asset.assetId} exceeds a declared runtime budget.`,
        `$.assets[${assetIndex}]`,
      );
    }
    assetsByKey.set(asset.assetKey, {
      assetId: asset.assetId,
      assetKey: asset.assetKey,
      instanceId: asset.instanceId,
      role: asset.role,
      faction: asset.faction,
      root,
      stableNodes: assetStableNodes,
      collisionProxies,
      interactionAnchors,
      semanticAnchors,
      materials: assetMaterials,
      declaredBounds,
      runtimeBounds: runtimeBounds(
        root,
        `$.assets[${assetIndex}].runtimeBounds`,
      ),
      meshCount: meshStats.meshCount,
      triangleCount: meshStats.triangles,
      materialCount: meshStats.materials.size,
    });
  });

  const sceneStats = collectMeshStats(parsedScene);
  if (
    sceneStats.meshCount !== manifest.meshNodeIds.length ||
    sceneStats.triangles !== manifest.triangleCount ||
    sceneStats.materials.size !== manifest.materialIds.length
  ) {
    fail(
      'COUNT_MISMATCH',
      'Parsed GLB counts differ from the LOWPASS manifest.',
      '$.glb',
    );
  }

  const group = new Group();
  group.name = `lowpass-consumer--${manifest.assetPackId}`;
  group.userData = {
    kind: 'lowpass-artifact-consumer',
    contractVersion: LOWPASS_ARTIFACT_CONSUMER_CONTRACT_VERSION,
    assetPackId: manifest.assetPackId,
  };
  group.add(parsedScene);
  return {
    group,
    assetsByKey,
    stats: {
      assets: assetsByKey.size,
      stableNodes: stableNodes.size,
      meshes: sceneStats.meshCount,
      triangles: sceneStats.triangles,
      materials: manifest.materialCount,
      uniqueMaterials: sceneStats.materials.size,
      collisionProxies: manifest.collisionProxyIds.length,
      interactionAnchors: manifest.interactionAnchorIds.length,
    },
  };
}

export class LowpassArtifactConsumer {
  #active: ConsumerResult | null = null;

  get active(): LowpassArtifactConsumerResult | null {
    return this.#active;
  }

  async load(
    options: LowpassArtifactConsumerLoadOptions,
  ): Promise<LowpassArtifactConsumerOutcome> {
    if (options.enabled === false) {
      return {
        ok: true,
        state: 'disabled',
        attached: false,
        result: null,
      };
    }

    let candidate: ConsumerResult | null = null;
    try {
      const manifest = validateManifest(options.manifest);
      const glb = normalizeBytes(options.glb);
      if (glb.byteLength !== manifest.files.glb.bytes) {
        fail(
          'GLB_BYTE_COUNT_MISMATCH',
          `GLB byte count ${glb.byteLength} does not match manifest byte count ${manifest.files.glb.bytes}.`,
          '$.files.glb.bytes',
        );
      }
      const actualHash = await sha256(glb);
      if (actualHash !== manifest.files.glb.sha256) {
        fail(
          'GLB_HASH_MISMATCH',
          `GLB SHA-256 ${actualHash} does not match manifest identity ${manifest.files.glb.sha256}.`,
          '$.files.glb.sha256',
        );
      }

      let parsedScene: Group;
      try {
        const gltf = await new GLTFLoader().parseAsync(
          Uint8Array.from(glb).buffer,
          '',
        );
        parsedScene = gltf.scene;
      } catch (error) {
        fail(
          'GLB_PARSE_FAILED',
          `GLTFLoader could not parse the supplied GLB: ${error instanceof Error ? error.message : String(error)}`,
          '$.glb',
        );
      }

      const resolved = resolveCandidate(manifest, parsedScene);
      candidate = new ConsumerResult(
        manifest,
        resolved.group,
        resolved.assetsByKey,
        resolved.stats,
        (result) => {
          if (this.#active === result) this.#active = null;
        },
      );

      if (!options.target) {
        return {
          ok: true,
          state: 'loaded',
          attached: false,
          result: candidate,
        };
      }

      if (this.#active && !this.#active.disposed) {
        if (!options.replaceExisting) {
          candidate.dispose();
          return {
            ok: true,
            state: 'already-attached',
            attached: true,
            result: this.#active,
          };
        }
        this.#active.dispose();
      }
      options.target.add(candidate.group);
      this.#active = candidate;
      return {
        ok: true,
        state: 'loaded',
        attached: true,
        result: candidate,
      };
    } catch (error) {
      candidate?.dispose();
      if (error instanceof ConsumerValidationFailure) {
        return {
          ok: false,
          state: 'failed',
          attached: false,
          result: null,
          error: error.detail,
        };
      }
      return {
        ok: false,
        state: 'failed',
        attached: false,
        result: null,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error instanceof Error ? error.message : String(error),
          path: '$',
        },
      };
    }
  }

  dispose(): LowpassArtifactConsumerDisposal {
    if (!this.#active) {
      return { geometries: 0, materials: 0, alreadyDisposed: true };
    }
    return this.#active.dispose();
  }
}
