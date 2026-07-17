import type { Transform, Vec3 } from '@cgawe/schema';

export interface MeshData {
  id: string;
  materialId: string;
  positions: number[];
  normals: number[];
  indices: number[];
}

export interface MeshStats {
  vertexCount: number;
  triangleCount: number;
  boundingBox: { min: Vec3; max: Vec3 };
}

export const vec = {
  add: (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a: Vec3, amount: number): Vec3 => [a[0] * amount, a[1] * amount, a[2] * amount],
  dot: (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a: Vec3, b: Vec3): Vec3 => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  length: (a: Vec3): number => Math.hypot(a[0], a[1], a[2]),
  normalize(a: Vec3): Vec3 {
    const length = vec.length(a);
    return length < 1e-9 ? [0, 1, 0] : vec.scale(a, 1 / length);
  },
  lerp: (a: Vec3, b: Vec3, t: number): Vec3 => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ],
};

export function rotateVector(point: Vec3, rotation: Vec3): Vec3 {
  let [x, y, z] = point;
  const [rx, ry, rz] = rotation;
  let c = Math.cos(rx); let s = Math.sin(rx);
  [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(ry); s = Math.sin(ry);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(rz); s = Math.sin(rz);
  [x, y] = [x * c - y * s, x * s + y * c];
  return [x, y, z];
}

export function transformPoint(point: Vec3, transform: Transform): Vec3 {
  const scaled: Vec3 = [point[0] * transform.scale[0], point[1] * transform.scale[1], point[2] * transform.scale[2]];
  return vec.add(rotateVector(scaled, transform.rotation), transform.position);
}

export function recalculateNormals(positions: number[], indices: number[]): number[] {
  const normals = Array<number>(positions.length).fill(0);
  for (let i = 0; i < indices.length; i += 3) {
    const ia = (indices[i] ?? 0) * 3;
    const ib = (indices[i + 1] ?? 0) * 3;
    const ic = (indices[i + 2] ?? 0) * 3;
    const a: Vec3 = [positions[ia] ?? 0, positions[ia + 1] ?? 0, positions[ia + 2] ?? 0];
    const b: Vec3 = [positions[ib] ?? 0, positions[ib + 1] ?? 0, positions[ib + 2] ?? 0];
    const c: Vec3 = [positions[ic] ?? 0, positions[ic + 1] ?? 0, positions[ic + 2] ?? 0];
    const normal = vec.cross(vec.sub(b, a), vec.sub(c, a));
    for (const offset of [ia, ib, ic]) {
      normals[offset] = (normals[offset] ?? 0) + normal[0];
      normals[offset + 1] = (normals[offset + 1] ?? 0) + normal[1];
      normals[offset + 2] = (normals[offset + 2] ?? 0) + normal[2];
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const normal = vec.normalize([normals[i] ?? 0, normals[i + 1] ?? 0, normals[i + 2] ?? 0]);
    normals[i] = normal[0]; normals[i + 1] = normal[1]; normals[i + 2] = normal[2];
  }
  return normals;
}

export function combineMeshes(id: string, materialId: string, meshes: MeshData[]): MeshData {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (const mesh of meshes) {
    const offset = positions.length / 3;
    positions.push(...mesh.positions);
    normals.push(...mesh.normals);
    indices.push(...mesh.indices.map((index) => index + offset));
  }
  return { id, materialId, positions, normals, indices };
}

export function getMeshStats(meshes: MeshData[]): MeshStats {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  let vertexCount = 0;
  let triangleCount = 0;
  for (const mesh of meshes) {
    vertexCount += mesh.positions.length / 3;
    triangleCount += mesh.indices.length / 3;
    for (let i = 0; i < mesh.positions.length; i += 3) {
      for (let axis = 0; axis < 3; axis += 1) {
        const value = mesh.positions[i + axis] ?? 0;
        min[axis] = Math.min(min[axis] ?? value, value);
        max[axis] = Math.max(max[axis] ?? value, value);
      }
    }
  }
  if (vertexCount === 0) return { vertexCount: 0, triangleCount: 0, boundingBox: { min: [0, 0, 0], max: [0, 0, 0] } };
  return { vertexCount, triangleCount, boundingBox: { min, max } };
}

export function isValidMesh(mesh: MeshData): boolean {
  const vertexCount = mesh.positions.length / 3;
  return mesh.positions.length > 0
    && mesh.positions.length % 3 === 0
    && mesh.normals.length === mesh.positions.length
    && mesh.indices.length > 0
    && mesh.indices.length % 3 === 0
    && [...mesh.positions, ...mesh.normals].every(Number.isFinite)
    && mesh.indices.every((index) => Number.isInteger(index) && index >= 0 && index < vertexCount);
}
