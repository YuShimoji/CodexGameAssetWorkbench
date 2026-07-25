import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseRecipe } from '@cgawe/schema';
import {
  RUNTIME_BUNDLE_CONTRACT_VERSION,
  RuntimeBundleValidationError,
  buildRuntimeBundle,
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

const fixture = parseRecipe(JSON.parse(readFileSync(new URL('../../../samples/starter-project/recipe.json', import.meta.url), 'utf8')));

describe('Runtime Bundle contract', () => {
  it('exports the Whole Recipe deterministically with expanded placements and stable node identities', async () => {
    const first = await buildRuntimeBundle(fixture);
    const second = await buildRuntimeBundle(fixture);

    expect(Buffer.from(first.glb)).toEqual(Buffer.from(second.glb));
    expect(first.manifestText).toBe(second.manifestText);
    expect(first.manifest.contractVersion).toBe(RUNTIME_BUNDLE_CONTRACT_VERSION);
    expect(first.manifest.sceneInstances).toHaveLength(fixture.sceneInstances.length);
    expect(first.manifest.placements.length).toBeGreaterThan(0);
    expect(first.manifest.counts.nodes).toBe(first.manifest.nodeMap.length);
    expect(new Set(first.manifest.nodeMap.map((node) => node.stableId)).size).toBe(first.manifest.nodeMap.length);
    expect(first.manifest.rights.status).toBe('NOASSERTION');
    expect(first.manifestText).not.toContain('generatedAt');
  }, 15_000);

  it('fails closed before export when Recipe references are invalid', async () => {
    const invalid = structuredClone(fixture);
    invalid.sceneInstances[0]!.assetId = 'asset-missing';

    await expect(buildRuntimeBundle(invalid)).rejects.toBeInstanceOf(RuntimeBundleValidationError);
  });
});
