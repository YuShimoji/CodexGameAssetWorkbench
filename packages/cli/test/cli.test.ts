import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const recipePath = new URL('../../../samples/starter-project/recipe.json', import.meta.url).pathname.replace(/^\/(.:)/, '$1');

describe('CLI', () => {
  it('returns machine-readable inspect and validate results', () => {
    const executable = new URL('../dist/index.js', import.meta.url).pathname.replace(/^\/(.:)/, '$1');
    const inspect = JSON.parse(execFileSync(process.execPath, [executable, 'inspect', recipePath, '--json'], { encoding: 'utf8' }));
    const validation = JSON.parse(execFileSync(process.execPath, [executable, 'validate', recipePath, '--json'], { encoding: 'utf8' }));
    expect(inspect.assetCount).toBeGreaterThan(0);
    expect(validation.valid).toBe(true);
  });
});
