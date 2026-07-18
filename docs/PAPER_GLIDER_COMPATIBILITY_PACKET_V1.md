# PaperGlider Compatibility Packet v1

## Conclusion

**READY_FOR_PAPERGLIDER_INTEGRATION** means the next Paper Glider implementation turn can begin from an actual, regenerable canary bundle and executable green fixture. It does **not** mean the asset is already integrated, playable in the Paper Glider runtime, physically device-tested, licensed for public redistribution, or deployed.

The runtime boundary is **GLB + validated compatibility manifest**. The Workbench Recipe remains the editable build-time authority and provenance record. Paper Glider does not need to parse Recipe 0.1.0 at runtime.

## Fixed baselines and scope proof

| Repository | Observed state | Role in this packet |
|---|---|---|
| CodexGameAssetWorkbench | Work began from `ff25c6d14b40c82fc21f79fd8361384417e344e7` on `codex/paper-glider-compat-v1`, derived from the pushed v0.2 continuation branch | Only repository changed |
| Paper Glider | clean `main`; HEAD/upstream `3ad5ac1fbc6715f36f4b2d961754dfd8d7f35750` | Read-only compatibility authority; no fetch, checkout, install, build, file write, commit, or push |

No `AGENTS.md` exists in either repository; the user-supplied project-local instructions and each canonical handoff were used. Paper Glider's existing preview process on port 4173 was deliberately left running and untouched.

## Live code findings

### Workbench v0.2

- Recipe schema `0.1.0` provides Stable IDs, material/asset definitions, scene transforms, deterministic seeds, editable Spline control points/keyframes, Room volumes, Sockets, and Placement rules.
- `packages/core` creates engine-neutral MeshData and deterministic Recipe hashes. `packages/adapter-three` converts MeshData to Three geometry/materials without moving Recipe authority into Object3D state.
- Existing UI export in `apps/workbench/src/App.tsx` exports one selected Asset Definition and a small manifest. It does not bundle Spline/Room/Socket/collider metadata and is insufficient by itself for a Paper Glider room archetype.
- Packet v1 therefore adds a separate deterministic compatibility generator. It does not change Recipe schema 0.1.0 or claim the generic UI export now handles game room bundles.
- Exported GLB nodes use Stable IDs as names and retain `kind`, IDs, labels, and material IDs in glTF extras. Collider metadata remains in the sidecar manifest rather than being disguised as render meshes.

### Paper Glider `3ad5ac1`

- The runtime is Three.js `0.180.0`; Workbench exports standard glTF 2.0 with Three `0.178.0`. The real canary loads through the Workbench fixture's `GLTFLoader` without warnings.
- `src/main.ts` constructs `PaperGliderGame` synchronously. There is no GLB loader, asset registry, or fallback-loading contract today.
- `vite.config.ts` fixes `base: '/paper-glider/'` and publishes committed `docs/`. Root-absolute `/assets/...` URLs would be wrong on GitHub Pages; runtime URLs must be based on `import.meta.env.BASE_URL`.
- `PaperGliderGame.ts` uses a right-handed Three scene, `+Y` up, camera facing `-Z`, `58°` desktop FOV / `66°` mobile FOV, ACES tone mapping, sRGB output, fog `24..132`, and cast/receive shadows.
- `CorridorWorld.ts` owns nine recycled room groups. Each room is length `18`, moves toward `+Z`, and is replaced after its group passes `z=13`.
- Collision is gameplay-owned AABB data: an Object3D anchor plus half extents. Render geometry is not queried for collision.
- `RingPath.ts` plans deterministic, obstacle-aware rings from run seed, sequence, speed, and known pure obstacle volumes. A loaded room cannot bypass this planning boundary.
- Run selection must remain coordinate-addressed through `randomUnit(seed, ...coordinates)`; asynchronous load completion or `Math.random()` cannot select the canary room.

## Canary: Archive Gate

