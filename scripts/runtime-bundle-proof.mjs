import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  RUNTIME_BUNDLE_CONTRACT_VERSION,
  RuntimeBundleRightsValidationError,
  buildRuntimeBundle,
} from '@cgawe/adapter-three';
import { parseRecipe } from '@cgawe/schema';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactDir = resolve(root, 'artifacts/runtime-bundle-v1');
const writeMode = process.argv.includes('--write');
const cases = [
  {
    id: 'starter',
    recipe: resolve(root, 'samples/starter-project/recipe.json'),
  },
  {
    id: 'paper-glider-canary',
    recipe: resolve(root, 'docs/compat/paper-glider-v1/paper-glider-canary.recipe.json'),
  },
];

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

function nodeToken(value) {
  return [...value].map((character) => (
    /[A-Za-z0-9_-]/.test(character)
      ? character
      : `_u${character.codePointAt(0)?.toString(16) ?? '0'}_`
  )).join('');
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

const schema = JSON.parse(await readFile(resolve(root, 'schemas/runtime-bundle-1.0.0.schema.json'), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateManifest = ajv.compile(schema);

async function inspectBundle(recipe, bundle) {
  const manifest = JSON.parse(bundle.manifestText);
  assert(validateManifest(manifest), `Manifest schema failed:\n${ajv.errorsText(validateManifest.errors, { separator: '\n' })}`);
  assert(manifest.contractVersion === RUNTIME_BUNDLE_CONTRACT_VERSION, 'Runtime contract version drifted.');
  assert(bundle.glb.byteLength === manifest.files.glb.bytes, 'GLB byte count does not match the manifest.');
  assert(sha256(Buffer.from(bundle.glb)) === manifest.files.glb.sha256, 'GLB hash does not match the manifest.');
  assert(manifest.rights.status === 'NOASSERTION', 'Generic Runtime Bundle must default to NOASSERTION rights.');
  assert(!('generatedAt' in manifest), 'Canonical Runtime manifest must not contain a timestamp.');
  assert(!/([A-Z]:[\\/]|Users[\\/]|thank|file:\/\/)/i.test(bundle.manifestText), 'Canonical Runtime manifest discloses a local path or username.');
  assertFinite(manifest);

  const gltf = await new GLTFLoader().parseAsync(bundle.glb.slice(0), '');
  const glbNodeNames = new Set();
  let parsedNodes = 0;
  gltf.scene.traverse((object) => {
    parsedNodes += 1;
    glbNodeNames.add(object.name);
    assertFinite(object.position.toArray(), `${object.name}.position`);
    assertFinite(object.rotation.toArray(), `${object.name}.rotation`);
    assertFinite(object.scale.toArray(), `${object.name}.scale`);
  });
  const stableIds = new Set(manifest.nodeMap.map((entry) => entry.stableId));
  assert(stableIds.size === manifest.nodeMap.length, 'Runtime nodeMap contains duplicate stable IDs.');
  for (const entry of manifest.nodeMap) {
    assert(entry.stableId === entry.glbNodeName, `Node ${entry.stableId} has a divergent GLB node name.`);
    assert(glbNodeNames.has(entry.glbNodeName), `GLB parse did not resolve node ${entry.glbNodeName}.`);
  }
  assert(manifest.rootNodeId === `runtime-root--${nodeToken(recipe.projectId)}`, 'Root node identity does not bind to projectId.');
  assert(manifest.counts.nodes === manifest.nodeMap.length, 'Manifest node count does not equal nodeMap length.');
  assert(parsedNodes >= manifest.counts.nodes, 'Parsed GLB node count is smaller than the manifest count.');
  assert(manifest.counts.sceneInstances === recipe.sceneInstances.length, 'Scene instance count drifted.');
  assert(manifest.counts.placements === manifest.placements.length, 'Expanded placement count drifted.');
  assert(manifest.counts.splines === recipe.splineDefinitions.length, 'Spline count drifted.');
  assert(manifest.counts.rooms === recipe.roomDefinitions.length, 'Room count drifted.');
  assert(manifest.counts.sockets === recipe.socketDefinitions.length, 'Socket count drifted.');

  const roomIds = new Set(manifest.rooms.map((room) => room.id));
  manifest.sockets.forEach((socket) => assert(roomIds.has(socket.roomId), `Socket ${socket.id} has an unresolved room reference.`));
  manifest.sceneInstances.forEach((instance) => {
    assert(stableIds.has(instance.nodeId), `Scene instance ${instance.id} has an unresolved node.`);
    instance.partIds.forEach((partId) => assert(stableIds.has(`scene-part--${nodeToken(instance.id)}--${nodeToken(partId)}`), `Scene part ${instance.id}:${partId} is unresolved.`));
  });
  const ruleIds = new Set(recipe.placementRules.map((rule) => rule.id));
  manifest.placements.forEach((placement) => {
    assert(ruleIds.has(placement.ruleId), `Placement ${placement.id} has an unresolved rule.`);
    assert(placement.id === `${placement.ruleId}:${placement.sequenceIndex}`, `Placement ${placement.id} has a non-canonical sequence identity.`);
    assert(stableIds.has(placement.nodeId), `Placement ${placement.id} has an unresolved node.`);
    placement.partIds.forEach((partId) => assert(stableIds.has(`placement-part--${nodeToken(placement.id)}--${nodeToken(partId)}`), `Placement part ${placement.id}:${partId} is unresolved.`));
  });
  return {
    projectId: manifest.projectId,
    glb: {
      file: manifest.files.glb.name,
      bytes: manifest.files.glb.bytes,
      sha256: manifest.files.glb.sha256,
    },
    manifest: {
      file: manifest.files.manifest.name,
      sha256: sha256(bundle.manifestText),
    },
    counts: manifest.counts,
    bounds: manifest.bounds,
    parsedNodes,
    rights: manifest.rights.status,
  };
}

async function runCase(entry) {
  const recipe = parseRecipe(JSON.parse(await readFile(entry.recipe, 'utf8')));
  const first = await buildRuntimeBundle(recipe);
  const second = await buildRuntimeBundle(recipe);
  assert(Buffer.from(first.glb).equals(Buffer.from(second.glb)), `${entry.id} GLB generation is not byte-deterministic.`);
  assert(first.manifestText === second.manifestText, `${entry.id} manifest generation is not byte-deterministic.`);
  const inspection = await inspectBundle(recipe, first);
  const glbPath = resolve(artifactDir, first.manifest.files.glb.name);
  const manifestPath = resolve(artifactDir, first.manifest.files.manifest.name);
  if (writeMode) {
    await writeFile(glbPath, Buffer.from(first.glb));
    await writeFile(manifestPath, first.manifestText, 'utf8');
  } else {
    const [expectedGlb, expectedManifest] = await Promise.all([readFile(glbPath), readFile(manifestPath, 'utf8')]);
    assert(expectedGlb.equals(Buffer.from(first.glb)), `${entry.id} tracked GLB differs from a clean regeneration.`);
    assert(expectedManifest === first.manifestText, `${entry.id} tracked manifest differs from a clean regeneration.`);
  }
  return { caseId: entry.id, recipeFile: entry.recipe.slice(root.length + 1).replaceAll('\\', '/'), ...inspection };
}

async function runRightsConformance(recipe) {
  const originalParseAsync = GLTFExporter.prototype.parseAsync;
  let exporterInvocations = 0;
  GLTFExporter.prototype.parseAsync = async function countedParseAsync(...args) {
    exporterInvocations += 1;
    return originalParseAsync.apply(this, args);
  };

  try {
    const defaultBefore = exporterInvocations;
    const defaultBundle = await buildRuntimeBundle(recipe);
    assert(exporterInvocations === defaultBefore + 1, 'Default NOASSERTION build did not invoke the exporter exactly once.');
    assert(validateManifest(defaultBundle.manifest), `Default rights manifest schema failed:\n${ajv.errorsText(validateManifest.errors, { separator: '\n' })}`);
    assert(defaultBundle.manifest.rights.status === 'NOASSERTION', 'Default rights status drifted from NOASSERTION.');

    const syntheticDeclared = {
      status: 'DECLARED',
      licenseId: 'LicenseRef-CGAWE-Synthetic-Test-Only',
      notice: 'Synthetic conformance data only; this is not a license or distribution grant.',
    };
    const declaredBefore = exporterInvocations;
    const declaredBundle = await buildRuntimeBundle(recipe, { rights: syntheticDeclared });
    assert(exporterInvocations === declaredBefore + 1, 'Synthetic DECLARED build did not invoke the exporter exactly once.');
    assert(validateManifest(declaredBundle.manifest), `Synthetic DECLARED manifest schema failed:\n${ajv.errorsText(validateManifest.errors, { separator: '\n' })}`);
    assert(JSON.stringify(declaredBundle.manifest.rights) === JSON.stringify(syntheticDeclared), 'Synthetic DECLARED rights were repaired or replaced.');

    const malformedCases = [
      {
        id: 'unknown-status',
        rights: { status: 'UNKNOWN', notice: 'Unknown status must fail.' },
        expectedCode: 'RUNTIME_BUNDLE_RIGHTS_STATUS_INVALID',
      },
      {
        id: 'blank-notice',
        rights: { status: 'NOASSERTION', notice: ' \t ' },
        expectedCode: 'RUNTIME_BUNDLE_RIGHTS_NOTICE_INVALID',
      },
      {
        id: 'declared-missing-license-id',
        rights: { status: 'DECLARED', notice: 'A DECLARED fixture requires a license identifier.' },
        expectedCode: 'RUNTIME_BUNDLE_RIGHTS_LICENSE_ID_REQUIRED',
      },
      {
        id: 'declared-blank-license-id',
        rights: { status: 'DECLARED', licenseId: ' \t ', notice: 'A blank license identifier must fail.' },
        expectedCode: 'RUNTIME_BUNDLE_RIGHTS_LICENSE_ID_INVALID',
      },
    ];
    const negatives = [];
    for (const entry of malformedCases) {
      const callsBefore = exporterInvocations;
      let bundle;
      let caught;
      try {
        bundle = await buildRuntimeBundle(recipe, { rights: entry.rights });
      } catch (error) {
        caught = error;
      }
      assert(bundle === undefined, `${entry.id} produced a partial Runtime Bundle.`);
      assert(caught instanceof RuntimeBundleRightsValidationError, `${entry.id} did not return RuntimeBundleRightsValidationError.`);
      const errorCodes = caught.issues.map((issue) => issue.code);
      assert(errorCodes.includes(entry.expectedCode), `${entry.id} did not expose ${entry.expectedCode}.`);
      assert(exporterInvocations === callsBefore, `${entry.id} invoked GLTFExporter before failing.`);
      negatives.push({
        caseId: entry.id,
        errorName: caught.name,
        errorCodes,
        exporterInvocations: exporterInvocations - callsBefore,
        outputFilesProduced: 0,
      });
    }

    const recoveryBefore = exporterInvocations;
    const recovery = await buildRuntimeBundle(recipe);
    assert(exporterInvocations === recoveryBefore + 1, 'Valid recovery did not invoke the exporter exactly once.');
    assert(recovery.manifest.rights.status === 'NOASSERTION', 'Valid recovery did not restore default NOASSERTION rights.');

    return {
      positives: {
        defaultNoAssertion: {
          status: defaultBundle.manifest.rights.status,
          exporterInvocations: 1,
        },
        syntheticDeclared: {
          status: declaredBundle.manifest.rights.status,
          licenseId: declaredBundle.manifest.rights.licenseId,
          exporterInvocations: 1,
          testOnly: true,
        },
      },
      negatives,
      recovery: {
        status: recovery.manifest.rights.status,
        exporterInvocations: exporterInvocations - recoveryBefore,
      },
      malformedExporterInvocations: negatives.reduce((sum, entry) => sum + entry.exporterInvocations, 0),
      malformedOutputFilesProduced: negatives.reduce((sum, entry) => sum + entry.outputFilesProduced, 0),
      claimBoundary: 'Synthetic DECLARED data proves structural conformance only and grants no license or distribution permission.',
    };
  } finally {
    GLTFExporter.prototype.parseAsync = originalParseAsync;
  }
}

await mkdir(artifactDir, { recursive: true });
const results = [];
for (const entry of cases) results.push(await runCase(entry));
const rightsRecipe = parseRecipe(JSON.parse(await readFile(cases[0].recipe, 'utf8')));
const rightsConformance = await runRightsConformance(rightsRecipe);

const readback = {
  contractVersion: RUNTIME_BUNDLE_CONTRACT_VERSION,
  state: 'CGAWE_GENERIC_RUNTIME_BUNDLE_RIGHTS_GATE_LOCAL_GREEN',
  inputs: results,
  rightsConformance,
  checks: {
    inputCount: results.length,
    deterministicGlb: true,
    deterministicManifest: true,
    jsonSchema: true,
    gltfLoaderParse: true,
    stableNodeReferences: true,
    finiteNumbers: true,
    fileHashesAndBytes: true,
    genericRightsNoAssertion: true,
    syntheticDeclaredRights: true,
    rightsValidationBeforeExport: rightsConformance.malformedExporterInvocations === 0,
    malformedRightsOutputFiles: rightsConformance.malformedOutputFilesProduced,
    validRecoveryAfterRightsFailures: rightsConformance.recovery.status === 'NOASSERTION',
    localDisclosureAbsent: true,
  },
  browserEvidence: {
    desktop: 'runtime-bundle-desktop.png',
    mobile: 'runtime-bundle-mobile.png',
  },
};
const readbackText = `${JSON.stringify(readback, null, 2)}\n`;
const readbackPath = resolve(artifactDir, 'runtime-bundle-readback.json');
if (writeMode) {
  await writeFile(readbackPath, readbackText, 'utf8');
} else {
  assert(await readFile(readbackPath, 'utf8') === readbackText, 'Tracked Runtime Bundle readback differs from current validation.');
}

console.log(`Runtime Bundle proof passed for ${results.length} inputs (${writeMode ? 'artifacts written' : 'tracked artifacts matched'}).`);
for (const result of results) {
  console.log(`- ${result.projectId}: ${result.glb.bytes} bytes, ${result.counts.nodes} nodes, ${result.counts.triangles} triangles`);
}
