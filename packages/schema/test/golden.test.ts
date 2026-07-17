import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, parseRecipe } from '../src/index.js';

describe('schema 0.1.0 golden fixture', () => {
  it('loads and normalizes with the frozen semantic hash', () => {
    const raw = JSON.parse(readFileSync(new URL('./fixtures/recipe-0.1.0.golden.json', import.meta.url), 'utf8'));
    const parsed = parseRecipe(raw);
    const roundTripped = parseRecipe(JSON.parse(JSON.stringify(parsed)));
    expect(parsed.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(JSON.stringify(parsed)).toBe(JSON.stringify(raw));
    expect(roundTripped).toEqual(parsed);
  });
});