The canary is a low-poly gate archetype sized for one Paper Glider room segment. Two piers and a top beam form gameplay collision surfaces; plinths and beacons improve silhouette; a directly edited Catmull-Rom rod Spline forms the gold route arch and proves the v0.2 Spline export path.

| Metric | Value |
|---|---|
| Recipe hash | `fnv1a-3383aa61` |
| Content hash | `sha256:f866eacf62263b24d5a102d9460a95d9ab3bc0a803c8159078b17bdc4fb3810b` |
| GLB SHA-256 | `sha256:e91d1a4b87c2c0a7d3c6698c320c13239b3751c03884b3a4c6b5b6853be1d019` |
| GLB size | 30,172 bytes |
| Visual / mesh nodes | 8 / 8 |
| Vertices / triangles | 594 / 1,064 |
| Exported material slots / logical definitions | 8 / 4 |
| Collider AABBs | 3 |
| Bounds before placement | `[-4.45, 0, -0.9]` to `[4.45, 5.226928, 1.1]` |
| Room contract | width 11.2, height 6.8, length 18, Paper floor placement Y `-0.52` |
| Axes | right-handed, `+Y` up, `-Z` forward, scale 1 |

Canonical files and visual evidence are in `docs/compat/paper-glider-v1/`; its README is the bundle-local entrypoint.

## Compatibility matrix

| Item | Workbench v0.2 current state | Paper Glider `3ad5ac1` expectation | Result | Required adapter | Owner | Next concrete work | Gate |
|---|---|---|---|---|---|---|---|
| Recipe schema | Versioned Recipe 0.1.0; validated and deterministic | No Recipe parser or authoring concern | Compatible at build time | Do not ship/parse Recipe at runtime | Workbench | Keep Recipe with bundle provenance; generate GLB + manifest before copy | Non-blocking |
| GLB loading | Deterministic glTF 2.0 binary; fixture loads real file | Three runtime but no GLTFLoader path | Conversion required | Preload manifest and GLB before run creation; fail closed to procedural room | Paper Glider | Add a small `WorkbenchRoomAssetLoader` | Blocking for integration |
| Visual node identity | Stable part/spline IDs are node names and glTF extras | Needs resolvable nodes for inspection/shadows/collider mapping | Compatible | Require all manifest node IDs after load | Paper Glider | Traverse scene and validate required IDs | Blocking for integration |
| Axes and handedness | right-handed, +Y up, -Z forward | Same Three defaults; rooms approach camera by group +Z motion | Compatible | No axis conversion | None | Apply manifest transform exactly | Non-blocking |
| Unit, pivot, placement | one unit, floor-center pivot; placement Y -0.52 | Paper room floor top is approximately -0.52 | Compatible with transform | Apply position/rotation/scale from manifest | Paper Glider | Add canary clone under selected room group | Blocking for integration |
| Materials | Solid MeshStandard colors, no textures/alpha, double-sided | ACES/sRGB/fog/lit scene; mixed Standard/Basic materials | Compatible | Traverse loaded meshes and set cast/receiveShadow | Paper Glider | Reuse loaded geometry/materials across recycled clones | Non-blocking |
| Collider ownership | Three AABB records in dedicated manifest; refs resolve to visuals | `WorldCollider` anchor + half Vector3; gameplay collision is not mesh-based | Conversion required | Create anchors at manifest centers and copy half extents | Paper Glider | Register collider records on each cloned room segment | Blocking for integration |
| Ring clearance | Canary collision volumes are machine-readable | Planner only knows current procedural obstacle families | Conversion required | Feed canary pure AABBs into ring planning before route choice | Paper Glider | Extend planner input without changing flight tuning/seed semantics | Blocking for playable room |
| Room recycling | Root is cloneable, static, 30 KB, no textures | Nine groups are removed/replaced; geometry should be reused | Compatible with adapter | Cache one loaded scene; clone groups; dispose only at library shutdown | Paper Glider | Choose archetype by deterministic sequence/seed | Blocking for integration |
| Seeded variant selection | Canary visual variant is baked by Workbench generation seed | Runtime room routes use 32-bit run seed and coordinate-addressed random | Compatible with rule | Select among versioned bundle manifests using existing `randomUnit`; never load-timing | Paper Glider | Add deterministic asset-room selection test | Blocking for replay integrity |
| GitHub Pages URL | Manifest declares relative asset path and `/paper-glider/` base | Vite base is `/paper-glider/`, deployed from `main/docs` | Compatible with helper | Resolve from `import.meta.env.BASE_URL`, not site root | Paper Glider | Copy approved bundle under source/public assets and verify built URL | Blocking for deployment |
| Failure fallback | Manifest requires current procedural room on fetch/schema/hash/node failure | Current procedural room path is already playable | Compatible | Catch preload failure, record local diagnostic, retain current room | Paper Glider | Add failed-fetch/hash test with console error policy | Blocking for safe integration |
| Public asset license | Provenance has no third-party files; license is `NOASSERTION` | Public GitHub Pages redistributes copied GLB/manifest | Owner decision required | No technical adapter | Repository owner | Confirm and record intended asset license before public deploy | Blocking for public redistribution only |

