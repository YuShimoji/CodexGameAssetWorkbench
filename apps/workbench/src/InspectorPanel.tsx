import { useState } from 'react';
import {
  activeSplineChannels, addSplineKeyframe, appendSplineControlPoint, estimateSplineSegments,
  findLargestKeyframeGap, generateSplineMesh, getMeshStats, insertSplineControlPoint,
  moveSplineControlPoint, removeSplineControlPoint, removeSplineKeyframe, reorderSplineControlPoint,
  updateSplineKeyframe, valueAt, type SplineKeyframeChannel,
} from '@cgawe/core';
import type { AssetPart, PrimitiveDefinition, Recipe, SplineDefinition, Transform, Vec3 } from '@cgawe/schema';
import { useWorkbench } from './store';

function NumberInput({ label, value, onChange, step = 0.1, min, max, testId }: { label: string; value: number; onChange(value: number): void; step?: number; min?: number; max?: number; testId?: string }) {
  return <label className="field"><span>{label}</span><input data-testid={testId} type="number" value={Number(value.toFixed(4))} step={step} min={min} max={max} onChange={(event) => { const next = Number(event.target.value); if (Number.isFinite(next)) onChange(next); }} /></label>;
}

function VectorEditor({ label, value, onChange, step = 0.1, testIdPrefix }: { label: string; value: Vec3; onChange(value: Vec3): void; step?: number; testIdPrefix?: string }) {
  return <div className="vector-field"><span>{label}</span><div>{(['X', 'Y', 'Z'] as const).map((axis, index) => <label key={axis}><b>{axis}</b><input data-testid={testIdPrefix ? `${testIdPrefix}-${axis.toLowerCase()}` : undefined} type="number" value={Number((value[index] ?? 0).toFixed(3))} step={step} onChange={(event) => { const changed = Number(event.target.value); if (!Number.isFinite(changed)) return; const next = [...value] as Vec3; next[index] = changed; onChange(next); }} /></label>)}</div></div>;
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
  const { recipe, transact, selection, setSelection, gridSnap, setGridSnap } = useWorkbench();
  const [operationError, setOperationError] = useState<string | null>(null);
  const spline = recipe.splineDefinitions.find((item) => item.id === splineId);
  if (!spline) return <p className="empty">Select a spline.</p>;
  const selectedPointIndex = selection.kind === 'spline' && selection.id === spline.id ? Math.min(selection.pointIndex ?? 0, spline.controlPoints.length - 1) : 0;
  const selectedPoint = spline.controlPoints[selectedPointIndex] ?? spline.controlPoints[0];
  const activeChannels = activeSplineChannels(spline.sweepType);
  const meshStats = getMeshStats([generateSplineMesh(spline)]);
  const segments = estimateSplineSegments(spline);

  const replaceSpline = (next: SplineDefinition) => transact((draft) => {
    const index = draft.splineDefinitions.findIndex((item) => item.id === spline.id);
    if (index >= 0) draft.splineDefinitions[index] = next;
  });
  type SplineFocus = { pointIndex?: number; keyframe?: { channel: SplineKeyframeChannel; index: number } };
  const runOperation = (operation: () => SplineDefinition, focus?: SplineFocus | ((next: SplineDefinition) => SplineFocus)) => {
    try {
      const next = operation();
      replaceSpline(next);
      setOperationError(null);
      const resolvedFocus = typeof focus === 'function' ? focus(next) : focus;
      setSelection({ kind: 'spline', id: spline.id, ...resolvedFocus });
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : String(error));
    }
  };
  const updateDirect = (mutator: (target: SplineDefinition) => void) => transact((draft) => {
    const target = draft.splineDefinitions.find((item) => item.id === spline.id);
    if (target) mutator(target);
  });

  return <>
    <div className="identity-block spline"><span>SPLINE DEFINITION</span><strong>{spline.name}</strong><code>{spline.id}</code><div className="identity-meta"><b>{spline.interpolation}</b><b>{spline.sweepType}</b><b>seed {spline.seed}</b></div></div>
    {operationError && <div className="notice error-notice" role="alert">{operationError}</div>}

    <div className="inspector-section">
      <h3>Vertical section</h3>
      <div className="segmented three">{(['rod', 'road', 'corridor'] as const).map((type) => <button key={type} data-testid={`sweep-${type}`} className={spline.sweepType === type ? 'active' : ''} onClick={() => updateDirect((target) => { target.sweepType = type; })}>{type}</button>)}</div>
    </div>

    <div className="inspector-section">
      <div className="section-heading-row"><h3>Control points</h3><span data-testid="control-point-count">{spline.controlPoints.length}</span></div>
      <div className="point-chips">{spline.controlPoints.map((_, index) => <button key={index} data-testid={`spline-point-${index}`} className={index === selectedPointIndex ? 'active' : ''} onClick={() => setSelection({ kind: 'spline', id: spline.id, pointIndex: index })}>P{index + 1}</button>)}</div>
      {selectedPoint && <VectorEditor label={`Point ${selectedPointIndex + 1}`} value={selectedPoint} testIdPrefix="control-point" onChange={(point) => runOperation(() => moveSplineControlPoint(spline, selectedPointIndex, point), { pointIndex: selectedPointIndex })} />}
      <div className="button-row point-actions">
        <button data-testid="append-control-point" onClick={() => runOperation(() => appendSplineControlPoint(spline), { pointIndex: spline.controlPoints.length })}>Append</button>
        <button data-testid="insert-control-point" onClick={() => { const segment = Math.min(selectedPointIndex, spline.controlPoints.length - 2); runOperation(() => insertSplineControlPoint(spline, segment), { pointIndex: segment + 1 }); }}>Insert segment</button>
        <button disabled={selectedPointIndex === 0} onClick={() => runOperation(() => reorderSplineControlPoint(spline, selectedPointIndex, selectedPointIndex - 1), { pointIndex: selectedPointIndex - 1 })}>Move earlier</button>
        <button disabled={selectedPointIndex >= spline.controlPoints.length - 1} onClick={() => runOperation(() => reorderSplineControlPoint(spline, selectedPointIndex, selectedPointIndex + 1), { pointIndex: selectedPointIndex + 1 })}>Move later</button>
        <button data-testid="delete-control-point" disabled={spline.controlPoints.length <= 2} onClick={() => runOperation(() => removeSplineControlPoint(spline, selectedPointIndex), { pointIndex: Math.max(0, selectedPointIndex - 1) })}>Delete point</button>
      </div>
      <label className="toggle-field"><input type="checkbox" checked={gridSnap} onChange={(event) => setGridSnap(event.target.checked)} /><span>Grid snap · 0.25 units</span></label>
    </div>

    <div className="inspector-section">
      <h3>Spline behavior</h3>
      <div className="field-grid two"><label className="field"><span>Interpolation</span><select value={spline.interpolation} onChange={(event) => updateDirect((target) => { target.interpolation = event.target.value as SplineDefinition['interpolation']; })}><option value="linear">linear</option><option value="catmull-rom">catmull-rom</option></select></label><NumberInput label="Spline seed" value={spline.seed} step={1} onChange={(value) => updateDirect((target) => { target.seed = Math.floor(value); })} /></div>
      <label className="toggle-field"><input type="checkbox" checked={spline.closed} onChange={(event) => updateDirect((target) => { target.closed = event.target.checked; })} /><span>Closed path</span></label>
    </div>

    <div className="inspector-section">
      <h3>Profile keyframes · normalized 0—1</h3>
      {activeChannels.map((channel) => {
        const selectedKeyframe = selection.kind === 'spline' && selection.id === spline.id && selection.keyframe?.channel === channel ? selection.keyframe.index : 0;
        const keyframe = spline[channel][selectedKeyframe] ?? spline[channel][0];
        const label = channel.replace('Keyframes', '');
        return <div className="keyframe-channel" key={channel}>
          <div className="keyframe-channel-title"><strong>{label}</strong><button data-testid={`add-keyframe-${channel}`} onClick={() => { const t = findLargestKeyframeGap(spline[channel]); const value = valueAt(spline[channel], t, 1); runOperation(() => addSplineKeyframe(spline, channel, { t, value }), (next) => ({ keyframe: { channel, index: next[channel].findIndex((frame) => frame.t === t) } })); }}>＋ Keyframe</button></div>
          <div className="keyframe-track">{spline[channel].map((frame, index) => <button key={`${frame.t}:${index}`} style={{ left: `${frame.t * 100}%` }} className={index === selectedKeyframe ? 'active' : ''} title={`${label} ${frame.value} at ${frame.t}`} onClick={() => setSelection({ kind: 'spline', id: spline.id, keyframe: { channel, index } })}><i /></button>)}</div>
          {keyframe && <div className="field-grid keyframe-fields"><NumberInput label="Position t" testId={`keyframe-t-${channel}`} value={keyframe.t} min={0} max={1} step={0.01} onChange={(t) => runOperation(() => updateSplineKeyframe(spline, channel, selectedKeyframe, { ...keyframe, t }), (next) => ({ keyframe: { channel, index: next[channel].findIndex((frame) => frame.t === t) } }))} /><NumberInput label={label} testId={`keyframe-value-${channel}`} value={keyframe.value} min={0.01} step={0.05} onChange={(value) => runOperation(() => updateSplineKeyframe(spline, channel, selectedKeyframe, { ...keyframe, value }), (next) => ({ keyframe: { channel, index: next[channel].findIndex((frame) => frame.t === keyframe.t) } }))} /><button data-testid={`delete-keyframe-${channel}`} disabled={spline[channel].length <= 1} onClick={() => runOperation(() => removeSplineKeyframe(spline, channel, selectedKeyframe), { keyframe: { channel, index: Math.max(0, selectedKeyframe - 1) } })}>Delete</button></div>}
        </div>;
      })}
    </div>

    <div className="inspector-section">
      <h3>Adaptive resolution</h3>
      <div className="field-grid two"><NumberInput label="Minimum" value={spline.resolutionPolicy.minSegments} min={1} step={1} onChange={(value) => updateDirect((target) => { target.resolutionPolicy.minSegments = Math.min(Math.floor(value), target.resolutionPolicy.maxSegments); })} /><NumberInput label="Maximum" value={spline.resolutionPolicy.maxSegments} min={1} step={1} onChange={(value) => updateDirect((target) => { target.resolutionPolicy.maxSegments = Math.max(Math.floor(value), target.resolutionPolicy.minSegments); })} /><NumberInput label="Segments / unit" value={spline.resolutionPolicy.segmentsPerUnit} min={0} step={0.25} onChange={(value) => updateDirect((target) => { target.resolutionPolicy.segmentsPerUnit = value; })} /><NumberInput label="Curvature weight" value={spline.resolutionPolicy.curvatureWeight} min={0} step={0.5} onChange={(value) => updateDirect((target) => { target.resolutionPolicy.curvatureWeight = value; })} /></div>
      <div className="metric-list spline-metrics"><span><b>{segments}</b>segments</span><span><b>{meshStats.vertexCount}</b>vertices</span><span><b>{meshStats.triangleCount}</b>triangles</span></div>
      <p className="helper">Path length, curvature and profile changes contribute subdivisions; control point count is not the vertex budget.</p>
    </div>
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
