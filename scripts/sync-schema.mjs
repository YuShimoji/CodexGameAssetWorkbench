import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { recipeSchema } from '../packages/schema/dist/index.js';

const target = resolve('schemas/recipe-0.1.0.schema.json');
const rendered = `${JSON.stringify({ $schema: 'http://json-schema.org/draft-07/schema#', title: 'Codex Game Asset Workbench Recipe', ...recipeSchema }, null, 2)}\n`;

if (process.argv.includes('--check')) {
  const current = await readFile(target, 'utf8');
  if (current !== rendered) {
    process.stderr.write('Recipe schema artifact is out of date. Run npm run schema:sync.\n');
    process.exitCode = 1;
  }
} else {
  await writeFile(target, rendered, 'utf8');
  process.stdout.write(`Updated ${target}\n`);
}
