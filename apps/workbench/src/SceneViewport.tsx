import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { GizmoHelper, GizmoViewport, Grid, Line, OrbitControls, TransformControls } from '@react-three/drei';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Color, Group, MeshStandardMaterial, type Object3D } from 'three';
import { buildAssetObject, buildSplineObject, disposeObject } from '@cgawe/adapter-three';
import {
  activeSplineChannels, appendSplineControlPoint, generateAllPlacements, insertSplineControlPoint,
  moveSplineControlPoint, removeSplineControlPoint, sampleSpline, valueAt,
  type SplineKeyframeChannel,
} from '@cgawe/core';
import type { AssetDefinition, Recipe, SceneInstance, SplineDefinition, Transform, Vec3 } from '@cgawe/schema';
import { useWorkbench } from './store';

interface ViewLayers {
  mesh: boolean;
  handles: boolean;
  guides: boolean;
  context: boolean;
}

type PointPlacementMode = 'append' | 'insert' | null;

function selectPartFromEvent(event: ThreeEvent<MouseEvent>, assetId: string, fallbackPartId?: string) {
  event.stopPropagation();
  let object: Object3D | null = event.object;
  while (object && !object.userData.partId) object = object.parent;
  return { kind: 'asset' as const, id: assetId, partId: (object?.userData.partId as string | undefined) ?? fallbackPartId };
}

function AssetObject({ recipe, asset, selectedPartId, variantId, variantSeed, onSelect }: {
  recipe: Recipe;
  asset: AssetDefinition;
  selectedPartId?: string;
  variantId?: string;
  variantSeed?: number;
  onSelect?(event: ThreeEvent<MouseEvent>): void;
}) {
  const variant = recipe.variantSets.find((item) => item.id === variantId);
  const object = useMemo(() => buildAssetObject(recipe, asset, { variant, variantSeed, selectedPartId }), [asset, recipe, selectedPartId, variant, variantSeed]);
  useEffect(() => () => disposeObject(object), [object]);
  return <primitive object={object} onClick={onSelect} />;
}

function EditableInstance({ recipe, instance }: { recipe: Recipe; instance: SceneInstance }) {
  const { selection, setSelection, transformMode, transact } = useWorkbench();
  const selected = selection.kind === 'instance' && selection.id === instance.id;
  const asset = recipe.assetDefinitions.find((item) => item.id === instance.assetId);
  const groupRef = useRef<Group>(null);
  if (!asset) return null;
  const content = (
    <group
      ref={groupRef}
      position={instance.transform.position}
      rotation={instance.transform.rotation}
      scale={instance.transform.scale}
      onClick={(event) => {
        event.stopPropagation();
        let target: Object3D | null = event.object;
        while (target && !target.userData.partId) target = target.parent;
        setSelection({ kind: 'instance', id: instance.id, partId: target?.userData.partId as string | undefined });
      }}
    >
      <AssetObject recipe={recipe} asset={asset} selectedPartId={selected ? selection.partId : undefined} variantId={instance.variantSetId} variantSeed={recipe.generationSeed} />
    </group>
  );
  if (!selected) return content;
  return (
    <TransformControls
      mode={transformMode}
      onMouseUp={() => {
        const object = groupRef.current;
        if (!object) return;
        const transform: Transform = {
          position: object.position.toArray() as Transform['position'],
          rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
          scale: object.scale.toArray() as Transform['scale'],
        };
        transact((draft) => {
          const target = draft.sceneInstances.find((item) => item.id === instance.id);
          if (target) target.transform = transform;
        });
      }}
    >{content}</TransformControls>
  );
}

function PlacementObjects({ recipe }: { recipe: Recipe }) {
  const placements = useMemo(() => generateAllPlacements(recipe), [recipe]);
  return placements.map((placement) => {
    const asset = recipe.assetDefinitions.find((item) => item.id === placement.assetId);
    if (!asset) return null;
    return (
      <group key={placement.id} position={placement.transform.position} rotation={placement.transform.rotation} scale={placement.transform.scale}>
        <AssetObject recipe={recipe} asset={asset} variantId={placement.variantSetId} variantSeed={placement.variantSeed} />
      </group>
    );
  });
}

