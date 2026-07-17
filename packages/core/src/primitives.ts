import type { AssetDefinition, AssetPart, PrimitiveDefinition, Transform, Vec3 } from '@cgawe/schema';
import { recalculateNormals, rotateVector, transformPoint, type MeshData } from './mesh.js';

function baseMesh(id: string, materialId: string, positions: number[], indices: number[]): MeshData {
  return { id, materialId, positions, indices, normals: recalculateNormals(positions, indices) };
}

function box(id: string, materialId: string, size: Vec3): MeshData {
  const [x, y, z] = size.map((value) => value / 2) as Vec3;
  const positions = [-x,-y,-z, x,-y,-z, x,y,-z, -x,y,-z, -x,-y,z, x,-y,z, x,y,z, -x,y,z];
  const indices = [0,2,1, 0,3,2, 4,5,6, 4,6,7, 0,1,5, 0,5,4, 3,7,6, 3,6,2, 1,2,6, 1,6,5, 0,4,7, 0,7,3];
  return baseMesh(id, materialId, positions, indices);
}

function cylinder(id: string, materialId: string, radiusTop: number, radiusBottom: number, height: number, radialSegments: number): MeshData {
  const segments = Math.max(3, Math.floor(radialSegments));
  const positions: number[] = [];
  const indices: number[] = [];
  for (let ring = 0; ring < 2; ring += 1) {
    const radius = ring === 0 ? radiusBottom : radiusTop;
    const y = ring === 0 ? -height / 2 : height / 2;
    for (let i = 0; i < segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    }
  }
  const bottomCenter = positions.length / 3; positions.push(0, -height / 2, 0);
  const topCenter = positions.length / 3; positions.push(0, height / 2, 0);
  for (let i = 0; i < segments; i += 1) {
    const next = (i + 1) % segments;
    indices.push(i, next, segments + next, i, segments + next, segments + i);
    indices.push(bottomCenter, next, i, topCenter, segments + i, segments + next);
  }
  return baseMesh(id, materialId, positions, indices);
}

function plane(id: string, materialId: string, size: [number, number]): MeshData {
  const x = size[0] / 2; const z = size[1] / 2;
  return baseMesh(id, materialId, [-x,0,-z, x,0,-z, x,0,z, -x,0,z], [0,2,1, 0,3,2]);
}

function sphere(id: string, materialId: string, radius: number, widthSegments: number, heightSegments: number): MeshData {
  const width = Math.max(3, Math.floor(widthSegments));
  const height = Math.max(2, Math.floor(heightSegments));
  const positions: number[] = [];
  const indices: number[] = [];
  for (let y = 0; y <= height; y += 1) {
    const v = y / height;
    const phi = v * Math.PI;
    for (let x = 0; x <= width; x += 1) {
      const theta = (x / width) * Math.PI * 2;
      positions.push(-Math.cos(theta) * Math.sin(phi) * radius, Math.cos(phi) * radius, Math.sin(theta) * Math.sin(phi) * radius);
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const a = y * (width + 1) + x;
      const b = a + width + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return baseMesh(id, materialId, positions, indices);
}

export function createPrimitiveMesh(id: string, materialId: string, primitive: PrimitiveDefinition): MeshData {
  switch (primitive.type) {
    case 'box': return box(id, materialId, primitive.size);
    case 'cylinder': return cylinder(id, materialId, primitive.radiusTop, primitive.radiusBottom, primitive.height, primitive.radialSegments);
    case 'plane': return plane(id, materialId, primitive.size);
    case 'sphere': return sphere(id, materialId, primitive.radius, primitive.widthSegments, primitive.heightSegments);
  }
}

export function createPartMesh(part: AssetPart): MeshData {
  const mesh = createPrimitiveMesh(part.id, part.materialId, part.primitive);
  const positions: number[] = [];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const transformed = transformPoint([mesh.positions[i] ?? 0, mesh.positions[i + 1] ?? 0, mesh.positions[i + 2] ?? 0], part.transform);
    positions.push(...transformed);
  }
  const normals: number[] = [];
  for (let i = 0; i < mesh.normals.length; i += 3) {
    const transformed = rotateVector([mesh.normals[i] ?? 0, mesh.normals[i + 1] ?? 0, mesh.normals[i + 2] ?? 0], part.transform.rotation);
    const length = Math.hypot(...transformed) || 1;
    normals.push(transformed[0] / length, transformed[1] / length, transformed[2] / length);
  }
  return { ...mesh, positions, normals };
}

export function createAssetMeshes(asset: AssetDefinition): MeshData[] {
  return asset.parts.map(createPartMesh);
}

export function applyTransformToMesh(mesh: MeshData, transform: Transform): MeshData {
  const positions: number[] = [];
  const normals: number[] = [];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    positions.push(...transformPoint([mesh.positions[i] ?? 0, mesh.positions[i + 1] ?? 0, mesh.positions[i + 2] ?? 0], transform));
    const normal = rotateVector([mesh.normals[i] ?? 0, mesh.normals[i + 1] ?? 0, mesh.normals[i + 2] ?? 0], transform.rotation);
    const length = Math.hypot(...normal) || 1;
    normals.push(normal[0] / length, normal[1] / length, normal[2] / length);
  }
  return { ...mesh, positions, normals };
}
