import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Box3, Group, Mesh, Vector3 } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { buildAssetObject, buildSplineObject, disposeObject } from '@cgawe/adapter-three';
import {
  createAssetMeshes,
  generateSplineMesh,
  getMeshStats,
  recipeHash,
  resolveInstanceAsset,
  stableStringify,
  validateRecipe,
} from '@cgawe/core';
import { parseRecipe } from '@cgawe/schema';

export const PAPER_GLIDER_BASELINE_COMMIT = '3ad5ac1fbc6715f36f4b2d961754dfd8d7f35750';
export const COMPAT_CONTRACT_VERSION = 'paper-glider-compat-v1';
export const COMPAT_GENERATOR_VERSION = '1.1.0';
export const PAPER_GLIDER_RIGHTS_IDENTIFIER = 'LicenseRef-PaperGlider-Project-Asset';
export const PAPER_GLIDER_RIGHTS_REPOSITORY_PATH = 'docs/compat/paper-glider-v1/RIGHTS.md';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const compatibilityPaths = {
  root,
  bundleDir: resolve(root, 'docs/compat/paper-glider-v1'),
  bundleReadme: resolve(root, 'docs/compat/paper-glider-v1/README.md'),
  handoff: resolve(root, 'docs/PROJECT_HANDOFF.md'),
  matrix: resolve(root, 'docs/PAPER_GLIDER_COMPATIBILITY_PACKET_V1.md'),
  nextPrompt: resolve(root, 'docs/NEXT_AGENT_PROMPT.md'),
  recipe: resolve(root, 'docs/compat/paper-glider-v1/paper-glider-canary.recipe.json'),
  rights: resolve(root, 'docs/compat/paper-glider-v1/RIGHTS.md'),
  schema: resolve(root, 'docs/compat/paper-glider-v1/paper-glider-compat-manifest-v1.schema.json'),
  glb: resolve(root, 'docs/compat/paper-glider-v1/paper-glider-archive-gate.glb'),
  manifest: resolve(root, 'docs/compat/paper-glider-v1/paper-glider-archive-gate.manifest.json'),
  visualReadback: resolve(root, 'docs/compat/paper-glider-v1/visual-readback.json'),
};

const colliderDefinitions = [
  {
    id: 'collider-left-pier',
    label: 'archive gate left pier',
    shape: 'aabb',
    center: [-3.65, 2.2, 0],
    halfExtents: [0.55, 2.2, 0.7],
    visualNodeIds: ['part-left-pier'],
  },
  {
    id: 'collider-right-pier',
    label: 'archive gate right pier',
    shape: 'aabb',
    center: [3.65, 2.2, 0],
    halfExtents: [0.55, 2.2, 0.7],
    visualNodeIds: ['part-right-pier'],
  },
  {
    id: 'collider-top-beam',
    label: 'archive gate top beam',
    shape: 'aabb',
    center: [0, 4.65, 0],
    halfExtents: [4.2, 0.275, 0.7],
    visualNodeIds: ['part-top-beam'],
  },
];

// V8's sRGB transfer calculation can differ by one ULP between supported Node
// majors. The compatibility packet promises byte-identical GLB regeneration,
// so snap the canary's known linear color components to the already-published
// values before GLTFExporter serializes them. Values outside the pinned canary
// palette are left alone and therefore still surface intentional Recipe edits.
const canonicalCanaryColorComponents = [
  0.181164244239483,
  0.08228270712149792,
  0.04518620437910499,
  0.7835377915215659,
  0.6866853124288864,
  0.508881320845802,
  0.4793201830913402,
  0.11193242782769693,
  0.06480326668529614,
  0.4735314961384573,
  0.1844749944900301,
  0.06301001764564068,
  0.9215818562755338,
  0.5647115056965487,
  0.15292615198613213,
];

