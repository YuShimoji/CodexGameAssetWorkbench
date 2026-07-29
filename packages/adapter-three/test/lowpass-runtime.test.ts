import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseRecipe } from '@cgawe/schema';
import {
  LOWPASS_ASSET_PACK_SCHEMA_VERSION,
  LowpassAssetContractError,
  buildLowpassRuntimeAssetPack,
  type LowpassAssetPackDefinition,
} from '../src/index.js';

class NodeFileReader {
  result: string | ArrayBuffer | null = null;
  error: unknown = null;
  onloadend: ((event: { target: NodeFileReader }) => void) | null = null;
  onerror: ((event: { target: NodeFileReader }) => void) | null = null;

  readAsArrayBuffer(blob: Blob): void {
    void blob.arrayBuffer()
      .then((result) => {
        this.result = result;
        this.onloadend?.({ target: this });
      })
      .catch((error: unknown) => {
        this.error = error;
        this.onerror?.({ target: this });
        this.onloadend?.({ target: this });
      });
  }

  readAsDataURL(blob: Blob): void {
    void blob.arrayBuffer()
      .then((result) => {
        this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(result).toString('base64')}`;
        this.onloadend?.({ target: this });
      })
      .catch((error: unknown) => {
        this.error = error;
        this.onerror?.({ target: this });
        this.onloadend?.({ target: this });
      });
  }
}

if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = NodeFileReader as unknown as typeof FileReader;
}

const recipe = parseRecipe(JSON.parse(readFileSync(
  new URL('../../../samples/lowpass-canary/lowpass-readability-canary-v1.recipe.json', import.meta.url),
  'utf8',
)));
const definition = JSON.parse(readFileSync(
  new URL('../../../samples/lowpass-canary/lowpass-readability-canary-v1.definition.json', import.meta.url),
  'utf8',
)) as LowpassAssetPackDefinition;

describe('LOWPASS runtime asset pack', () => {
  it('exports five deterministic assets with stable gameplay semantics and bounded budgets', async () => {
    const first = await buildLowpassRuntimeAssetPack(recipe, definition);
    const second = await buildLowpassRuntimeAssetPack(recipe, definition);

    expect(Buffer.from(first.glb)).toEqual(Buffer.from(second.glb));
    expect(first.manifestText).toBe(second.manifestText);
    expect(first.manifest.schemaVersion).toBe(LOWPASS_ASSET_PACK_SCHEMA_VERSION);
    expect(first.manifest.assets).toHaveLength(5);
    expect(first.manifest.license.status).toBe('NOASSERTION');
    expect(first.manifest.textureStage).toMatchObject({
      status: 'UNAVAILABLE_NO_BLENDER',
      uvPresent: false,
      textureCount: 0,
      productionTexturingComplete: false,
    });

    const byRole = new Map(first.manifest.assets.map((asset) => [asset.role, asset]));
    expect(byRole.get('hostile-needle')?.anchors.map((anchor) => anchor.kind)).toEqual(expect.arrayContaining(['scan', 'lock-on']));
    expect(byRole.get('hostile-watcher')?.anchors.map((anchor) => anchor.kind)).toEqual(['scan']);
    expect(byRole.get('allied-porter')?.anchors.map((anchor) => anchor.kind)).toEqual(expect.arrayContaining(['carry', 'interaction', 'communication']));
    expect(byRole.get('push-cart')?.features.filter((feature) => feature.kind === 'wheel')).toHaveLength(4);
    expect(byRole.get('field-terminal')?.features.map((feature) => feature.kind)).toContain('screen');

    for (const asset of first.manifest.assets) {
      expect(asset.collisionProxyIds.length).toBeGreaterThan(0);
      expect(asset.materialCount).toBeLessThanOrEqual(definition.budgets.maxMaterialsPerAsset);
      expect(asset.triangleCount).toBeLessThanOrEqual(definition.budgets.maxTrianglesPerAsset);
      expect(asset.bounds.min.every(Number.isFinite)).toBe(true);
      expect(asset.bounds.max.every(Number.isFinite)).toBe(true);
      expect(asset.textureDimensions).toEqual([]);
    }
  }, 15_000);

  it('fails with structured issues when required semantic anchors are missing', async () => {
    const invalid = structuredClone(definition);
    const cart = invalid.assets.find((asset) => asset.role === 'push-cart');
    if (!cart) throw new Error('Cart fixture missing');
    cart.anchors = cart.anchors.filter((anchor) => anchor.kind !== 'handle');

    await expect(buildLowpassRuntimeAssetPack(recipe, invalid)).rejects.toMatchObject({
      name: 'LowpassAssetContractError',
      issues: expect.arrayContaining([
        expect.objectContaining({ code: 'LOWPASS_REQUIRED_ANCHOR_MISSING', assetId: 'asset-shopping-cart' }),
      ]),
    } satisfies Partial<LowpassAssetContractError>);
  });

  it('fails before export when DECLARED rights omit a license ID', async () => {
    const invalid = structuredClone(definition);
    invalid.rights = {
      status: 'DECLARED',
      notice: 'Synthetic test declaration; not a distribution grant.',
    };

    await expect(buildLowpassRuntimeAssetPack(recipe, invalid)).rejects.toMatchObject({
      name: 'LowpassAssetContractError',
      issues: expect.arrayContaining([
        expect.objectContaining({
          code: 'LOWPASS_RIGHTS_LICENSE_ID_REQUIRED',
          assetId: null,
          path: '$.rights.licenseId',
        }),
      ]),
    } satisfies Partial<LowpassAssetContractError>);
  });
});
