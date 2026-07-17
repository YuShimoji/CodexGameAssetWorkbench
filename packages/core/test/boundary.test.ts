import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('core engine-independent boundary', () => {
  it('depends only on the schema workspace package', () => {
    const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(packageJson.dependencies).toEqual({ '@cgawe/schema': '0.0.0' });
  });

  it('does not import Three.js, React, DOM or WebGL modules', () => {
    const sourceDirectory = new URL('../src/', import.meta.url);
    const source = readdirSync(sourceDirectory).filter((name) => name.endsWith('.ts')).map((name) => readFileSync(new URL(name, sourceDirectory), 'utf8')).join('\n');
    expect(source).not.toMatch(/from ['"](?:three|react|react-dom|@react-three|webgl)/i);
    expect(source).not.toMatch(/\b(?:document|window|HTMLElement|WebGLRenderingContext)\b/);
  });
});
