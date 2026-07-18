import './compat-preview.css';
import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface CompatManifest {
  contractVersion: string;
  contentHash: string;
  source: { recipeHash: string };
  coordinateSystem: { upAxis: string; forwardAxis: string; unitMeters: number };
  placement: { position: [number, number, number]; rotationRadians: [number, number, number]; scale: [number, number, number] };
  room: { width: number; height: number; length: number; floorY: number };
  counts: { visualNodeCount: number; triangleCount: number; colliderCount: number };
  visualNodes: Array<{ id: string }>;
  colliders: Array<{ id: string; center: [number, number, number]; halfExtents: [number, number, number] }>;
}

interface CompatPreviewState {
  ready: boolean;
  mode: string;
  contentHash: string;
  recipeHash: string;
  loadedNodeIds: string[];
  colliderCount: number;
  viewport: { width: number; height: number };
  camera: { fov: number; position: [number, number, number]; target: [number, number, number] };
}

declare global {
  interface Window { __compatPreview?: CompatPreviewState }
}

const mountElement = document.querySelector<HTMLDivElement>('#compat-root');
if (!mountElement) throw new Error('Compatibility preview root is missing.');
const mount: HTMLDivElement = mountElement;

const mode = new URLSearchParams(window.location.search).get('mode') ?? 'overview';
const colliderMode = mode === 'colliders';
mount.innerHTML = `
  <main class="compat-shell" data-mode="${mode}">
    <canvas class="compat-canvas" aria-label="Paper Glider canary preview"></canvas>
    <header class="compat-header">
      <section class="compat-brand">
        <span>Workbench authored room archetype</span>
        <h1>Archive Gate</h1>
        <p>Actual canary GLB · Paper Glider 3ad5ac1 coordinate and camera contract</p>
      </section>
      <div class="compat-badge">${mode.replace('-', ' ')}</div>
    </header>
    <aside class="compat-panel">
      <h2>Compatibility readback</h2>
      <dl class="compat-grid">
        <dt>Load</dt><dd class="compat-status" data-label="Load">pending</dd>
        <dt>Nodes</dt><dd class="compat-nodes" data-label="Nodes">—</dd>
        <dt>Triangles</dt><dd class="compat-triangles" data-label="Tris">—</dd>
        <dt>Colliders</dt><dd class="compat-colliders" data-label="AABB">—</dd>
        <dt>Axes</dt><dd class="compat-axes" data-label="Axes">—</dd>
        <dt>Recipe</dt><dd class="compat-recipe compat-hash">—</dd>
        <dt>Content</dt><dd class="compat-content compat-hash">—</dd>
      </dl>
    </aside>
    <div class="compat-legend" ${colliderMode ? '' : 'hidden'}><i></i><strong>Collision proxies</strong><span>manifest AABB</span></div>
  </main>`;

const canvasElement = mount.querySelector<HTMLCanvasElement>('.compat-canvas');
if (!canvasElement) throw new Error('Compatibility preview canvas is missing.');
const canvas: HTMLCanvasElement = canvasElement;

function query(selector: string): HTMLElement {
  const result = mount.querySelector<HTMLElement>(selector);
  if (!result) throw new Error(`Compatibility preview element ${selector} is missing.`);
  return result;
}

