import {
  Box3,
  Group,
  Mesh,
  Object3D,
  Vector3,
  type Material,
} from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import {
  generateAllPlacements,
  recipeHash,
  resolveInstanceAsset,
  stableStringify,
  validateRecipe,
} from '@cgawe/core';
import type { Recipe, Transform, ValidationIssue, Vec3 } from '@cgawe/schema';
import { buildAssetObject, buildSplineObject, disposeObject } from './index.js';

export const RUNTIME_BUNDLE_CONTRACT_VERSION = 'cgawe-runtime-bundle-1.0.0';
export const RUNTIME_BUNDLE_MANIFEST_VERSION = '1.0.0';

export interface RuntimeBundleRights {
  status: 'NOASSERTION' | 'DECLARED';
  licenseId?: string;
  notice: string;
}

export interface RuntimeBundleNode {
  stableId: string;
  glbNodeName: string;
  kind: 'root' | 'scene-instance' | 'scene-part' | 'placement' | 'placement-part' | 'spline' | 'room' | 'socket';
  sourceId: string;
}

export interface RuntimeBundleManifest {
  contractVersion: typeof RUNTIME_BUNDLE_CONTRACT_VERSION;
  manifestSchemaVersion: typeof RUNTIME_BUNDLE_MANIFEST_VERSION;
  projectId: string;
  source: {
    recipeSchemaVersion: Recipe['schemaVersion'];
    recipeHash: string;
    recipeSha256: string;
    generationSeed: number;
  };
  coordinateSystem: {
    handedness: 'right';
    upAxis: '+Y';
    forwardAxis: '-Z';
    unit: 'meter';
    rotationUnit: 'radian';
  };
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
  };
  rootNodeId: string;
  sceneInstances: Array<{
    id: string;
    assetId: string;
    nodeId: string;
    transform: Transform;
    variantSetId?: string;
    partIds: string[];
  }>;
  placements: Array<{
    id: string;
    ruleId: string;
    sequenceIndex: number;
    assetId: string;
    nodeId: string;
    transform: Transform;
    variantSeed: number;
    variantSetId?: string;
    partIds: string[];
  }>;
  splines: Array<{
    id: string;
    nodeId: string;
    materialId: string;
    controlPointCount: number;
    closed: boolean;
  }>;
  rooms: Array<{
    id: string;
    nodeId: string;
    position: Vec3;
    width: number;
    height: number;
    depth: number;
    floorY: number;
    materialId: string;
  }>;
  sockets: Array<{
    id: string;
    nodeId: string;
    roomId: string;
    type: string;
    position: Vec3;
    orientation: Vec3;
    compatibleTags: string[];
  }>;
  nodeMap: RuntimeBundleNode[];
  counts: {
    nodes: number;
    meshes: number;
    vertices: number;
    triangles: number;
    materials: number;
    sceneInstances: number;
    placements: number;
    splines: number;
    rooms: number;
    sockets: number;
  };
  bounds: {
    min: Vec3;
    max: Vec3;
  };
  validation: {
    errorCount: 0;
    warningCount: number;
    warningCodes: string[];
  };
  rights: RuntimeBundleRights;
}

export interface RuntimeBundle {
  glb: ArrayBuffer;
  manifest: RuntimeBundleManifest;
  manifestText: string;
}

export interface RuntimeBundleOptions {
  rights?: RuntimeBundleRights;
  preserveMaterialIds?: boolean;
  reuseMaterials?: boolean;
}

export class RuntimeBundleValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    const errors = issues.filter((issue) => issue.severity === 'error');
    super(`Runtime Bundle blocked by ${errors.length} Recipe validation error${errors.length === 1 ? '' : 's'}.`);
    this.name = 'RuntimeBundleValidationError';
    this.issues = issues;
  }
}

function applyTransform(object: Object3D, transform: Transform): void {
  object.position.set(...transform.position);
  object.rotation.set(...transform.rotation);
  object.scale.set(...transform.scale);
}

function nodeToken(value: string): string {
  return [...value].map((character) => (
    /[A-Za-z0-9_-]/.test(character)
      ? character
      : `_u${character.codePointAt(0)?.toString(16) ?? '0'}_`
  )).join('');
}

function registerNode(
  nodeMap: RuntimeBundleNode[],
  object: Object3D,
  stableId: string,
  kind: RuntimeBundleNode['kind'],
  sourceId: string,
): void {
  object.name = stableId;
  object.userData = { stableId, kind, sourceId };
  nodeMap.push({ stableId, glbNodeName: stableId, kind, sourceId });
}

function registerAssetParts(
  nodeMap: RuntimeBundleNode[],
  group: Group,
  ownerId: string,
  kind: 'scene-part' | 'placement-part',
): string[] {
  const partIds: string[] = [];
  for (const object of group.children) {
    const partId = typeof object.userData.partId === 'string' ? object.userData.partId : object.name;
    const stableId = `${kind}--${nodeToken(ownerId)}--${nodeToken(partId)}`;
    registerNode(nodeMap, object, stableId, kind, partId);
    partIds.push(partId);
  }
  return partIds;
}