## Minimal Paper Glider adapter blueprint

1. Add a manifest type/validator and `WorkbenchRoomAssetLoader` owned by Paper Glider. Resolve manifest/GLB URLs from `import.meta.env.BASE_URL`.
2. Preload once before constructing the deterministic run world. On any failure, pass `null` and use the existing procedural rooms; do not let network completion switch rooms mid-run.
3. Validate contract version, full Paper baseline expectation, file hash, required node IDs, finite transforms, scale, colliders, and visual references before accepting the asset.
4. Cache the loaded root and share geometry/materials. Clone the root per selected room sequence, apply manifest placement, and enable shadows on loaded meshes.
5. Convert each manifest AABB to a room-local Object3D anchor and `Vector3` half extent. Keep collision tuning and player clearance in Paper Glider.
6. Extend pure room planning so the same canary AABBs are considered before ring coordinates are finalized. Do not infer colliders from render bounds.
7. Select the room only from run seed + room sequence. Preserve current ring, flight, score, visibility, and Pages contracts.
8. Add unit, loader failure, deterministic selection/replay, collision, recycling, desktop/mobile E2E, visual, production preview, and Pages-subpath tests before publication.

## Automated evidence

| Command / check | Result |
|---|---|
| `npm ci` / `npm ls --depth=0` | serialized clean install; dependency tree valid; audit 0 |
| `npm run compat:generate` | GLB/manifest and five visual states regenerated |
| `npm run compat:check` | schema, byte-identical GLB regeneration, GLTFLoader, nodes, transforms, scale, colliders, Recipe reload, hashes, URL, Windows spaces all green |
| Vitest compatibility fixture | real verifier executed from the space-containing workspace path; green |
| Visual smoke | actual GLB loaded; overview/collider/flight/reload/mobile states; console errors 0 |

Final full `npm run verify`, exact final test counts, commit IDs, parity, and staged/secret audit are recorded in `docs/PROJECT_HANDOFF.md` after closeout.

## Visual inspection

- Overview: full gate, plinths, beacons, and direct-edit Spline are visible at room scale; no blank canvas or camera escape.
- Colliders: three red AABBs align with the two piers and top beam; the Spline remains visual-only as declared.
- Flight camera: gate silhouette is readable from Paper Glider's desktop camera position/FOV and leaves a clear central passage.
- Reload: required nodes, Recipe hash, and content hash match after GLB reload; the reloaded rendered state was inspected separately.
- Mobile portrait: the gate remains legible at `390x844`; the compact evidence panel does not hide the passage.

These are Workbench-hosted render checks. They do not prove Paper Glider gameplay collision, route fairness, runtime fallback, public deployment, physical touch, or physical-device performance.

## Remaining owner gate

The technical packet is ready. Before Paper Glider publishes the copied asset, the repository owner must replace `NOASSERTION` with the intended asset license or otherwise record explicit redistribution authorization. The next integration turn may proceed locally while keeping public deployment gated.
