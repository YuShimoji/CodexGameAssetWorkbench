import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactDir = resolve(root, 'artifacts/lowpass-canary-v1');
const outputDir = process.argv.includes('--write')
  ? artifactDir
  : resolve(root, 'output/lowpass-canary-proof');
const packId = 'lowpass-readability-canary-v1';
const glb = await readFile(resolve(artifactDir, `${packId}.runtime.glb`));
const manifest = await readFile(resolve(artifactDir, `${packId}.manifest.json`));
const threeModule = await readFile(resolve(root, 'node_modules/three/build/three.module.js'));
const threeCore = await readFile(resolve(root, 'node_modules/three/build/three.core.js'));
const gltfLoader = await readFile(resolve(root, 'node_modules/three/examples/jsm/loaders/GLTFLoader.js'));
const geometryUtils = await readFile(resolve(root, 'node_modules/three/examples/jsm/utils/BufferGeometryUtils.js'));

function send(response, status, type, bytes) {
  response.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'Cross-Origin-Resource-Policy': 'same-origin',
  });
  response.end(bytes);
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>LOWPASS Readability Canary v1</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #071113; color: #d9c89a; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
    main { position: relative; width: 1200px; height: 675px; overflow: hidden; background: radial-gradient(circle at 50% 35%, #173235 0, #071113 72%); }
    canvas { display: block; width: 1200px; height: 675px; }
    body.ps1 canvas { image-rendering: pixelated; image-rendering: crisp-edges; }
    header { position: absolute; top: 22px; left: 26px; right: 26px; z-index: 2; display: flex; justify-content: space-between; align-items: flex-start; pointer-events: none; text-shadow: 0 2px 0 #000; }
    h1 { margin: 0; font-size: 20px; letter-spacing: .16em; }
    header p { margin: 7px 0 0; color: #8aa9a5; font-size: 12px; letter-spacing: .08em; }
    .mode { border: 1px solid #d9c89a; padding: 9px 12px; font-size: 12px; letter-spacing: .14em; background: #071113cc; }
    .labels { position: absolute; left: 28px; right: 28px; bottom: 22px; z-index: 2; display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; pointer-events: none; }
    .label { border-top: 1px solid #688d88; padding: 9px 7px 0; text-align: center; color: #c7d7ce; text-shadow: 0 2px 0 #000; }
    .label strong { display: block; color: #f0c070; font-size: 13px; letter-spacing: .08em; }
    .label span { display: block; margin-top: 4px; font-size: 10px; color: #779b96; }
    .legend { position: absolute; left: 26px; top: 92px; z-index: 2; color: #78918e; font-size: 10px; line-height: 1.5; pointer-events: none; }
  </style>
  <script type="importmap">{"imports":{"three":"/three.module.js"}}</script>
</head>
<body>
<main>
  <header>
    <div><h1>LOWPASS / READABILITY CANARY v1</h1><p>10m ROLE &amp; FACTION SILHOUETTE CHECK · -Z FORWARD · 1m UNITS</p></div>
    <div class="mode" data-mode></div>
  </header>
  <div class="legend">RUNTIME MARKERS HIDDEN<br>COLLISION / ANCHORS FROM MANIFEST</div>
  <div class="labels">
    <div class="label"><strong>NEEDLE</strong><span>NARROW · LOCK</span></div>
    <div class="label"><strong>WATCHER</strong><span>WIDE · OBSERVE</span></div>
    <div class="label"><strong>PORTER</strong><span>ALLIED · CARRY</span></div>
    <div class="label"><strong>CART</strong><span>HANDLE · LOAD</span></div>
    <div class="label"><strong>TERMINAL</strong><span>SCREEN · INTERACT</span></div>
  </div>
</main>
<script type="module">
  import * as THREE from 'three';
  import { GLTFLoader } from '/loaders/GLTFLoader.js';

  const mode = new URLSearchParams(location.search).get('mode') === 'ps1-on' ? 'ps1-on' : 'ps1-off';
  document.body.classList.add('ps1');
  document.querySelector('[data-mode]').textContent = mode.toUpperCase();
  const main = document.querySelector('main');
  const manifest = await fetch('/manifest.json').then((response) => response.json());
  const hiddenNodeIds = new Set([
    ...manifest.collisionProxyIds,
    ...manifest.assets.flatMap((asset) => asset.anchors.map((anchor) => anchor.nodeId)),
    ...manifest.assets.flatMap((asset) => asset.features.filter((feature) => feature.kind === 'visual-center').map((feature) => feature.nodeId)),
  ]);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#071113');
  scene.fog = new THREE.Fog('#071113', 10, 19);
  const camera = new THREE.PerspectiveCamera(31, 1200 / 675, 0.05, 40);
  camera.position.set(0, 4.6, 12.5);
  camera.lookAt(0, 1.35, 0);
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(1);
  renderer.setSize(400, 225, false);
  renderer.domElement.style.width = '1200px';
  renderer.domElement.style.height = '675px';
  renderer.domElement.style.imageRendering = 'pixelated';
  main.prepend(renderer.domElement);

  scene.add(new THREE.HemisphereLight('#a8d8d1', '#362a1f', 2.15));
  const key = new THREE.DirectionalLight('#ffd7a0', 4.4);
  key.position.set(-4, 8, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#5cc8d2', 2.7);
  rim.position.set(6, 5, -5);
  scene.add(rim);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 8),
    new THREE.MeshStandardMaterial({ color: '#112326', roughness: 0.94, metalness: 0.05 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  for (let x = -6; x <= 6; x += 1) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.006, 4.5),
      new THREE.MeshBasicMaterial({ color: x === 0 ? '#426a67' : '#213c3d' }),
    );
    line.position.set(x, 0.006, 0);
    scene.add(line);
  }

  const gltf = await new GLTFLoader().loadAsync('/asset.glb');
  let visibleMeshes = 0;
  gltf.scene.traverse((object) => {
    if (hiddenNodeIds.has(object.name)) object.visible = false;
    if (!object.isMesh || !object.visible) return;
    visibleMeshes += 1;
    object.castShadow = true;
    object.receiveShadow = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      material.flatShading = true;
      material.needsUpdate = true;
    });
  });
  scene.add(gltf.scene);
  renderer.render(scene, camera);
  await new Promise((resolveFrame) => requestAnimationFrame(resolveFrame));
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 400));
  renderer.render(scene, camera);
  await new Promise((resolveFrame) => requestAnimationFrame(resolveFrame));
  const proofCanvas = document.createElement('canvas');
  proofCanvas.width = 1200;
  proofCanvas.height = 675;
  proofCanvas.style.width = '1200px';
  proofCanvas.style.height = '675px';
  const stagingCanvas = document.createElement('canvas');
  stagingCanvas.width = renderer.domElement.width;
  stagingCanvas.height = renderer.domElement.height;
  const stagingContext = stagingCanvas.getContext('2d');
  stagingContext.imageSmoothingEnabled = false;
  stagingContext.drawImage(renderer.domElement, 0, 0);
  const proofContext = proofCanvas.getContext('2d');
  if (mode === 'ps1-on') {
    proofContext.imageSmoothingEnabled = false;
    proofContext.drawImage(stagingCanvas, 0, 0, proofCanvas.width, proofCanvas.height);
  } else {
    const sourceImage = stagingContext.getImageData(0, 0, stagingCanvas.width, stagingCanvas.height);
    const proofImage = proofContext.createImageData(proofCanvas.width, proofCanvas.height);
    for (let targetY = 0; targetY < proofCanvas.height; targetY += 1) {
      const sourceY = ((targetY + 0.5) * stagingCanvas.height / proofCanvas.height) - 0.5;
      const sourceY0 = Math.max(0, Math.floor(sourceY));
      const sourceY1 = Math.min(stagingCanvas.height - 1, sourceY0 + 1);
      const blendY = Math.max(0, sourceY - sourceY0);
      for (let targetX = 0; targetX < proofCanvas.width; targetX += 1) {
        const sourceX = ((targetX + 0.5) * stagingCanvas.width / proofCanvas.width) - 0.5;
        const sourceX0 = Math.max(0, Math.floor(sourceX));
        const sourceX1 = Math.min(stagingCanvas.width - 1, sourceX0 + 1);
        const blendX = Math.max(0, sourceX - sourceX0);
        const outputOffset = (targetY * proofCanvas.width + targetX) * 4;
        const topLeftOffset = (sourceY0 * stagingCanvas.width + sourceX0) * 4;
        const topRightOffset = (sourceY0 * stagingCanvas.width + sourceX1) * 4;
        const bottomLeftOffset = (sourceY1 * stagingCanvas.width + sourceX0) * 4;
        const bottomRightOffset = (sourceY1 * stagingCanvas.width + sourceX1) * 4;
        for (let channel = 0; channel < 4; channel += 1) {
          const top = sourceImage.data[topLeftOffset + channel]
            + (sourceImage.data[topRightOffset + channel] - sourceImage.data[topLeftOffset + channel]) * blendX;
          const bottom = sourceImage.data[bottomLeftOffset + channel]
            + (sourceImage.data[bottomRightOffset + channel] - sourceImage.data[bottomLeftOffset + channel]) * blendX;
          proofImage.data[outputOffset + channel] = top + (bottom - top) * blendY;
        }
      }
    }
    proofContext.putImageData(proofImage, 0, 0);
  }
  renderer.domElement.style.display = 'none';
  main.prepend(proofCanvas);
  const proofPixels = proofContext.getImageData(0, 0, proofCanvas.width, proofCanvas.height).data;
  let foregroundPixels = 0;
  for (let pixel = 0; pixel < proofPixels.length; pixel += 4) {
    const red = proofPixels[pixel];
    const green = proofPixels[pixel + 1];
    const blue = proofPixels[pixel + 2];
    if (red > 45 && red > blue * 1.3 && green > blue * 1.15) foregroundPixels += 1;
  }
  window.__LOWPASS_PROOF__ = {
    ready: true,
    mode,
    visibleMeshes,
    nodes: manifest.stableNodeMap.length,
    foregroundPixels,
  };
  window.__disposeProof = () => {
    let geometries = 0;
    const materials = new Set();
    scene.traverse((object) => {
      if (!object.isMesh) return;
      object.geometry.dispose();
      geometries += 1;
      (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => materials.add(material));
    });
    materials.forEach((material) => material.dispose());
    renderer.dispose();
    return { geometries, materials: materials.size };
  };
</script>
</body>
</html>`;

const server = createServer((request, response) => {
  const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
  if (path === '/') return send(response, 200, 'text/html; charset=utf-8', html);
  if (path === '/asset.glb') return send(response, 200, 'model/gltf-binary', glb);
  if (path === '/manifest.json') return send(response, 200, 'application/json; charset=utf-8', manifest);
  if (path === '/three.module.js') return send(response, 200, 'text/javascript; charset=utf-8', threeModule);
  if (path === '/three.core.js') return send(response, 200, 'text/javascript; charset=utf-8', threeCore);
  if (path === '/loaders/GLTFLoader.js') return send(response, 200, 'text/javascript; charset=utf-8', gltfLoader);
  if (path === '/utils/BufferGeometryUtils.js') return send(response, 200, 'text/javascript; charset=utf-8', geometryUtils);
  if (path === '/favicon.ico') return send(response, 204, 'image/x-icon', '');
  return send(response, 404, 'text/plain; charset=utf-8', 'Not found');
});
await new Promise((resolveReady) => server.listen(0, '127.0.0.1', resolveReady));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('LOWPASS proof server did not acquire a TCP port.');
const origin = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });
const proofResults = [];
try {
  await mkdir(outputDir, { recursive: true });
  const warmupPage = await browser.newPage({ viewport: { width: 1200, height: 675 }, deviceScaleFactor: 1 });
  await warmupPage.goto(`${origin}/?mode=ps1-on`, { waitUntil: 'networkidle' });
  await warmupPage.waitForFunction(() => globalThis.__LOWPASS_PROOF__?.ready === true);
  await warmupPage.close();
  for (const mode of ['ps1-off', 'ps1-on']) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 675 }, deviceScaleFactor: 1 });
    const consoleErrors = [];
    const externalRequests = [];
    const failedResponses = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('request', (request) => {
      if (!request.url().startsWith(origin)) externalRequests.push(request.url());
    });
    page.on('response', (response) => {
      if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(`${origin}/?mode=${mode}`, { waitUntil: 'networkidle' });
    try {
      await page.waitForFunction(() => globalThis.__LOWPASS_PROOF__?.ready === true);
    } catch (error) {
      throw new Error(`${mode} proof did not become ready: ${[...failedResponses, ...consoleErrors].join(' | ') || error.message}`);
    }
    const proof = await page.evaluate(() => globalThis.__LOWPASS_PROOF__);
    if (proof.mode !== mode || proof.visibleMeshes < 20 || proof.foregroundPixels < 1_000) {
      throw new Error(`${mode} proof did not render the expected canary silhouettes.`);
    }
    if (consoleErrors.length > 0) throw new Error(`${mode} proof logged console errors: ${consoleErrors.join(' | ')}`);
    if (externalRequests.length > 0) throw new Error(`${mode} proof attempted external network requests: ${externalRequests.join(', ')}`);
    const file = `${packId}.${mode}.png`;
    await page.screenshot({ path: resolve(outputDir, file) });
    const disposal = await page.evaluate(() => globalThis.__disposeProof());
    if (disposal.geometries < proof.visibleMeshes || disposal.materials < 1) throw new Error(`${mode} dispose smoke did not release scene resources.`);
    proofResults.push({
      mode,
      file,
      visibleMeshes: proof.visibleMeshes,
      foregroundPixels: proof.foregroundPixels,
      nodes: proof.nodes,
      consoleErrors: 0,
      externalRequests: 0,
      disposal,
    });
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()));
}

console.log(JSON.stringify({
  ok: true,
  outputDir,
  proofs: proofResults,
}, null, 2));
