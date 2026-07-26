import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { preview } from 'vite';
import { parseRecipe } from '@cgawe/schema';
import { recipeHash, validateRecipe } from '@cgawe/core';

/* global document, getComputedStyle, window */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(root, 'output/playwright/browser-authoring-loop');
const screenshotPath = resolve(outputDir, 'browser-authoring-loop-final.png');
const recipePath = resolve(outputDir, 'review-prop.recipe.json');
const readbackPath = resolve(outputDir, 'browser-authoring-loop-readback.json');
const previewPort = await findAvailablePort();
const baseUrl = `http://127.0.0.1:${previewPort}`;
const appRoot = resolve(root, 'apps/workbench');

await mkdir(outputDir, { recursive: true });
for (const name of [
  'browser-authoring-loop-final.png',
  'review-prop.recipe.json',
  'browser-authoring-loop-readback.json',
  'asset-review-prop.glb',
  'asset-review-prop.manifest.json',
]) await rm(resolve(outputDir, name), { force: true });

const server = await preview({
  root: appRoot,
  logLevel: 'error',
  preview: {
    host: '127.0.0.1',
    port: previewPort,
    strictPort: true,
  },
});

function findAvailablePort() {
  return new Promise((resolvePromise, reject) => {
    const probe = createServer();
    probe.unref();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      if (!address || typeof address === 'string') {
        probe.close();
        reject(new Error('Unable to allocate a local preview port.'));
        return;
      }
      probe.close((error) => error ? reject(error) : resolvePromise(address.port));
    });
  });
}

