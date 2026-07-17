import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { GizmoHelper, GizmoViewport, Grid, OrbitControls, TransformControls } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Color, Group, MeshStandardMaterial, type Object3D } from 'three';
import { buildAssetObject, buildSplineObject, disposeObject } from '@cgawe/adapter-three';
import { generateAllPlacements } from '@cgawe/core';
import type { AssetDefinition, Recipe, SceneInstance, Transform } from '@cgawe/schema';
import { useWorkbench } from './store';

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

function SplineObjects({ recipe }: { recipe: Recipe }) {
  const { selection, setSelection } = useWorkbench();
  return recipe.splineDefinitions.map((spline) => <SplineObject key={`${spline.id}:${spline.sweepType}:${spline.seed}`} recipe={recipe} splineId={spline.id} selected={selection.kind === 'spline' && selection.id === spline.id} onSelect={() => setSelection({ kind: 'spline', id: spline.id })} />);
}

function SplineObject({ recipe, splineId, selected, onSelect }: { recipe: Recipe; splineId: string; selected: boolean; onSelect(): void }) {
  const object = useMemo(() => buildSplineObject(recipe, splineId), [recipe, splineId]);
  useEffect(() => () => disposeObject(object), [object]);
  const material = object.material as MeshStandardMaterial;
  material.emissive = new Color(selected ? '#1d5b66' : '#000000');
  material.emissiveIntensity = selected ? 0.6 : 0;
  return <primitive object={object} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(); }} />;
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
        <mesh>
          <octahedronGeometry args={[0.24, 0]} />
          <meshStandardMaterial color={selection.kind === 'socket' && selection.id === socket.id ? '#ffe08a' : '#f6a84f'} emissive="#6d3513" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.11, 0.5, 8]} />
          <meshStandardMaterial color="#f6a84f" />
        </mesh>
      </group>
    ))}
  </>;
}

function SceneContents() {
  const { recipe, selection, viewMode, renderEpoch, setSelection } = useWorkbench();
  const selectedAsset = selection.kind === 'asset' ? recipe.assetDefinitions.find((asset) => asset.id === selection.id) : undefined;
  const isolatedSpline = selection.kind === 'spline' ? recipe.splineDefinitions.find((spline) => spline.id === selection.id) : undefined;
  return (
    <group key={renderEpoch} onPointerMissed={() => undefined}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[6, 11, 7]} intensity={2.3} castShadow shadow-mapSize={[1024, 1024]} shadow-normalBias={0.035} />
      <directionalLight position={[-7, 4, -3]} intensity={0.8} color="#8fc9d4" />
      {viewMode === 'asset' ? <>
        {selectedAsset && <AssetObject
            recipe={recipe}
            asset={selectedAsset}
            selectedPartId={selection.kind === 'asset' ? selection.partId : undefined}
            onSelect={(event) => setSelection(selectPartFromEvent(event, selectedAsset.id, selectedAsset.parts[0]?.id))}
          />}
        {isolatedSpline && <SplineObject recipe={recipe} splineId={isolatedSpline.id} selected onSelect={() => setSelection({ kind: 'spline', id: isolatedSpline.id })} />}
      </> : (
        <>
          {recipe.sceneInstances.map((instance) => <EditableInstance key={instance.id} recipe={recipe} instance={instance} />)}
          <PlacementObjects recipe={recipe} />
          <SplineObjects recipe={recipe} />
          <RoomObjects recipe={recipe} />
        </>
      )}
      <Grid position={[0, -0.005, 0]} args={[30, 30]} cellSize={0.5} cellThickness={0.55} cellColor="#28424a" sectionSize={2.5} sectionThickness={1} sectionColor="#40636a" fadeDistance={28} fadeStrength={1.2} infiniteGrid />
      <OrbitControls makeDefault target={[0, 1, 0]} minDistance={2} maxDistance={28} />
      <GizmoHelper alignment="bottom-right" margin={[68, 68]}><GizmoViewport axisColors={['#d96868', '#7eba78', '#5b91d4']} labelColor="#dce7e8" /></GizmoHelper>
    </group>
  );
}

export function SceneViewport() {
  return (
    <div className="viewport" data-testid="viewport">
      <Canvas shadows dpr={[1, 1.7]} camera={{ position: [9, 6.6, 10], fov: 42, near: 0.05, far: 100 }} gl={{ antialias: true }} onCreated={({ gl }) => gl.setClearColor('#10191e')}>
        <Suspense fallback={null}><SceneContents /></Suspense>
      </Canvas>
      <div className="viewport-watermark"><span>LIVE RECIPE</span><small>engine-neutral preview</small></div>
    </div>
  );
}