function SplineMesh({ recipe, spline, selected, onSelect }: { recipe: Recipe; spline: SplineDefinition; selected: boolean; onSelect(): void }) {
  const object = useMemo(() => buildSplineObject(recipe, spline.id), [recipe, spline]);
  useEffect(() => () => disposeObject(object), [object]);
  const material = object.material as MeshStandardMaterial;
  material.emissive = new Color(selected ? '#1d5b66' : '#000000');
  material.emissiveIntensity = selected ? 0.55 : 0;
  return <primitive object={object} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(); }} />;
}

function ControlPointHandle({ spline, index }: { spline: SplineDefinition; index: number }) {
  const {
    selection, setSelection, gridSnap, beginGesture, previewTransaction, commitGesture,
  } = useWorkbench();
  const selected = selection.kind === 'spline' && selection.id === spline.id && selection.pointIndex === index;
  const ref = useRef<Group>(null);
  const point = spline.controlPoints[index] ?? [0, 0, 0];
  const handle = (
    <group ref={ref} position={point}>
      <mesh
        onPointerDown={(event) => { event.stopPropagation(); setSelection({ kind: 'spline', id: spline.id, pointIndex: index }); }}
        renderOrder={20}
      >
        <sphereGeometry args={[selected ? 0.2 : 0.145, 14, 10]} />
        <meshStandardMaterial color={selected ? '#fff0a6' : '#60d4df'} emissive={selected ? '#a16a19' : '#164b52'} emissiveIntensity={selected ? 0.9 : 0.55} depthTest={false} />
      </mesh>
      {selected && <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={21}><torusGeometry args={[0.27, 0.025, 8, 32]} /><meshBasicMaterial color="#ffe08a" depthTest={false} /></mesh>}
    </group>
  );
  if (!selected) return handle;
  return (
    <TransformControls
      mode="translate"
      translationSnap={gridSnap ? 0.25 : undefined}
      onMouseDown={beginGesture}
      onObjectChange={() => {
        const object = ref.current;
        if (!object) return;
        const position = object.position.toArray() as Vec3;
        previewTransaction((draft) => {
          const splineIndex = draft.splineDefinitions.findIndex((item) => item.id === spline.id);
          if (splineIndex >= 0) draft.splineDefinitions[splineIndex] = moveSplineControlPoint(draft.splineDefinitions[splineIndex]!, index, position);
        });
      }}
      onMouseUp={commitGesture}
    >{handle}</TransformControls>
  );
}

function keyframePosition(spline: SplineDefinition, channel: SplineKeyframeChannel, t: number, channelIndex: number): Vec3 {
  const frames = sampleSpline(spline);
  const frame = frames[Math.round(t * Math.max(0, frames.length - 1))] ?? frames[0];
  if (!frame) return [0, 0, 0];
  const profileHeight = channel === 'heightKeyframes' ? valueAt(spline.heightKeyframes, t, 2) : 0;
  const lift = 0.38 + profileHeight * 0.24;
  return [
    frame.position[0] + frame.binormal[0] * lift + frame.normal[0] * channelIndex * 0.14,
    frame.position[1] + frame.binormal[1] * lift + frame.normal[1] * channelIndex * 0.14,
    frame.position[2] + frame.binormal[2] * lift + frame.normal[2] * channelIndex * 0.14,
  ];
}

function ProfileKeyframeHandles({ spline }: { spline: SplineDefinition }) {
  const { selection, setSelection } = useWorkbench();
  const colors: Record<SplineKeyframeChannel, string> = { radiusKeyframes: '#ffbd69', widthKeyframes: '#d98bf0', heightKeyframes: '#83d5ff' };
  return activeSplineChannels(spline.sweepType).flatMap((channel, channelIndex) => spline[channel].map((keyframe, index) => {
    const selected = selection.kind === 'spline' && selection.id === spline.id && selection.keyframe?.channel === channel && selection.keyframe.index === index;
    return (
      <group key={`${channel}:${index}:${keyframe.t}`} position={keyframePosition(spline, channel, keyframe.t, channelIndex)}>
        <mesh
          onPointerDown={(event) => { event.stopPropagation(); setSelection({ kind: 'spline', id: spline.id, keyframe: { channel, index } }); }}
          scale={selected ? 1.35 : 1}
          renderOrder={22}
        >
          <octahedronGeometry args={[0.16, 0]} />
          <meshBasicMaterial color={colors[channel]} depthTest={false} />
        </mesh>
        {selected && <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={23}><ringGeometry args={[0.22, 0.26, 24]} /><meshBasicMaterial color="#ffffff" side={2} depthTest={false} /></mesh>}
      </group>
    );
  }));
}

