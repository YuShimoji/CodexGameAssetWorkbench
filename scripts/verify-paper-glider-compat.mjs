import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import Ajv from 'ajv';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { recipeHash, stableStringify, validateRecipe } from '@cgawe/core';
import { parseRecipe } from '@cgawe/schema';
import {
  assertFileUrlRoundTrip,
  buildCompatibilityBundle,
  calculateManifestContentHash,
  compatibilityPaths,
  PAPER_GLIDER_RIGHTS_IDENTIFIER,
  PAPER_GLIDER_RIGHTS_REPOSITORY_PATH,
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

const canonicalManifestBytes = await readFile(compatibilityPaths.manifest);
const canonicalManifest = JSON.parse(canonicalManifestBytes.toString('utf8'));
const canonicalGlb = await readFile(compatibilityPaths.glb);
const canonicalRecipeText = await readFile(compatibilityPaths.recipe, 'utf8');
const canonicalRights = await readFile(compatibilityPaths.rights);
const canonicalSchemaBytes = await readFile(compatibilityPaths.schema);
const canonicalSchema = JSON.parse(canonicalSchemaBytes.toString('utf8'));
const generated = await buildCompatibilityBundle(canonicalRecipeText);

const ajv = new Ajv({ allErrors: true, strict: true });
assert(ajv.validate(canonicalSchema, canonicalManifest), `Manifest schema validation failed: ${ajv.errorsText(ajv.errors)}`);
assert(stableStringify(generated.manifest) === stableStringify(canonicalManifest), 'Regenerated manifest differs from the canonical manifest.');
assert(generated.glb.equals(canonicalGlb), 'Regenerated GLB differs from the canonical GLB.');
assert(sha256(canonicalGlb) === canonicalManifest.files.glb.sha256, 'Canonical GLB SHA-256 does not match the manifest.');
assert(sha256(canonicalRights) === canonicalManifest.files.rights.sha256, 'Canonical rights SHA-256 does not match the manifest.');
assert(canonicalRights.byteLength === canonicalManifest.files.rights.bytes, 'Canonical rights byte count does not match the manifest.');
assert(sha256(canonicalSchemaBytes) === canonicalManifest.files.schema.sha256, 'Canonical schema SHA-256 does not match the manifest.');
assert(canonicalManifest.provenance.license === PAPER_GLIDER_RIGHTS_IDENTIFIER, 'Manifest rights identifier is not the approved LicenseRef.');
assert(canonicalManifest.provenance.rightsDocument === PAPER_GLIDER_RIGHTS_REPOSITORY_PATH, 'Manifest rights document path is not repository-relative canonical path.');
assert(canonicalManifest.files.rights.path === 'RIGHTS.md', 'Manifest bundle-relative rights path is invalid.');
assert(canonicalManifest.provenance.ownerDecision === 'A' && canonicalManifest.provenance.ownerDecisionDate === '2026-07-19', 'Owner Decision A metadata is missing or incorrect.');
assert(canonicalRights.toString('utf8').includes(PAPER_GLIDER_RIGHTS_IDENTIFIER), 'Canonical rights text does not contain its identifier.');
assert(calculateManifestContentHash(canonicalManifest) === canonicalManifest.contentHash, 'Manifest contentHash is invalid.');

const pinnedDocumentation = [
  compatibilityPaths.bundleReadme,
  compatibilityPaths.matrix,
  compatibilityPaths.nextPrompt,
  compatibilityPaths.handoff,
];
const manifestSha256 = sha256(canonicalManifestBytes);
const requiredDocumentationValues = [
  canonicalManifest.source.recipeHash,
  canonicalManifest.contentHash,
  canonicalManifest.files.glb.sha256,
  manifestSha256,
  canonicalManifest.files.schema.sha256,
  canonicalManifest.files.rights.sha256,
  canonicalManifest.provenance.license,
];
for (const path of pinnedDocumentation) {
  const document = await readFile(path, 'utf8');
  for (const value of requiredDocumentationValues) {
    assert(document.includes(value), `${path} does not contain pinned packet value ${value}.`);
  }
}

const visualReadback = JSON.parse(await readFile(compatibilityPaths.visualReadback, 'utf8'));
assert(visualReadback.contentHash === canonicalManifest.contentHash, 'Visual readback content hash is stale.');
assert(visualReadback.glbSha256 === canonicalManifest.files.glb.sha256, 'Visual readback GLB hash is stale.');
assert(visualReadback.manifestSha256 === manifestSha256, 'Visual readback manifest hash is stale.');
assert(visualReadback.schemaSha256 === canonicalManifest.files.schema.sha256, 'Visual readback schema hash is stale.');
assert(visualReadback.rightsIdentifier === canonicalManifest.provenance.license, 'Visual readback rights identifier is stale.');
assert(visualReadback.rightsSha256 === canonicalManifest.files.rights.sha256, 'Visual readback rights hash is stale.');

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
const spacedPathProof = resolve(compatibilityPaths.root, 'Game Projects path proof', 'paper-glider-archive-gate.glb');
assert(spacedPathProof.includes(' '), 'The constructed filesystem proof path does not contain a space.');
assertFileUrlRoundTrip(spacedPathProof);

process.stdout.write(`${JSON.stringify({
  ok: true,
  contractVersion: canonicalManifest.contractVersion,
  recipeHash: canonicalManifest.source.recipeHash,
  contentHash: canonicalManifest.contentHash,
  glbSha256: canonicalManifest.files.glb.sha256,
  manifestSha256,
  schemaSha256: canonicalManifest.files.schema.sha256,
  rightsIdentifier: canonicalManifest.provenance.license,
  rightsSha256: canonicalManifest.files.rights.sha256,
  documentationFilesChecked: pinnedDocumentation.length,
  loadedNodes: [...nodes.keys()].sort(),
  counts: canonicalManifest.counts,
  publishedGlbUrl,
  warnings: warnings.length,
  validationErrors: 0,
  validationWarnings: 0,
}, null, 2)}\n`);
