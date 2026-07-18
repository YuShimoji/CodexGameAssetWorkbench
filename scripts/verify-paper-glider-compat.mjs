import { readFile } from 'node:fs/promises';
import Ajv from 'ajv';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { recipeHash, stableStringify, validateRecipe } from '@cgawe/core';
import { parseRecipe } from '@cgawe/schema';
import {
  assertFileUrlRoundTrip,
  buildCompatibilityBundle,
  calculateManifestContentHash,
  compatibilityPaths,
  resolvePaperGliderAssetUrl,
  sha256,
} from './paper-glider-compat-lib.mjs';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseGlbJson(glb) {
  assert(glb.readUInt32LE(0) === 0x46546c67, 'GLB magic header is invalid.');
  assert(glb.readUInt32LE(4) === 2, 'GLB version is not 2.');
  assert(glb.readUInt32LE(8) === glb.byteLength, 'GLB header length does not match the file size.');
  const jsonLength = glb.readUInt32LE(12);
  assert(glb.readUInt32LE(16) === 0x4e4f534a, 'GLB first chunk is not JSON.');
  return JSON.parse(glb.subarray(20, 20 + jsonLength).toString('utf8').trim());
}

async function loadGlb(glb, warnings) {
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args.map(String).join(' '));
  try {
    return await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), '');
  } finally {
    console.warn = originalWarn;
  }
}

const canonicalManifest = JSON.parse(await readFile(compatibilityPaths.manifest, 'utf8'));
const canonicalGlb = await readFile(compatibilityPaths.glb);
const canonicalRecipeText = await readFile(compatibilityPaths.recipe, 'utf8');
const canonicalSchema = JSON.parse(await readFile(compatibilityPaths.schema, 'utf8'));
const generated = await buildCompatibilityBundle(canonicalRecipeText);

const ajv = new Ajv({ allErrors: true, strict: true });
assert(ajv.validate(canonicalSchema, canonicalManifest), `Manifest schema validation failed: ${ajv.errorsText(ajv.errors)}`);
assert(stableStringify(generated.manifest) === stableStringify(canonicalManifest), 'Regenerated manifest differs from the canonical manifest.');
assert(generated.glb.equals(canonicalGlb), 'Regenerated GLB differs from the canonical GLB.');
assert(sha256(canonicalGlb) === canonicalManifest.files.glb.sha256, 'Canonical GLB SHA-256 does not match the manifest.');
assert(calculateManifestContentHash(canonicalManifest) === canonicalManifest.contentHash, 'Manifest contentHash is invalid.');

const recipe = parseRecipe(JSON.parse(canonicalRecipeText));
const savedRecipe = `${JSON.stringify(recipe, null, 2)}\n`;
const reloadedRecipe = parseRecipe(JSON.parse(savedRecipe));
assert(recipeHash(recipe) === recipeHash(reloadedRecipe), 'Recipe Save -> Reload changed the Recipe hash.');
assert(validateRecipe(reloadedRecipe).length === 0, 'Reloaded Recipe has validation issues.');
const reloadedBundle = await buildCompatibilityBundle(savedRecipe);
assert(reloadedBundle.manifest.source.recipeHash === generated.manifest.source.recipeHash, 'Reloaded Recipe changed the bundle Recipe hash.');
assert(reloadedBundle.manifest.files.glb.sha256 === generated.manifest.files.glb.sha256, 'Reloaded Recipe changed the generated GLB hash.');

const glbJson = parseGlbJson(canonicalGlb);
const warnings = [];
const loaded = await loadGlb(canonicalGlb, warnings);
const nodes = new Map();
loaded.scene.traverse((object) => {
  if (object.name) nodes.set(object.name, object);
  assert([...object.position, ...object.quaternion, ...object.scale, ...object.matrix.elements].every(Number.isFinite), `Node ${object.name || object.type} has a non-finite transform.`);
  assert([...object.scale].every((value) => value > 0 && value <= 20), `Node ${object.name || object.type} has an out-of-range scale.`);
});
for (const visualNode of canonicalManifest.visualNodes) {
  assert(nodes.has(visualNode.id), `Required GLB node ${visualNode.id} was not loaded.`);
}
for (const collider of canonicalManifest.colliders) {
  for (const visualNodeId of collider.visualNodeIds) {
    assert(nodes.has(visualNodeId), `Collider ${collider.id} references missing visual node ${visualNodeId}.`);
  }
}
assert(glbJson.nodes.length >= canonicalManifest.counts.visualNodeCount, 'GLB JSON contains fewer nodes than the manifest requires.');
assert(glbJson.meshes.length === canonicalManifest.counts.meshCount, 'GLB mesh count differs from the manifest.');
assert(glbJson.materials.length === canonicalManifest.counts.materialCount, 'GLB material count differs from the manifest.');
assert(canonicalManifest.materials.length === canonicalManifest.counts.materialDefinitionCount, 'Logical material definition count differs from the manifest.');
assert(warnings.length === 0, `GLB loader warnings were emitted: ${warnings.join(' | ')}`);

const publishedGlbUrl = resolvePaperGliderAssetUrl('https://yushimoji.github.io', canonicalManifest.integration.publishedBasePath, canonicalManifest.integration.relativeGlbPath);
assert(publishedGlbUrl === 'https://yushimoji.github.io/paper-glider/assets/workbench/paper-glider-v1/paper-glider-archive-gate.glb', `GitHub Pages asset URL is incorrect: ${publishedGlbUrl}`);
assertFileUrlRoundTrip(compatibilityPaths.glb);
assert(compatibilityPaths.glb.includes('Game Projects'), 'The current verification path did not exercise the required Windows space-containing path.');

process.stdout.write(`${JSON.stringify({
  ok: true,
  contractVersion: canonicalManifest.contractVersion,
  recipeHash: canonicalManifest.source.recipeHash,
  contentHash: canonicalManifest.contentHash,
  glbSha256: canonicalManifest.files.glb.sha256,
  loadedNodes: [...nodes.keys()].sort(),
  counts: canonicalManifest.counts,
  publishedGlbUrl,
  warnings: warnings.length,
  validationErrors: 0,
  validationWarnings: 0,
}, null, 2)}\n`);