function SplineEditor({ recipe, spline, layers }: { recipe: Recipe; spline: SplineDefinition; layers: ViewLayers }) {
  const { setSelection } = useWorkbench();
  const sampledPoints = useMemo(() => sampleSpline(spline).map((frame) => frame.position), [spline]);
  return <>
    {layers.mesh && <SplineMesh recipe={recipe} spline={spline} selected onSelect={() => setSelection({ kind: 'spline', id: spline.id })} />}
    {layers.guides && sampledPoints.length > 1 && <Line points={sampledPoints} color="#8ee7ef" lineWidth={1.5} transparent opacity={0.8} depthTest={false} />}
    {layers.guides && spline.controlPoints.length > 1 && <Line points={spline.controlPoints} color="#527c83" lineWidth={1} dashed dashScale={4} dashSize={0.15} gapSize={0.12} depthTest={false} />}
    {layers.handles && spline.controlPoints.map((_, index) => <ControlPointHandle key={`${spline.id}:point:${index}`} spline={spline} index={index} />)}
    {layers.guides && <ProfileKeyframeHandles spline={spline} />}
  </>;
}

function SplineObjects({ recipe, layers }: { recipe: Recipe; layers: ViewLayers }) {
  const { selection, setSelection } = useWorkbench();
  return recipe.splineDefinitions.map((spline) => selection.kind === 'spline' && selection.id === spline.id
    ? <SplineEditor key={spline.id} recipe={recipe} spline={spline} layers={layers} />
    : layers.mesh ? <SplineMesh key={spline.id} recipe={recipe} spline={spline} selected={false} onSelect={() => setSelection({ kind: 'spline', id: spline.id })} /> : null);
}

function RoomObjects({ recipe }: { recipe: Recipe }) {
  const { selection, setSelection } = useWorkbench();
  return <>
    {recipe.roomDefinitions.map((room) => (
      <mesh key={room.id} position={[room.position[0], room.floorY + room.height / 2, room.position[2]]} onClick={(event) => { event.stopPropagation(); setSelection({ kind: 'room', id: room.id }); }}>
        <boxGeometry args={[room.width, room.height, room.depth]} />
        <meshStandardMaterial color={selection.kind === 'room' && selection.id === room.id ? '#74d4e4' : '#5877a8'} wireframe transparent opacity={0.35} />
      </mesh>
    ))}
    {recipe.socketDefinitions.map((socket) => (
      <group key={socket.id} position={socket.position} rotation={socket.orientation} onClick={(event) => { event.stopPropagation(); setSelection({ kind: 'socket', id: socket.id }); }}>
        <mesh><octahedronGeometry args={[0.24, 0]} /><meshStandardMaterial color={selection.kind === 'socket' && selection.id === socket.id ? '#ffe08a' : '#f6a84f'} emissive="#6d3513" emissiveIntensity={0.5} /></mesh>
        <mesh position={[0, 0, 0.42]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.11, 0.5, 8]} /><meshStandardMaterial color="#f6a84f" /></mesh>
      </group>
    ))}
  </>;
}

function SplineCreationDraft() {
  const { splineCreation, addDraftSplinePoint } = useWorkbench();
  if (!splineCreation.active) return null;
  return <>
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.015, 0]}
      onClick={(event) => { event.stopPropagation(); addDraftSplinePoint([event.point.x, 0, event.point.z]); }}
    >
      <planeGeometry args={[80, 80]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
    {splineCreation.points.length > 1 && <Line points={splineCreation.points} color="#ffe08a" lineWidth={2} depthTest={false} />}
    {splineCreation.points.map((point, index) => <mesh key={`${index}:${point.join(':')}`} position={point} renderOrder={30}><sphereGeometry args={[0.18, 12, 8]} /><meshBasicMaterial color="#ffe08a" depthTest={false} /></mesh>)}
  </>;
}

