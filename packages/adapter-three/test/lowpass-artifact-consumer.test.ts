import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  LOWPASS_ARTIFACT_CONSUMER_CONTRACT_VERSION,
  LowpassArtifactConsumer,
  type LowpassArtifactConsumerErrorCode,
} from '../src/lowpass-artifact-consumer.js';

class NodeFileReader {
  result: string | ArrayBuffer | null = null;
  error: Error | null = null;
  onloadend: ((event: { target: NodeFileReader }) => void) | null = null;
  onerror: ((event: { target: NodeFileReader }) => void) | null = null;

  readAsArrayBuffer(blob: Blob): void {
    blob
      .arrayBuffer()
      .then((result) => {
        this.result = result;
        this.onloadend?.({ target: this });
      })
      .catch((error: Error) => {
        this.error = error;
        this.onerror?.({ target: this });
        this.onloadend?.({ target: this });
      });
  }

  readAsDataURL(blob: Blob): void {
    blob
      .arrayBuffer()
      .then((result) => {
        this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(result).toString('base64')}`;
        this.onloadend?.({ target: this });
      })
      .catch((error: Error) => {
        this.error = error;
        this.onerror?.({ target: this });
        this.onloadend?.({ target: this });
      });
  }
}

if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = NodeFileReader as unknown as typeof FileReader;
}

const artifactRoot = resolve(
  process.cwd(),
  'artifacts/lowpass-canary-v1/lowpass-readability-canary-v1',
);
let fixtureGlb: Uint8Array;
let fixtureManifest: Record<string, any>;

beforeAll(async () => {
  fixtureGlb = await readFile(`${artifactRoot}.runtime.glb`);
  fixtureManifest = JSON.parse(
    await readFile(`${artifactRoot}.manifest.json`, 'utf8'),
  ) as Record<string, any>;
});

function fixture(): {
  glb: Uint8Array;
  manifest: Record<string, any>;
} {
  return {
    glb: Uint8Array.from(fixtureGlb),
    manifest: structuredClone(fixtureManifest),
  };
}

function sha256(bytes: Uint8Array): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function createSentinelScene(): {
  scene: Group;
  sentinel: Mesh;
  geometryDispose: ReturnType<typeof vi.spyOn>;
  materialDispose: ReturnType<typeof vi.spyOn>;
} {
  const scene = new Group();
  scene.name = 'existing-runtime-scene';
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshBasicMaterial({ color: '#445566' });
  const sentinel = new Mesh(geometry, material);
  sentinel.name = 'pre-existing-sentinel';
  sentinel.position.set(7, 3, -2);
  sentinel.userData = { owner: 'existing-scene' };
  scene.add(sentinel);
  return {
    scene,
    sentinel,
    geometryDispose: vi.spyOn(geometry, 'dispose'),
    materialDispose: vi.spyOn(material, 'dispose'),
  };
}

function consumerRoots(scene: Group): Group[] {
  return scene.children.filter(
    (child): child is Group =>
      child instanceof Group &&
      child.userData.kind === 'lowpass-artifact-consumer',
  );
}

async function expectFailClosedThenRecover(
  inputs: { glb: Uint8Array; manifest: Record<string, any> },
  expectedCode: LowpassArtifactConsumerErrorCode,
): Promise<void> {
  const { scene, sentinel, geometryDispose, materialDispose } =
    createSentinelScene();
  const consumer = new LowpassArtifactConsumer();
  const before = {
    position: sentinel.position.toArray(),
    userData: structuredClone(sentinel.userData),
  };

  const failed = await consumer.load({ ...inputs, target: scene });
  expect(failed.ok).toBe(false);
  if (failed.ok) throw new Error('Expected a structured consumer failure.');
  expect(failed.error.code).toBe(expectedCode);
  expect(failed.attached).toBe(false);
  expect(consumerRoots(scene)).toHaveLength(0);
  expect(scene.children).toEqual([sentinel]);
  expect(sentinel.position.toArray()).toEqual(before.position);
  expect(sentinel.userData).toEqual(before.userData);
  expect(geometryDispose).not.toHaveBeenCalled();
  expect(materialDispose).not.toHaveBeenCalled();

  const recovered = await consumer.load({ ...fixture(), target: scene });
  expect(recovered.ok).toBe(true);
  expect(recovered.state).toBe('loaded');
  expect(consumerRoots(scene)).toHaveLength(1);
  expect(scene.children).toContain(sentinel);
  const disposal = consumer.dispose();
  expect(disposal).toMatchObject({
    geometries: 44,
    materials: 10,
    alreadyDisposed: false,
  });
  expect(scene.children).toEqual([sentinel]);
  expect(geometryDispose).not.toHaveBeenCalled();
  expect(materialDispose).not.toHaveBeenCalled();
}

describe('LOWPASS artifact consumer', () => {
  it('loads the exact tracked artifacts and resolves all runtime semantics', async () => {
    const { scene, sentinel, geometryDispose, materialDispose } =
      createSentinelScene();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const consumer = new LowpassArtifactConsumer();
    const loaded = await consumer.load({ ...fixture(), target: scene });

    expect(loaded.ok).toBe(true);
    if (!loaded.ok || loaded.state === 'disabled') {
      throw new Error('Expected a loaded consumer result.');
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(loaded.attached).toBe(true);
    expect(loaded.result.contractVersion).toBe(
      LOWPASS_ARTIFACT_CONSUMER_CONTRACT_VERSION,
    );
    expect(loaded.result.stats).toEqual({
      assets: 5,
      stableNodes: 50,
      meshes: 44,
      triangles: 1068,
      materials: 10,
      uniqueMaterials: 7,
      collisionProxies: 5,
      interactionAnchors: 5,
    });
    expect(
      [...loaded.result.assetsByKey.values()].map((asset) => asset.role).sort(),
    ).toEqual(
      [
        'hostile-needle',
        'hostile-watcher',
        'allied-porter',
        'push-cart',
        'field-terminal',
      ].sort(),
    );
    for (const manifestAsset of fixtureManifest.assets as Array<
      Record<string, any>
    >) {
      const resolved = loaded.result.assetsByKey.get(manifestAsset.assetKey);
      expect(resolved).toBeDefined();
      expect(resolved).toMatchObject({
        assetId: manifestAsset.assetId,
        instanceId: manifestAsset.instanceId,
        role: manifestAsset.role,
        faction: manifestAsset.faction,
        declaredBounds: manifestAsset.bounds,
        triangleCount: manifestAsset.triangleCount,
        materialCount: manifestAsset.materialCount,
      });
      expect(resolved?.root.name).toBe(manifestAsset.rootNodeId);
      expect(resolved?.stableNodes.size).toBe(
        manifestAsset.stableNodeIds.length,
      );
      expect(resolved?.collisionProxies.size).toBe(
        manifestAsset.collisionProxyIds.length,
      );
      expect(resolved?.interactionAnchors.size).toBe(
        manifestAsset.interactionAnchorIds.length,
      );
      expect(resolved?.semanticAnchors.size).toBe(
        manifestAsset.anchors.length,
      );
      expect(
        [
          ...resolved!.runtimeBounds.min,
          ...resolved!.runtimeBounds.max,
        ].every(Number.isFinite),
      ).toBe(true);
    }
    expect(scene.children).toContain(sentinel);
    expect(consumerRoots(scene)).toHaveLength(1);

    const repeated = await consumer.load({ ...fixture(), target: scene });
    expect(repeated.ok).toBe(true);
    expect(repeated.state).toBe('already-attached');
    expect(consumerRoots(scene)).toHaveLength(1);

    const firstDisposal = consumer.dispose();
    expect(firstDisposal).toEqual({
      geometries: 44,
      materials: 10,
      alreadyDisposed: false,
    });
    expect(consumer.dispose()).toEqual({
      geometries: 0,
      materials: 0,
      alreadyDisposed: true,
    });
    expect(scene.children).toEqual([sentinel]);
    expect(geometryDispose).not.toHaveBeenCalled();
    expect(materialDispose).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('keeps the existing scene active when the consumer is disabled', async () => {
    const { scene, sentinel, geometryDispose, materialDispose } =
      createSentinelScene();
    const consumer = new LowpassArtifactConsumer();
    const outcome = await consumer.load({
      ...fixture(),
      target: scene,
      enabled: false,
    });
    expect(outcome).toEqual({
      ok: true,
      state: 'disabled',
      attached: false,
      result: null,
    });
    expect(scene.children).toEqual([sentinel]);
    expect(consumerRoots(scene)).toHaveLength(0);
    expect(geometryDispose).not.toHaveBeenCalled();
    expect(materialDispose).not.toHaveBeenCalled();
  });

  it('fails closed on an unsupported manifest schema and recovers', async () => {
    const inputs = fixture();
    inputs.manifest.schemaVersion = 'lowpass-runtime-asset-pack-9.9.9';
    await expectFailClosedThenRecover(
      inputs,
      'UNSUPPORTED_MANIFEST_SCHEMA_VERSION',
    );
  });

  it('fails closed on a GLB hash mismatch and recovers', async () => {
    const inputs = fixture();
    inputs.manifest.files.glb.sha256 = `sha256:${'0'.repeat(64)}`;
    await expectFailClosedThenRecover(inputs, 'GLB_HASH_MISMATCH');
  });

  it('fails closed on a GLB byte-count mismatch and recovers', async () => {
    const inputs = fixture();
    inputs.manifest.files.glb.bytes += 1;
    await expectFailClosedThenRecover(inputs, 'GLB_BYTE_COUNT_MISMATCH');
  });

  it('fails closed on a missing stable GLB node and recovers', async () => {
    const inputs = fixture();
    inputs.manifest.stableNodeMap[0].glbNodeName =
      'missing-required-stable-node';
    await expectFailClosedThenRecover(inputs, 'STABLE_NODE_MISSING');
  });

  it('fails closed on an unresolved collision proxy and recovers', async () => {
    const inputs = fixture();
    inputs.manifest.collisionProxyIds[0] =
      'missing-required-collision-proxy';
    await expectFailClosedThenRecover(
      inputs,
      'COLLISION_PROXY_UNRESOLVED',
    );
  });

  it('fails closed on an unresolved interaction anchor and recovers', async () => {
    const inputs = fixture();
    inputs.manifest.interactionAnchorIds[0] =
      'missing-required-interaction-anchor';
    await expectFailClosedThenRecover(
      inputs,
      'INTERACTION_ANCHOR_UNRESOLVED',
    );
  });

  it('fails closed on a truncated GLB and recovers', async () => {
    const inputs = fixture();
    inputs.glb = inputs.glb.slice(0, 32);
    inputs.manifest.files.glb.bytes = inputs.glb.byteLength;
    inputs.manifest.files.glb.sha256 = sha256(inputs.glb);
    await expectFailClosedThenRecover(inputs, 'GLB_PARSE_FAILED');
  });
});
