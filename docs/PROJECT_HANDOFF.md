# CodexGameAssetWorkbench project handoff

この文書は、別端末のAgentまたは開発者が外部添付や過去のCodex taskなしで現在地点から再開するための正本です。2026-07-18時点の結論は **READY_FOR_PAPERGLIDER_INTEGRATION** です。これは実物のcanary bundle、再生成経路、実行可能fixture、Paper Glider側adapter設計が揃ったことを意味します。Paper Glider runtimeへの統合済み、公開可能、実機受入済みを意味しません。

## Gitとauthority

| 項目 | 確定状態 |
|---|---|
| GitHub | `https://github.com/YuShimoji/CodexGameAssetWorkbench`（public） |
| main | v0.1基準。今回mergeしていない |
| v0.2 continuation | `codex/spline-direct-edit-v0-2`、Windows closeout `ff25c6d`までpush済み |
| 現在のfocused branch | `codex/paper-glider-compat-v1` |
| packet実装commit | `c981865` — contract/schema/generator/fixture/canary Recipe・GLB・manifest |
| packet証跡commit | `ed6922f` — visual fixture/5 screenshots/matrix/次Prompt |
| upstream | `origin/codex/paper-glider-compat-v1` |
| Recipe schema | `0.1.0`。packetのための汎用schema変更なし |
| PR / merge / tag | 未作成 |

この作業の開始時は`codex/spline-direct-edit-v0-2`、HEAD/upstream `403b028c67d4eaff847df5f086f53bbedb448d64`、parity `0/0`でした。既知の未commit変更はWindows空白入りpath testとこのhandoffの2件でした。`.gitattributes`のbinary/LF契約と空きportを使うbrowser smokeも含めて`npm run verify`を通し、`ff25c6d fix: harden Windows verification paths`として同branchへpushしました。そこからfocused branchを作成しています。

Paper Gliderは`C:\Users\thank\Storage\Game Projects\paper-glider`をread-only参照しました。確認時から終了監査までbranch `main`、HEAD/upstream `3ad5ac1fbc6715f36f4b2d961754dfd8d7f35750`、parity `0/0`、cleanです。fetch、checkout、branch、install、build、formatter、file write、commit、pushは一切実行していません。4173番で既に動いていたPaper Glider preview processも停止・変更していません。

## Packet v1の結論

runtime境界は **GLB + schema-validated compatibility manifest** です。Recipe 0.1.0はWorkbenchの編集・provenance・再生成正本として保持し、Paper Glider runtimeは読みません。Paper Glider固有のroom placement、AABB collision、fallback、Pages URL契約は専用manifestへ分離し、汎用Recipe schemaへ混ぜていません。

Paper Glider `3ad5ac1`との実コード比較で確定したadapter ownershipは次の通りです。

- Workbench: Recipe編集、Spline/direct-edit生成、決定論的GLB/manifest生成、schema/hash/node/collider validation。
- Paper Glider: `import.meta.env.BASE_URL`を使うpreload loader、room clone/recycle、shadow flags、manifest AABBから`WorldCollider`への変換、ring plannerへの同AABB入力、run seed/room sequenceだけを使うvariant選択、procedural fallback。
- Repository owner: `NOASSERTION`となっているasset licenseをpublic redistribution前に明示する。

Paper Gliderの現行worldは11.2 x 6.8 x 18のroomを9件recycleし、Three右手系、`+Y` up、cameraは`-Z`方向、床面topは約Y `-0.52`です。collisionはrender meshではなくanchor + half extentsのAABBで、ring pathはrun seed/sequence/speedと既知obstacleから決定論的に計画されます。現在GLTFLoader経路はないため、実統合時はrun生成前にload結果を確定し、network timingによるmid-run切替を禁止します。

## Canary bundle: Archive Gate

canonical entrypointは`docs/compat/paper-glider-v1/README.md`です。二本のpier、top beam、plinth、beacon、v0.2のdirect-edit Catmull-Rom rod Spline archを含む低poly room archetypeで、中央を通過できる輪郭と3つの明示AABBを持ちます。

| Metric | Value |
|---|---|
| Contract | `paper-glider-compat-v1` |
| Recipe hash | `fnv1a-3383aa61` |
| Content hash | `sha256:f866eacf62263b24d5a102d9460a95d9ab3bc0a803c8159078b17bdc4fb3810b` |
| GLB SHA-256 | `sha256:e91d1a4b87c2c0a7d3c6698c320c13239b3751c03884b3a4c6b5b6853be1d019` |
| GLB size | 30,172 bytes |
| Visual / mesh nodes | 8 / 8 |
| Vertices / triangles | 594 / 1,064 |
| GLB material slots / logical definitions | 8 / 4 |
| Collider AABBs | 3 |
| Axes / scale | right-handed、`+Y` up、`-Z` forward、scale 1 |
| Placement | room-local position `[0, -0.52, 0]`、rotation `[0,0,0]`、scale `[1,1,1]` |

Tracked bundle files:

