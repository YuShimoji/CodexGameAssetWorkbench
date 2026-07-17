#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { diffRecipes, inspectRecipe, summarizeRecipe, validateRecipe } from '@cgawe/core';
import { parseRecipe, validateRecipeShape } from '@cgawe/schema';

type Command = 'inspect' | 'validate' | 'diff' | 'summarize';

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(path), 'utf8'));
}

function usage(): never {
  throw new Error('Usage: cgawe <inspect|validate|diff|summarize> <recipe> [after-recipe] [--json]');
}

function main(): void {
  const args = process.argv.slice(2).filter((arg) => arg !== '--json');
  const command = args[0] as Command | undefined;
  const firstPath = args[1];
  if (!command || !firstPath || !['inspect', 'validate', 'diff', 'summarize'].includes(command)) usage();
  let output: unknown;
  if (command === 'validate') {
    const raw = readJson(firstPath);
    const shapeIssues = validateRecipeShape(raw);
    const issues = shapeIssues.length ? shapeIssues : validateRecipe(parseRecipe(raw));
    output = { valid: !issues.some((issue) => issue.severity === 'error'), issues };
  } else if (command === 'diff') {
    const secondPath = args[2];
    if (!secondPath) usage();
    const before = parseRecipe(readJson(firstPath));
    const after = parseRecipe(readJson(secondPath));
    const changes = diffRecipes(before, after);
    output = { equal: changes.length === 0, changeCount: changes.length, changes };
  } else {
    const recipe = parseRecipe(readJson(firstPath));
    output = command === 'inspect' ? inspectRecipe(recipe) : summarizeRecipe(recipe);
  }
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2)}\n`);
  process.exitCode = 1;
}
