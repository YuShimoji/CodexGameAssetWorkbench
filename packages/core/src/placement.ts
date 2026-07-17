import type { PlacementRule, Recipe, Transform, Vec3 } from '@cgawe/schema';
import { vec } from './mesh.js';
import { SeededRng } from './rng.js';
import { sampleSpline } from './spline.js';

export interface GeneratedPlacement {
  id: string;
  ruleId: string;
  assetId: string;
  transform: Transform;
  variantSetId?: string;
  variantSeed: number;
}

function countFor(rule: PlacementRule): number {
  if (rule.count && rule.count > 0) return Math.floor(rule.count);
  return rule.spacing && rule.spacing > 0 ? Math.max(1, Math.floor(10 / rule.spacing) + 1) : 1;
}

function jitteredTransform(base: Vec3, yaw: number, rule: PlacementRule, rng: SeededRng): Transform {
  const scale: Vec3 = [0, 1, 2].map((axis) => Math.max(0.05, 1 + rng.centered(rule.jitter.scale[axis] ?? 0))) as Vec3;
  return {
    position: [0, 1, 2].map((axis) => (base[axis] ?? 0) + rng.centered(rule.jitter.position[axis] ?? 0)) as Vec3,
    rotation: [rng.centered(rule.jitter.rotation[0]), yaw + rng.centered(rule.jitter.rotation[1]), rng.centered(rule.jitter.rotation[2])],
    scale,
  };
}

export function generatePlacements(recipe: Recipe, rule: PlacementRule): GeneratedPlacement[] {
  const count = countFor(rule);
  const rng = new SeededRng(`${recipe.generationSeed}:${rule.seed}:${rule.id}`);
  const placements: GeneratedPlacement[] = [];
  const spline = rule.splineId ? recipe.splineDefinitions.find((item) => item.id === rule.splineId) : undefined;
  const frames = spline ? sampleSpline(spline) : [];
  for (let index = 0; index < count; index += 1) {
    let position: Vec3;
    let yaw = 0;
    if (rule.type === 'grid') {
      const columns = Math.max(1, rule.columns ?? Math.ceil(Math.sqrt(count)));
      const spacing = rule.spacing ?? 1;
      position = vec.add(rule.origin, [(index % columns) * spacing, 0, Math.floor(index / columns) * spacing]);
    } else if (rule.type === 'spline' && frames.length > 0) {
      const frame = frames[Math.round((index / Math.max(1, count - 1)) * (frames.length - 1))] ?? frames[0];
      position = vec.add(frame?.position ?? rule.origin, rule.origin);
      yaw = Math.atan2(frame?.tangent[0] ?? 0, frame?.tangent[2] ?? 1);
    } else {
      const spacing = rule.spacing ?? 1;
      position = vec.add(rule.origin, vec.scale(vec.normalize(rule.direction), index * spacing));
    }
    const generated: GeneratedPlacement = {
      id: `${rule.id}:${index}`,
      ruleId: rule.id,
      assetId: rule.assetId,
      transform: jitteredTransform(position, yaw, rule, rng),
      variantSeed: Math.floor(rng.next() * 0x7fffffff),
    };
    if (rule.variantSetId) generated.variantSetId = rule.variantSetId;
    placements.push(generated);
  }
  return placements;
}

export function generateAllPlacements(recipe: Recipe): GeneratedPlacement[] {
  return recipe.placementRules.flatMap((rule) => generatePlacements(recipe, rule));
}
