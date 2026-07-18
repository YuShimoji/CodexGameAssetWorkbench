import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const verifier = fileURLToPath(new URL('../../../scripts/verify-paper-glider-compat.mjs', import.meta.url));

describe('Paper Glider compatibility packet', () => {
  it('regenerates, validates, loads, and resolves the canonical canary bundle', () => {
    const result = JSON.parse(execFileSync(process.execPath, [verifier], { encoding: 'utf8' }));
    expect(result.ok).toBe(true);
    expect(result.contractVersion).toBe('paper-glider-compat-v1');
    expect(result.validationErrors).toBe(0);
    expect(result.validationWarnings).toBe(0);
    expect(result.warnings).toBe(0);
    expect(result.loadedNodes).toContain('spline-route-arch');
    expect(result.publishedGlbUrl).toContain('/paper-glider/assets/workbench/');
  });
});