async function boot(): Promise<void> {
  const manifestResponse = await fetch('/compat-bundle/manifest.json');
  if (!manifestResponse.ok) throw new Error(`Manifest request failed: ${manifestResponse.status}`);
  const manifest = await manifestResponse.json() as CompatManifest;
  const gltf = await new GLTFLoader().loadAsync('/compat-bundle/canary.glb');

  const renderer = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;

  const scene = new Scene();
  scene.background = new Color(0xb8c8b7);
  scene.fog = new Fog(0xb8c8b7, 24, 132);
  scene.add(new AmbientLight(0xfff0d2, 0.4));
  scene.add(new HemisphereLight(0xffe4b5, 0x647163, 2.15));
  const sun = new DirectionalLight(0xffca7e, 3.2);
  sun.position.set(-5.5, 9.5, 5.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const roomOffsetZ = -10;
  const floorMaterial = new MeshStandardMaterial({ color: 0xb48660, roughness: 0.9 });
  const wallMaterial = new MeshStandardMaterial({ color: 0xc8c9ad, roughness: 0.95, transparent: true, opacity: 0.32, depthWrite: false });
  const floor = new Mesh(new BoxGeometry(manifest.room.width, 0.28, manifest.room.length), floorMaterial);
  floor.position.set(0, -0.66, roomOffsetZ);
  floor.receiveShadow = true;
  scene.add(floor);
  for (const side of [-1, 1]) {
    const wall = new Mesh(new BoxGeometry(0.24, manifest.room.height, manifest.room.length), wallMaterial);
    wall.position.set(side * manifest.room.width / 2, 2.72, roomOffsetZ);
    wall.receiveShadow = true;
    scene.add(wall);
  }

  const canary = gltf.scene;
  canary.position.set(manifest.placement.position[0], manifest.placement.position[1], roomOffsetZ + manifest.placement.position[2]);
  canary.rotation.set(...manifest.placement.rotationRadians);
  canary.scale.fromArray(manifest.placement.scale);
  canary.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  scene.add(canary);

  if (colliderMode) {
    const colliderMaterial = new MeshBasicMaterial({ color: 0xff5f48, wireframe: true, transparent: true, opacity: 0.95, depthTest: false });
    const colliders = new Group();
    colliders.name = 'manifest-colliders';
    for (const collider of manifest.colliders) {
      const proxy = new Mesh(new BoxGeometry(...collider.halfExtents.map((value) => value * 2) as [number, number, number]), colliderMaterial);
      proxy.name = collider.id;
      proxy.position.set(
        collider.center[0] + manifest.placement.position[0],
        collider.center[1] + manifest.placement.position[1],
        collider.center[2] + manifest.placement.position[2] + roomOffsetZ,
      );
      proxy.renderOrder = 20;
      colliders.add(proxy);
    }
    scene.add(colliders);
  }

  const camera = new PerspectiveCamera(mode === 'overview' || colliderMode ? 48 : 58, 1, 0.1, 180);
  const target = new Vector3(0, 2.35, -11);
  if (mode === 'overview' || colliderMode) {
    camera.position.set(colliderMode ? 7.7 : 8.5, colliderMode ? 5.4 : 6.4, 5.8);
    target.set(0, 2.25, -10);
  } else {
    camera.position.set(0, 2.95, 7.65);
  }
  camera.lookAt(target);

  const render = () => {
    const width = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 640 ? 1.45 : 1.8));
    renderer.setSize(width, height, false);
    renderer.render(scene, camera);
    if (window.__compatPreview) window.__compatPreview.viewport = { width, height };
  };

  const loadedNodeIds: string[] = [];
  canary.traverse((object) => { if (manifest.visualNodes.some((node) => node.id === object.name)) loadedNodeIds.push(object.name); });
  loadedNodeIds.sort();
  if (loadedNodeIds.length !== manifest.counts.visualNodeCount) throw new Error('Preview did not load every required visual node.');

  query('.compat-status').textContent = 'GLB loaded';
  query('.compat-nodes').textContent = String(loadedNodeIds.length);
  query('.compat-triangles').textContent = manifest.counts.triangleCount.toLocaleString('en-US');
  query('.compat-colliders').textContent = String(manifest.counts.colliderCount);
  query('.compat-axes').textContent = `${manifest.coordinateSystem.upAxis} · ${manifest.coordinateSystem.forwardAxis}`;
  query('.compat-recipe').textContent = manifest.source.recipeHash;
  query('.compat-content').textContent = manifest.contentHash.slice(0, 24);

  const previewState: CompatPreviewState = {
    ready: false,
    mode,
    contentHash: manifest.contentHash,
    recipeHash: manifest.source.recipeHash,
    loadedNodeIds,
    colliderCount: manifest.colliders.length,
    viewport: { width: 0, height: 0 },
    camera: { fov: camera.fov, position: camera.position.toArray(), target: target.toArray() },
  };
  window.__compatPreview = previewState;
  render();
  await new Promise<void>((resolvePromise) => requestAnimationFrame(() => {
    render();
    resolvePromise();
  }));
  previewState.ready = true;
  renderer.setAnimationLoop(render);
  window.addEventListener('resize', render);
}

boot().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  mount.innerHTML = `<div class="compat-error"><strong>Compatibility preview failed</strong><br />${message}</div>`;
  console.error(error);
});
