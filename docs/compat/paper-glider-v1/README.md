# PaperGlider Compatibility Packet v1 — Canary Bundle

This directory is the canonical, tracked handoff bundle for the first Workbench-authored Paper Glider room archetype. It is generated and verified inside `CodexGameAssetWorkbench`; it has not yet been copied into or executed by the Paper Glider repository.

## Contract

- Contract: `paper-glider-compat-v1`
- Generator: `1.1.0`
- Paper Glider baseline: `3ad5ac1fbc6715f36f4b2d961754dfd8d7f35750`
- Recipe schema: `0.1.0`
- Recipe hash: `fnv1a-3383aa61`
- Bundle content hash: `sha256:04461554becd391625cc834460196186e32a6c08a393e34c210bd1d45503d397`
- GLB SHA-256: `sha256:e91d1a4b87c2c0a7d3c6698c320c13239b3751c03884b3a4c6b5b6853be1d019`
- Manifest file SHA-256: `sha256:b9c41a053e97d061ac4795c77d8f628e93f0a40adef6f718614e614c861e1bd5`
- Manifest schema SHA-256: `sha256:abbd570b742de3ae87904069dfd0b27f26a0e223999e1cfa760dec81a26a4e39`
- Rights file SHA-256: `sha256:481eb1980eb1728eefb84c6a5fb5bdf307185e99e7089e511e927ebf49958c9f`
- Rights identifier: `LicenseRef-PaperGlider-Project-Asset`
- Coordinate system: right-handed, `+Y` up, `-Z` forward, one unit per meter-like Paper Glider world unit
- Runtime input: GLB plus validated manifest. The Recipe remains the Workbench build-time authoring/provenance source and is not required by Paper Glider at runtime.

## Files

| File | Role |
|---|---|
| `paper-glider-canary.recipe.json` | Editable/versioned Workbench source of truth; do not copy to Paper Glider runtime |
| `paper-glider-archive-gate.glb` | Runtime visual nodes with Stable IDs in node names and glTF extras |
| `paper-glider-archive-gate.manifest.json` | Placement, axes, bounds, counts, AABB colliders, sockets, provenance, rights, fallback, URL contract, and hashes |
| `paper-glider-compat-manifest-v1.schema.json` | Draft-07 validation contract for the manifest |
| `RIGHTS.md` | Complete project-scoped text for `LicenseRef-PaperGlider-Project-Asset` |
| `canary-overview.png` | Full canary and room-scale context |
| `canary-colliders.png` | Manifest collider proxies aligned with visual nodes |
| `canary-flight-camera.png` | Workbench-hosted preview using Paper Glider's `58°` camera position and `-Z` view direction |
| `canary-reloaded.png` | Reloaded GLB state; expected to match overview state |
| `canary-mobile-portrait.png` | `390x844` emulated portrait layout/readability evidence |
| `visual-readback.json` | Machine-readable viewport, node, hash, rights, screenshot, console, and evidence-boundary readback |

## Rights boundary

Owner Decision A, recorded 2026-07-19, permits Archive Gate to be copied, modified, stored, released, and publicly delivered as part of Paper Glider, including GitHub Pages and browser delivery. It also permits Paper Glider maintenance, optimization, and collision-related derivative changes.

This resolves the former `NOASSERTION` publication gate for Paper Glider. It is not CC0, CC BY, MIT, or a general-purpose third-party asset-library license. Paper Glider's source-code license does not automatically grant unrestricted standalone reuse of this asset. `RIGHTS.md` is the complete authority; the manifest carries its LicenseRef, repository-relative path, byte count, and SHA-256.

Rights readiness and technical readiness are separate. Public integration still requires the Paper Glider loader, finite preload timeout/fallback, hash and structure checks, deterministic room selection, collision/ring clearance, recycling, browser validation, main integration, and deployment checks to pass.

## Regeneration and validation

```powershell
npm run compat:generate
npm run compat:check
npm run test:browser
```

`compat:generate` rewrites the GLB, manifest, screenshots, and visual readback from the canonical Recipe, schema, rights text, and generator. `compat:check` regenerates the manifest and GLB byte-identically, validates the manifest schema and rights reference/hash, loads the real GLB through `GLTFLoader`, resolves all visual/collider references, checks finite transforms and scale, proves Recipe Save→Reload identity, verifies the GitHub Pages subpath URL, and exercises the workspace's Windows path containing spaces.

## Hash boundary

- Paper Glider runtime should verify the pinned manifest file SHA-256 and GLB file SHA-256, then perform a small runtime structural check. Full Draft-07 schema validation belongs in Paper Glider build/test unless the project deliberately adopts a runtime validator.
- The manifest `contentHash` is a Workbench regeneration-integrity value: SHA-256 of UTF-8 `stableStringify(manifestWithoutContentHash)`. `stableStringify` recursively sorts object keys lexicographically, preserves array order, and JSON-encodes primitive values.
- That canonicalization currently comes from Workbench Core and is not a separately versioned cross-repository runtime standard. Paper Glider must not independently reimplement it as an acceptance requirement; use the pinned manifest/GLB file hashes and schema/structure checks instead.

## Integration boundary

Paper Glider owns the runtime loader, timeout, room-selection policy, cloning/recycling behavior, shadow flags, collision tuning, and ring-path clearance. Timeout, manifest fetch/validation, GLB fetch/parse, hash, or required-node failure must retain the current procedural room for the run. Asset availability must be resolved before deterministic run creation; network completion must never switch rooms mid-run.

## Evidence boundary

The screenshots prove Workbench-hosted loading and rendering under Paper Glider-equivalent axes, fog, lights, camera, desktop viewport, and emulated mobile portrait viewport. They do not prove Paper Glider runtime integration, route fairness, physical-device rendering, touch behavior, main integration, or deployment.
