import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import {
  LOWPASS_ARTIFACT_CONSUMER_CONTRACT_VERSION,
  LowpassArtifactConsumer,
} from '../packages/adapter-three/dist/lowpass-artifact-consumer.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactBase = resolve(
  root,
  'artifacts/lowpass-canary-v1/lowpass-readability-canary-v1',
);
const schemaPath = resolve(
  root,
  'schemas/lowpass-runtime-asset-pack-1.0.0.schema.json',
);
const consumerSourcePath = resolve(
  root,
  'packages/adapter-three/dist/lowpass-artifact-consumer.js',
);

class NodeFileReader {
  result = null;
  error = null;
  onloadend = null;
  onerror = null;

  readAsArrayBuffer(blob) {
    blob
      .arrayBuffer()
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
    blob
      .arrayBuffer()
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

if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = NodeFileReader;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function cloneInputs(glb, manifest) {
  return {
    glb: Uint8Array.from(glb),
    manifest: structuredClone(manifest),
  };
}

function createSentinelScene() {
  const scene = new Group();
  scene.name = 'existing-runtime-scene';
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshBasicMaterial({ color: '#445566' });
  let geometryDisposals = 0;
  let materialDisposals = 0;
  const disposeGeometry = geometry.dispose.bind(geometry);
  const disposeMaterial = material.dispose.bind(material);
  geometry.dispose = () => {
    geometryDisposals += 1;
    disposeGeometry();
  };
  material.dispose = () => {
    materialDisposals += 1;
    disposeMaterial();
  };
  const sentinel = new Mesh(geometry, material);
  sentinel.name = 'pre-existing-sentinel';
  sentinel.position.set(7, 3, -2);
  sentinel.userData = { owner: 'existing-scene' };
  scene.add(sentinel);
  return {
    scene,
    sentinel,
    disposalCounts: () => ({
      geometries: geometryDisposals,
      materials: materialDisposals,
    }),
  };
}

function snapshotSentinel(scene, sentinel) {
  return JSON.stringify({
    children: scene.children.map((child) => child.name),
    sentinelParent: sentinel.parent?.name ?? null,
    sentinelPosition: sentinel.position.toArray(),
    sentinelUserData: sentinel.userData,
  });
}

function attachedConsumerRoots(scene) {
  return scene.children.filter(
    (child) => child.userData.kind === 'lowpass-artifact-consumer',
  );
}

async function failClosedCase({
  name,
  expectedCode,
  inputs,
  validGlb,
  validManifest,
}) {
  const { scene, sentinel, disposalCounts } = createSentinelScene();
  const consumer = new LowpassArtifactConsumer();
  const before = snapshotSentinel(scene, sentinel);
  const failed = await consumer.load({ ...inputs, target: scene });
  assert(!failed.ok, `${name} unexpectedly succeeded.`);
  assert(
    failed.error.code === expectedCode,
    `${name} returned ${failed.error.code}, expected ${expectedCode}.`,
  );
  assert(
    attachedConsumerRoots(scene).length === 0,
    `${name} attached partial LOWPASS content.`,
  );
  assert(
    snapshotSentinel(scene, sentinel) === before,
    `${name} changed the pre-existing scene.`,
  );
  assert(
    disposalCounts().geometries === 0 && disposalCounts().materials === 0,
    `${name} disposed pre-existing resources.`,
  );

  const recovered = await consumer.load({
    glb: Uint8Array.from(validGlb),
    manifest: structuredClone(validManifest),
    target: scene,
  });
  assert(recovered.ok && recovered.state === 'loaded', `${name} did not recover.`);
  assert(
    attachedConsumerRoots(scene).length === 1,
    `${name} recovery did not attach exactly one consumer root.`,
  );
  const disposal = consumer.dispose();
  assert(
    disposal.geometries === 44 &&
      disposal.materials === 10 &&
      !disposal.alreadyDisposed,
    `${name} recovery disposal counts were unexpected.`,
  );
  assert(
    snapshotSentinel(scene, sentinel) === before,
    `${name} recovery cleanup changed the pre-existing scene.`,
  );
  return {
    name,
    code: failed.error.code,
    path: failed.error.path,
    partialAttachments: 0,
    sentinelPreserved: true,
    recoverySucceeded: true,
  };
}

export async function runArtifactConsumerConformance() {
  const [glb, manifestBytes, schemaBytes, compiledConsumer] = await Promise.all([
    readFile(`${artifactBase}.runtime.glb`),
    readFile(`${artifactBase}.manifest.json`),
    readFile(schemaPath),
    readFile(consumerSourcePath, 'utf8'),
  ]);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const schema = JSON.parse(schemaBytes.toString('utf8'));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validateManifest = ajv.compile(schema);
  assert(
    validateManifest(manifest),
    `Tracked manifest failed its canonical schema: ${ajv.errorsText(validateManifest.errors)}`,
  );
  assert(
    glb.byteLength === 70_892 &&
      sha256(glb) ===
        'sha256:54b10bf450971139a9cfe8302f671d29bc37fda6f2631dbf5545ef69e1b4d102',
    'Tracked GLB identity differs from the reconciled Mission input.',
  );
  assert(
    sha256(manifestBytes) ===
      'sha256:a1dd222f98c109697849279f3f5644266d685bc7b4d543534c8e4191b225c353',
    'Tracked manifest identity differs from the reconciled Mission input.',
  );
  assert(
    !/buildLowpassRuntimeAssetPack|buildRuntimeBundle|lowpass-runtime\.js|recipe/i.test(
      compiledConsumer,
    ),
    'Compiled consumer entry imports or references generation behavior.',
  );

  let networkRequests = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    networkRequests += 1;
    throw new Error('Artifact consumer conformance forbids network access.');
  };

  try {
    const positiveScene = createSentinelScene();
    const positiveBefore = snapshotSentinel(
      positiveScene.scene,
      positiveScene.sentinel,
    );
    const consumer = new LowpassArtifactConsumer();
    const loaded = await consumer.load({
      glb: Uint8Array.from(glb),
      manifest: structuredClone(manifest),
      target: positiveScene.scene,
    });
    assert(loaded.ok && loaded.state === 'loaded', 'Valid tracked artifacts failed.');
    assert(loaded.result.stats.assets === 5, 'Consumer did not resolve five assets.');
    assert(loaded.result.stats.stableNodes === 50, 'Stable node count differs.');
    assert(loaded.result.stats.meshes === 44, 'Parsed mesh count differs.');
    assert(loaded.result.stats.triangles === 1_068, 'Triangle count differs.');
    const expectedRoles = [
      'allied-porter',
      'field-terminal',
      'hostile-needle',
      'hostile-watcher',
      'push-cart',
    ];
    const roles = [...loaded.result.assetsByKey.values()]
      .map((asset) => asset.role)
      .sort();
    assert(
      JSON.stringify(roles) === JSON.stringify(expectedRoles),
      'Resolved LOWPASS role identities differ from the manifest.',
    );
    for (const asset of loaded.result.assetsByKey.values()) {
      assert(asset.root.name.length > 0, `${asset.assetKey} has no stable root.`);
      assert(
        asset.stableNodes.size > 0 &&
          asset.collisionProxies.size > 0 &&
          asset.semanticAnchors.size > 0,
        `${asset.assetKey} did not resolve required semantics.`,
      );
      assert(
        [...asset.runtimeBounds.min, ...asset.runtimeBounds.max].every(
          Number.isFinite,
        ),
        `${asset.assetKey} has non-finite runtime bounds.`,
      );
    }
    const repeated = await consumer.load({
      glb: Uint8Array.from(glb),
      manifest: structuredClone(manifest),
      target: positiveScene.scene,
    });
    assert(
      repeated.ok &&
        repeated.state === 'already-attached' &&
        attachedConsumerRoots(positiveScene.scene).length === 1,
      'Repeated load duplicated attached LOWPASS content.',
    );
    const positiveDisposal = consumer.dispose();
    assert(
      positiveDisposal.geometries === 44 &&
        positiveDisposal.materials === 10 &&
        !positiveDisposal.alreadyDisposed,
      'Positive disposal did not release all consumer-owned resources once.',
    );
    assert(
      snapshotSentinel(positiveScene.scene, positiveScene.sentinel) ===
        positiveBefore,
      'Positive cleanup changed the pre-existing scene.',
    );
    assert(
      positiveScene.disposalCounts().geometries === 0 &&
        positiveScene.disposalCounts().materials === 0,
      'Positive cleanup disposed pre-existing resources.',
    );
    const repeatedDisposal = consumer.dispose();
    assert(
      repeatedDisposal.alreadyDisposed &&
        repeatedDisposal.geometries === 0 &&
        repeatedDisposal.materials === 0,
      'Repeated disposal released resources more than once.',
    );

    const disabledScene = createSentinelScene();
    const disabledBefore = snapshotSentinel(
      disabledScene.scene,
      disabledScene.sentinel,
    );
    const disabled = await new LowpassArtifactConsumer().load({
      glb: Uint8Array.from(glb),
      manifest: structuredClone(manifest),
      target: disabledScene.scene,
      enabled: false,
    });
    assert(
      disabled.ok &&
        disabled.state === 'disabled' &&
        attachedConsumerRoots(disabledScene.scene).length === 0 &&
        snapshotSentinel(disabledScene.scene, disabledScene.sentinel) ===
          disabledBefore,
      'Disabled consumer changed the base scene.',
    );

    const declaredScene = createSentinelScene();
    const declaredManifest = structuredClone(manifest);
    declaredManifest.license = {
      status: 'DECLARED',
      licenseId: 'LicenseRef-CGAWE-Synthetic-Test-Only',
      notice: 'Synthetic test declaration; not a distribution grant.',
    };
    for (const asset of declaredManifest.assets) {
      asset.sourceProvenance.rightsStatus = 'DECLARED';
    }
    const declaredConsumer = new LowpassArtifactConsumer();
    const declared = await declaredConsumer.load({
      glb: Uint8Array.from(glb),
      manifest: declaredManifest,
      target: declaredScene.scene,
    });
    assert(
      declared.ok &&
        declared.state === 'loaded' &&
        declared.result.manifest.license.status === 'DECLARED',
      'A self-consistent synthetic DECLARED rights fixture did not load.',
    );
    declaredConsumer.dispose();

    const negativeCases = [];
    const unsupportedSchema = cloneInputs(glb, manifest);
    unsupportedSchema.manifest.schemaVersion =
      'lowpass-runtime-asset-pack-9.9.9';
    negativeCases.push(
      await failClosedCase({
        name: 'unsupported-manifest-schema-version',
        expectedCode: 'UNSUPPORTED_MANIFEST_SCHEMA_VERSION',
        inputs: unsupportedSchema,
        validGlb: glb,
        validManifest: manifest,
      }),
    );
    const unknownRightsStatus = cloneInputs(glb, manifest);
    unknownRightsStatus.manifest.license.status = 'UNREVIEWED';
    negativeCases.push(
      await failClosedCase({
        name: 'unknown-rights-status',
        expectedCode: 'RIGHTS_DECLARATION_INVALID',
        inputs: unknownRightsStatus,
        validGlb: glb,
        validManifest: manifest,
      }),
    );
    const emptyRightsNotice = cloneInputs(glb, manifest);
    emptyRightsNotice.manifest.license.notice = '   ';
    negativeCases.push(
      await failClosedCase({
        name: 'empty-rights-notice',
        expectedCode: 'RIGHTS_DECLARATION_INVALID',
        inputs: emptyRightsNotice,
        validGlb: glb,
        validManifest: manifest,
      }),
    );
    const declaredWithoutLicenseId = cloneInputs(glb, manifest);
    declaredWithoutLicenseId.manifest.license = {
      status: 'DECLARED',
      notice: 'Synthetic test declaration; not a distribution grant.',
    };
    for (const asset of declaredWithoutLicenseId.manifest.assets) {
      asset.sourceProvenance.rightsStatus = 'DECLARED';
    }
    negativeCases.push(
      await failClosedCase({
        name: 'declared-rights-without-license-id',
        expectedCode: 'RIGHTS_DECLARATION_INVALID',
        inputs: declaredWithoutLicenseId,
        validGlb: glb,
        validManifest: manifest,
      }),
    );
    const inconsistentAssetRights = cloneInputs(glb, manifest);
    inconsistentAssetRights.manifest.assets[0].sourceProvenance.rightsStatus =
      'DECLARED';
    negativeCases.push(
      await failClosedCase({
        name: 'asset-rights-status-mismatch',
        expectedCode: 'RIGHTS_DECLARATION_INVALID',
        inputs: inconsistentAssetRights,
        validGlb: glb,
        validManifest: manifest,
      }),
    );
    const hashMismatch = cloneInputs(glb, manifest);
    hashMismatch.manifest.files.glb.sha256 = `sha256:${'0'.repeat(64)}`;
    negativeCases.push(
      await failClosedCase({
        name: 'glb-hash-mismatch',
        expectedCode: 'GLB_HASH_MISMATCH',
        inputs: hashMismatch,
        validGlb: glb,
        validManifest: manifest,
      }),
    );
    const byteMismatch = cloneInputs(glb, manifest);
    byteMismatch.manifest.files.glb.bytes += 1;
    negativeCases.push(
      await failClosedCase({
        name: 'glb-byte-count-mismatch',
        expectedCode: 'GLB_BYTE_COUNT_MISMATCH',
        inputs: byteMismatch,
        validGlb: glb,
        validManifest: manifest,
      }),
    );
    const missingStableNode = cloneInputs(glb, manifest);
    missingStableNode.manifest.stableNodeMap[0].glbNodeName =
      'missing-required-stable-node';
    negativeCases.push(
      await failClosedCase({
        name: 'missing-required-stable-node',
        expectedCode: 'STABLE_NODE_MISSING',
        inputs: missingStableNode,
        validGlb: glb,
        validManifest: manifest,
      }),
    );
    const missingCollision = cloneInputs(glb, manifest);
    missingCollision.manifest.collisionProxyIds[0] =
      'missing-required-collision-proxy';
    negativeCases.push(
      await failClosedCase({
        name: 'unresolved-collision-proxy',
        expectedCode: 'COLLISION_PROXY_UNRESOLVED',
        inputs: missingCollision,
        validGlb: glb,
        validManifest: manifest,
      }),
    );
    const missingInteraction = cloneInputs(glb, manifest);
    missingInteraction.manifest.interactionAnchorIds[0] =
      'missing-required-interaction-anchor';
    negativeCases.push(
      await failClosedCase({
        name: 'unresolved-interaction-anchor',
        expectedCode: 'INTERACTION_ANCHOR_UNRESOLVED',
        inputs: missingInteraction,
        validGlb: glb,
        validManifest: manifest,
      }),
    );
    const truncatedGlb = cloneInputs(glb, manifest);
    truncatedGlb.glb = truncatedGlb.glb.subarray(0, 32);
    truncatedGlb.manifest.files.glb.bytes = truncatedGlb.glb.byteLength;
    truncatedGlb.manifest.files.glb.sha256 = sha256(truncatedGlb.glb);
    negativeCases.push(
      await failClosedCase({
        name: 'malformed-truncated-glb',
        expectedCode: 'GLB_PARSE_FAILED',
        inputs: truncatedGlb,
        validGlb: glb,
        validManifest: manifest,
      }),
    );

    assert(networkRequests === 0, 'Consumer attempted network access.');
    return {
      consumerContractVersion: LOWPASS_ARTIFACT_CONSUMER_CONTRACT_VERSION,
      inputs: {
        glb: {
          name: manifest.files.glb.name,
          bytes: glb.byteLength,
          sha256: sha256(glb),
        },
        manifest: {
          name: manifest.files.manifest.name,
          bytes: manifestBytes.byteLength,
          sha256: sha256(manifestBytes),
        },
        schema: {
          name: 'lowpass-runtime-asset-pack-1.0.0.schema.json',
          bytes: schemaBytes.byteLength,
          sha256: sha256(schemaBytes),
        },
      },
      positive: {
        schemaValidated: true,
        loaded: true,
        defaultRightsStatus: loaded.result.manifest.license.status,
        syntheticDeclaredRightsAccepted:
          declared.ok && declared.state === 'loaded',
        attachedRoots: 1,
        repeatedLoadState: repeated.state,
        repeatedLoadRoots: 1,
        stats: loaded.result.stats,
        assets: [...loaded.result.assetsByKey.values()].map((asset) => ({
          assetId: asset.assetId,
          assetKey: asset.assetKey,
          instanceId: asset.instanceId,
          role: asset.role,
          faction: asset.faction,
          rootNodeId: asset.root.name,
          stableNodes: asset.stableNodes.size,
          collisionProxies: asset.collisionProxies.size,
          interactionAnchors: asset.interactionAnchors.size,
          semanticAnchors: asset.semanticAnchors.size,
          declaredBounds: asset.declaredBounds,
          runtimeBounds: asset.runtimeBounds,
          meshCount: asset.meshCount,
          triangleCount: asset.triangleCount,
          materialCount: asset.materialCount,
        })),
      },
      negativeCases,
      scenePreservation: {
        positiveSentinelPreserved: true,
        allFailuresAttachedZeroRoots: true,
        allFailuresPreservedSentinel: true,
        allFailuresRecovered: true,
      },
      fallback: {
        consumerDisabled: true,
        attachedRoots: 0,
        sentinelPreserved: true,
      },
      disposal: {
        geometries: positiveDisposal.geometries,
        materials: positiveDisposal.materials,
        repeatedDisposalReleasedResources: false,
        unrelatedGeometriesDisposed: 0,
        unrelatedMaterialsDisposed: 0,
      },
      isolation: {
        consumerEntryImportsGenerator: false,
        consumerEntryImportsRecipe: false,
        generatorCalls: 0,
        recipeReads: 0,
        networkRequests,
      },
    };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  const result = await runArtifactConsumerConformance();
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
}