async function waitForServer() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch { /* Preview is still starting. */ }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 150));
  }
  throw new Error('Vite preview did not start.');
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

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByTestId('viewport').waitFor({ state: 'visible' });
  await page.locator('canvas').waitFor({ state: 'visible' });
  await page.waitForTimeout(600);
  const canvasBox = await page.locator('canvas').boundingBox();
  if (!canvasBox || canvasBox.width < 500 || canvasBox.height < 500) throw new Error('Desktop 3D viewport is missing or too small.');
  for (const testId of ['new-asset', 'new-material']) await page.getByTestId(testId).waitFor({ state: 'visible' });
  if (await page.locator('.bottom-dock').count() !== 0) throw new Error('Validation dock should be collapsed when the Recipe has no errors.');

  const currentHash = async () => page.locator('.stage-status code').textContent();
  const waitForRecipeChange = async (before) => {
    await page.waitForFunction((hash) => document.querySelector('.stage-status code')?.textContent !== hash, before);
    return currentHash();
  };
  const undo = () => page.getByTitle('Undo').click();
  const redo = () => page.getByTitle('Redo').click();

  // Asset create/delete is a real Recipe transaction and remains undoable.
  await page.getByTestId('new-asset-name').fill('Delete Probe');
  await page.getByTestId('new-asset').click();
  await page.getByTestId('asset-asset-delete-probe').waitFor();
  const deleteProbeHash = await currentHash();
  await page.getByTestId('delete-asset').click();
  await page.getByTestId('asset-asset-delete-probe').waitFor({ state: 'detached' });
  await undo();
  await page.getByTestId('asset-asset-delete-probe').waitFor();
  if (await currentHash() !== deleteProbeHash) throw new Error('Undo did not restore the deleted Asset.');
  await redo();
  await page.getByTestId('asset-asset-delete-probe').waitFor({ state: 'detached' });

  // Create Review Prop with its required default box.
  await page.getByTestId('new-asset-name').fill('Review Prop');
  await page.getByTestId('new-asset').click();
  await page.getByTestId('asset-asset-review-prop').waitFor();
  await page.getByTestId('part-name').fill('Base Block');
  await page.getByTestId('primitive-size-x').fill('1.8');
  await page.getByTestId('primitive-size-y').fill('0.7');
  await page.getByTestId('primitive-size-z').fill('1.2');
  await page.getByTestId('part-position-x').fill('-0.8');
  await page.getByTestId('part-position-y').fill('0.35');

  // Add and independently edit a cylinder and sphere.
  await page.getByTestId('part-primitive-type').selectOption('cylinder');
  await page.getByTestId('add-part').click();
  await page.getByTestId('part-name').fill('Signal Column');
  await page.getByTestId('primitive-radius-top').fill('0.32');
  await page.getByTestId('primitive-radius-bottom').fill('0.42');
  await page.getByTestId('primitive-height').fill('1.8');
  await page.getByTestId('part-position-x').fill('0.3');
  await page.getByTestId('part-position-y').fill('0.9');

  await page.getByTestId('part-primitive-type').selectOption('sphere');
  await page.getByTestId('add-part').click();
  await page.getByTestId('part-name').fill('Beacon Sphere');
  await page.getByTestId('primitive-radius').fill('0.55');
  await page.getByTestId('part-position-x').fill('1.25');
  await page.getByTestId('part-position-y').fill('1.25');
  await page.getByTestId('part-position-z').fill('0.2');
  if (await page.getByRole('combobox', { name: 'Selected part' }).locator('option').count() !== 3) throw new Error('Review Prop does not contain exactly three authored Parts.');

  // Part duplication and safe deletion both participate in Undo/Redo.
  const beforePartDuplicateHash = await currentHash();
  await page.getByTestId('duplicate-part').click();
  const partDuplicateHash = await waitForRecipeChange(beforePartDuplicateHash);
  if (await page.getByRole('combobox', { name: 'Selected part' }).locator('option').count() !== 4) throw new Error('Part duplication did not add a Part.');
  await undo();
  if (await currentHash() !== beforePartDuplicateHash) throw new Error('Undo did not remove the duplicated Part.');
  await redo();
  if (await currentHash() !== partDuplicateHash) throw new Error('Redo did not restore the duplicated Part.');
  await page.getByTestId('delete-part').click();
  const partDeleteHash = await currentHash();
  await undo();
  if (await currentHash() !== partDuplicateHash) throw new Error('Undo did not restore the deleted Part.');
  await redo();
  if (await currentHash() !== partDeleteHash) throw new Error('Redo did not reapply Part deletion.');

  // Create and edit two distinct materials.
  await page.getByTestId('new-material-name').fill('Review Teal');
  await page.getByTestId('new-material').click();
  await page.getByTestId('material-color').evaluate((input, value) => {
    const nativeSetter = Object.getOwnPropertyDescriptor(input.constructor.prototype, 'value')?.set;
    nativeSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, '#2ea7a0');
  await page.getByTestId('material-roughness').fill('0.35');
  const beforeMaterialChangeHash = await currentHash();
  await page.getByTestId('material-metalness').fill('0.48');
  const materialChangeHash = await waitForRecipeChange(beforeMaterialChangeHash);
  await undo();
  if (await currentHash() !== beforeMaterialChangeHash) throw new Error('Undo did not restore the material value.');
  await redo();
  if (await currentHash() !== materialChangeHash) throw new Error('Redo did not restore the material value.');

  await page.getByTestId('new-material-name').fill('Review Copper');
  await page.getByTestId('new-material').click();
  await page.getByTestId('material-color').evaluate((input, value) => {
    const nativeSetter = Object.getOwnPropertyDescriptor(input.constructor.prototype, 'value')?.set;
    nativeSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, '#c46b3c');
  await page.getByTestId('material-roughness').fill('0.42');
  await page.getByTestId('material-metalness').fill('0.35');

  // Assign both materials to the three authored Parts.
  await page.getByTestId('asset-asset-review-prop').click();
  const selectedPart = page.getByRole('combobox', { name: 'Selected part' });
  await selectedPart.selectOption({ label: 'Base Block' });
  await page.getByTestId('part-material').selectOption('mat-review-copper');
  await selectedPart.selectOption({ label: 'Signal Column' });
  await page.getByTestId('part-material').selectOption('mat-review-teal');
  await selectedPart.selectOption({ label: 'Beacon Sphere' });
  await page.getByTestId('part-material').selectOption('mat-review-copper');

  // Place, name and transform the Asset through the existing Inspector transaction path.
  await page.getByTestId('add-to-scene').click();
  await page.getByTestId('instance-name').fill('Review Prop Stage');
  const beforeTransformHash = await currentHash();
  await page.getByTestId('instance-position-x').fill('2.2');
  const transformHash = await waitForRecipeChange(beforeTransformHash);
  await undo();
  if (await currentHash() !== beforeTransformHash) throw new Error('Undo did not restore the Instance transform.');
  await redo();
  if (await currentHash() !== transformHash) throw new Error('Redo did not restore the Instance transform.');
  await page.getByTestId('instance-position-z').fill('-1.3');
  await page.getByTestId('instance-rotation-y').fill('0.45');

  // Instance duplication/deletion are complete and undoable; retain one final instance.
  const beforeInstanceDuplicateHash = await currentHash();
  await page.getByTestId('duplicate-instance').click();
  const instanceDuplicateHash = await waitForRecipeChange(beforeInstanceDuplicateHash);
  await undo();
  if (await currentHash() !== beforeInstanceDuplicateHash) throw new Error('Undo did not remove the duplicated Instance.');
  await redo();
  if (await currentHash() !== instanceDuplicateHash) throw new Error('Redo did not restore the duplicated Instance.');
  await page.getByTestId('delete-instance').click();
  const instanceDeleteHash = await currentHash();
  await undo();
  if (await currentHash() !== instanceDuplicateHash) throw new Error('Undo did not restore the deleted Instance.');
  await redo();
  if (await currentHash() !== instanceDeleteHash) throw new Error('Redo did not reapply Instance deletion.');
  await page.getByTestId('asset-asset-review-prop').click();
  if (await page.getByTestId('delete-asset').isEnabled()) throw new Error('Referenced Asset deletion was not blocked.');
  await page.getByText(/Delete blocked by 1 scene instance/).waitFor();

  // Save, mutate, then reload through the visible Open control.
  const savedHash = await currentHash();
  const recipeDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save Recipe' }).click();
  const recipeDownload = await recipeDownloadPromise;
  await recipeDownload.saveAs(recipePath);
  await page.getByTestId('part-name').fill('Temporary Mutation');
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Open' }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles(recipePath);
  await page.getByRole('status').filter({ hasText: 'Loaded review-prop.recipe.json' }).waitFor();
  await page.getByTestId('asset-asset-review-prop').waitFor();
  if (await currentHash() !== savedHash) throw new Error('Save/Open did not restore the saved Recipe hash.');

  const roundtripRecipe = parseRecipe(JSON.parse(await readFile(recipePath, 'utf8')));
  const issues = validateRecipe(roundtripRecipe);
  const reviewAsset = roundtripRecipe.assetDefinitions.find((asset) => asset.id === 'asset-review-prop');
  const reviewInstance = roundtripRecipe.sceneInstances.find((instance) => instance.assetId === 'asset-review-prop');
  if (!reviewAsset || reviewAsset.parts.length !== 3) throw new Error('Roundtrip Recipe did not preserve Review Prop and its three Parts.');
  if (!reviewInstance || reviewInstance.name !== 'Review Prop Stage') throw new Error('Roundtrip Recipe did not preserve the authored Scene Instance.');
  const reviewTeal = roundtripRecipe.materialDefinitions.find((material) => material.id === 'mat-review-teal');
  const reviewCopper = roundtripRecipe.materialDefinitions.find((material) => material.id === 'mat-review-copper');
  if (reviewTeal?.color !== '#2ea7a0' || reviewCopper?.color !== '#c46b3c') throw new Error('Roundtrip Recipe did not preserve both authored material colors.');
  const materialIds = new Set(reviewAsset.parts.map((part) => part.materialId));
  if (!materialIds.has('mat-review-teal') || !materialIds.has('mat-review-copper')) throw new Error('Roundtrip Recipe did not preserve both material assignments.');
  if (issues.some((issue) => issue.severity === 'error')) throw new Error(`Roundtrip Recipe validation failed: ${JSON.stringify(issues)}`);

  // Export the selected Asset after reload and require a non-empty GLB.
  await page.getByTestId('asset-asset-review-prop').click();
  const exportPaths = [];
  const exportTasks = [];
  page.on('download', (download) => {
    const path = resolve(outputDir, download.suggestedFilename());
    exportPaths.push(path);
    exportTasks.push(download.saveAs(path));
  });
  await page.getByRole('button', { name: 'Export Selected Asset GLB' }).click();
  await page.getByRole('status').filter({ hasText: 'Selected Asset exported: Review Prop.' }).waitFor({ timeout: 15_000 });
  const exportDeadline = Date.now() + 10_000;
  while (exportTasks.length < 2 && Date.now() < exportDeadline) await page.waitForTimeout(100);
  await Promise.all(exportTasks);
  const glbPath = resolve(outputDir, 'asset-review-prop.glb');
  const glbBytes = (await readFile(glbPath)).byteLength;
  if (glbBytes <= 0) throw new Error('Selected Asset GLB is empty.');
  if (!exportPaths.some((path) => path.endsWith('asset-review-prop.manifest.json'))) throw new Error('Selected Asset manifest was not downloaded.');

  // Return to a scene view with all critical creation controls visible for evidence.
  await page.getByRole('button', { name: 'Scene', exact: true }).click();
  await page.locator('.library-panel .panel-scroll').evaluate((element) => { element.scrollTop = 0; });
  await page.locator('.inspector-panel .panel-scroll').evaluate((element) => { element.scrollTop = 0; });
  await page.waitForTimeout(700);
  const criticalControls = await page.evaluate(() => {
    const selectors = ['[data-testid="new-asset"]', '[data-testid="new-material"]', '[data-testid="add-part"]', '[data-testid="add-to-scene"]'];
    return selectors.map((selector) => {
      const element = document.querySelector(selector);
      const rect = element?.getBoundingClientRect();
      return {
        selector,
        visible: Boolean(rect && rect.width > 0 && rect.height > 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth),
        fontSize: element ? Number.parseFloat(getComputedStyle(element).fontSize) : 0,
      };
    });
  });
  if (criticalControls.some((control) => !control.visible || control.fontSize < 10)) {
    throw new Error(`Critical authoring controls are not visible and legible: ${JSON.stringify(criticalControls)}`);
  }
  await page.locator('.stage-status').filter({ hasText: 'Recipe valid' }).waitFor();
  await page.screenshot({ path: screenshotPath });
  if (consoleErrors.length > 0) throw new Error(`Browser console errors:\n${consoleErrors.join('\n')}`);

  const readback = {
    ok: true,
    baseUrl,
    browser: 'chromium',
    viewport: { width: 1440, height: 1000 },
    recipeHash: recipeHash(roundtripRecipe),
    asset: {
      id: reviewAsset.id,
      name: reviewAsset.name,
      parts: reviewAsset.parts.map((part) => ({ id: part.id, name: part.name, primitive: part.primitive.type, materialId: part.materialId, transform: part.transform })),
    },
    materials: roundtripRecipe.materialDefinitions.filter((material) => material.id === 'mat-review-teal' || material.id === 'mat-review-copper'),
    instance: reviewInstance,
    undoRedo: {
      assetDelete: true,
      partDuplicate: true,
      partDelete: true,
      materialEdit: true,
      instanceTransform: true,
      instanceDuplicate: true,
      instanceDelete: true,
    },
    safeDeletion: { referencedAssetBlocked: true, partReferencesRepaired: true },
    saveOpen: { beforeHash: savedHash, afterHash: await currentHash(), equal: savedHash === await currentHash() },
    validation: {
      errors: issues.filter((issue) => issue.severity === 'error').length,
      warnings: issues.filter((issue) => issue.severity === 'warning').length,
    },
    export: { glb: 'asset-review-prop.glb', glbBytes, manifest: 'asset-review-prop.manifest.json' },
    criticalControls,
    screenshot: screenshotPath,
    consoleErrorCount: consoleErrors.length,
  };
  await writeFile(readbackPath, `${JSON.stringify(readback, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(readback, null, 2)}\n`);
  await context.close();
} finally {
  if (browser) await browser.close();
  await new Promise((resolvePromise, reject) => {
    server.httpServer.close((error) => error ? reject(error) : resolvePromise());
  });
}
