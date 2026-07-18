# PaperGlider Compatibility Packet v1 — Canary Bundle

This directory is the canonical, tracked handoff bundle for the first Workbench-authored Paper Glider room archetype. The bundle is generated and verified inside `CodexGameAssetWorkbench`; it has not been copied into or executed by the Paper Glider repository.

## Contract

- Contract: `paper-glider-compat-v1`
- Paper Glider baseline: `3ad5ac1fbc6715f36f4b2d961754dfd8d7f35750`
- Recipe schema: `0.1.0`
- Recipe hash: `fnv1a-3383aa61`
- Bundle content hash: `sha256:f866eacf62263b24d5a102d9460a95d9ab3bc0a803c8159078b17bdc4fb3810b`
- GLB hash: `sha256:e91d1a4b87c2c0a7d3c6698c320c13239b3751c03884b3a4c6b5b6853be1d019`
- Coordinate system: right-handed, `+Y` up, `-Z` forward, one unit per meter-like Paper Glider world unit
- Runtime input: GLB plus validated manifest. The Recipe remains the build-time authoring/provenance source and is not required by Paper Glider at runtime.

## Files

| File | Role |
|---|---|
| `paper-glider-canary.recipe.json` | Editable/versioned Workbench source of truth |
| `paper-glider-archive-gate.glb` | Runtime visual nodes with Stable IDs in node names and glTF extras |
| `paper-glider-archive-gate.manifest.json` | Placement, axes, bounds, counts, AABB colliders, sockets, provenance, fallback, URL contract, and hashes |
| `paper-glider-compat-manifest-v1.schema.json` | Draft-07 validation contract for the manifest |
| `canary-overview.png` | Full canary and room-scale context |
| `canary-colliders.png` | Manifest collider proxies aligned with visual nodes |
| `canary-flight-camera.png` | Workbench-hosted preview using Paper Glider's `58°` camera position and `-Z` view direction |
| `canary-reloaded.png` | Reloaded GLB state; expected to match overview state |
| `canary-mobile-portrait.png` | `390x844` emulated portrait layout/readability evidence |
| `visual-readback.json` | Machine-readable viewport, node, hash, screenshot, console, and evidence-boundary readback |

## Regeneration and validation

```powershell
npm run compat:generate
npm run compat:check
npm run test:browser
```

`compat:generate` rewrites the GLB, manifest, screenshots, and visual readback from the canonical Recipe and compatibility code. `compat:check` regenerates the GLB in memory and requires byte-identical output, validates the manifest schema, loads the real GLB through `GLTFLoader`, resolves all visual/collider references, checks finite transforms and scale, proves Recipe Save→Reload identity, verifies the GitHub Pages subpath URL, and exercises the workspace's Windows path containing spaces.

## Integration boundary

Paper Glider must own the runtime loader, room-selection policy, cloning/recycling behavior, shadow flags, collision tuning, and ring-path clearance. If manifest fetch/validation, GLB fetch/parse, hash, or required-node checks fail, it must retain the current procedural room for that segment. Asset availability must be resolved before a deterministic run begins; network timing must not choose room variants.

The geometry and metadata were generated from repository-owned Recipe data and contain no copied Paper Glider code or third-party asset files. The repository has no explicit asset license, so the manifest uses `NOASSERTION`; the owner must confirm the intended license before public redistribution from Paper Glider.

## Evidence boundary

The screenshots prove Workbench-hosted loading and rendering under Paper Glider-equivalent axes, fog, lights, camera, desktop viewport, and emulated mobile portrait viewport. They do not prove Paper Glider runtime integration, route fairness with this collider set, physical-device rendering, touch behavior, or public deployment.