function toVec3(vector: Vector3): Vec3 {
  return [vector.x, vector.y, vector.z];
}

function collectStats(root: Object3D): {
  nodes: number;
  meshes: number;
  vertices: number;
  triangles: number;
  materials: number;
  bounds: RuntimeBundleManifest['bounds'];
} {
  let nodes = 0;
  let meshes = 0;
  let vertices = 0;
  let triangles = 0;
  const materials = new Set<Material>();
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    nodes += 1;
    if (!(object instanceof Mesh)) return;
    meshes += 1;
    const position = object.geometry.getAttribute('position');
    vertices += position?.count ?? 0;
    triangles += object.geometry.index ? object.geometry.index.count / 3 : (position?.count ?? 0) / 3;
    const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
    meshMaterials.forEach((material) => materials.add(material));
  });
  const box = new Box3().setFromObject(root);
  const bounds = box.isEmpty()
    ? { min: [0, 0, 0] as Vec3, max: [0, 0, 0] as Vec3 }
    : { min: toVec3(box.min), max: toVec3(box.max) };
  return { nodes, meshes, vertices, triangles, materials: materials.size, bounds };
}

async function sha256(data: string | ArrayBuffer): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${[...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function canonicalManifestText(manifest: RuntimeBundleManifest): string {
  return `${JSON.stringify(JSON.parse(stableStringify(manifest)), null, 2)}\n`;
}

function defaultRights(): RuntimeBundleRights {
  return {
    status: 'NOASSERTION',
    notice: 'No license assertion is made by the generic Runtime Bundle exporter.',
  };
}

export async function buildRuntimeBundle(recipe: Recipe, options: RuntimeBundleOptions = {}): Promise<RuntimeBundle> {
  const issues = validateRecipe(recipe);
  if (issues.some((issue) => issue.severity === 'error')) throw new RuntimeBundleValidationError(issues);

  const root = new Group();
  const rootNodeId = `runtime-root--${nodeToken(recipe.projectId)}`;
  const nodeMap: RuntimeBundleNode[] = [];
  registerNode(nodeMap, root, rootNodeId, 'root', recipe.projectId);

  const sceneInstances: RuntimeBundleManifest['sceneInstances'] = [];
  const placements: RuntimeBundleManifest['placements'] = [];
  const splines: RuntimeBundleManifest['splines'] = [];
  const rooms: RuntimeBundleManifest['rooms'] = [];
  const sockets: RuntimeBundleManifest['sockets'] = [];

  for (const instance of [...recipe.sceneInstances].sort((a, b) => a.id.localeCompare(b.id))) {
    const asset = resolveInstanceAsset(recipe, instance);
    const variant = instance.variantSetId
      ? recipe.variantSets.find((candidate) => candidate.id === instance.variantSetId)
      : undefined;
    const object = buildAssetObject(recipe, asset, {
      ...(variant ? { variant } : {}),
      variantSeed: recipe.generationSeed,
      ...(options.preserveMaterialIds === undefined ? {} : { preserveMaterialIds: options.preserveMaterialIds }),
      ...(options.reuseMaterials === undefined ? {} : { reuseMaterials: options.reuseMaterials }),
    });
    const nodeId = `scene-instance--${nodeToken(instance.id)}`;
    registerNode(nodeMap, object, nodeId, 'scene-instance', instance.id);
    const partIds = registerAssetParts(nodeMap, object, instance.id, 'scene-part');
    applyTransform(object, instance.transform);
    root.add(object);
    sceneInstances.push({
      id: instance.id,
      assetId: instance.assetId,
      nodeId,
      transform: structuredClone(instance.transform),
      ...(instance.variantSetId ? { variantSetId: instance.variantSetId } : {}),
      partIds,
    });
  }

  for (const placement of generateAllPlacements(recipe)) {
    const sequenceIndex = Number.parseInt(placement.id.slice(placement.ruleId.length + 1), 10);
    const asset = recipe.assetDefinitions.find((candidate) => candidate.id === placement.assetId);
    if (!asset) throw new Error(`Placement ${placement.id} references missing asset ${placement.assetId}.`);
    const variant = placement.variantSetId
      ? recipe.variantSets.find((candidate) => candidate.id === placement.variantSetId)
      : undefined;
    const object = buildAssetObject(recipe, asset, {
      ...(variant ? { variant } : {}),
      variantSeed: placement.variantSeed,
      ...(options.preserveMaterialIds === undefined ? {} : { preserveMaterialIds: options.preserveMaterialIds }),
      ...(options.reuseMaterials === undefined ? {} : { reuseMaterials: options.reuseMaterials }),
    });
    const nodeId = `placement--${nodeToken(placement.ruleId)}--${sequenceIndex}`;
    registerNode(nodeMap, object, nodeId, 'placement', placement.id);
    const partIds = registerAssetParts(nodeMap, object, placement.id, 'placement-part');
    applyTransform(object, placement.transform);
    root.add(object);
    placements.push({
      id: placement.id,
      ruleId: placement.ruleId,
      sequenceIndex,
      assetId: placement.assetId,
      nodeId,
      transform: structuredClone(placement.transform),
      variantSeed: placement.variantSeed,
      ...(placement.variantSetId ? { variantSetId: placement.variantSetId } : {}),
      partIds,
    });
  }

  for (const spline of [...recipe.splineDefinitions].sort((a, b) => a.id.localeCompare(b.id))) {
    const object = buildSplineObject(recipe, spline.id);
    const nodeId = `spline--${nodeToken(spline.id)}`;
    registerNode(nodeMap, object, nodeId, 'spline', spline.id);
    root.add(object);
    splines.push({
      id: spline.id,
      nodeId,
      materialId: spline.materialId,
      controlPointCount: spline.controlPoints.length,
      closed: spline.closed,
    });
  }

  for (const room of [...recipe.roomDefinitions].sort((a, b) => a.id.localeCompare(b.id))) {
    const object = new Object3D();
    const nodeId = `room--${nodeToken(room.id)}`;
    registerNode(nodeMap, object, nodeId, 'room', room.id);
    object.position.set(...room.position);
    root.add(object);
    rooms.push({
      id: room.id,
      nodeId,
      position: structuredClone(room.position),
      width: room.width,
      height: room.height,
      depth: room.depth,
      floorY: room.floorY,
      materialId: room.materialId,
    });
  }

  for (const socket of [...recipe.socketDefinitions].sort((a, b) => a.id.localeCompare(b.id))) {
    const object = new Object3D();
    const nodeId = `socket--${nodeToken(socket.id)}`;
    registerNode(nodeMap, object, nodeId, 'socket', socket.id);
    object.position.set(...socket.position);
    object.rotation.set(...socket.orientation);
    root.add(object);
    sockets.push({
      id: socket.id,
      nodeId,
      roomId: socket.roomId,
      type: socket.type,
      position: structuredClone(socket.position),
      orientation: structuredClone(socket.orientation),
      compatibleTags: [...socket.compatibleTags],
    });
  }

  try {
    const stats = collectStats(root);
    const exported = await new GLTFExporter().parseAsync(root, { binary: true, onlyVisible: true });
    if (!(exported instanceof ArrayBuffer) || exported.byteLength === 0) {
      throw new Error('GLTFExporter returned no binary Runtime Bundle data.');
    }
    const recipeText = stableStringify(recipe);
    const glbName = `${recipe.projectId}.runtime.glb`;
    const manifestName = `${recipe.projectId}.runtime.manifest.json`;
    const warnings = issues.filter((issue) => issue.severity === 'warning');
    const manifest: RuntimeBundleManifest = {
      contractVersion: RUNTIME_BUNDLE_CONTRACT_VERSION,
      manifestSchemaVersion: RUNTIME_BUNDLE_MANIFEST_VERSION,
      projectId: recipe.projectId,
      source: {
        recipeSchemaVersion: recipe.schemaVersion,
        recipeHash: recipeHash(recipe),
        recipeSha256: await sha256(recipeText),
        generationSeed: recipe.generationSeed,
      },
      coordinateSystem: {
        handedness: 'right',
        upAxis: '+Y',
        forwardAxis: '-Z',
        unit: 'meter',
        rotationUnit: 'radian',
      },
      files: {
        glb: {
          name: glbName,
          mediaType: 'model/gltf-binary',
          bytes: exported.byteLength,
          sha256: await sha256(exported),
        },
        manifest: {
          name: manifestName,
          mediaType: 'application/json',
        },
      },
      rootNodeId,
      sceneInstances,
      placements,
      splines,
      rooms,
      sockets,
      nodeMap,
      counts: {
        nodes: stats.nodes,
        meshes: stats.meshes,
        vertices: stats.vertices,
        triangles: stats.triangles,
        materials: stats.materials,
        sceneInstances: sceneInstances.length,
        placements: placements.length,
        splines: splines.length,
        rooms: rooms.length,
        sockets: sockets.length,
      },
      bounds: stats.bounds,
      validation: {
        errorCount: 0,
        warningCount: warnings.length,
        warningCodes: [...new Set(warnings.map((issue) => issue.code))].sort(),
      },
      rights: structuredClone(options.rights ?? defaultRights()),
    };
    return { glb: exported, manifest, manifestText: canonicalManifestText(manifest) };
  } finally {
    disposeObject(root);
  }
}
