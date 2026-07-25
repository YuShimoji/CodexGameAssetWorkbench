import {
  BufferAttribute, BufferGeometry, Color, DoubleSide, Group, Mesh, MeshStandardMaterial,
  type Object3D,
} from 'three';
import {
  applyVariant, createPartMesh, generateSplineMesh, type MeshData,
} from '@cgawe/core';
import type { AssetDefinition, MaterialDefinition, Recipe, VariantSet } from '@cgawe/schema';

export function meshDataToBufferGeometry(mesh: MeshData): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(mesh.positions), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(mesh.normals), 3));
  geometry.setIndex(mesh.indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function materialDefinitionToThree(material: MaterialDefinition, options: { transparent?: boolean; opacity?: number; wireframe?: boolean; flatShading?: boolean } = {}): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: new Color(material.color),
    roughness: material.roughness,
    metalness: material.metalness,
    side: DoubleSide,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    wireframe: options.wireframe ?? false,
    flatShading: options.flatShading ?? false,
  });
}

function findMaterial(recipe: Recipe, id: string): MaterialDefinition {
  return recipe.materialDefinitions.find((material) => material.id === id)
    ?? { id: 'missing', name: 'Missing Material', color: '#ff2f68', roughness: 0.5, metalness: 0 };
}

export interface AssetObjectOptions {
  variant?: VariantSet;
  variantSeed?: number;
  selectedPartId?: string;
}

export function buildAssetObject(recipe: Recipe, asset: AssetDefinition, options: AssetObjectOptions = {}): Group {
  const group = new Group();
  group.name = asset.name;
  group.userData = { kind: 'asset', assetId: asset.id };
  for (const part of asset.parts) {
    const meshData = createPartMesh(part);
    const sourceMaterial = findMaterial(recipe, part.materialId);
    const materialDefinition = applyVariant(sourceMaterial, options.variant, part, options.variantSeed ?? recipe.generationSeed);
    const material = materialDefinitionToThree(materialDefinition, { flatShading: true });
    if (part.id === options.selectedPartId) {
      material.emissive = new Color('#284d66');
      material.emissiveIntensity = 0.72;
    }
    const object = new Mesh(meshDataToBufferGeometry(meshData), material);
    object.name = part.name;
    object.castShadow = true;
    object.receiveShadow = true;
    object.userData = { kind: 'part', assetId: asset.id, partId: part.id };
    group.add(object);
  }
  return group;
}

export function buildSplineObject(recipe: Recipe, splineId: string): Mesh {
  const spline = recipe.splineDefinitions.find((item) => item.id === splineId);
  if (!spline) throw new Error(`Spline ${splineId} not found.`);
  const meshData = generateSplineMesh(spline);
  const material = materialDefinitionToThree(findMaterial(recipe, spline.materialId));
  const object = new Mesh(meshDataToBufferGeometry(meshData), material);
  object.name = spline.name;
  object.castShadow = true;
  object.receiveShadow = true;
  object.userData = { kind: 'spline', splineId };
  return object;
}

export function disposeObject(object: Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material.dispose());
  });
}

export * from './runtime-bundle.js';
