import { useWorkbench } from './store';

function SectionTitle({ children, count }: { children: string; count: number }) {
  return <div className="section-title"><span>{children}</span><b>{count}</b></div>;
}

export function LibraryPanel() {
  const { recipe, selection, setSelection, setViewMode } = useWorkbench();
  return (
    <aside className="panel library-panel" aria-label="Asset catalog and scene tree">
      <div className="panel-heading"><div><span className="eyebrow">LIBRARY</span><h2>Asset Catalog</h2></div></div>
      <div className="panel-scroll">
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

        <SectionTitle count={recipe.sceneInstances.length}>Scene Instances</SectionTitle>
        <div className="tree-list">
          {recipe.sceneInstances.map((instance) => (
            <button key={instance.id} className={selection.kind === 'instance' && selection.id === instance.id ? 'selected' : ''} onClick={() => { setSelection({ kind: 'instance', id: instance.id }); setViewMode('scene'); }}>
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
