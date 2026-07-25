import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  LowpassAssetContractError,
  RuntimeBundleValidationError,
  buildLowpassRuntimeAssetPack,
} from '@cgawe/adapter-three';
import { parseRecipe } from '@cgawe/schema';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactDir = resolve(root, 'artifacts/lowpass-canary-v1');
const recipePath = resolve(root, 'samples/lowpass-canary/lowpass-readability-canary-v1.recipe.json');
const definitionPath = resolve(root, 'samples/lowpass-canary/lowpass-readability-canary-v1.definition.json');
const schemaPath = resolve(root, 'schemas/lowpass-runtime-asset-pack-1.0.0.schema.json');
const writeMode = process.argv.includes('--write');
const requireProof = !writeMode || process.argv.includes('--require-proof');

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

if (typeof globalThis.FileReader === 'undefined') globalThis.FileReader = NodeFileReader;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(data) {
  return `sha256:${createHash('sha256').update(data).digest('hex')}`;
}

function assertFinite(value, path = '$') {
  if (typeof value === 'number') {
    assert(Number.isFinite(value), `${path} contains a non-finite number.`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertFinite(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => assertFinite(item, `${path}.${key}`));
  }
}

function pngDimensions(bytes, file) {
  assert(bytes.length > 24, `${file} is too small to be a PNG proof.`);
  assert(bytes.subarray(1, 4).toString('ascii') === 'PNG', `${file} does not have a PNG signature.`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function inspectProofs(manifest) {
  const results = [];
  for (const proof of manifest.files.visualProofs) {
    const path = resolve(artifactDir, proof.name);
    try {
      const bytes = await readFile(path);
      const dimensions = pngDimensions(bytes, proof.name);
      assert(bytes.length >= 10_000, `${proof.name} is too small to be meaningful visual evidence.`);
      assert(dimensions.width === 1200 && dimensions.height === 675, `${proof.name} must be 1200 x 675.`);
      results.push({
        file: proof.name,
        mode: proof.mode,
        bytes: bytes.length,
        sha256: sha256(bytes),
        ...dimensions,
      });
    } catch (error) {
      if (requireProof) throw error;
      return [];
    }
  }
  return results;
}

const recipe = parseRecipe(JSON.parse(await readFile(recipePath, 'utf8')));
const definition = JSON.parse(await readFile(definitionPath, 'utf8'));
const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateManifest = ajv.compile(schema);

const first = await buildLowpassRuntimeAssetPack(recipe, definition);
const second = await buildLowpassRuntimeAssetPack(recipe, definition);
assert(Buffer.from(first.glb).equals(Buffer.from(second.glb)), 'Same LOWPASS Recipe + seed did not produce the same GLB identity.');
assert(first.manifestText === second.manifestText, 'Same LOWPASS Recipe + seed did not produce the same manifest identity.');
assert(validateManifest(first.manifest), `LOWPASS manifest schema failed:\n${ajv.errorsText(validateManifest.errors, { separator: '\n' })}`);
assert(first.glb.byteLength > 0, 'LOWPASS GLB is empty.');
assert(first.manifest.files.glb.bytes === first.glb.byteLength, 'LOWPASS GLB byte count does not match manifest.');
assert(first.manifest.files.glb.sha256 === sha256(Buffer.from(first.glb)), 'LOWPASS GLB hash does not match manifest.');
assertFinite(first.manifest);
assert(!/([A-Z]:[\\/]|Users[\\/]|thank|file:\/\/)/i.test(first.manifestText), 'LOWPASS manifest discloses a local path or username.');

const gltf = await new GLTFLoader().parseAsync(first.glb.slice(0), '');
const glbNodeNames = new Set();
const glbMaterialNames = new Set();
let parsedMeshes = 0;
gltf.scene.traverse((object) => {
  glbNodeNames.add(object.name);
  assertFinite(object.position.toArray(), `${object.name}.position`);
  assertFinite(object.rotation.toArray(), `${object.name}.rotation`);
  assertFinite(object.scale.toArray(), `${object.name}.scale`);
  if (!object.isMesh) return;
  parsedMeshes += 1;
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  materials.forEach((material) => glbMaterialNames.add(material.name));
});

const stableIds = new Set(first.manifest.stableNodeMap.map((entry) => entry.stableId));
assert(stableIds.size === first.manifest.stableNodeMap.length, 'LOWPASS stable node map contains duplicate IDs.');
first.manifest.stableNodeMap.forEach((entry) => {
  assert(entry.stableId === entry.glbNodeName, `Stable node ${entry.stableId} diverges from GLB name.`);
  assert(glbNodeNames.has(entry.glbNodeName), `Stable node ${entry.stableId} is unresolved in actual GLB.`);
});
for (const nodeId of [
  ...first.manifest.meshNodeIds,
  ...first.manifest.collisionProxyIds,
  ...first.manifest.interactionAnchorIds,
  ...first.manifest.assets.flatMap((asset) => asset.anchors.map((anchor) => anchor.nodeId)),
  ...first.manifest.assets.flatMap((asset) => asset.features.map((feature) => feature.nodeId)),
]) {
  assert(stableIds.has(nodeId), `LOWPASS semantic node ${nodeId} is unresolved.`);
}
const anchorIds = new Set(first.manifest.assets.flatMap((asset) => asset.anchors.map((anchor) => anchor.id)));
first.manifest.socketIds.forEach((socketId) => {
  assert(anchorIds.has(socketId), `LOWPASS socket ${socketId} is unresolved from semantic anchors.`);
});
first.manifest.materialIds.forEach((materialId) => assert(glbMaterialNames.has(materialId), `LOWPASS material ${materialId} is unresolved in actual GLB.`));
first.manifest.assets.forEach((asset) => {
  assert(asset.triangleCount <= first.manifest.budgets.maxTrianglesPerAsset, `${asset.assetId} exceeds triangle budget.`);
  assert(asset.materialCount <= first.manifest.budgets.maxMaterialsPerAsset, `${asset.assetId} exceeds material budget.`);
  asset.textureDimensions.forEach(({ width, height }) => {
    assert(width <= first.manifest.budgets.maxTextureDimension && height <= first.manifest.budgets.maxTextureDimension, `${asset.assetId} exceeds texture budget.`);
  });
  assert(asset.bounds.min.every(Number.isFinite) && asset.bounds.max.every(Number.isFinite), `${asset.assetId} has invalid bounds.`);
});

let disposedGeometries = 0;
let disposedMaterials = 0;
const materialObjects = new Set();
gltf.scene.traverse((object) => {
  if (!object.isMesh) return;
  object.geometry.dispose();
  disposedGeometries += 1;
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  materials.forEach((material) => materialObjects.add(material));
});
materialObjects.forEach((material) => {
  material.dispose();
  disposedMaterials += 1;
});
assert(disposedGeometries === parsedMeshes, 'Dispose smoke did not visit every parsed mesh.');

const invalidRecipe = structuredClone(recipe);
invalidRecipe.assetDefinitions[0].parts[0].materialId = 'material-missing-for-structured-error';
let invalidRecipeIssue = null;
try {
  await buildLowpassRuntimeAssetPack(invalidRecipe, definition);
} catch (error) {
  assert(error instanceof RuntimeBundleValidationError, 'Invalid Recipe did not produce RuntimeBundleValidationError.');
  invalidRecipeIssue = error.issues.find((issue) => issue.severity === 'error') ?? null;
}
assert(invalidRecipeIssue, 'Invalid Recipe did not expose a structured validation issue.');

const invalidDefinition = structuredClone(definition);
invalidDefinition.assets.find((asset) => asset.role === 'push-cart').anchors = [];
let invalidContractIssue = null;
try {
  await buildLowpassRuntimeAssetPack(recipe, invalidDefinition);
} catch (error) {
  assert(error instanceof LowpassAssetContractError, 'Invalid LOWPASS definition did not produce LowpassAssetContractError.');
  invalidContractIssue = error.issues.find((issue) => issue.code === 'LOWPASS_REQUIRED_ANCHOR_MISSING') ?? null;
}
assert(invalidContractIssue, 'Invalid LOWPASS definition did not expose a structured semantic issue.');

await mkdir(artifactDir, { recursive: true });
const glbPath = resolve(artifactDir, first.manifest.files.glb.name);
const manifestPath = resolve(artifactDir, first.manifest.files.manifest.name);
if (writeMode) {
  await writeFile(glbPath, Buffer.from(first.glb));
  await writeFile(manifestPath, first.manifestText, 'utf8');
} else {
  const [trackedGlb, trackedManifest] = await Promise.all([readFile(glbPath), readFile(manifestPath, 'utf8')]);
  assert(trackedGlb.equals(Buffer.from(first.glb)), 'Tracked LOWPASS GLB differs from clean regeneration.');
  assert(trackedManifest === first.manifestText, 'Tracked LOWPASS manifest differs from clean regeneration.');
}

const visualProofs = await inspectProofs(first.manifest);
const readback = {
  schemaVersion: first.manifest.schemaVersion,
  state: 'LOWPASS_ASSET_CANARY_V1_LOCAL_GREEN',
  suitability: 'B_SMALL_EXTENSION',
  assetPackId: first.manifest.assetPackId,
  recipeHash: first.manifest.recipeHash,
  generatorVersion: first.manifest.generatorVersion,
  files: {
    glb: {
      name: first.manifest.files.glb.name,
      bytes: first.glb.byteLength,
      sha256: first.manifest.files.glb.sha256,
    },
    manifest: {
      name: first.manifest.files.manifest.name,
      bytes: Buffer.byteLength(first.manifestText),
      sha256: sha256(first.manifestText),
    },
    visualProofs,
  },
  counts: {
    assets: first.manifest.assets.length,
    parsedMeshes,
    triangles: first.manifest.triangleCount,
    vertices: first.manifest.vertexCount,
    materials: first.manifest.materialCount,
    textures: first.manifest.textureStage.textureCount,
    stableNodes: first.manifest.stableNodeMap.length,
    anchors: first.manifest.assets.reduce((sum, asset) => sum + asset.anchors.length, 0),
    collisionProxies: first.manifest.collisionProxyIds.length,
  },
  checks: {
    sameRecipeSeedSameGlb: true,
    sameRecipeSeedSameManifest: true,
    jsonSchema: true,
    gltfLoaderParse: true,
    stableNodeIdsPreserved: true,
    socketIdsResolved: true,
    collisionProxyIdsResolved: true,
    finiteTransformsAndBounds: true,
    materialBudget: true,
    textureBudget: true,
    triangleBudget: true,
    disposeSmoke: true,
    invalidRecipeStructuredError: true,
    invalidDefinitionStructuredError: true,
    externalNetworkDependency: false,
    localDisclosureAbsent: true,
  },
  disposal: {
    geometries: disposedGeometries,
    materials: disposedMaterials,
  },
  blender: {
    commandOnPath: false,
    pythonScripting: 'NOT_TESTED_BLENDER_UNAVAILABLE',
    headlessExport: 'NOT_TESTED_BLENDER_UNAVAILABLE',
  },
  textureStage: first.manifest.textureStage,
  rights: first.manifest.license,
};
const readbackText = `${JSON.stringify(readback, null, 2)}\n`;
const readbackPath = resolve(artifactDir, first.manifest.files.readback.name);
if (writeMode && (visualProofs.length === 2 || !requireProof)) {
  if (visualProofs.length === 2) await writeFile(readbackPath, readbackText, 'utf8');
} else if (!writeMode) {
  assert(await readFile(readbackPath, 'utf8') === readbackText, 'Tracked LOWPASS readback differs from current validation.');
}

console.log(`LOWPASS canary ${writeMode ? 'generated' : 'verified'}: ${first.glb.byteLength} bytes, ${first.manifest.assets.length} assets, ${first.manifest.triangleCount} triangles.`);
if (visualProofs.length === 2) console.log(`Visual proofs verified: ${visualProofs.map((proof) => proof.file).join(', ')}.`);
