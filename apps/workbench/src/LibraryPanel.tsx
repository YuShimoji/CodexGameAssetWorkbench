import { useState } from 'react';
import { createAssetDraft, createMaterialDraft } from './authoring';
import { useWorkbench } from './store';

function SectionTitle({ children, count }: { children: string; count: number }) {
  return <div className="section-title"><span>{children}</span><b>{count}</b></div>;
}

export function LibraryPanel() {
  const { recipe, selection, setSelection, setViewMode, transact } = useWorkbench();
  const [newAssetName, setNewAssetName] = useState('');
  const [newMaterialName, setNewMaterialName] = useState('');

  function createAsset() {
    const { asset, fallbackMaterial } = createAssetDraft(recipe, newAssetName);
    transact((draft) => {
      if (fallbackMaterial) draft.materialDefinitions.push(fallbackMaterial);
      draft.assetDefinitions.push(asset);
    });
    setSelection({ kind: 'asset', id: asset.id, partId: asset.parts[0]!.id });
    setViewMode('asset');
    setNewAssetName('');
  }

  function createMaterial() {
    const material = createMaterialDraft(recipe, newMaterialName);
    transact((draft) => { draft.materialDefinitions.push(material); });
    setSelection({ kind: 'material', id: material.id });
    setNewMaterialName('');
  }

  return (
    <aside className="panel library-panel" aria-label="Asset catalog and scene tree">
      <div className="panel-heading"><div><span className="eyebrow">AUTHORING</span><h2>Asset Catalog</h2><small>Create, assemble, then place</small></div></div>
      <div className="panel-scroll">
        <div className="creation-composer">
          <label><span>Asset name</span><input data-testid="new-asset-name" value={newAssetName} placeholder="Review Prop" onChange={(event) => setNewAssetName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && newAssetName.trim()) createAsset(); }} /></label>
          <button className="authoring-primary" data-testid="new-asset" disabled={!newAssetName.trim()} onClick={createAsset}>New Asset</button>
        </div>

        <SectionTitle count={recipe.assetDefinitions.length}>Definitions</SectionTitle>
        <div className="catalog-grid">
          {recipe.assetDefinitions.map((asset, index) => (
            <button
              key={asset.id}
              className={`catalog-card ${selection.kind === 'asset' && selection.id === asset.id ? 'selected' : ''}`}
              onClick={() => { setSelection({ kind: 'asset', id: asset.id, partId: asset.parts[0]?.id }); setViewMode('asset'); }}
              data-testid={`asset-${asset.id}`}
            >
              <span className={`asset-glyph glyph-${index % 3}`} aria-hidden="true" />
              <span><strong>{asset.name}</strong><small>{asset.parts.length} parts · {asset.id}</small></span>
            </button>
          ))}
        </div>

        <div className="creation-composer material-composer">
          <label><span>Material name</span><input data-testid="new-material-name" value={newMaterialName} placeholder="Review Teal" onChange={(event) => setNewMaterialName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && newMaterialName.trim()) createMaterial(); }} /></label>
          <button className="authoring-primary" data-testid="new-material" disabled={!newMaterialName.trim()} onClick={createMaterial}>New Material</button>
        </div>

        <SectionTitle count={recipe.materialDefinitions.length}>Materials</SectionTitle>
        <div className="material-list">
          {recipe.materialDefinitions.map((material) => (
            <button key={material.id} data-testid={`material-${material.id}`} className={selection.kind === 'material' && selection.id === material.id ? 'selected' : ''} onClick={() => setSelection({ kind: 'material', id: material.id })}>
              <i style={{ background: material.color }} /><span><strong>{material.name}</strong><small>{material.id}</small></span>
            </button>
          ))}
        </div>

        <SectionTitle count={recipe.sceneInstances.length}>Scene Instances</SectionTitle>
        <div className="tree-list">
          {recipe.sceneInstances.map((instance) => (
            <button key={instance.id} data-testid={`instance-${instance.id}`} className={selection.kind === 'instance' && selection.id === instance.id ? 'selected' : ''} onClick={() => { setSelection({ kind: 'instance', id: instance.id }); setViewMode('scene'); }}>
              <span className="tree-icon">◇</span><span><strong>{instance.name}</strong><small>{instance.assetId}</small></span>
            </button>
          ))}
        </div>

        <SectionTitle count={recipe.splineDefinitions.length}>Splines</SectionTitle>
        <div className="tree-list">
          {recipe.splineDefinitions.map((spline) => (
            <button key={spline.id} className={selection.kind === 'spline' && selection.id === spline.id ? 'selected' : ''} onClick={() => { setSelection({ kind: 'spline', id: spline.id }); setViewMode('scene'); }}>
              <span className="tree-icon">⌁</span><span><strong>{spline.name}</strong><small>{spline.sweepType} · {spline.controlPoints.length} points</small></span>
            </button>
          ))}
        </div>

        <SectionTitle count={recipe.roomDefinitions.length + recipe.socketDefinitions.length}>Rooms & Sockets</SectionTitle>
        <div className="tree-list">
          {recipe.roomDefinitions.map((room) => (
            <button key={room.id} className={selection.kind === 'room' && selection.id === room.id ? 'selected' : ''} onClick={() => { setSelection({ kind: 'room', id: room.id }); setViewMode('scene'); }}>
              <span className="tree-icon">▱</span><span><strong>{room.name}</strong><small>{room.width} × {room.height} × {room.depth}</small></span>
            </button>
          ))}
          {recipe.socketDefinitions.map((socket) => (
            <button key={socket.id} className={selection.kind === 'socket' && selection.id === socket.id ? 'selected' : ''} onClick={() => { setSelection({ kind: 'socket', id: socket.id }); setViewMode('scene'); }}>
              <span className="tree-icon socket">◆</span><span><strong>{socket.name}</strong><small>{socket.type} · {socket.roomId}</small></span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
