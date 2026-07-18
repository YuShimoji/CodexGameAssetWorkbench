/* global window */
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { compatibilityPaths } from './paper-glider-compat-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = resolve(root, 'apps/workbench');
const viteBin = resolve(root, 'node_modules/vite/bin/vite.js');
const outputDir = resolve(root, 'output/compat/paper-glider-v1');
const writeCanonical = process.argv.includes('--write');
const screenshots = [
  'canary-overview.png',
  'canary-colliders.png',
  'canary-flight-camera.png',
  'canary-reloaded.png',
  'canary-mobile-portrait.png',
];

function findAvailablePort() {
  return new Promise((resolvePromise, reject) => {
    const probe = createServer();
    probe.unref();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      if (!address || typeof address === 'string') {
        probe.close();
        reject(new Error('Unable to allocate a compatibility preview port.'));
        return;
      }
      probe.close((error) => error ? reject(error) : resolvePromise(address.port));
    });
  });
}

function sha256(data) {
  return `sha256:${createHash('sha256').update(data).digest('hex')}`;
}

await mkdir(outputDir, { recursive: true });
for (const name of [...screenshots, 'visual-readback.json']) await rm(resolve(outputDir, name), { force: true });

const manifestBytes = await readFile(compatibilityPaths.manifest);
const manifest = JSON.parse(manifestBytes.toString('utf8'));
const glbBytes = await readFile(compatibilityPaths.glb);
const previewPort = await findAvailablePort();
const baseUrl = `http://127.0.0.1:${previewPort}`;
const server = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', String(previewPort), '--strictPort'], {
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
      const response = await fetch(`${baseUrl}/compat.html`);
      if (response.ok) return;
    } catch { /* Vite is still starting. */ }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 150));
  }
  throw new Error(`Compatibility preview did not start.\n${serverLog}`);
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const errors = [];
  const evidence = {};

  async function createPage(viewport) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    await context.route('**/compat-bundle/manifest.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: manifestBytes }));
    await context.route('**/compat-bundle/canary.glb', (route) => route.fulfill({ status: 200, contentType: 'model/gltf-binary', body: glbBytes }));
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    return { context, page };
  }

  async function capture(name, mode, viewport) {
    const { context, page } = await createPage(viewport);
    await page.goto(`${baseUrl}/compat.html?mode=${mode}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__compatPreview?.ready === true);
    // Headless Chromium may recycle one early software-WebGL context; keep the static render loop alive until it settles.
    await page.waitForTimeout(1_250);
    const state = await page.evaluate(() => window.__compatPreview);
    const canvasBox = await page.locator('canvas').boundingBox();
    if (!state || !canvasBox || canvasBox.width < 300 || canvasBox.height < 500) throw new Error(`${name} did not expose a usable WebGL preview.`);
    await page.screenshot({ path: resolve(outputDir, name), fullPage: true, animations: 'disabled', caret: 'hide' });
    evidence[name] = state;
    await context.close();
  }

  await capture('canary-overview.png', 'overview', { width: 1440, height: 900 });
  await capture('canary-colliders.png', 'colliders', { width: 1440, height: 900 });
  await capture('canary-flight-camera.png', 'flight-camera', { width: 1440, height: 900 });

  const { context: reloadContext, page: reloadPage } = await createPage({ width: 1440, height: 900 });
  await reloadPage.goto(`${baseUrl}/compat.html?mode=overview`, { waitUntil: 'networkidle' });
  await reloadPage.waitForFunction(() => window.__compatPreview?.ready === true);
  await reloadPage.waitForTimeout(1_250);
  const beforeReload = await reloadPage.evaluate(() => window.__compatPreview);
  await reloadPage.reload({ waitUntil: 'networkidle' });
  await reloadPage.waitForFunction(() => window.__compatPreview?.ready === true);
  await reloadPage.waitForTimeout(1_250);
  const afterReload = await reloadPage.evaluate(() => window.__compatPreview);
  if (!beforeReload || !afterReload || beforeReload.contentHash !== afterReload.contentHash || JSON.stringify(beforeReload.loadedNodeIds) !== JSON.stringify(afterReload.loadedNodeIds)) {
    throw new Error('Reloaded compatibility preview did not restore the same bundle state.');
  }
  await reloadPage.screenshot({ path: resolve(outputDir, 'canary-reloaded.png'), fullPage: true, animations: 'disabled', caret: 'hide' });
  evidence['canary-reloaded.png'] = { ...afterReload, reloadStateEqual: true };
  await reloadContext.close();

  await capture('canary-mobile-portrait.png', 'flight-camera', { width: 390, height: 844 });
  if (errors.length > 0) throw new Error(`Compatibility preview console errors:\n${errors.join('\n')}`);

  const screenshotRecords = [];
  for (const name of screenshots) {
    const bytes = await readFile(resolve(outputDir, name));
    screenshotRecords.push({ name, bytes: bytes.byteLength, sha256: sha256(bytes) });
  }
  const readback = {
    contractVersion: manifest.contractVersion,
    contentHash: manifest.contentHash,
    recipeHash: manifest.source.recipeHash,
    glbSha256: manifest.files.glb.sha256,
    evidenceBoundary: 'Workbench-hosted GLB preview using Paper Glider camera and coordinate assumptions; not runtime integration or physical-device proof.',
    viewports: { desktop: { width: 1440, height: 900 }, mobilePortrait: { width: 390, height: 844 } },
    screenshots: screenshotRecords,
    evidence,
    consoleErrors: 0,
    validationErrors: 0,
    validationWarnings: 0,
  };
  await writeFile(resolve(outputDir, 'visual-readback.json'), `${JSON.stringify(readback, null, 2)}\n`, 'utf8');

  if (writeCanonical) {
    for (const name of screenshots) await copyFile(resolve(outputDir, name), resolve(compatibilityPaths.bundleDir, name));
    await writeFile(resolve(compatibilityPaths.bundleDir, 'visual-readback.json'), `${JSON.stringify(readback, null, 2)}\n`, 'utf8');
  }

  process.stdout.write(`${JSON.stringify({ ok: true, outputDir, writeCanonical, contentHash: manifest.contentHash, screenshots: screenshotRecords, consoleErrors: 0 }, null, 2)}\n`);
} finally {
  if (browser) await browser.close();
  server.kill();
}