function stabilizeCanaryMaterialColors(rootObject) {
  rootObject.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (!material.color) return;
      for (const channel of ['r', 'g', 'b']) {
        const canonical = canonicalCanaryColorComponents.find(
          (value) => Math.abs(value - material.color[channel]) <= Number.EPSILON,
        );
        if (canonical !== undefined) material.color[channel] = canonical;
      }
    });
  });
}

class NodeFileReader {
  result = null;
  error = null;
  onloadend = null;
  onerror = null;

  readAsArrayBuffer(blob) {
    blob.arrayBuffer()
      .then((result) => {
        this.result = result;
        this.onloadend?.({ target: this });
      })
      .catch((error) => {
        this.error = error;
        this.onerror?.({ target: this });
        this.onloadend?.({ target: this });
      });
  }

  readAsDataURL(blob) {
    blob.arrayBuffer()
      .then((result) => {
        this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(result).toString('base64')}`;
        this.onloadend?.({ target: this });
      })
      .catch((error) => {
        this.error = error;
        this.onerror?.({ target: this });
        this.onloadend?.({ target: this });
      });
  }
}

function installNodeFileReader() {
  if (typeof globalThis.FileReader === 'undefined') globalThis.FileReader = NodeFileReader;
}

export function sha256(data) {
  return `sha256:${createHash('sha256').update(data).digest('hex')}`;
}

export function calculateManifestContentHash(manifest) {
  const payload = structuredClone(manifest);
  delete payload.contentHash;
  return sha256(stableStringify(payload));
}

function finiteNumber(value) {
  return Object.is(value, -0) ? 0 : Number(value.toFixed(6));
}

function vectorToArray(vector) {
  return [finiteNumber(vector.x), finiteNumber(vector.y), finiteNumber(vector.z)];
}

function applyTransform(object, transform) {
  object.position.fromArray(transform.position);
  object.rotation.set(...transform.rotation);
  object.scale.fromArray(transform.scale);
}

export function buildCanaryScene(recipe) {
  const instance = recipe.sceneInstances.find((item) => item.id === 'instance-archive-gate');
  const spline = recipe.splineDefinitions.find((item) => item.id === 'spline-route-arch');
  if (!instance || !spline) throw new Error('Canary Recipe is missing its required instance or spline.');

  const resolvedAsset = resolveInstanceAsset(recipe, instance);
  const variant = recipe.variantSets.find((item) => item.id === instance.variantSetId);
  const room = recipe.roomDefinitions.find((item) => item.id === 'room-paper-glider-segment');
  if (!room) throw new Error('Canary Recipe is missing room-paper-glider-segment.');

  const rootObject = new Group();
  rootObject.name = 'room-archetype-archive-gate-v1';
  rootObject.userData = { contractVersion: COMPAT_CONTRACT_VERSION, roomId: room.id };

  const assetObject = buildAssetObject(recipe, resolvedAsset, {
    variant,
    variantSeed: recipe.generationSeed,
  });
  assetObject.name = resolvedAsset.id;
  assetObject.userData = { ...assetObject.userData, instanceId: instance.id, label: resolvedAsset.name };
  applyTransform(assetObject, instance.transform);

  const parts = new Map(resolvedAsset.parts.map((part) => [part.id, part]));
  assetObject.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const partId = child.userData.partId;
    const part = parts.get(partId);
    if (!part) throw new Error(`Exported part node ${partId} is not present in the resolved asset.`);
    child.name = part.id;
    child.userData = { ...child.userData, label: part.name, materialId: part.materialId };
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => { material.name = part.materialId; });
  });

  const splineObject = buildSplineObject(recipe, spline.id);
  splineObject.name = spline.id;
  splineObject.userData = { ...splineObject.userData, label: spline.name, materialId: spline.materialId };
  const splineMaterials = Array.isArray(splineObject.material) ? splineObject.material : [splineObject.material];
  splineMaterials.forEach((material) => { material.name = spline.materialId; });

  rootObject.add(assetObject, splineObject);
  stabilizeCanaryMaterialColors(rootObject);
  rootObject.updateMatrixWorld(true);
  return { rootObject, resolvedAsset, spline, room };
}

async function exportCanaryGlb(rootObject) {
  installNodeFileReader();
  const result = await new GLTFExporter().parseAsync(rootObject, { binary: true, onlyVisible: true });
  if (!(result instanceof ArrayBuffer) || result.byteLength === 0) {
    throw new Error('GLTFExporter did not return a non-empty GLB ArrayBuffer.');
  }
  return Buffer.from(result);
}

function buildManifest(recipe, scene, glb, recipeBytes, rightsBytes, schemaBytes) {
  const assetMeshes = createAssetMeshes(scene.resolvedAsset);
  const splineMesh = generateSplineMesh(scene.spline);
  const stats = getMeshStats([...assetMeshes, splineMesh]);
  const box = new Box3().setFromObject(scene.rootObject);
  const boxSize = box.getSize(new Vector3());
  const visualNodes = [
    ...scene.resolvedAsset.parts.map((part) => ({ id: part.id, name: part.name, kind: 'part', materialId: part.materialId })),
    { id: scene.spline.id, name: scene.spline.name, kind: 'spline', materialId: scene.spline.materialId },
  ];
  const usedMaterialIds = new Set(visualNodes.map((node) => node.materialId));
  const materials = recipe.materialDefinitions
    .filter((material) => usedMaterialIds.has(material.id))
    .map((material) => ({
      id: material.id,
      name: material.name,
      color: material.color,
      roughness: material.roughness,
      metalness: material.metalness,
      doubleSided: true,
      alphaMode: 'OPAQUE',
      texture: null,
    }));
  const exportedMaterials = new Set();
  scene.rootObject.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    objectMaterials.forEach((material) => exportedMaterials.add(material));
  });
  const sockets = recipe.socketDefinitions.map((socket) => ({
    id: socket.id,
    type: socket.type,
    position: socket.position,
    orientationRadians: socket.orientation,
    compatibleTags: socket.compatibleTags,
  }));
  const manifest = {
    contractVersion: COMPAT_CONTRACT_VERSION,
    paperGliderBaselineCommit: PAPER_GLIDER_BASELINE_COMMIT,
    generatorVersion: COMPAT_GENERATOR_VERSION,
    source: {
      recipeFile: 'paper-glider-canary.recipe.json',
      recipeSchemaVersion: recipe.schemaVersion,
      projectId: recipe.projectId,
      recipeHash: recipeHash(recipe),
      recipeSha256: sha256(recipeBytes),
    },
    coordinateSystem: {
      handedness: 'right',
      upAxis: '+Y',
      forwardAxis: '-Z',
      unitMeters: 1,
    },
    placement: {
      pivot: [0, 0, 0],
      origin: 'floor-center',
      position: [0, scene.room.floorY, 0],
      rotationRadians: [0, 0, 0],
      scale: [1, 1, 1],
    },
    room: {
      id: scene.room.id,
      width: scene.room.width,
      height: scene.room.height,
      length: scene.room.depth,
      floorY: scene.room.floorY,
    },
    bounds: {
      min: vectorToArray(box.min),
      max: vectorToArray(box.max),
      size: vectorToArray(boxSize),
    },
    counts: {
      visualNodeCount: visualNodes.length,
      meshCount: visualNodes.length,
      vertexCount: stats.vertexCount,
      triangleCount: stats.triangleCount,
      materialCount: exportedMaterials.size,
      materialDefinitionCount: materials.length,
      colliderCount: colliderDefinitions.length,
    },
    visualNodes,
    materials,
    colliders: structuredClone(colliderDefinitions),
    sockets,
    files: {
      recipe: { path: 'paper-glider-canary.recipe.json', bytes: recipeBytes.byteLength, sha256: sha256(recipeBytes) },
      glb: { path: 'paper-glider-archive-gate.glb', bytes: glb.byteLength, sha256: sha256(glb) },
      rights: { path: 'RIGHTS.md', bytes: rightsBytes.byteLength, sha256: sha256(rightsBytes) },
      schema: { path: 'paper-glider-compat-manifest-v1.schema.json', bytes: schemaBytes.byteLength, sha256: sha256(schemaBytes) },
    },
    provenance: {
      author: 'YuShimoji',
      method: 'Generated from the versioned Workbench Recipe using engine-neutral MeshData and Three GLTFExporter; no copied Paper Glider code or third-party asset files.',
      thirdPartyAssets: [],
      license: PAPER_GLIDER_RIGHTS_IDENTIFIER,
      rightsDocument: PAPER_GLIDER_RIGHTS_REPOSITORY_PATH,
      ownerDecision: 'A',
      ownerDecisionDate: '2026-07-19',
      rightsScope: 'Paper Glider project development, repository storage, releases, GitHub Pages/public game distribution, browser delivery, maintenance, optimization, and collision-related derivative changes; no general-purpose third-party asset-library license.',
      publicationGate: 'Rights gate resolved by Owner Decision A on 2026-07-19; publication still requires successful Paper Glider runtime integration and technical acceptance.',
    },
    fallback: {
      required: true,
      strategy: 'retain-current-procedural-room',
      conditions: ['manifest fetch or validation failure', 'GLB fetch or parse failure', 'content hash mismatch', 'required node or collider reference missing'],
    },
    integration: {
      runtimeRecipeRequired: false,
      publishedBasePath: '/paper-glider/',
      relativeGlbPath: 'assets/workbench/paper-glider-v1/paper-glider-archive-gate.glb',
      relativeManifestPath: 'assets/workbench/paper-glider-v1/paper-glider-archive-gate.manifest.json',
      variantSelection: 'Select the manifest by the existing deterministic room sequence/seed contract; do not call Math.random().',
    },
  };
  manifest.contentHash = calculateManifestContentHash(manifest);
  return manifest;
}

export async function buildCompatibilityBundle(recipeText) {
  const sourceText = recipeText ?? await readFile(compatibilityPaths.recipe, 'utf8');
  const recipeBytes = Buffer.from(sourceText, 'utf8');
  const rightsBytes = await readFile(compatibilityPaths.rights);
  const schemaBytes = await readFile(compatibilityPaths.schema);
  const recipe = parseRecipe(JSON.parse(sourceText));
  const issues = validateRecipe(recipe);
  if (issues.length > 0) throw new Error(`Canary Recipe validation failed: ${JSON.stringify(issues)}`);

  const scene = buildCanaryScene(recipe);
  try {
    const glb = await exportCanaryGlb(scene.rootObject);
    const manifest = buildManifest(recipe, scene, glb, recipeBytes, rightsBytes, schemaBytes);
    const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    return { recipe, recipeText: sourceText, recipeBytes, rightsBytes, schemaBytes, glb, manifest, manifestBytes };
  } finally {
    disposeObject(scene.rootObject);
  }
}

export async function writeCompatibilityBundle(bundle) {
  await writeFile(compatibilityPaths.glb, bundle.glb);
  await writeFile(compatibilityPaths.manifest, bundle.manifestBytes);
}

export function resolvePaperGliderAssetUrl(origin, basePath, relativePath) {
  const normalizedOrigin = origin.endsWith('/') ? origin : `${origin}/`;
  const normalizedBase = `${basePath.replace(/^\/+|\/+$/g, '')}/`;
  const normalizedRelative = relativePath.replace(/^\/+/, '');
  return new URL(`${normalizedBase}${normalizedRelative}`, normalizedOrigin).toString();
}

export function assertFileUrlRoundTrip(path) {
  const roundTrip = fileURLToPath(pathToFileURL(path));
  if (roundTrip !== path) throw new Error(`Filesystem URL round-trip changed the path: ${path} -> ${roundTrip}`);
  return roundTrip;
}
