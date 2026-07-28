import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PerspectiveCamera, Vector3 } from 'three';
import { preview } from 'vite';
import { parseRecipe } from '@cgawe/schema';
import { recipeHash, validateRecipe } from '@cgawe/core';

/* global document, getComputedStyle */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(root, 'output/playwright/direct-manipulation');
const artifactDir = resolve(root, 'artifacts/direct-manipulation-visible-placement-v1');
const writeArtifacts = process.argv.includes('--write-artifacts');
const recipePath = resolve(outputDir, 'direct-review-prop.recipe.json');
const readbackPath = resolve(outputDir, 'readback.json');
const evidenceFiles = {
  recipe: 'direct-review-prop.recipe.json',
  readback: 'readback.json',
  isolateScreenshot: '01-isolate-cylinder-direct-selected.png',
  placementScreenshot: '02-scene-placement-preview.png',
  confirmedScreenshot: '03-scene-confirmed-selected.png',
};
const isolateScreenshot = resolve(outputDir, evidenceFiles.isolateScreenshot);
const placementScreenshot = resolve(outputDir, evidenceFiles.placementScreenshot);
const confirmedScreenshot = resolve(outputDir, evidenceFiles.confirmedScreenshot);
const appRoot = resolve(root, 'apps/workbench');
const previewPort = await findAvailablePort();
const baseUrl = `http://127.0.0.1:${previewPort}`;

await mkdir(outputDir, { recursive: true });
for (const name of [
  'direct-review-prop.recipe.json',
  'readback.json',
  '01-isolate-cylinder-direct-selected.png',
  '02-scene-placement-preview.png',
  '03-scene-confirmed-selected.png',
  'asset-direct-review-prop.glb',
  'asset-direct-review-prop.manifest.json',
]) await rm(resolve(outputDir, name), { force: true });

