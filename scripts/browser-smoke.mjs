import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { parseRecipe } from '@cgawe/schema';
import { generateSplineMesh, getMeshStats, recipeHash, summarizeRecipe, validateRecipe } from '@cgawe/core';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(root, 'output/playwright');
const baseUrl = 'http://127.0.0.1:4173';
const viteBin = resolve(root, 'node_modules/vite/bin/vite.js');
const appRoot = resolve(root, 'apps/workbench');
const screenshots = [
  'v02-01-create-mode.png',
  'v02-02-control-point-edit.png',
  'v02-03-curved-rod.png',
  'v02-04-curved-road.png',
  'v02-05-keyframed-corridor.png',
  'v02-06-integrated-scene.png',
  'v02-07-reloaded-state.png',
];
await mkdir(outputDir, { recursive: true });

for (const name of [
  ...screenshots,
  'v0.2-roundtrip.recipe.json', 'asset-console-table.glb', 'asset-console-table.manifest.json',
  'readback-v0.2.json', 'starter-atelier.recipe.json',
]) await rm(resolve(outputDir, name), { force: true });

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

function splineState(recipe, splineName, extra = {}) {
  const spline = recipe.splineDefinitions.find((item) => item.name === splineName);
  if (!spline) return { recipeHash: recipeHash(recipe), ...extra };
  const stats = getMeshStats([generateSplineMesh(spline)]);
  const issues = validateRecipe(recipe);
  return {
    recipeHash: recipeHash(recipe),
    splineId: spline.id,
    controlPointCount: spline.controlPoints.length,
    profile: spline.sweepType,
    keyframeCount: {
      radius: spline.radiusKeyframes.length,
      width: spline.widthKeyframes.length,
      height: spline.heightKeyframes.length,
    },
    vertexCount: stats.vertexCount,
    triangleCount: stats.triangleCount,
    boundingBox: stats.boundingBox,
    validation: {
      errors: issues.filter((issue) => issue.severity === 'error').length,
      warnings: issues.filter((issue) => issue.severity === 'warning').length,
    },
    ...extra,
  };
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
  const downloadTasks = [];
  page.on('download', (download) => {
    const path = resolve(outputDir, download.suggestedFilename());
    downloadPaths.push(path);
    downloadTasks.push(download.saveAs(path));
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByTestId('viewport').waitFor({ state: 'visible' });
  await page.locator('canvas').waitFor({ state: 'visible' });
  await page.waitForTimeout(700);
  const canvasBox = await page.locator('canvas').boundingBox();
  if (!canvasBox || canvasBox.width < 300 || canvasBox.height < 250) throw new Error('3D viewport canvas is missing or too small.');

  const evidenceStates = {};
  async function readCurrentRecipe() {
    await page.getByRole('button', { name: /Recipe JSON/ }).click();
    const text = await page.locator('.recipe-preview code').textContent();
    await page.getByRole('button', { name: /^Validation/ }).click();
    if (!text) throw new Error('Recipe JSON dock did not expose the current recipe.');
    return parseRecipe(JSON.parse(text));
  }
  async function capture(name, splineName, extra = {}) {
    await page.screenshot({ path: resolve(outputDir, name) });
    evidenceStates[name] = splineState(await readCurrentRecipe(), splineName, extra);
  }

  // Create a new Spline by clicking the viewport ground plane; OrbitControls is gated in this mode.
  await page.getByRole('button', { name: 'mesh', exact: true }).click();
  await page.getByRole('button', { name: 'context', exact: true }).click();
  await page.getByTestId('new-spline').click();
  await page.mouse.click(canvasBox.x + canvasBox.width * 0.22, canvasBox.y + canvasBox.height * 0.72);
  await page.keyboard.press('Escape');
  await page.getByTestId('draft-point-count').waitFor({ state: 'detached' });
  if (await page.getByRole('button', { name: /Spline 2/ }).count()) throw new Error('Cancelled Spline creation leaked into the Recipe.');
  await page.getByTestId('new-spline').click();
  const groundClickCandidates = [
    [0.22, 0.72], [0.38, 0.66], [0.56, 0.69], [0.72, 0.63],
    [0.28, 0.54], [0.47, 0.52], [0.67, 0.51], [0.82, 0.58],
  ];
  for (const [xRatio, yRatio] of groundClickCandidates) {
    const before = Number((await page.getByTestId('draft-point-count').textContent())?.match(/^\d+/)?.[0] ?? 0);
    await page.mouse.click(canvasBox.x + canvasBox.width * xRatio, canvasBox.y + canvasBox.height * yRatio);
    await page.waitForTimeout(140);
    const after = Number((await page.getByTestId('draft-point-count').textContent())?.match(/^\d+/)?.[0] ?? 0);
    if (after >= 3) break;
    if (after === before) continue;
  }
  const draftPointText = await page.getByTestId('draft-point-count').textContent();
  if (!draftPointText?.startsWith('3 ')) throw new Error(`Viewport creation produced an unexpected point count: ${draftPointText}`);
  await capture('v02-01-create-mode.png', 'Spline 2', { draftControlPointCount: 3, creationMode: true });
  await page.getByTestId('confirm-spline').click();
  await page.getByRole('button', { name: /Spline 2/ }).waitFor();
  await page.getByRole('button', { name: 'mesh', exact: true }).click();
  await page.getByRole('button', { name: 'context', exact: true }).click();
  await page.waitForTimeout(450);
  await capture('v02-02-control-point-edit.png', 'Spline 2', { selectedControlPoint: 3 });

  // Move a point as a single Recipe transaction, then prove Undo/Redo restore the expected hashes.
  await page.getByTestId('spline-point-1').click();
  const beforeMoveHash = await page.locator('.stage-status code').textContent();
  await page.getByTestId('control-point-y').fill('1.5');
  await page.waitForTimeout(250);
  const movedHash = await page.locator('.stage-status code').textContent();
  if (movedHash === beforeMoveHash) throw new Error('Control point movement did not update the Recipe hash.');
  await page.locator('button[title="Undo"]').click();
  await page.waitForTimeout(180);
  const undoneHash = await page.locator('.stage-status code').textContent();
  if (undoneHash !== beforeMoveHash) throw new Error('Undo did not restore the pre-move Recipe hash.');
  await page.locator('button[title="Redo"]').click();
  await page.waitForTimeout(180);
  const redoneHash = await page.locator('.stage-status code').textContent();
  if (redoneHash !== movedHash) throw new Error('Redo did not restore the moved Recipe hash.');

  await page.getByRole('button', { name: 'Isolate' }).click();
  await page.getByRole('button', { name: 'mesh', exact: true }).click();
  await page.getByTestId('append-point-viewport').click();
  await page.mouse.click(canvasBox.x + canvasBox.width * 0.7, canvasBox.y + canvasBox.height * 0.62);
  await page.getByTestId('control-point-count').filter({ hasText: '4' }).waitFor();
  await page.getByTestId('insert-point-viewport').click();
  await page.mouse.click(canvasBox.x + canvasBox.width * 0.55, canvasBox.y + canvasBox.height * 0.63);
  await page.getByTestId('control-point-count').filter({ hasText: '5' }).waitFor();
  await page.getByTestId('delete-point-viewport').click();
  await page.getByTestId('control-point-count').filter({ hasText: '4' }).waitFor();
  await page.getByRole('button', { name: 'mesh', exact: true }).click();
  await page.getByTestId('sweep-rod').click();
  await page.waitForTimeout(350);
  await capture('v02-03-curved-rod.png', 'Spline 2');
  await page.getByTestId('sweep-road').click();
  await page.waitForTimeout(350);
  await capture('v02-04-curved-road.png', 'Spline 2');

  await page.getByTestId('sweep-corridor').click();
  await page.getByTestId('add-keyframe-widthKeyframes').click();
  await page.getByTestId('keyframe-value-widthKeyframes').fill('1.8');
  await page.getByTestId('add-keyframe-heightKeyframes').click();
  await page.getByTestId('keyframe-value-heightKeyframes').fill('2.8');
  await page.waitForTimeout(400);
  await capture('v02-05-keyframed-corridor.png', 'Spline 2');

  await page.getByTestId('sweep-road').click();
  await page.getByRole('button', { name: 'Scene' }).click();
  await page.waitForTimeout(400);
  await capture('v02-06-integrated-scene.png', 'Spline 2');
  await page.getByTestId('sweep-corridor').click();

  // Save, mutate, reload and require the normalized Recipe hash to match the saved state.
  const savedHash = await page.locator('.stage-status code').textContent();
  const recipeDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save Recipe' }).click();
  const recipeDownload = await recipeDownloadPromise;
  const roundtripPath = resolve(outputDir, 'v0.2-roundtrip.recipe.json');
  await recipeDownload.saveAs(roundtripPath);
  await page.getByTestId('spline-point-0').click();
  await page.getByTestId('control-point-x').fill('-5');
  await page.locator('input[type="file"]').setInputFiles(roundtripPath);
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: /Spline 2/ }).click();
  const reloadedHash = await page.locator('.stage-status code').textContent();
  if (reloadedHash !== savedHash) throw new Error(`Saved/reloaded hash mismatch: ${savedHash} vs ${reloadedHash}.`);
  await page.waitForTimeout(350);
  await capture('v02-07-reloaded-state.png', 'Spline 2', { saveReloadHashMatch: true });

  // v0.1 GLB + manifest regression remains a real browser export.
  await page.getByTestId('asset-asset-console-table').click();
  await page.getByRole('button', { name: 'Export GLB' }).click();
  await page.getByRole('status').filter({ hasText: 'Exported' }).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(650);
  await Promise.all(downloadTasks);
  if (!downloadPaths.some((path) => path.endsWith('.glb')) || !downloadPaths.some((path) => path.endsWith('.manifest.json'))) {
    throw new Error(`GLB export did not produce both files: ${downloadPaths.join(', ')}`);
  }

  const roundtripRecipe = parseRecipe(JSON.parse(await readFile(roundtripPath, 'utf8')));
  const summary = summarizeRecipe(roundtripRecipe);
  const editedSpline = roundtripRecipe.splineDefinitions.find((item) => item.name === 'Spline 2');
  if (!editedSpline) throw new Error('The saved Recipe does not contain the newly created Spline.');
  const splineStats = getMeshStats([generateSplineMesh(editedSpline)]);
  const issues = validateRecipe(roundtripRecipe);
  const readback = {
    capturedAt: new Date().toISOString(),
    baseUrl,
    browser: 'chromium',
    viewport: { width: 1440, height: 1000 },
    schemaVersion: roundtripRecipe.schemaVersion,
    recipeHash: recipeHash(roundtripRecipe),
    seed: roundtripRecipe.generationSeed,
    splineId: editedSpline.id,
    controlPointCount: editedSpline.controlPoints.length,
    profile: editedSpline.sweepType,
    keyframeCount: {
      radius: editedSpline.radiusKeyframes.length,
      width: editedSpline.widthKeyframes.length,
      height: editedSpline.heightKeyframes.length,
      total: editedSpline.radiusKeyframes.length + editedSpline.widthKeyframes.length + editedSpline.heightKeyframes.length,
    },
    vertexCount: splineStats.vertexCount,
    triangleCount: splineStats.triangleCount,
    boundingBox: splineStats.boundingBox,
    validation: {
      errors: issues.filter((issue) => issue.severity === 'error').length,
      warnings: issues.filter((issue) => issue.severity === 'warning').length,
    },
    saveReload: { beforeHash: savedHash, afterHash: reloadedHash, equal: savedHash === reloadedHash },
    transaction: { beforeMoveHash, movedHash, undoHash: undoneHash, redoHash: redoneHash, undoRestored: undoneHash === beforeMoveHash, redoRestored: redoneHash === movedHash },
    viewportOperations: { creationCancelled: true, createdPointCount: 3, afterAppend: 4, afterInsert: 5, afterDelete: 4 },
    consoleErrorCount: consoleErrors.length,
    browserConsoleErrors: consoleErrors,
    regression: {
      v01Summary: summary,
      glbExport: true,
      manifestExport: true,
    },
    screenshots,
    evidenceStates,
    exports: downloadPaths.map((path) => path.replace(`${outputDir}\\`, '').replace(`${outputDir}/`, '')),
  };
  await writeFile(resolve(outputDir, 'readback-v0.2.json'), `${JSON.stringify(readback, null, 2)}\n`, 'utf8');
  if (consoleErrors.length) throw new Error(`Browser console errors:\n${consoleErrors.join('\n')}`);
  process.stdout.write(`${JSON.stringify({ ok: true, outputDir, recipeHash: readback.recipeHash, splineId: readback.splineId, screenshots, exports: readback.exports }, null, 2)}\n`);
  await context.close();
} finally {
  if (browser) await browser.close();
  server.kill();
}
