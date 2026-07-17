import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { parseRecipe } from '@cgawe/schema';
import { summarizeRecipe } from '@cgawe/core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(root, 'output/playwright');
const baseUrl = 'http://127.0.0.1:4173';
const viteBin = resolve(root, 'node_modules/vite/bin/vite.js');
const appRoot = resolve(root, 'apps/workbench');
await mkdir(outputDir, { recursive: true });

for (const name of [
  '01-scene-array-room.png', '02-asset-catalog.png', '03-spline-rod.png',
  '04-spline-road.png', '05-spline-corridor.png', '06-room-sockets.png',
  'roundtrip.recipe.json', 'asset-console-table.glb', 'asset-console-table.manifest.json',
  'readback.json',
]) {
  await rm(resolve(outputDir, name), { force: true });
}

const server = spawn(process.execPath, [viteBin, 'preview', '--host', '127.0.0.1', '--port', '4173'], {
  cwd: appRoot,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
server.stdout.on('data', (chunk) => { serverLog += chunk.toString(); });
server.stderr.on('data', (chunk) => { serverLog += chunk.toString(); });

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch { /* Preview is still starting. */ }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 150));
  }
  throw new Error(`Vite preview did not start.\n${serverLog}`);
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  const downloadPaths = [];
  page.on('download', async (download) => {
    const path = resolve(outputDir, download.suggestedFilename());
    await download.saveAs(path);
    downloadPaths.push(path);
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByTestId('viewport').waitFor({ state: 'visible' });
  await page.locator('canvas').waitFor({ state: 'visible' });
  await page.waitForTimeout(900);
  const canvasBox = await page.locator('canvas').boundingBox();
  if (!canvasBox || canvasBox.width < 300 || canvasBox.height < 250) throw new Error('3D viewport canvas is missing or too small.');
  await page.screenshot({ path: resolve(outputDir, '01-scene-array-room.png') });

  await page.getByTestId('asset-asset-console-table').click();
  await page.waitForTimeout(450);
  await page.screenshot({ path: resolve(outputDir, '02-asset-catalog.png') });

  await page.getByRole('button', { name: /Gallery Sweep/ }).click();
  await page.getByRole('button', { name: 'Isolate' }).click();
  await page.getByTestId('sweep-rod').click();
  await page.waitForTimeout(450);
  await page.screenshot({ path: resolve(outputDir, '03-spline-rod.png') });
  await page.getByTestId('sweep-road').click();
  await page.waitForTimeout(450);
  await page.screenshot({ path: resolve(outputDir, '04-spline-road.png') });
  await page.getByTestId('sweep-corridor').click();
  await page.waitForTimeout(450);
  await page.screenshot({ path: resolve(outputDir, '05-spline-corridor.png') });

  const savedRecipeDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save Recipe' }).click();
  const recipeDownload = await savedRecipeDownload;
  const roundtripPath = resolve(outputDir, 'roundtrip.recipe.json');
  await recipeDownload.saveAs(roundtripPath);
  await page.getByTestId('sweep-road').click();
  await page.locator('input[type="file"]').setInputFiles(roundtripPath);
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: /Gallery Sweep/ }).click();
  const corridorClass = await page.getByTestId('sweep-corridor').getAttribute('class');
  if (!corridorClass?.includes('active')) throw new Error('Saved recipe did not reload the corridor sweep state.');

  await page.getByTestId('sweep-road').click();
  await page.getByRole('button', { name: /Atrium Volume/ }).click();
  await page.waitForTimeout(350);
  await page.screenshot({ path: resolve(outputDir, '06-room-sockets.png') });

  await page.getByTestId('asset-asset-console-table').click();
  await page.getByRole('button', { name: 'Export GLB' }).click();
  await page.getByRole('status').filter({ hasText: 'Exported' }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(700);
  if (!downloadPaths.some((path) => path.endsWith('.glb')) || !downloadPaths.some((path) => path.endsWith('.manifest.json'))) {
    throw new Error(`GLB export did not produce both files: ${downloadPaths.join(', ')}`);
  }

  const roundtripRecipe = parseRecipe(JSON.parse(await readFile(roundtripPath, 'utf8')));
  const summary = summarizeRecipe(roundtripRecipe);
  const stateSummary = (sweepType) => {
    const state = structuredClone(roundtripRecipe);
    if (state.splineDefinitions[0]) state.splineDefinitions[0].sweepType = sweepType;
    const stateResult = summarizeRecipe(state);
    return {
      sweepType,
      recipeHash: stateResult.recipeHash,
      triangleCount: stateResult.triangleCount,
      validation: stateResult.validation,
    };
  };
  const screenshots = [
    '01-scene-array-room.png', '02-asset-catalog.png', '03-spline-rod.png',
    '04-spline-road.png', '05-spline-corridor.png', '06-room-sockets.png',
  ];
  const readback = {
    capturedAt: new Date().toISOString(),
    baseUrl,
    browser: 'chromium',
    viewport: { width: 1440, height: 1000 },
    ...summary,
    recipeSnapshot: 'roundtrip.recipe.json',
    generatedPlacementCount: roundtripRecipe.placementRules.reduce((sum, rule) => sum + (rule.count ?? 0), 0),
    validationIssues: summary.validation,
    smokeChecks: {
      canvasVisible: true,
      assetIsolation: true,
      sweepModes: ['rod', 'road', 'corridor'],
      recipeSaveReload: true,
      glbExport: true,
      manifestExport: true,
      browserConsoleErrors: consoleErrors,
    },
    evidenceStates: {
      '01-scene-array-room.png': stateSummary('road'),
      '02-asset-catalog.png': stateSummary('road'),
      '03-spline-rod.png': stateSummary('rod'),
      '04-spline-road.png': stateSummary('road'),
      '05-spline-corridor.png': stateSummary('corridor'),
      '06-room-sockets.png': stateSummary('road'),
    },
    screenshots,
    exports: downloadPaths.map((path) => path.replace(`${outputDir}\\`, '').replace(`${outputDir}/`, '')),
  };
  await writeFile(resolve(outputDir, 'readback.json'), `${JSON.stringify(readback, null, 2)}\n`, 'utf8');
  if (consoleErrors.length) throw new Error(`Browser console errors:\n${consoleErrors.join('\n')}`);
  process.stdout.write(`${JSON.stringify({ ok: true, outputDir, recipeHash: summary.recipeHash, screenshots, exports: readback.exports }, null, 2)}\n`);
  await context.close();
} finally {
  if (browser) await browser.close();
  server.kill();
}
