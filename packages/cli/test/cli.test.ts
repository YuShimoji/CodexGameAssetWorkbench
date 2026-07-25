import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const recipePath = fileURLToPath(new URL('../../../samples/starter-project/recipe.json', import.meta.url));

describe('CLI', () => {
  it('returns machine-readable inspect and validate results', () => {
    const executable = fileURLToPath(new URL('../dist/index.js', import.meta.url));
    const inspect = JSON.parse(execFileSync(process.execPath, [executable, 'inspect', recipePath, '--json'], { encoding: 'utf8' }));
    const validation = JSON.parse(execFileSync(process.execPath, [executable, 'validate', recipePath, '--json'], { encoding: 'utf8' }));
    expect(inspect.assetCount).toBeGreaterThan(0);
    expect(validation.valid).toBe(true);
  }, 15_000);
});
