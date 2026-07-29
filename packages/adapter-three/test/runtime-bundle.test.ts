import { readFileSync } from 'node:fs';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { describe, expect, it, vi } from 'vitest';
import { parseRecipe } from '@cgawe/schema';
import {
  RUNTIME_BUNDLE_CONTRACT_VERSION,
  RuntimeBundleRightsValidationError,
  RuntimeBundleValidationError,
  buildRuntimeBundle,
  type RuntimeBundleRights,
  type RuntimeBundleRightsValidationCode,
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

  it('validates rights before export and recovers after malformed declarations', async () => {
    const exporterSpy = vi.spyOn(GLTFExporter.prototype, 'parseAsync');
    try {
      const syntheticDeclared: RuntimeBundleRights = {
        status: 'DECLARED',
        licenseId: 'LicenseRef-CGAWE-Synthetic-Test-Only',
        notice: 'Synthetic conformance data only; this is not a license or distribution grant.',
      };
      const declared = await buildRuntimeBundle(fixture, { rights: syntheticDeclared });
      expect(declared.manifest.rights).toEqual(syntheticDeclared);

      const malformed: Array<{
        id: string;
        rights: RuntimeBundleRights;
        code: RuntimeBundleRightsValidationCode;
      }> = [
        {
          id: 'unknown-status',
          rights: { status: 'UNKNOWN', notice: 'Unknown status must fail.' } as unknown as RuntimeBundleRights,
          code: 'RUNTIME_BUNDLE_RIGHTS_STATUS_INVALID',
        },
        {
          id: 'blank-notice',
          rights: { status: 'NOASSERTION', notice: ' \t ' },
          code: 'RUNTIME_BUNDLE_RIGHTS_NOTICE_INVALID',
        },
        {
          id: 'declared-missing-license-id',
          rights: {
            status: 'DECLARED',
            notice: 'A DECLARED fixture requires a license identifier.',
          } as RuntimeBundleRights,
          code: 'RUNTIME_BUNDLE_RIGHTS_LICENSE_ID_REQUIRED',
        },
        {
          id: 'declared-blank-license-id',
          rights: { status: 'DECLARED', licenseId: ' \t ', notice: 'A blank license identifier must fail.' },
          code: 'RUNTIME_BUNDLE_RIGHTS_LICENSE_ID_INVALID',
        },
      ];

      for (const entry of malformed) {
        const callsBefore = exporterSpy.mock.calls.length;
        let bundle: Awaited<ReturnType<typeof buildRuntimeBundle>> | undefined;
        let caught: unknown;
        try {
          bundle = await buildRuntimeBundle(fixture, { rights: entry.rights });
        } catch (error) {
          caught = error;
        }
        expect(bundle, `${entry.id} must not produce a Runtime Bundle.`).toBeUndefined();
        expect(caught, `${entry.id} must return a rights-specific error.`).toBeInstanceOf(RuntimeBundleRightsValidationError);
        expect(
          (caught as RuntimeBundleRightsValidationError).issues.map((issue) => issue.code),
          `${entry.id} must expose its stable validation code.`,
        ).toContain(entry.code);
        expect(exporterSpy.mock.calls.length, `${entry.id} must fail before GLTFExporter.parseAsync.`).toBe(callsBefore);
      }

      const callsBeforeRecovery = exporterSpy.mock.calls.length;
      const recovery = await buildRuntimeBundle(fixture);
      expect(recovery.manifest.rights.status).toBe('NOASSERTION');
      expect(exporterSpy.mock.calls.length).toBe(callsBeforeRecovery + 1);
    } finally {
      exporterSpy.mockRestore();
    }
  }, 30_000);
});