function SplinePointPlacement({ mode, onComplete }: { mode: Exclude<PointPlacementMode, null>; onComplete(): void }) {
  const { recipe, selection, gridSnap, transact, setSelection } = useWorkbench();
  if (selection.kind !== 'spline') return null;
  const spline = recipe.splineDefinitions.find((item) => item.id === selection.id);
  if (!spline) return null;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.02, 0]}
      onClick={(event) => {
        event.stopPropagation();
        const point: Vec3 = gridSnap
          ? [Math.round(event.point.x * 4) / 4, 0, Math.round(event.point.z * 4) / 4]
          : [event.point.x, 0, event.point.z];
        const segmentIndex = Math.min(selection.pointIndex ?? spline.controlPoints.length - 2, spline.controlPoints.length - 2);
        const nextIndex = mode === 'append' ? spline.controlPoints.length : segmentIndex + 1;
        transact((draft) => {
          const splineIndex = draft.splineDefinitions.findIndex((item) => item.id === spline.id);
          if (splineIndex < 0) return;
          draft.splineDefinitions[splineIndex] = mode === 'append'
            ? appendSplineControlPoint(draft.splineDefinitions[splineIndex]!, point)
            : insertSplineControlPoint(draft.splineDefinitions[splineIndex]!, segmentIndex, point);
        });
        setSelection({ kind: 'spline', id: spline.id, pointIndex: nextIndex });
        onComplete();
      }}
    >
      <planeGeometry args={[80, 80]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function SceneContents({ layers, pointPlacement, finishPointPlacement }: {
  layers: ViewLayers;
  pointPlacement: PointPlacementMode;
  finishPointPlacement(): void;
}) {
  const { recipe, selection, viewMode, renderEpoch, setSelection, splineCreation } = useWorkbench();
  const selectedAsset = selection.kind === 'asset' ? recipe.assetDefinitions.find((asset) => asset.id === selection.id) : undefined;
  const isolatedSpline = selection.kind === 'spline' ? recipe.splineDefinitions.find((spline) => spline.id === selection.id) : undefined;
  return (
    <group key={renderEpoch}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[6, 11, 7]} intensity={2.3} castShadow shadow-mapSize={[1024, 1024]} shadow-normalBias={0.035} />
      <directionalLight position={[-7, 4, -3]} intensity={0.8} color="#8fc9d4" />
      {viewMode === 'asset' ? <>
        {selectedAsset && <AssetObject recipe={recipe} asset={selectedAsset} selectedPartId={selection.kind === 'asset' ? selection.partId : undefined} onSelect={(event) => setSelection(selectPartFromEvent(event, selectedAsset.id, selectedAsset.parts[0]?.id))} />}
        {isolatedSpline && <SplineEditor recipe={recipe} spline={isolatedSpline} layers={layers} />}
      </> : <>
        {layers.context && recipe.sceneInstances.map((instance) => <EditableInstance key={instance.id} recipe={recipe} instance={instance} />)}
        {layers.context && <PlacementObjects recipe={recipe} />}
        <SplineObjects recipe={recipe} layers={layers} />
        {layers.context && <RoomObjects recipe={recipe} />}
      </>}
      <SplineCreationDraft />
      {pointPlacement && <SplinePointPlacement mode={pointPlacement} onComplete={finishPointPlacement} />}
      <Grid position={[0, -0.005, 0]} args={[30, 30]} cellSize={0.5} cellThickness={0.55} cellColor="#28424a" sectionSize={2.5} sectionThickness={1} sectionColor="#40636a" fadeDistance={28} fadeStrength={1.2} infiniteGrid />
      <OrbitControls makeDefault enabled={!splineCreation.active && !pointPlacement} target={[0, 1, 0]} minDistance={2} maxDistance={28} />
      <GizmoHelper alignment="bottom-right" margin={[68, 68]}><GizmoViewport axisColors={['#d96868', '#7eba78', '#5b91d4']} labelColor="#dce7e8" /></GizmoHelper>
    </group>
  );
}

