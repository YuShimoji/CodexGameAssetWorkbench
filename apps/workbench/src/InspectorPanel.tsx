import type { AssetPart, PrimitiveDefinition, Recipe, Transform, Vec3 } from '@cgawe/schema';
import { useWorkbench } from './store';

function NumberInput({ label, value, onChange, step = 0.1, min }: { label: string; value: number; onChange(value: number): void; step?: number; min?: number }) {
  return <label className="field"><span>{label}</span><input type="number" value={Number(value.toFixed(4))} step={step} min={min} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function VectorEditor({ label, value, onChange, step = 0.1 }: { label: string; value: Vec3; onChange(value: Vec3): void; step?: number }) {
  return <div className="vector-field"><span>{label}</span><div>{(['X', 'Y', 'Z'] as const).map((axis, index) => <label key={axis}><b>{axis}</b><input type="number" value={Number((value[index] ?? 0).toFixed(3))} step={step} onChange={(event) => { const next = [...value] as Vec3; next[index] = Number(event.target.value); onChange(next); }} /></label>)}</div></div>;
}

function PrimitiveEditor({ part, update }: { part: AssetPart; update(mutator: (primitive: PrimitiveDefinition) => void): void }) {
  const primitive = part.primitive;
  if (primitive.type === 'box') return <div className="field-grid"><VectorEditor label="Size" value={primitive.size} onChange={(size) => update((draft) => { if (draft.type === 'box') draft.size = size; })} /></div>;
  if (primitive.type === 'cylinder') return <div className="field-grid two"><NumberInput label="Top radius" value={primitive.radiusTop} min={0.01} onChange={(value) => update((draft) => { if (draft.type === 'cylinder') draft.radiusTop = value; })} /><NumberInput label="Bottom radius" value={primitive.radiusBottom} min={0.01} onChange={(value) => update((draft) => { if (draft.type === 'cylinder') draft.radiusBottom = value; })} /><NumberInput label="Height" value={primitive.height} min={0.01} onChange={(value) => update((draft) => { if (draft.type === 'cylinder') draft.height = value; })} /><NumberInput label="Segments" value={primitive.radialSegments} min={3} step={1} onChange={(value) => update((draft) => { if (draft.type === 'cylinder') draft.radialSegments = Math.floor(value); })} /></div>;
  if (primitive.type === 'plane') return <div className="field-grid two"><NumberInput label="Width" value={primitive.size[0]} min={0.01} onChange={(value) => update((draft) => { if (draft.type === 'plane') draft.size[0] = value; })} /><NumberInput label="Depth" value={primitive.size[1]} min={0.01} onChange={(value) => update((draft) => { if (draft.type === 'plane') draft.size[1] = value; })} /></div>;
  return <div className="field-grid two"><NumberInput label="Radius" value={primitive.radius} min={0.01} onChange={(value) => update((draft) => { if (draft.type === 'sphere') draft.radius = value; })} /><NumberInput label="Segments" value={primitive.widthSegments} min={3} step={1} onChange={(value) => update((draft) => { if (draft.type === 'sphere') draft.widthSegments = Math.floor(value); })} /></div>;
}

function MaterialEditor({ recipe, materialId, update }: { recipe: Recipe; materialId: string; update(mutator: (recipe: Recipe) => void): void }) {
  const material = recipe.materialDefinitions.find((item) => item.id === materialId);
  if (!material) return <p className="empty">Material reference is missing.</p>;
  return <>
    <div className="material-field"><label><span>Color</span><input type="color" value={material.color} onChange={(event) => update((draft) => { const target = draft.materialDefinitions.find((item) => item.id === material.id); if (target) target.color = event.target.value; })} /></label><code>{material.color}</code></div>
    <div className="field-grid two"><NumberInput label="Roughness" value={material.roughness} min={0} step={0.01} onChange={(value) => update((draft) => { const target = draft.materialDefinitions.find((item) => item.id === material.id); if (target) target.roughness = Math.max(0, Math.min(1, value)); })} /><NumberInput label="Metalness" value={material.metalness} min={0} step={0.01} onChange={(value) => update((draft) => { const target = draft.materialDefinitions.find((item) => item.id === material.id); if (target) target.metalness = Math.max(0, Math.min(1, value)); })} /></div>
  </>;
}

function AssetInspector({ assetId, selectedPartId }: { assetId: string; selectedPartId?: string }) {
  const { recipe, transact, setSelection } = useWorkbench();
  const asset = recipe.assetDefinitions.find((item) => item.id === assetId);
  if (!asset) return <p className="empty">Select an asset definition.</p>;
  const part = asset.parts.find((item) => item.id === selectedPartId) ?? asset.parts[0];
  if (!part) return <p className="empty">This definition has no parts.</p>;
  const updatePart = (mutator: (part: AssetPart) => void) => transact((draft) => { const target = draft.assetDefinitions.find((item) => item.id === asset.id)?.parts.find((item) => item.id === part.id); if (target) mutator(target); });
  return <>
    <div className="identity-block"><span>DEFINITION</span><strong>{asset.name}</strong><code>{asset.id}</code></div>
    <div className="inspector-section"><h3>Part</h3><select aria-label="Selected part" value={part.id} onChange={(event) => setSelection({ kind: 'asset', id: asset.id, partId: event.target.value })}>{asset.parts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><code className="stable-id">{part.id}</code></div>
    <div className="inspector-section"><h3>Primitive · {part.primitive.type}</h3><PrimitiveEditor part={part} update={(mutator) => updatePart((draft) => mutator(draft.primitive))} /></div>
    <div className="inspector-section"><h3>Part transform</h3><VectorEditor label="Position" value={part.transform.position} onChange={(position) => updatePart((draft) => { draft.transform.position = position; })} /><VectorEditor label="Rotation" value={part.transform.rotation} step={0.05} onChange={(rotation) => updatePart((draft) => { draft.transform.rotation = rotation; })} /><VectorEditor label="Scale" value={part.transform.scale} onChange={(scale) => updatePart((draft) => { draft.transform.scale = scale; })} /></div>
    <div className="inspector-section"><h3>Shared material</h3><MaterialEditor recipe={recipe} materialId={part.materialId} update={transact} /></div>
  </>;
}

function InstanceInspector({ instanceId, partId }: { instanceId: string; partId?: string }) {
  const { recipe, transact, setSelection } = useWorkbench();
  const instance = recipe.sceneInstances.find((item) => item.id === instanceId);
  const asset = recipe.assetDefinitions.find((item) => item.id === instance?.assetId);
  if (!instance || !asset) return <p className="empty">Select a valid scene instance.</p>;
  const part = asset.parts.find((item) => item.id === partId) ?? asset.parts[0];
  const override = part ? instance.partOverrides?.[part.id] : undefined;
  const updateTransform = (key: keyof Transform, value: Vec3) => transact((draft) => { const target = draft.sceneInstances.find((item) => item.id === instance.id); if (target) target.transform[key] = value; });
  return <>
    <div className="identity-block instance"><span>INSTANCE OVERRIDE</span><strong>{instance.name}</strong><code>{instance.id}</code></div>
    <div className="notice">Definition <b>{asset.name}</b> remains shared. Changes below affect only this instance unless explicitly applied.</div>
    <div className="inspector-section"><h3>Scene transform</h3><VectorEditor label="Position" value={instance.transform.position} onChange={(value) => updateTransform('position', value)} /><VectorEditor label="Rotation" value={instance.transform.rotation} step={0.05} onChange={(value) => updateTransform('rotation', value)} /><VectorEditor label="Scale" value={instance.transform.scale} onChange={(value) => updateTransform('scale', value)} /></div>
    {part && <div className="inspector-section"><h3>Part override</h3><select value={part.id} aria-label="Instance override part" onChange={(event) => setSelection({ kind: 'instance', id: instance.id, partId: event.target.value })}>{asset.parts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><label className="field"><span>Material</span><select value={override?.materialId ?? ''} onChange={(event) => transact((draft) => { const target = draft.sceneInstances.find((item) => item.id === instance.id); if (!target) return; target.partOverrides ??= {}; if (!event.target.value) delete target.partOverrides[part.id]; else target.partOverrides[part.id] = { ...(target.partOverrides[part.id] ?? {}), materialId: event.target.value }; })}><option value="">Use definition ({part.materialId})</option>{recipe.materialDefinitions.map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}</select></label><div className="button-row"><button disabled={!override} onClick={() => transact((draft) => { const target = draft.sceneInstances.find((item) => item.id === instance.id); if (target?.partOverrides) delete target.partOverrides[part.id]; })}>Revert override</button><button className="danger-soft" disabled={!override?.materialId} onClick={() => transact((draft) => { const targetAsset = draft.assetDefinitions.find((item) => item.id === asset.id); const targetPart = targetAsset?.parts.find((item) => item.id === part.id); const targetInstance = draft.sceneInstances.find((item) => item.id === instance.id); const materialId = targetInstance?.partOverrides?.[part.id]?.materialId; if (targetPart && materialId) targetPart.materialId = materialId; if (targetInstance?.partOverrides) delete targetInstance.partOverrides[part.id]; })}>Apply to definition</button></div></div>}
  </>;
}

function SplineInspector({ splineId }: { splineId: string }) {
  const { recipe, transact } = useWorkbench();
  const spline = recipe.splineDefinitions.find((item) => item.id === splineId);
  if (!spline) return <p className="empty">Select a spline.</p>;
  return <>
    <div className="identity-block spline"><span>SPLINE DEFINITION</span><strong>{spline.name}</strong><code>{spline.id}</code></div>
    <div className="inspector-section"><h3>Vertical section</h3><div className="segmented three">{(['rod', 'road', 'corridor'] as const).map((type) => <button key={type} data-testid={`sweep-${type}`} className={spline.sweepType === type ? 'active' : ''} onClick={() => transact((draft) => { const target = draft.splineDefinitions.find((item) => item.id === spline.id); if (target) target.sweepType = type; })}>{type}</button>)}</div></div>
    <div className="inspector-section"><h3>Profile</h3><div className="field-grid two"><NumberInput label="Radius at start" value={spline.radiusKeyframes[0]?.value ?? 0.2} min={0.01} onChange={(value) => transact((draft) => { const target = draft.splineDefinitions.find((item) => item.id === spline.id); if (target?.radiusKeyframes[0]) target.radiusKeyframes[0].value = value; })} /><NumberInput label="Width at start" value={spline.widthKeyframes[0]?.value ?? 1} min={0.05} onChange={(value) => transact((draft) => { const target = draft.splineDefinitions.find((item) => item.id === spline.id); if (target?.widthKeyframes[0]) target.widthKeyframes[0].value = value; })} /><NumberInput label="Height at start" value={spline.heightKeyframes[0]?.value ?? 2} min={0.05} onChange={(value) => transact((draft) => { const target = draft.splineDefinitions.find((item) => item.id === spline.id); if (target?.heightKeyframes[0]) target.heightKeyframes[0].value = value; })} /><NumberInput label="Spline seed" value={spline.seed} step={1} onChange={(value) => transact((draft) => { const target = draft.splineDefinitions.find((item) => item.id === spline.id); if (target) target.seed = Math.floor(value); })} /></div></div>
    <div className="inspector-section"><h3>Adaptive resolution</h3><div className="metric-list"><span><b>{spline.resolutionPolicy.minSegments}</b> minimum</span><span><b>{spline.resolutionPolicy.maxSegments}</b> maximum</span><span><b>{spline.resolutionPolicy.segmentsPerUnit}</b> per unit</span></div><p className="helper">Path length, curvature and profile changes contribute additional subdivisions.</p></div>
  </>;
}

function RoomInspector({ roomId }: { roomId: string }) {
  const { recipe, transact } = useWorkbench();
  const room = recipe.roomDefinitions.find((item) => item.id === roomId);
  if (!room) return <p className="empty">Select a room volume.</p>;
  return <><div className="identity-block room"><span>ROOM VOLUME</span><strong>{room.name}</strong><code>{room.id}</code></div><div className="inspector-section"><h3>Dimensions</h3><div className="field-grid two">{(['width', 'height', 'depth', 'floorY'] as const).map((key) => <NumberInput key={key} label={key} value={room[key]} min={key === 'floorY' ? undefined : 0.1} onChange={(value) => transact((draft) => { const target = draft.roomDefinitions.find((item) => item.id === room.id); if (target) target[key] = value; })} />)}</div></div><div className="inspector-section"><h3>Sockets</h3><div className="metric-list">{recipe.socketDefinitions.filter((socket) => socket.roomId === room.id).map((socket) => <span key={socket.id}><b>{socket.type}</b>{socket.name}</span>)}</div></div></>;
}

function SocketInspector({ socketId }: { socketId: string }) {
  const { recipe, transact } = useWorkbench();
  const socket = recipe.socketDefinitions.find((item) => item.id === socketId);
  if (!socket) return <p className="empty">Select a socket.</p>;
  return <><div className="identity-block socket"><span>SOCKET DEFINITION</span><strong>{socket.name}</strong><code>{socket.id}</code></div><div className="inspector-section"><h3>Placement</h3><VectorEditor label="Position" value={socket.position} onChange={(position) => transact((draft) => { const target = draft.socketDefinitions.find((item) => item.id === socket.id); if (target) target.position = position; })} /><VectorEditor label="Orientation" value={socket.orientation} step={0.05} onChange={(orientation) => transact((draft) => { const target = draft.socketDefinitions.find((item) => item.id === socket.id); if (target) target.orientation = orientation; })} /></div><div className="inspector-section"><h3>Compatibility</h3><div className="tag-row">{socket.compatibleTags.map((tag) => <span key={tag}>{tag}</span>)}</div></div></>;
}

export function InspectorPanel() {
  const { selection } = useWorkbench();
  return <aside className="panel inspector-panel" aria-label="Inspector"><div className="panel-heading"><div><span className="eyebrow">INSPECTOR</span><h2>Properties</h2></div></div><div className="panel-scroll">{selection.kind === 'asset' && <AssetInspector assetId={selection.id} selectedPartId={selection.partId} />}{selection.kind === 'instance' && <InstanceInspector instanceId={selection.id} partId={selection.partId} />}{selection.kind === 'spline' && <SplineInspector splineId={selection.id} />}{selection.kind === 'room' && <RoomInspector roomId={selection.id} />}{selection.kind === 'socket' && <SocketInspector socketId={selection.id} />}</div></aside>;
}
