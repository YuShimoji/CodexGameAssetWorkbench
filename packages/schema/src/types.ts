export type Vec3 = [number, number, number];

export interface Transform {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

export type PrimitiveDefinition =
  | { type: 'box'; size: Vec3 }
  | { type: 'cylinder'; radiusTop: number; radiusBottom: number; height: number; radialSegments: number }
  | { type: 'plane'; size: [number, number] }
  | { type: 'sphere'; radius: number; widthSegments: number; heightSegments: number };

export interface AssetPart {
  id: string;
  name: string;
  primitive: PrimitiveDefinition;
  materialId: string;
  transform: Transform;
}

export interface AssetDefinition {
  id: string;
  name: string;
  parts: AssetPart[];
}

export interface MaterialDefinition {
  id: string;
  name: string;
  color: string;
  roughness: number;
  metalness: number;
}

export interface MaterialParameterOverride {
  color?: string;
  roughness?: number;
  metalness?: number;
}

export interface VariantRange {
  min: number;
  max: number;
}

export interface VariantSet {
  id: string;
  name: string;
  assetId: string;
  partIds: string[];
  hue?: VariantRange;
  saturation?: VariantRange;
  brightness?: VariantRange;
  materialOverride?: MaterialParameterOverride;
  seed: number;
}

export interface PartOverride {
  materialId?: string;
  transform?: Partial<Transform>;
}

export interface SceneInstance {
  id: string;
  name: string;
  assetId: string;
  transform: Transform;
  variantSetId?: string;
  partOverrides?: Record<string, PartOverride>;
}

export interface DimensionKeyframe {
  t: number;
  value: number;
}

export interface ResolutionPolicy {
  minSegments: number;
  maxSegments: number;
  segmentsPerUnit: number;
  curvatureWeight: number;
  dimensionChangeWeight: number;
}

export interface SplineDefinition {
  id: string;
  name: string;
  controlPoints: Vec3[];
  closed: boolean;
  interpolation: 'linear' | 'catmull-rom';
  sweepType: 'rod' | 'road' | 'corridor';
  radiusKeyframes: DimensionKeyframe[];
  widthKeyframes: DimensionKeyframe[];
  heightKeyframes: DimensionKeyframe[];
  resolutionPolicy: ResolutionPolicy;
  materialId: string;
  seed: number;
}

export interface RoomDefinition {
  id: string;
  name: string;
  position: Vec3;
  width: number;
  height: number;
  depth: number;
  floorY: number;
  materialId: string;
}

export interface SocketDefinition {
  id: string;
  name: string;
  roomId: string;
  type: string;
  position: Vec3;
  orientation: Vec3;
  compatibleTags: string[];
}

export interface JitterDefinition {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

export interface PlacementRule {
  id: string;
  name: string;
  type: 'linear' | 'grid' | 'spline';
  assetId: string;
  splineId?: string;
  count?: number;
  spacing?: number;
  columns?: number;
  origin: Vec3;
  direction: Vec3;
  jitter: JitterDefinition;
  variantSetId?: string;
  seed: number;
}

export interface Recipe {
  schemaVersion: '0.1.0';
  projectId: string;
  generationSeed: number;
  materialDefinitions: MaterialDefinition[];
  assetDefinitions: AssetDefinition[];
  variantSets: VariantSet[];
  sceneInstances: SceneInstance[];
  splineDefinitions: SplineDefinition[];
  roomDefinitions: RoomDefinition[];
  socketDefinitions: SocketDefinition[];
  placementRules: PlacementRule[];
  extensions?: {
    lodPolicies?: unknown[];
    morphDefinitions?: unknown[];
    destructionDefinitions?: unknown[];
    environmentDefinitions?: unknown[];
    spawnerDefinitions?: unknown[];
  };
}

export interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  assetId: string | null;
  recipePath: string;
  message: string;
}

export interface RecipeInspection {
  projectId: string;
  schemaVersion: string;
  seed: number;
  assetCount: number;
  partCount: number;
  materialCount: number;
  splineCount: number;
  roomCount: number;
  socketCount: number;
  instanceCount: number;
  placementRuleCount: number;
}