| File | Bytes | SHA-256 / role |
|---|---:|---|
| `paper-glider-canary.recipe.json` | 4,841 | `a757b3421d46aadc7b5d2b34cdd3adfbed72efb6cfae131ec9ed5833373e1486`、authoring正本 |
| `paper-glider-archive-gate.glb` | 30,172 | `e91d1a4b87c2c0a7d3c6698c320c13239b3751c03884b3a4c6b5b6853be1d019`、runtime visual |
| `paper-glider-archive-gate.manifest.json` | 6,717 | `2df0a9c0b021857833636311560961f718d9ecf0671b48d7209d2f09cbdeded9`、runtime contract |
| `paper-glider-compat-manifest-v1.schema.json` | 8,634 | `775708ca3a25189ec938192509ff9a545a88ef9f6415498bbfdf03f768f7d17c`、manifest schema |
| `canary-overview.png` | 99,314 | canary全体とroom scale |
| `canary-colliders.png` | 115,470 | 3 AABBとvisual alignment |
| `canary-flight-camera.png` | 84,012 | desktop Paper flight camera相当 |
| `canary-reloaded.png` | 99,314 | overviewと同じimage hash、reload state一致 |
| `canary-mobile-portrait.png` | 47,280 | 390 x 844 portrait |
| `visual-readback.json` | 5,407 | viewport/node/hash/reload/consoleのmachine readback |
| `README.md` | 3,704 | bundle-local handoff |

画像別hashは`visual-readback.json`に記録されています。Workbench-hosted previewであり、Paper Glider gameplay、physical device、public deploymentの証拠ではありません。

## Executable compatibility fixture

- `scripts/generate-paper-glider-compat.mjs`: Recipeからcanonical GLB/manifestを決定論的に生成する。
- `scripts/verify-paper-glider-compat.mjs`: AJV schema、real GLB header/GLTFLoader、required nodes、finite transforms、scale、collider refs、Recipe Save→Reload、byte-identical regeneration、content/file hash、Windows空白path、Pages URLを検証する。
- `packages/cli/test/paper-glider-compat.test.ts`: 上のverifierをVitestから実pathで実行するintegration test。
- `apps/workbench/compat.html` / `src/compatPreview.ts`: 実GLBとmanifestをPaper相当のcamera/light/fog/roomで表示する小さなfixture。
- `scripts/paper-glider-compat-smoke.mjs`: 空きloopback portでfixtureを起動し、overview/collider/flight/reload/mobileを撮影してconsole error 0を要求する。

Commands:

```powershell
npm ci
npm ls --depth=0
npm run compat:generate
npm run compat:check
npm run verify
```

Node `v24.13.0`、npm `11.6.2`で最終clean installは276 packages、audit 0 vulnerabilities、`npm ls --depth=0`はvalidです。最終`npm run verify`はSchema同期、production build、typecheck、lint、6 test files / 21 tests、compat verifier、既存Workbench Playwright 7状態、compat Playwright 5状態、console errors 0、validation errors 0、validation warnings 0、`git diff --check`を含めて成功しました。Viteの既知の約1.36 MB chunk warningはありますがbuild failureではなく、packet固有の新規warningではありません。

## Context map

| Path | Authority |
|---|---|
| `README.md` | 起動、package境界、v0.2操作、packet commands |
| `docs/PAPER_GLIDER_COMPATIBILITY_PACKET_V1.md` | 実コード調査、compatibility matrix、owner/adapter/gate |
| `docs/compat/paper-glider-v1/README.md` | bundle contract、全canonical files、再生成、evidence boundary |
| `docs/NEXT_AGENT_PROMPT.md` | 確定asset contractを使うPaper Glider側の単独実行可能な次Prompt |
| `docs/ARCHITECTURE.md` | Recipe transaction、Core/Three境界、GLB派生物 |
| `docs/RECIPE_SCHEMA.md` | Schema 0.1.0、Stable ID、互換性、golden fixture |
| `artifacts/v0.2/` | v0.2 editorの選別済みVisual Proof |

## 残作業

| Purpose | Effect | Requirements | State | Owner | Next move |
|---|---|---|---|---|---|
| Archive GateをPaper runtimeへ統合 | 最初のWorkbench-authored playable roomを得る | Packet hashを照合し、GLB+manifestをpreload、clone/recycle、AABB collision、ring clearance、deterministic selection、fallbackを実装 | 未着手。packetはREADY | Paper Glider | `docs/NEXT_AGENT_PROMPT.md`をPaper repositoryで実行 |
| Asset licenseを明示 | GitHub Pagesからbundleを安全に再配布できる | ownerの明示的license/authorization | `NOASSERTION` | Repository owner | public deployment前にmanifest/provenanceとPaper側asset noticeを更新 |
| Paper gameplay受入 | collision fairness、ring passage、mobile performanceを確定 | 実統合後のdesktop/mobile playtest、可能ならphysical device | 未確認 | Paper Glider / owner | integration branchで自動・visual・human feelを分離して検証 |
| v0.2/main昇格判断 | clone直後に最新Workbenchへ到達可能にする | owner reviewと明示的merge/tag判断 | 未判断 | Repository owner | `codex/spline-direct-edit-v0-2`とpacket branchをreview。今回merge/tagしない |

## 再開

```powershell
git clone https://github.com/YuShimoji/CodexGameAssetWorkbench.git
Set-Location CodexGameAssetWorkbench
git switch codex/paper-glider-compat-v1
npm ci
npx playwright install chromium
npm run verify
```

commit前にrepository-local author `YuShimoji <160492991+YuShimoji@users.noreply.github.com>`、remote、staged scopeを確認します。Windowsではnpm操作を直列化し、他repositoryのprocessやproject外Tempへ退避された`node_modules`を削除・回収・変更しません。次の作業でPaper Gliderへ移る場合、Workbenchはread-onlyに切り替え、`docs/NEXT_AGENT_PROMPT.md`の境界を守ってください。