const server = await preview({
  root: appRoot,
  logLevel: 'error',
  preview: { host: '127.0.0.1', port: previewPort, strictPort: true },
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

function projectToCanvas(point, canvasBox) {
  const camera = new PerspectiveCamera(42, canvasBox.width / canvasBox.height, 0.05, 100);
  camera.position.set(9, 6.6, 10);
  camera.lookAt(0, 1, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  const projected = new Vector3(...point).project(camera);
  return {
    x: canvasBox.x + ((projected.x + 1) * canvasBox.width) / 2,
    y: canvasBox.y + ((1 - projected.y) * canvasBox.height) / 2,
  };
}

function normalizedDirection(from, to) {
  const x = to.x - from.x;
  const y = to.y - from.y;
  const length = Math.hypot(x, y);
  return { x: x / length, y: y / length };
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByTestId('viewport').waitFor({ state: 'visible' });
  const canvas = page.locator('canvas');
  await canvas.waitFor({ state: 'visible' });
  await page.waitForTimeout(700);
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox || canvasBox.width < 800 || canvasBox.height < 700) throw new Error('Desktop 3D viewport is missing or too small.');

  const currentHash = () => page.locator('.stage-status code').textContent();
  const undo = () => page.getByTitle('Undo').click();
  const redo = () => page.getByTitle('Redo').click();
  const libraryInstanceCount = () => page.locator('.library-panel [data-testid^="instance-"]').count();
  const readVector = (prefix) => Promise.all(['x', 'y', 'z'].map((axis) => page.getByTestId(`${prefix}-${axis}`).inputValue()));
  const expectHash = async (expected, label) => {
    const actual = await currentHash();
    if (actual !== expected) throw new Error(`${label}: expected Recipe hash ${expected}, received ${actual}.`);
  };
  async function setColor(testId, value) {
    await page.getByTestId(testId).evaluate((input, nextValue) => {
      const nativeSetter = Object.getOwnPropertyDescriptor(input.constructor.prototype, 'value')?.set;
      nativeSetter?.call(input, nextValue);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  }
  async function directSelect(name, point) {
    const screen = projectToCanvas(point, canvasBox);
    await page.mouse.click(screen.x, screen.y);
    await page.getByTestId('part-name').waitFor({ state: 'visible' });
    const selected = await page.getByTestId('part-name').inputValue();
    if (selected !== name) throw new Error(`Direct viewport pick expected ${name}, received ${selected}.`);
    const contextText = await page.getByTestId('viewport-selection').textContent();
    if (!contextText?.includes(name)) throw new Error(`Viewport context did not identify directly selected ${name}.`);
    return screen;
  }
  async function dragFromTo(from, to) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.waitForTimeout(50);
    const cameraState = await page.getByTestId('camera-control-state').textContent();
    if (cameraState !== 'Camera locked') {
      await page.mouse.up();
      throw new Error(`Transform handle did not lock camera at ${JSON.stringify(from)}.`);
    }
    await page.mouse.move(to.x, to.y, { steps: 16 });
    return cameraState;
  }
  async function verifyGesture({ mode, prefix, from, to }) {
    await page.getByTestId(`transform-mode-${mode}`).click();
    await page.waitForTimeout(180);
    const beforeHash = await currentHash();
    const before = await readVector(prefix);
    const cameraState = await dragFromTo(from, to);
    const during = await readVector(prefix);
    await page.mouse.up();
    await page.waitForTimeout(220);
    const afterHash = await currentHash();
    const after = await readVector(prefix);
    if (beforeHash === afterHash || JSON.stringify(before) === JSON.stringify(after)) {
      throw new Error(`${mode} gizmo did not update ${prefix}: ${JSON.stringify({ before, during, after })}.`);
    }
    await undo();
    await page.waitForTimeout(160);
    await expectHash(beforeHash, `${mode} Undo`);
    const undone = await readVector(prefix);
    if (JSON.stringify(undone) !== JSON.stringify(before)) throw new Error(`${mode} Undo did not restore Inspector values.`);
    await redo();
    await page.waitForTimeout(160);
    await expectHash(afterHash, `${mode} Redo`);
    const redone = await readVector(prefix);
    if (JSON.stringify(redone) !== JSON.stringify(after)) throw new Error(`${mode} Redo did not restore Inspector values.`);
    return { mode, cameraState, beforeHash, afterHash, before, during, after, undoRestored: true, redoRestored: true };
  }

  // Author a deliberately separated three-Part Asset so every shape can be picked from the viewport.
  await page.getByRole('button', { name: 'Isolate' }).click();
  await page.getByTestId('new-asset-name').fill('Direct Review Prop');
  await page.getByTestId('new-asset').click();
  await page.getByTestId('asset-asset-direct-review-prop').waitFor();
  await page.getByTestId('part-name').fill('Direct Box');
  await page.getByTestId('primitive-size-x').fill('1.2');
  await page.getByTestId('primitive-size-y').fill('1.1');
  await page.getByTestId('primitive-size-z').fill('1');
  await page.getByTestId('part-position-x').fill('-2');
  await page.getByTestId('part-position-y').fill('0.55');

  await page.getByTestId('part-primitive-type').selectOption('cylinder');
  await page.getByTestId('add-part').click();
  await page.getByTestId('part-name').fill('Direct Cylinder');
  await page.getByTestId('primitive-radius-top').fill('0.48');
  await page.getByTestId('primitive-radius-bottom').fill('0.48');
  await page.getByTestId('primitive-height').fill('1.6');
  await page.getByTestId('part-position-y').fill('0.8');

  await page.getByTestId('part-primitive-type').selectOption('sphere');
  await page.getByTestId('add-part').click();
  await page.getByTestId('part-name').fill('Direct Sphere');
  await page.getByTestId('primitive-radius').fill('0.65');
  await page.getByTestId('part-position-x').fill('2');
  await page.getByTestId('part-position-y').fill('0.65');

  const partSelect = page.getByRole('combobox', { name: 'Selected part' });
  if (await partSelect.locator('option').count() !== 3) throw new Error('Direct Review Prop does not contain exactly three Parts.');

  const materials = [
    { name: 'Direct Amber', id: 'mat-direct-amber', color: '#d88935' },
    { name: 'Direct Teal', id: 'mat-direct-teal', color: '#2bb8ad' },
    { name: 'Direct Violet', id: 'mat-direct-violet', color: '#8d6ed6' },
  ];
  for (const material of materials) {
    await page.getByTestId('new-material-name').fill(material.name);
    await page.getByTestId('new-material').click();
    await setColor('material-color', material.color);
    await page.getByTestId('material-roughness').fill('0.38');
    await page.getByTestId('material-metalness').fill('0.22');
  }
  await page.getByTestId('asset-asset-direct-review-prop').click();
  for (const assignment of [
    { part: 'Direct Box', material: 'mat-direct-amber' },
    { part: 'Direct Cylinder', material: 'mat-direct-teal' },
    { part: 'Direct Sphere', material: 'mat-direct-violet' },
  ]) {
    await partSelect.selectOption({ label: assignment.part });
    await page.getByTestId('part-material').selectOption(assignment.material);
  }

  // Native number spinners are removed without crushing the numeric Inspector controls.
  const numberControlAudit = await page.evaluate(() => [...document.querySelectorAll('input[type="number"]')].map((input) => {
    const rect = input.getBoundingClientRect();
    const style = getComputedStyle(input);
    return { testId: input.dataset.testid ?? '', height: rect.height, width: rect.width, appearance: style.appearance };
  }));
  if (!numberControlAudit.length || numberControlAudit.some((input) => input.height < 28 || input.width < 58 || input.appearance !== 'textfield')) {
    throw new Error(`Numeric Inspector controls are not clean and usable: ${JSON.stringify(numberControlAudit)}.`);
  }

  // Each authored shape is selected by clicking the rendered object itself.
  await directSelect('Direct Box', [-2, 0.55, 0]);
  await directSelect('Direct Cylinder', [0, 0.8, 0]);
  await directSelect('Direct Sphere', [2, 0.65, 0]);
  await directSelect('Direct Cylinder', [0, 0.8, 0]);

  // Move, rotate and scale the selected cylinder; every drag is one coherent Undo/Redo transaction.
  const cylinderOrigin = projectToCanvas([0, 0.8, 0], canvasBox);
  const projectedX = projectToCanvas([1, 0.8, 0], canvasBox);
  const xDirection = normalizedDirection(cylinderOrigin, projectedX);
  const moveGesture = await verifyGesture({
    mode: 'translate',
    prefix: 'part-position',
    from: { x: cylinderOrigin.x + xDirection.x * 84, y: cylinderOrigin.y + xDirection.y * 84 },
    to: { x: cylinderOrigin.x + xDirection.x * 170, y: cylinderOrigin.y + xDirection.y * 170 },
  });
  const movedPosition = (await readVector('part-position')).map(Number);
  const movedOrigin = projectToCanvas(movedPosition, canvasBox);
  const rotateGesture = await verifyGesture({
    mode: 'rotate',
    prefix: 'part-rotation',
    from: { x: movedOrigin.x - 66, y: movedOrigin.y - 32 },
    to: { x: movedOrigin.x - 66, y: movedOrigin.y + 63 },
  });
  const scaleGesture = await verifyGesture({
    mode: 'scale',
    prefix: 'part-scale',
    from: { x: movedOrigin.x + 2, y: movedOrigin.y - 85 },
    to: { x: movedOrigin.x + 2, y: movedOrigin.y - 155 },
  });
  await page.getByTestId('transform-mode-translate').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: isolateScreenshot });

  // Cancelled placement is purely ephemeral; confirmation creates exactly one selected instance.
  const beforePlacementHash = await currentHash();
  const beforePlacementCount = await libraryInstanceCount();
  await page.getByTestId('add-to-scene').click();
  await page.getByTestId('placement-strip').waitFor();
  await page.mouse.move(canvasBox.x + canvasBox.width * 0.50, canvasBox.y + canvasBox.height * 0.76);
  await page.waitForTimeout(220);
  if (await libraryInstanceCount() !== beforePlacementCount) throw new Error('Placement preview mutated Scene instances before confirmation.');
  await expectHash(beforePlacementHash, 'Placement preview');
  await page.getByTestId('placement-cancel').click();
  await page.getByTestId('placement-strip').waitFor({ state: 'detached' });
  if (await libraryInstanceCount() !== beforePlacementCount) throw new Error('Placement cancel mutated Scene instances.');
  await expectHash(beforePlacementHash, 'Placement cancel');

  await page.getByTestId('add-to-scene').click();
  await page.mouse.move(canvasBox.x + canvasBox.width * 0.50, canvasBox.y + canvasBox.height * 0.76);
  await page.waitForTimeout(300);
  const placementText = await page.getByTestId('placement-position').textContent();
  const placementValues = placementText?.match(/-?\d+\.\d+/g)?.map(Number);
  if (!placementValues || placementValues.length !== 3) throw new Error(`Visible placement did not expose a preview position: ${placementText}`);
  if (await page.locator('.viewport-tools').evaluate((element) => getComputedStyle(element).top) !== '70px') {
    throw new Error('Placement strip overlaps the viewport tool row.');
  }
  await page.screenshot({ path: placementScreenshot });
  await page.getByTestId('placement-confirm').click();
  await page.getByTestId('placement-strip').waitFor({ state: 'detached' });
  await page.waitForTimeout(300);
  const placedCount = await libraryInstanceCount();
  if (placedCount !== beforePlacementCount + 1) throw new Error(`Placement confirmation created ${placedCount - beforePlacementCount} instances instead of one.`);
  const placedName = await page.getByTestId('instance-name').inputValue();
  if (!placedName.startsWith('Direct Review Prop')) throw new Error(`Confirmed instance is not selected in Inspector: ${placedName}.`);
  const placementHash = await currentHash();
  await page.screenshot({ path: confirmedScreenshot });

  await undo();
  await page.waitForTimeout(180);
  if (await libraryInstanceCount() !== beforePlacementCount) throw new Error('Undo did not remove the confirmed placement.');
  await expectHash(beforePlacementHash, 'Placement Undo');
  await redo();
  await page.waitForTimeout(180);
  if (await libraryInstanceCount() !== placedCount) throw new Error('Redo did not restore the confirmed placement.');
  await expectHash(placementHash, 'Placement Redo');

  // Re-select the placed instance by clicking one of its rendered Parts, then transform the instance directly.
  await page.getByTestId('asset-asset-direct-review-prop').click();
  await page.getByRole('button', { name: 'Scene', exact: true }).click();
  const scenePickCandidates = [
    { x: 0.54, y: 0.72 },
    { x: 0.69, y: 0.76 },
    { x: 0.34, y: 0.62 },
  ];
  let scenePicked = false;
  for (const candidate of scenePickCandidates) {
    await page.mouse.click(canvasBox.x + canvasBox.width * candidate.x, canvasBox.y + canvasBox.height * candidate.y);
    await page.waitForTimeout(140);
    if (await page.getByTestId('instance-name').count() && await page.getByTestId('instance-name').inputValue() === placedName) {
      scenePicked = true;
      break;
    }
  }
  if (!scenePicked) throw new Error('Direct Scene viewport picks did not restore the confirmed instance selection.');

  const instanceOrigin = {
    x: canvasBox.x + canvasBox.width * 0.50,
    y: canvasBox.y + canvasBox.height * 0.775,
  };
  const instanceXDirection = xDirection;
  const instanceGesture = await verifyGesture({
    mode: 'translate',
    prefix: 'instance-position',
    from: { x: instanceOrigin.x + instanceXDirection.x * 98, y: instanceOrigin.y + instanceXDirection.y * 98 },
    to: { x: instanceOrigin.x + instanceXDirection.x * 165, y: instanceOrigin.y + instanceXDirection.y * 165 },
  });

  // Save, visibly mutate, and reopen the Recipe; the exact normalized hash must return.
  const savedHash = await currentHash();
  const recipeDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save Recipe' }).click();
  await (await recipeDownloadPromise).saveAs(recipePath);
  await page.getByTestId('instance-name').fill('Temporary Direct Mutation');
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Open' }).click();
  await (await chooserPromise).setFiles(recipePath);
  await page.getByRole('status').filter({ hasText: 'Loaded direct-review-prop.recipe.json' }).waitFor();
  await expectHash(savedHash, 'Save/Open roundtrip');

  const roundtripRecipe = parseRecipe(JSON.parse(await readFile(recipePath, 'utf8')));
  const issues = validateRecipe(roundtripRecipe);
  const reviewAsset = roundtripRecipe.assetDefinitions.find((asset) => asset.id === 'asset-direct-review-prop');
  const reviewInstance = roundtripRecipe.sceneInstances.find((instance) => instance.assetId === reviewAsset?.id);
  if (!reviewAsset || reviewAsset.parts.length !== 3) throw new Error('Roundtrip did not preserve Direct Review Prop and its three Parts.');
  if (!reviewInstance) throw new Error('Roundtrip did not preserve the confirmed Direct Review Prop instance.');
  if (issues.some((issue) => issue.severity === 'error')) throw new Error(`Roundtrip Recipe validation failed: ${JSON.stringify(issues)}.`);

  // Export the selected authored Asset and require both a real GLB and its manifest.
  await page.getByTestId('asset-asset-direct-review-prop').click();
  const exportPaths = [];
  const exportTasks = [];
  page.on('download', (download) => {
    const path = resolve(outputDir, download.suggestedFilename());
    exportPaths.push(path);
    exportTasks.push(download.saveAs(path));
  });
  await page.getByRole('button', { name: 'Export Selected Asset GLB' }).click();
  await page.getByRole('status').filter({ hasText: 'Selected Asset exported: Direct Review Prop.' }).waitFor({ timeout: 15_000 });
  const exportDeadline = Date.now() + 10_000;
  while (exportTasks.length < 2 && Date.now() < exportDeadline) await page.waitForTimeout(100);
  await Promise.all(exportTasks);
  const glbPath = resolve(outputDir, 'asset-direct-review-prop.glb');
  const glbBytes = (await readFile(glbPath)).byteLength;
  if (glbBytes <= 0) throw new Error('Selected Direct Review Prop GLB is empty.');
  if (!exportPaths.some((path) => path.endsWith('asset-direct-review-prop.manifest.json'))) throw new Error('Selected Asset manifest was not downloaded.');

  await page.locator('.stage-status').filter({ hasText: 'Recipe valid' }).waitFor();
  if (consoleErrors.length) throw new Error(`Browser console errors:\n${consoleErrors.join('\n')}`);
  const readback = {
    ok: true,
    browser: 'chromium',
    viewport: { width: 1600, height: 1000 },
    recipeHash: recipeHash(roundtripRecipe),
    asset: {
      id: reviewAsset.id,
      parts: reviewAsset.parts.map((part) => ({
        id: part.id,
        name: part.name,
        primitive: part.primitive.type,
        materialId: part.materialId,
        transform: part.transform,
      })),
    },
    materials: roundtripRecipe.materialDefinitions.filter((material) => materials.some((expected) => expected.id === material.id)),
    directSelection: ['Direct Box', 'Direct Cylinder', 'Direct Sphere'],
    gestures: { move: moveGesture, rotate: rotateGesture, scale: scaleGesture, instanceMove: instanceGesture },
    placement: {
      previewDidNotMutate: true,
      cancelDidNotMutate: true,
      confirmedExactlyOne: true,
      position: placementValues,
      undoRestored: true,
      redoRestored: true,
      scenePicking: true,
    },
    numberControlAudit,
    saveOpen: { hash: savedHash, restored: true },
    validation: {
      errors: issues.filter((issue) => issue.severity === 'error').length,
      warnings: issues.filter((issue) => issue.severity === 'warning').length,
    },
    export: { glb: 'asset-direct-review-prop.glb', glbBytes, manifest: 'asset-direct-review-prop.manifest.json' },
    screenshots: [
      evidenceFiles.isolateScreenshot,
      evidenceFiles.placementScreenshot,
      evidenceFiles.confirmedScreenshot,
    ],
    consoleErrorCount: consoleErrors.length,
  };
  await writeFile(readbackPath, `${JSON.stringify(readback, null, 2)}\n`, 'utf8');
  if (writeArtifacts) {
    await mkdir(artifactDir, { recursive: true });
    await Promise.all(Object.values(evidenceFiles).map((name) => copyFile(resolve(outputDir, name), resolve(artifactDir, name))));
  }
  process.stdout.write(`${JSON.stringify(readback, null, 2)}\n`);
  await context.close();
} finally {
  if (browser) await browser.close();
  await new Promise((resolvePromise, reject) => {
    server.httpServer.close((error) => error ? reject(error) : resolvePromise());
  });
}
