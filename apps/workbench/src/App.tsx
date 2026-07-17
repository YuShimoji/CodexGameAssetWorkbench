import { useRef, useState } from 'react';
import { Group } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { buildAssetObject, disposeObject } from '@cgawe/adapter-three';
import { createAssetMeshes, getMeshStats, recipeHash, validateRecipe } from '@cgawe/core';
import { BottomDock } from './BottomDock';
import { InspectorPanel } from './InspectorPanel';
import { LibraryPanel } from './LibraryPanel';
import { SceneViewport } from './SceneViewport';
import { useWorkbench } from './store';

function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  URL.revokeObjectURL(url);
}

export function App() {
  const { recipe, selection, viewMode, setViewMode, transformMode, setTransformMode, dirty, canUndo, canRedo, undo, redo, reset, revert, save, load } = useWorkbench();
  const inputRef = useRef<HTMLInputElement>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [bottomOpen, setBottomOpen] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  async function exportGlb() {
    const assetId = selection.kind === 'asset' ? selection.id : selection.kind === 'instance' ? recipe.sceneInstances.find((item) => item.id === selection.id)?.assetId : undefined;
    const asset = recipe.assetDefinitions.find((item) => item.id === assetId) ?? recipe.assetDefinitions[0];
    if (!asset) return;
    const group = new Group(); group.add(buildAssetObject(recipe, asset));
    const result = await new GLTFExporter().parseAsync(group, { binary: true, onlyVisible: true });
    if (!(result instanceof ArrayBuffer) || result.byteLength === 0) throw new Error('GLTFExporter returned no binary data.');
    const stats = getMeshStats(createAssetMeshes(asset));
    const manifest = {
      schemaVersion: recipe.schemaVersion,
      projectId: recipe.projectId,
      sourceRecipeHash: recipeHash(recipe),
      assetIds: [asset.id],
      generationSeed: recipe.generationSeed,
      vertexCount: stats.vertexCount,
      triangleCount: stats.triangleCount,
      materialCount: new Set(asset.parts.map((part) => part.materialId)).size,
      boundingBox: stats.boundingBox,
      generatedAt: new Date().toISOString(),
      generatorVersion: '0.0.0-v0',
    };
    download(`${asset.id}.glb`, result, 'model/gltf-binary');
    download(`${asset.id}.manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, 'application/json');
    disposeObject(group);
    setNotice(`Exported ${asset.name} with sidecar manifest.`);
    window.setTimeout(() => setNotice(null), 2800);
  }

  return <main className={`workbench ${leftOpen ? '' : 'left-collapsed'} ${rightOpen ? '' : 'right-collapsed'} ${bottomOpen ? '' : 'bottom-collapsed'}`}>
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><i /><i /><i /></div><div><span>CODEX</span><strong>Game Asset Workbench</strong></div><em>v0.1</em></div>
      <div className="mode-switch"><button className={viewMode === 'scene' ? 'active' : ''} onClick={() => setViewMode('scene')}>Scene</button><button className={viewMode === 'asset' ? 'active' : ''} onClick={() => setViewMode('asset')}>Isolate</button></div>
      <div className="transform-tools" aria-label="Transform mode">{(['translate', 'rotate', 'scale'] as const).map((mode) => <button key={mode} title={mode} className={transformMode === mode ? 'active' : ''} onClick={() => setTransformMode(mode)}>{mode === 'translate' ? '↗' : mode === 'rotate' ? '↻' : '↔'}</button>)}</div>
      <div className="history-tools"><button onClick={undo} disabled={!canUndo} title="Undo">↶</button><button onClick={redo} disabled={!canRedo} title="Redo">↷</button><span className={dirty ? 'dirty' : ''}>{dirty ? 'Unsaved changes' : 'Recipe saved'}</span></div>
      <div className="file-tools"><input ref={inputRef} type="file" accept="application/json,.json" hidden onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { load(JSON.parse(await file.text())); setNotice(`Loaded ${file.name}`); } catch (error) { setNotice(error instanceof Error ? error.message : String(error)); } event.target.value = ''; }} /><button onClick={() => inputRef.current?.click()}>Open</button><button onClick={revert} disabled={!dirty}>Revert</button><button onClick={reset}>Reset</button><button onClick={() => void exportGlb().catch((error) => setNotice(error instanceof Error ? error.message : String(error)))}>Export GLB</button><button className="primary" onClick={save}>Save Recipe</button></div>
    </header>
    <div className="left-slot">{leftOpen && <LibraryPanel />}<button className="collapse-handle left" aria-label="Toggle library" onClick={() => setLeftOpen((value) => !value)}>{leftOpen ? '‹' : '›'}</button></div>
    <section className="stage"><SceneViewport />{notice && <div className="toast" role="status">{notice}</div>}<div className="stage-status"><span><i className={validateRecipe(recipe).some((issue) => issue.severity === 'error') ? 'error-dot' : ''} />{validateRecipe(recipe).filter((issue) => issue.severity === 'error').length === 0 ? 'Recipe valid' : 'Validation errors'}</span><code>{recipeHash(recipe)}</code></div></section>
    <div className="right-slot">{rightOpen && <InspectorPanel />}<button className="collapse-handle right" aria-label="Toggle inspector" onClick={() => setRightOpen((value) => !value)}>{rightOpen ? '›' : '‹'}</button></div>
    <div className="bottom-slot">{bottomOpen && <BottomDock />}<button className="collapse-handle bottom" aria-label="Toggle recipe dock" onClick={() => setBottomOpen((value) => !value)}>{bottomOpen ? '⌄' : '⌃'}</button></div>
  </main>;
}
