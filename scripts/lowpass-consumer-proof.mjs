import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { runArtifactConsumerConformance } from './lowpass-consumer-conformance.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceArtifactDir = resolve(root, 'artifacts/lowpass-canary-v1');
const evidenceDir = resolve(
  root,
  'artifacts/lowpass-consumer-conformance-v1',
);
const writeMode = process.argv.includes('--write');
const outputDir = writeMode
  ? evidenceDir
  : resolve(root, 'output/lowpass-consumer-conformance-v1');
const manifest = await readFile(
  resolve(
    sourceArtifactDir,
    'lowpass-readability-canary-v1.manifest.json',
  ),
);
const glb = await readFile(
  resolve(
    sourceArtifactDir,
    'lowpass-readability-canary-v1.runtime.glb',
  ),
);
const consumerModule = await readFile(
  resolve(
    root,
    'packages/adapter-three/dist/lowpass-artifact-consumer.js',
  ),
);
const threeModule = await readFile(
  resolve(root, 'node_modules/three/build/three.module.js'),
);
const threeCore = await readFile(
  resolve(root, 'node_modules/three/build/three.core.js'),
);
const gltfLoader = await readFile(
  resolve(
    root,
    'node_modules/three/examples/jsm/loaders/GLTFLoader.js',
  ),
);
const geometryUtils = await readFile(
  resolve(
    root,
    'node_modules/three/examples/jsm/utils/BufferGeometryUtils.js',
  ),
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function pngDimensions(bytes, file) {
  assert(bytes.length > 24, `${file} is too small to be a PNG.`);
  assert(
    bytes.subarray(1, 4).toString('ascii') === 'PNG',
    `${file} is not a PNG.`,
  );
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

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
  <title>LOWPASS Artifact Consumer Conformance</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #0a0f12; color: #d8e0dc; font: 13px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace; }
    main { width: 1280px; height: 720px; display: grid; grid-template-columns: 900px 380px; background: #0a0f12; }
    .viewport { position: relative; width: 900px; height: 720px; overflow: hidden; border-right: 1px solid #334047; background: #10181c; }
    canvas { display: block; width: 900px; height: 720px; }
    .base-tag { position: absolute; left: 18px; bottom: 16px; padding: 6px 9px; border: 1px solid #d9984a; color: #f3c37c; background: #11191dd9; letter-spacing: .08em; }
    aside { height: 720px; padding: 18px 18px 14px; overflow: hidden; background: #11181c; }
    h1 { margin: 0 0 6px; color: #f1f4ef; font-size: 16px; letter-spacing: .08em; }
    .sub { margin: 0 0 15px; color: #81939a; font-size: 11px; }
    .status { margin-bottom: 14px; padding: 9px 10px; border: 1px solid #40535a; background: #162127; }
    .status strong { display: block; color: #80d3a5; font-size: 13px; }
    .status.disabled strong { color: #f0ba68; }
    dl { display: grid; grid-template-columns: 112px 1fr; gap: 4px 8px; margin: 0 0 14px; font-size: 11px; }
    dt { color: #70838b; }
    dd { margin: 0; color: #cad5d0; overflow-wrap: anywhere; }
    h2 { margin: 12px 0 7px; padding-top: 10px; border-top: 1px solid #2e3a40; color: #a9bab3; font-size: 11px; letter-spacing: .1em; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px; }
    th { color: #72868e; font-weight: 400; text-align: left; }
    th, td { padding: 4px 3px; border-bottom: 1px solid #253138; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    td:first-child { width: 42%; color: #e3e9e4; }
    .empty { color: #75878e; padding: 12px 0; font-size: 11px; }
    .boundary { margin-top: 12px; color: #74858b; font-size: 10px; line-height: 1.5; }
  </style>
  <script type="importmap">{"imports":{"three":"/vendor/three.module.js","three/":"/vendor/three/"}}</script>
  <script>
    window.__LOWPASS_AUDIO__ = { initializations: 0, playbacks: 0 };
    if (window.Audio) {
      const NativeAudio = window.Audio;
      window.Audio = function(...args) {
        window.__LOWPASS_AUDIO__.initializations += 1;
        return new NativeAudio(...args);
      };
    }
    for (const key of ['AudioContext', 'webkitAudioContext']) {
      if (!window[key]) continue;
      const NativeContext = window[key];
      window[key] = function(...args) {
        window.__LOWPASS_AUDIO__.initializations += 1;
        return new NativeContext(...args);
      };
    }
    const nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function(...args) {
      window.__LOWPASS_AUDIO__.playbacks += 1;
      return nativePlay.apply(this, args);
    };
  </script>
</head>
<body>
<main>
  <section class="viewport" data-viewport>
    <div class="base-tag">BASE SCENE SENTINEL / ACTIVE</div>
  </section>
  <aside>
    <h1>LOWPASS ARTIFACT CONSUMER</h1>
    <p class="sub">TRACKED GLB + MANIFEST · READ-ONLY RUNTIME ENTRY</p>
    <div class="status" data-status><strong>LOADING</strong><span>Validating tracked artifact</span></div>
    <dl>
      <dt>contract</dt><dd data-contract>—</dd>
      <dt>manifest</dt><dd data-manifest>—</dd>
      <dt>GLB identity</dt><dd data-hash>—</dd>
      <dt>scene roots</dt><dd data-roots>0</dd>
      <dt>meshes / tris</dt><dd data-counts>0 / 0</dd>
      <dt>corrupt load</dt><dd data-corrupt>not run</dd>
      <dt>recovery</dt><dd data-recovery>not run</dd>
      <dt>sentinel</dt><dd data-sentinel>active</dd>
    </dl>
    <h2>RESOLVED ASSET / SEMANTIC READBACK</h2>
    <table>
      <thead><tr><th>ROLE</th><th>FACTION</th><th>ANCHORS</th></tr></thead>
      <tbody data-assets></tbody>
    </table>
    <div class="empty" data-empty hidden>No LOWPASS asset inserted; base scene remains active.</div>
    <p class="boundary">Rendered-state proof only. No game-camera, fog, distance, motion, portability, readability, or art-acceptance claim.</p>
  </aside>
</main>
<script type="module">
  import * as THREE from 'three';
  import {
    LOWPASS_ARTIFACT_CONSUMER_CONTRACT_VERSION,
    LowpassArtifactConsumer,
  } from '/consumer.js';

  const mode = new URLSearchParams(location.search).get('mode') === 'disabled'
    ? 'disabled'
    : 'valid';
  const viewport = document.querySelector('[data-viewport]');
  const status = document.querySelector('[data-status]');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#10181c');
  const camera = new THREE.PerspectiveCamera(32, 900 / 720, 0.05, 50);
  camera.position.set(0, 4.5, 13.6);
  camera.lookAt(0, 1.45, 0);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setPixelRatio(1);
  renderer.setSize(900, 720, false);
  renderer.shadowMap.enabled = true;
  viewport.prepend(renderer.domElement);

  scene.add(new THREE.HemisphereLight('#c6dfdc', '#29343a', 2.3));
  const key = new THREE.DirectionalLight('#fff0cf', 3.8);
  key.position.set(-4, 9, 8);
  key.castShadow = true;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#66c9d2', 2.1);
  rim.position.set(6, 5, -4);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 8),
    new THREE.MeshStandardMaterial({ color: '#172328', roughness: 0.92, metalness: 0.05 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = 'base-scene-floor';
  scene.add(floor);
  const grid = new THREE.GridHelper(14, 14, '#344b52', '#24363c');
  grid.position.y = 0.006;
  grid.name = 'base-scene-grid';
  scene.add(grid);
  const sentinel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.34, 0.45, 8),
    new THREE.MeshStandardMaterial({ color: '#d98d3f', emissive: '#35180a', roughness: 0.55 }),
  );
  sentinel.position.set(0, 0.225, 2.75);
  sentinel.name = 'pre-existing-sentinel';
  sentinel.userData = { owner: 'base-scene' };
  sentinel.castShadow = true;
  scene.add(sentinel);
  const sentinelSnapshot = JSON.stringify({
    parent: sentinel.parent?.uuid,
    position: sentinel.position.toArray(),
    owner: sentinel.userData.owner,
  });

  const [manifest, glb] = await Promise.all([
    fetch('/manifest.json').then((response) => {
      if (!response.ok) throw new Error('Manifest request failed.');
      return response.json();
    }),
    fetch('/asset.glb').then((response) => {
      if (!response.ok) throw new Error('GLB request failed.');
      return response.arrayBuffer();
    }),
  ]);
  const consumer = new LowpassArtifactConsumer();
  let corruptFailure = null;
  let recoverySucceeded = false;
  let outcome;
  if (mode === 'disabled') {
    outcome = await consumer.load({
      glb,
      manifest,
      target: scene,
      enabled: false,
    });
    if (!outcome.ok || outcome.state !== 'disabled') {
      throw new Error('Consumer disable path did not remain disabled.');
    }
    status.classList.add('disabled');
    status.innerHTML = '<strong>CONSUMER DISABLED</strong><span>Base scene preserved; zero canary roots attached</span>';
    document.querySelector('[data-empty]').hidden = false;
  } else {
    const corruptManifest = structuredClone(manifest);
    corruptManifest.files.glb.sha256 = 'sha256:' + '0'.repeat(64);
    const corrupt = await consumer.load({
      glb,
      manifest: corruptManifest,
      target: scene,
    });
    if (corrupt.ok || corrupt.error.code !== 'GLB_HASH_MISMATCH') {
      throw new Error('Corrupt manifest did not fail with GLB_HASH_MISMATCH.');
    }
    if (scene.children.some((child) => child.userData.kind === 'lowpass-artifact-consumer')) {
      throw new Error('Corrupt manifest attached partial LOWPASS content.');
    }
    corruptFailure = corrupt.error.code;
    outcome = await consumer.load({ glb, manifest, target: scene });
    if (!outcome.ok || outcome.state !== 'loaded') {
      throw new Error('Valid artifact recovery failed.');
    }
    recoverySucceeded = true;
    const hiddenNodeIds = new Set([
      ...manifest.collisionProxyIds,
      ...manifest.assets.flatMap((asset) => asset.anchors.map((anchor) => anchor.nodeId)),
      ...manifest.assets.flatMap((asset) =>
        asset.features
          .filter((feature) => feature.kind === 'visual-center')
          .map((feature) => feature.nodeId)),
    ]);
    outcome.result.group.traverse((object) => {
      if (hiddenNodeIds.has(object.name)) object.visible = false;
      if (!object.isMesh || !object.visible) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        material.flatShading = true;
        material.needsUpdate = true;
      });
    });
    status.innerHTML = '<strong>ARTIFACT CONSUMER / LOCAL GREEN</strong><span>Corrupt load failed closed; valid tracked artifact recovered</span>';
    for (const asset of outcome.result.assetsByKey.values()) {
      const row = document.createElement('tr');
      row.innerHTML =
        '<td title="' + asset.assetKey + '">' + asset.role + '</td>' +
        '<td>' + asset.faction + '</td>' +
        '<td>' + asset.semanticAnchors.size + ' / ' + asset.collisionProxies.size + '</td>';
      document.querySelector('[data-assets]').append(row);
    }
  }

  const consumerRoots = scene.children.filter(
    (child) => child.userData.kind === 'lowpass-artifact-consumer',
  );
  const sentinelPreserved =
    JSON.stringify({
      parent: sentinel.parent?.uuid,
      position: sentinel.position.toArray(),
      owner: sentinel.userData.owner,
    }) === sentinelSnapshot;
  if (!sentinelPreserved) throw new Error('Base scene sentinel changed.');
  document.querySelector('[data-contract]').textContent =
    LOWPASS_ARTIFACT_CONSUMER_CONTRACT_VERSION;
  document.querySelector('[data-manifest]').textContent = manifest.schemaVersion;
  document.querySelector('[data-hash]').textContent =
    manifest.files.glb.sha256.slice(7, 19) + '…';
  document.querySelector('[data-roots]').textContent = String(consumerRoots.length);
  document.querySelector('[data-counts]').textContent =
    outcome.ok && outcome.state === 'loaded'
      ? outcome.result.stats.meshes + ' / ' + outcome.result.stats.triangles
      : '0 / 0';
  document.querySelector('[data-corrupt]').textContent =
    corruptFailure ?? 'not inserted';
  document.querySelector('[data-recovery]').textContent =
    recoverySucceeded ? 'valid load succeeded' : 'not required';
  document.querySelector('[data-sentinel]').textContent =
    sentinelPreserved ? 'active / unchanged' : 'changed';

  renderer.render(scene, camera);
  await new Promise((resolveFrame) => requestAnimationFrame(resolveFrame));
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 350));
  renderer.render(scene, camera);
  await new Promise((resolveFrame) => requestAnimationFrame(resolveFrame));
  const pixels = renderer.getContext().readPixels
    ? (() => {
        const values = new Uint8Array(900 * 720 * 4);
        renderer.getContext().readPixels(
          0,
          0,
          900,
          720,
          renderer.getContext().RGBA,
          renderer.getContext().UNSIGNED_BYTE,
          values,
        );
        return values;
      })()
    : new Uint8Array();
  let nonBlankPixels = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    if (Math.max(red, green, blue) - Math.min(red, green, blue) > 8 || red + green + blue > 90) {
      nonBlankPixels += 1;
    }
  }
  window.__LOWPASS_CONSUMER_PROOF__ = {
    ready: true,
    mode,
    contractVersion: LOWPASS_ARTIFACT_CONSUMER_CONTRACT_VERSION,
    httpArtifactInputs: true,
    consumerRoots: consumerRoots.length,
    assetRoles:
      outcome.ok && outcome.state === 'loaded'
        ? [...outcome.result.assetsByKey.values()].map((asset) => asset.role)
        : [],
    corruptFailure,
    corruptPartialAttachments: 0,
    recoverySucceeded,
    sentinelPreserved,
    meshes:
      outcome.ok && outcome.state === 'loaded' ? outcome.result.stats.meshes : 0,
    triangles:
      outcome.ok && outcome.state === 'loaded' ? outcome.result.stats.triangles : 0,
    nonBlankPixels,
    audio: structuredClone(window.__LOWPASS_AUDIO__),
  };
  window.__disposeConsumerProof = () => {
    const consumerDisposal = consumer.dispose();
    renderer.dispose();
    return consumerDisposal;
  };
</script>
</body>
</html>`;

const requestPaths = [];
const server = createServer((request, response) => {
  const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
  requestPaths.push(path);
  if (path === '/') return send(response, 200, 'text/html; charset=utf-8', html);
  if (path === '/asset.glb') {
    return send(response, 200, 'model/gltf-binary', glb);
  }
  if (path === '/manifest.json') {
    return send(response, 200, 'application/json; charset=utf-8', manifest);
  }
  if (path === '/consumer.js') {
    return send(response, 200, 'text/javascript; charset=utf-8', consumerModule);
  }
  if (path === '/vendor/three.module.js') {
    return send(response, 200, 'text/javascript; charset=utf-8', threeModule);
  }
  if (path === '/vendor/three.core.js') {
    return send(response, 200, 'text/javascript; charset=utf-8', threeCore);
  }
  if (path === '/vendor/three/examples/jsm/loaders/GLTFLoader.js') {
    return send(response, 200, 'text/javascript; charset=utf-8', gltfLoader);
  }
  if (path === '/vendor/three/examples/jsm/utils/BufferGeometryUtils.js') {
    return send(response, 200, 'text/javascript; charset=utf-8', geometryUtils);
  }
  if (path === '/favicon.ico') return send(response, 204, 'image/x-icon', '');
  return send(response, 404, 'text/plain; charset=utf-8', 'Not found');
});

await new Promise((resolveReady) =>
  server.listen(0, '127.0.0.1', resolveReady),
);
const address = server.address();
if (!address || typeof address === 'string') {
  throw new Error('Consumer proof server did not acquire a TCP port.');
}
const origin = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });
const browserProofs = [];
try {
  await mkdir(outputDir, { recursive: true });
  const warmup = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  await warmup.goto(`${origin}/?mode=disabled`, { waitUntil: 'networkidle' });
  await warmup.waitForFunction(
    () => globalThis.__LOWPASS_CONSUMER_PROOF__?.ready === true,
  );
  await warmup.close();

  for (const mode of ['valid', 'disabled']) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    const consoleErrors = [];
    const externalRequests = [];
    const failedResponses = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('request', (request) => {
      if (!request.url().startsWith(origin)) {
        externalRequests.push(request.url());
      }
    });
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedResponses.push(`${response.status()} ${response.url()}`);
      }
    });
    const navigation = await page.goto(`${origin}/?mode=${mode}`, {
      waitUntil: 'networkidle',
    });
    assert(navigation?.status() === 200, `${mode} page did not return HTTP 200.`);
    try {
      await page.waitForFunction(
        () => globalThis.__LOWPASS_CONSUMER_PROOF__?.ready === true,
      );
    } catch (error) {
      throw new Error(
        `${mode} proof did not become ready: ${
          [...failedResponses, ...consoleErrors].join(' | ') ||
          (error instanceof Error ? error.message : String(error))
        }`,
      );
    }
    const proof = await page.evaluate(
      () => globalThis.__LOWPASS_CONSUMER_PROOF__,
    );
    assert(proof.mode === mode, `${mode} proof reported the wrong mode.`);
    assert(
      proof.nonBlankPixels > (mode === 'valid' ? 20_000 : 5_000),
      `${mode} proof rendered a blank or ambiguous viewport.`,
    );
    assert(proof.sentinelPreserved, `${mode} proof changed the base sentinel.`);
    assert(
      proof.audio.initializations === 0 && proof.audio.playbacks === 0,
      `${mode} proof initialized or played audio.`,
    );
    if (mode === 'valid') {
      assert(
        proof.consumerRoots === 1 &&
          proof.assetRoles.length === 5 &&
          proof.meshes === 44 &&
          proof.triangles === 1_068,
        'Valid proof did not attach the exact five-asset runtime result.',
      );
      assert(
        proof.corruptFailure === 'GLB_HASH_MISMATCH' &&
          proof.corruptPartialAttachments === 0 &&
          proof.recoverySucceeded,
        'Valid proof did not demonstrate fail-closed recovery.',
      );
    } else {
      assert(
        proof.consumerRoots === 0 &&
          proof.assetRoles.length === 0 &&
          !proof.recoverySucceeded,
        'Disabled proof inserted LOWPASS content.',
      );
    }
    assert(
      consoleErrors.length === 0,
      `${mode} proof logged console/page errors: ${consoleErrors.join(' | ')}`,
    );
    assert(
      externalRequests.length === 0,
      `${mode} proof made external requests: ${externalRequests.join(', ')}`,
    );
    assert(
      failedResponses.length === 0,
      `${mode} proof received failed responses: ${failedResponses.join(' | ')}`,
    );
    const file = `lowpass-artifact-consumer-${mode}.png`;
    const screenshotPath = resolve(outputDir, file);
    await page.screenshot({ path: screenshotPath });
    const screenshot = await readFile(screenshotPath);
    const dimensions = pngDimensions(screenshot, file);
    assert(
      dimensions.width === 1280 && dimensions.height === 720,
      `${file} must be 1280 x 720.`,
    );
    const disposal = await page.evaluate(
      () => globalThis.__disposeConsumerProof(),
    );
    if (mode === 'valid') {
      assert(
        disposal.geometries === 44 &&
          disposal.materials === 10 &&
          !disposal.alreadyDisposed,
        'Browser consumer disposal counts differ from the loaded artifact.',
      );
    } else {
      assert(
        disposal.geometries === 0 &&
          disposal.materials === 0 &&
          disposal.alreadyDisposed,
        'Disabled browser state reported consumer-owned resources.',
      );
    }
    browserProofs.push({
      mode,
      file,
      bytes: screenshot.byteLength,
      sha256: sha256(screenshot),
      ...dimensions,
      httpStatus: navigation.status(),
      nonBlankPixels: proof.nonBlankPixels,
      consumerRoots: proof.consumerRoots,
      assetRoles: proof.assetRoles,
      corruptFailure: proof.corruptFailure,
      corruptPartialAttachments: proof.corruptPartialAttachments,
      recoverySucceeded: proof.recoverySucceeded,
      sentinelPreserved: proof.sentinelPreserved,
      meshes: proof.meshes,
      triangles: proof.triangles,
      consoleErrors: 0,
      pageErrors: 0,
      failedResponses: 0,
      externalRequests: 0,
      audioInitializations: proof.audio.initializations,
      audioPlaybacks: proof.audio.playbacks,
      disposal,
    });
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise((resolveClose, rejectClose) =>
    server.close((error) => (error ? rejectClose(error) : resolveClose())),
  );
}

const forbiddenRequests = requestPaths.filter((path) =>
  /recipe|definition|generator|lowpass-runtime\.js|runtime-bundle\.js/i.test(
    path,
  ),
);
assert(
  forbiddenRequests.length === 0,
  `Browser proof requested forbidden source/generator paths: ${forbiddenRequests.join(', ')}`,
);
const conformance = await runArtifactConsumerConformance();
const readback = {
  schemaVersion: 'cgawe-lowpass-artifact-consumer-conformance-readback-1.0.0',
  classification: 'CGAWE_LOWPASS_ARTIFACT_CONSUMER_CONFORMANCE_LOCAL_GREEN',
  missionBaseRevision: 'ba689ff26c5f4adb856bb2e077cbb5e8035f23a9',
  missionBaseParent: 'c893374ab0edd7329bd1482dbd6b99960acbbb68',
  branch: 'codex/lowpass-artifact-consumer-conformance-v1',
  consumerContractVersion: conformance.consumerContractVersion,
  inputs: conformance.inputs,
  positive: conformance.positive,
  negativeCases: conformance.negativeCases,
  scenePreservation: conformance.scenePreservation,
  fallback: conformance.fallback,
  disposal: conformance.disposal,
  isolation: {
    ...conformance.isolation,
    browserForbiddenSourceOrGeneratorRequests: forbiddenRequests.length,
  },
  browser: {
    viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
    localHttp200: browserProofs.every((proof) => proof.httpStatus === 200),
    nonBlankWebgl: browserProofs.every((proof) => proof.nonBlankPixels > 5_000),
    validLoadSucceeded: browserProofs.find((proof) => proof.mode === 'valid')
      ?.consumerRoots === 1,
    disabledPreservedBaseScene:
      browserProofs.find((proof) => proof.mode === 'disabled')
        ?.sentinelPreserved === true,
    corruptManifestFailedClosed:
      browserProofs.find((proof) => proof.mode === 'valid')?.corruptFailure ===
      'GLB_HASH_MISMATCH',
    recoverySucceeded:
      browserProofs.find((proof) => proof.mode === 'valid')
        ?.recoverySucceeded === true,
    consoleErrors: 0,
    pageErrors: 0,
    externalRequests: 0,
    audioInitializations: 0,
    audioPlaybacks: 0,
    proofs: browserProofs,
  },
  claimBoundary: {
    established: 'artifact-only local consumer conformance',
    notEstablished: [
      'LOWPASS repository or game integration',
      'real-game camera, fog, distance, or motion evaluation',
      'human readability or art acceptance',
      'cross-engine portability',
      'direct-manipulation branch integration',
      'canonical main promotion or remote CI',
      'security, rights, release, or deployment acceptance',
    ],
  },
  externalEffects: {
    push: 0,
    workflowRerun: 0,
    pullRequest: 0,
    mainIntegration: 0,
    tag: 0,
    release: 0,
    deployment: 0,
    forceOperation: 0,
  },
};
const readbackText = `${JSON.stringify(readback, null, 2)}\n`;
const readbackPath = resolve(
  evidenceDir,
  'lowpass-artifact-consumer-conformance.readback.json',
);
if (writeMode) {
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(readbackPath, readbackText, 'utf8');
} else {
  const trackedReadback = await readFile(readbackPath, 'utf8');
  assert(
    trackedReadback === readbackText,
    'Tracked consumer conformance readback differs from current proof.',
  );
  await rm(outputDir, { recursive: true, force: true });
}

console.log(
  JSON.stringify(
    {
      ok: true,
      writeMode,
      proofs: browserProofs,
      readback: writeMode ? 'written' : 'verified',
    },
    null,
    2,
  ),
);