export function SceneViewport() {
  const {
    recipe, selection, splineCreation, startSplineCreation, confirmSplineCreation, cancelSplineCreation,
    gridSnap, setGridSnap, transact, setSelection,
  } = useWorkbench();
  const [layers, setLayers] = useState<ViewLayers>({ mesh: true, handles: true, guides: true, context: true });
  const [pointPlacement, setPointPlacement] = useState<PointPlacementMode>(null);
  const selectedSpline = selection.kind === 'spline' ? recipe.splineDefinitions.find((item) => item.id === selection.id) : undefined;
  const canDeletePoint = Boolean(selectedSpline && selection.kind === 'spline' && selection.pointIndex !== undefined && selectedSpline.controlPoints.length > 2);
  const deleteSelectedPoint = useCallback(() => {
    if (!selectedSpline || selection.kind !== 'spline' || selection.pointIndex === undefined || selectedSpline.controlPoints.length <= 2) return;
    const removedIndex = selection.pointIndex;
    transact((draft) => {
      const splineIndex = draft.splineDefinitions.findIndex((item) => item.id === selectedSpline.id);
      if (splineIndex >= 0) draft.splineDefinitions[splineIndex] = removeSplineControlPoint(draft.splineDefinitions[splineIndex]!, removedIndex);
    });
    setSelection({ kind: 'spline', id: selectedSpline.id, pointIndex: Math.min(removedIndex, selectedSpline.controlPoints.length - 2) });
  }, [selectedSpline, selection, setSelection, transact]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (splineCreation.active) cancelSplineCreation();
        if (pointPlacement) setPointPlacement(null);
      }
      const target = event.target as HTMLElement | null;
      if ((event.key === 'Delete' || event.key === 'Backspace') && !target?.closest('input, select, textarea') && canDeletePoint) {
        event.preventDefault();
        deleteSelectedPoint();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cancelSplineCreation, canDeletePoint, deleteSelectedPoint, pointPlacement, splineCreation.active]);
  const toggleLayer = (layer: keyof ViewLayers) => setLayers((current) => ({ ...current, [layer]: !current[layer] }));
  const cancelPlacement = () => { cancelSplineCreation(); setPointPlacement(null); };
  return (
    <div className="viewport" data-testid="viewport" onContextMenu={(event) => { if (splineCreation.active || pointPlacement) { event.preventDefault(); cancelPlacement(); } }}>
      <Canvas shadows dpr={[1, 1.7]} camera={{ position: [9, 6.6, 10], fov: 42, near: 0.05, far: 100 }} gl={{ antialias: true }} onCreated={({ gl }) => gl.setClearColor('#10191e')}>
        <Suspense fallback={null}><SceneContents layers={layers} pointPlacement={pointPlacement} finishPointPlacement={() => setPointPlacement(null)} /></Suspense>
      </Canvas>
      <div className="viewport-watermark"><span>LIVE RECIPE</span><small>engine-neutral preview</small></div>
      <div className="viewport-tools" aria-label="Spline viewport tools">
        <button data-testid="new-spline" className={splineCreation.active ? 'active' : ''} onClick={() => { setPointPlacement(null); startSplineCreation(); }}>＋ Spline</button>
        {selectedSpline && <>
          <button data-testid="append-point-viewport" className={pointPlacement === 'append' ? 'active' : ''} onClick={() => { cancelSplineCreation(); setPointPlacement(pointPlacement === 'append' ? null : 'append'); }}>＋ Point</button>
          <button data-testid="insert-point-viewport" className={pointPlacement === 'insert' ? 'active' : ''} onClick={() => { cancelSplineCreation(); setPointPlacement(pointPlacement === 'insert' ? null : 'insert'); }}>↳ Insert</button>
          <button data-testid="delete-point-viewport" disabled={!canDeletePoint} onClick={deleteSelectedPoint}>− Point</button>
        </>}
        <button data-testid="grid-snap" className={gridSnap ? 'active' : ''} onClick={() => setGridSnap(!gridSnap)}>⌗ Snap</button>
        {(['mesh', 'handles', 'guides', 'context'] as const).map((layer) => <button key={layer} className={layers[layer] ? 'active' : ''} onClick={() => toggleLayer(layer)}>{layer}</button>)}
      </div>
      {splineCreation.active && <div className="creation-strip" role="status"><span><b>CREATE SPLINE</b><small data-testid="draft-point-count">{splineCreation.points.length} control points · click ground plane</small></span><button onClick={cancelSplineCreation}>Cancel</button><button data-testid="confirm-spline" className="primary" disabled={splineCreation.points.length < 2} onClick={confirmSplineCreation}>Confirm</button></div>}
      {pointPlacement && <div className="creation-strip point-placement" role="status"><span><b>{pointPlacement === 'append' ? 'APPEND CONTROL POINT' : 'INSERT CONTROL POINT'}</b><small>Click the ground plane · Esc/right-click cancels</small></span><button onClick={() => setPointPlacement(null)}>Cancel</button></div>}
    </div>
  );
}
