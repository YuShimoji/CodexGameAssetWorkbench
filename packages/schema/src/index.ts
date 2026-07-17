import { Ajv, type ErrorObject } from 'ajv';
import { recipeSchema } from './schema.js';
import type { Recipe, ValidationIssue } from './types.js';

export * from './types.js';
export { recipeSchema } from './schema.js';

export const CURRENT_SCHEMA_VERSION = '0.1.0' as const;

const ajv = new Ajv({ allErrors: true, strict: false });
const validateShape = ajv.compile(recipeSchema);

function issueFromAjv(error: ErrorObject): ValidationIssue {
  return {
    severity: 'error',
    code: `SCHEMA_${error.keyword.toUpperCase()}`,
    assetId: null,
    recipePath: error.instancePath || '/',
    message: error.message ?? 'Schema validation failed',
  };
}

export function parseRecipe(input: unknown): Recipe {
  if (!input || typeof input !== 'object') throw new Error('Recipe must be a JSON object.');
  const version = (input as { schemaVersion?: unknown }).schemaVersion;
  if (version !== CURRENT_SCHEMA_VERSION) {
    throw new Error(`Unsupported schemaVersion: ${String(version)}. Expected ${CURRENT_SCHEMA_VERSION}.`);
  }
  if (!validateShape(input)) {
    const details = (validateShape.errors ?? []).map((error: ErrorObject) => `${error.instancePath || '/'} ${error.message}`).join('; ');
    throw new Error(`Recipe schema validation failed: ${details}`);
  }
  return structuredClone(input) as Recipe;
}

export function validateRecipeShape(input: unknown): ValidationIssue[] {
  if (!input || typeof input !== 'object') {
    return [{ severity: 'error', code: 'SCHEMA_TYPE', assetId: null, recipePath: '/', message: 'Recipe must be a JSON object.' }];
  }
  if ((input as { schemaVersion?: unknown }).schemaVersion !== CURRENT_SCHEMA_VERSION) {
    return [{
      severity: 'error', code: 'SCHEMA_VERSION_UNSUPPORTED', assetId: null, recipePath: '/schemaVersion',
      message: `Expected schemaVersion ${CURRENT_SCHEMA_VERSION}.`,
    }];
  }
  return validateShape(input) ? [] : (validateShape.errors ?? []).map(issueFromAjv);
}

export function migrateRecipe(input: unknown): Recipe {
  // v0 intentionally has no implicit migration. Future migrations must be explicit and reviewable.
  return parseRecipe(input);
}
