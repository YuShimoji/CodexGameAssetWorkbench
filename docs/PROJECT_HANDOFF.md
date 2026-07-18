# CodexGameAssetWorkbench project handoff

この文書は、別端末のAgentまたは開発者が外部添付や過去のCodex taskなしで現在地点から再開する正本です。2026-07-19時点の判定は **READY_FOR_PAPERGLIDER_PUBLIC_INTEGRATION** です。Owner Decision AによりArchive GateのPaper Glider project-scoped public-use rightsが正本化され、実物bundle、再生成、fixture、hash、次Promptと一致しています。

この判定はPaper Glider側で統合・main merge・GitHub Pages deploymentを開始できることを意味します。Paper Glider runtime統合済み、technical acceptance済み、physical-device受入済み、公開済みを意味しません。

## Gitとscope

| 項目 | 確定状態 |
|---|---|
| Workbench GitHub | `https://github.com/YuShimoji/CodexGameAssetWorkbench` |
| 作業branch | `codex/paper-glider-compat-v1` |
| rights closeout開始HEAD | `ab659854d418fa8700d9806416c246d55ff0f13e`、upstream parity `0/0`、clean |
| v0.2 Windows closeout | `ff25c6d`、`origin/codex/spline-direct-edit-v0-2`へpush済み |
| packet contract実装 | `c981865` |
| visual packet | `ed6922f` |
| pre-rights handoff | `2fc5982` / `ab65985` |
| rights closeout | この文書を含む現在のbranch tip。正確なIDは`git rev-parse HEAD`で読む |
| main / PR / tag / release | 今回未変更・未作成 |
| Recipe schema | `0.1.0`、変更なし |

Paper Gliderは`C:\Users\thank\Storage\Game Projects\paper-glider`をread-only参照しました。開始・終了監査ともbranch `main`、HEAD/upstream `3ad5ac1fbc6715f36f4b2d961754dfd8d7f35750`、parity `0/0`、cleanです。file write、install、build、checkout、branch、commit、push、deploymentを行わず、既存preview processも停止していません。

## Owner Decision A

Rights identifierは`LicenseRef-PaperGlider-Project-Asset`、完全な文面は`docs/compat/paper-glider-v1/RIGHTS.md`、owner decision記録日は2026-07-19です。

許可範囲:

- CodexGameAssetWorkbenchからPaper Gliderへの複製、変換、調整、組み込み。
- Paper Glider Git repository、development branch、`main`、releaseへの格納。
- Paper Glider GitHub Pagesおよび公開ゲームの一部としての配信と、実行に必要なbrowser delivery。
- Paper Gliderの保守、最適化、collision調整に必要な派生変更。

これはPaper Gliderのゲームと開発・配布に限定したproject-scoped permissionです。CC0、CC BY、MIT等の一般ライセンス、第三者向け素材集、standalone assetの無制限再利用許諾ではありません。Paper Glider source codeのlicenseもこのassetへ自動的に一般適用されません。rights許可はtechnical acceptanceを代替しません。

## Packet contract

runtime境界は **pinned GLB + pinned/schema-validated manifest** です。Recipe 0.1.0はWorkbench build-timeの編集・provenance・再生成正本であり、Paper Glider runtimeへコピー・parseしません。`RIGHTS.md`はrights正本、manifestはLicenseRef、repository-relative rights path、rights file bytes/SHA-256、Owner Decision A/date/scopeを保持します。

| Metric | Value |
|---|---|
| Contract / generator | `paper-glider-compat-v1` / `1.1.0` |
| Recipe hash | `fnv1a-3383aa61`（旧値と同一） |
| Content hash | `sha256:04461554becd391625cc834460196186e32a6c08a393e34c210bd1d45503d397`（旧`f866...`からrights/schema分だけ更新） |
| GLB SHA-256 | `sha256:e91d1a4b87c2c0a7d3c6698c320c13239b3751c03884b3a4c6b5b6853be1d019`（旧値と同一） |
| Manifest SHA-256 | `sha256:b9c41a053e97d061ac4795c77d8f628e93f0a40adef6f718614e614c861e1bd5` |
| Schema SHA-256 | `sha256:abbd570b742de3ae87904069dfd0b27f26a0e223999e1cfa760dec81a26a4e39` |
| Rights SHA-256 | `sha256:481eb1980eb1728eefb84c6a5fb5bdf307185e99e7089e511e927ebf49958c9f` |
| Geometry | 30,172 bytes、594 vertices、1,064 triangles、8 visual/mesh nodes、8 GLB material slots / 4 logical materials、3 AABB |
| Axes / placement | right-handed、`+Y` up、`-Z` forward、scale 1、room-local `[0,-0.52,0]` |

GLB geometryはrights closeoutで変化していません。Recipe hashとGLB byte SHA-256が旧値と一致します。manifestは7,345 bytes、schemaは9,028 bytes、rightsは2,657 bytesです。

## Hash boundary

Manifest `contentHash`はWorkbench再生成整合値です。`contentHash` fieldを除いたmanifestをCore `stableStringify`で再帰的にobject-key sort、array-order維持、JSON primitive encodingし、そのUTF-8 bytesをSHA-256化します。このcanonicalizationは独立versionのcross-repository runtime standardではないため、Paper Gliderに再実装を要求しません。

Paper Glider integrationはpinned manifest file SHA-256とGLB file SHA-256をruntime正本とし、build/testでfull JSON Schemaとschema/rights SHA-256、runtimeでsmall structural validationを行います。

## Visual evidence

`npm run compat:generate`でcanonical 5状態を再生成し、実画像を目視確認しました。

| Evidence | SHA-256 | Result |
|---|---|---|
| `canary-overview.png` | `189e2d33fa4804f431a35694592a792fd558f288a1ff8fc86e1cd1320e78d850` | full gate/room、正常 |
| `canary-colliders.png` | `2e392f8d9a55518b06db6ad2a1540f106fbdb46646a031881aac39bdf8a55156` | 3 AABB alignment、正常 |
| `canary-flight-camera.png` | `ca588365bf9b34988a4869a02e18712612574c83dd1be6b49151a348ad75a90b` | desktop flight camera、正常 |
| `canary-reloaded.png` | `189e2d33fa4804f431a35694592a792fd558f288a1ff8fc86e1cd1320e78d850` | overviewとbyte-identical |
| `canary-mobile-portrait.png` | `6e11c08962d557de89f39482b7fcdcd7f0086dba343b7c43d0a2c4b46ba0d06a` | 390 x 844、旧hashと同一 |

Desktop画像のbyte hash変化はreadback panelに表示するcontent hash文字列の更新によるものです。GLB、camera、geometry、collider、visual compositionは不変です。これはWorkbench-hosted proofであり、Paper Glider gameplay、physical device、main integration、deploymentの証拠ではありません。

## Executable fixtureと最終検証

- `scripts/paper-glider-compat-lib.mjs`: Recipe/schema/rightsからmanifestとGLBを決定論的に生成。
- `scripts/verify-paper-glider-compat.mjs`: manifest/schema/rights/hash、byte-identical regeneration、real GLB load、nodes/transforms/scales/collider refs、Recipe Save→Reload、Pages URL、Windows空白pathを検証。
- `packages/cli/test/paper-glider-compat.test.ts`: verifier integration test。
- `scripts/paper-glider-compat-smoke.mjs`: actual GLBのoverview/collider/flight/reload/mobile、rights readback、console error 0。

```powershell
npm ci
npm ls --depth=0
npm run compat:generate
npm run compat:check
npm run verify
```

Node `v24.13.0`、npm `11.6.2`。最終gateはSchema同期、production build、typecheck、lint、6 test files / 21 tests、既存Playwright 7状態、compatibility visual 5状態、console errors 0、validation errors 0、validation warnings 0、`git diff --check`を含めてgreenです。既知のVite chunk-size warningはbuild failureでもcompat validation warningでもありません。

## Paper Glider次slice

`docs/NEXT_AGENT_PROMPT.md`が単独実行可能な正本です。5,000 msのAbortController-backed preload timeout、timeout/hash/parse/node failure時のprocedural fallback、pinned manifest/GLB hash、build/test full schema + runtime small validation、seeded room selection、3 AABB、ring clearance、9-room recyclingを要求します。

Owner Decision Aによりfocused branchへのasset commit/push、technical green後の`main`統合とGitHub Pages公開はrights上許可済みです。ただしtechnical green前にmain/deployへ進みません。

## 残作業

| Purpose | Effect | Requirements | State | Owner | Next move |
|---|---|---|---|---|---|
| Archive Gate Active Artifact | 最初のWorkbench-authored playable room | finite preload/fallback、hash/structure、clone/recycle、AABB collision、ring clearance、deterministic selection | Packet/rights READY、Paper未実装 | Paper Glider | `docs/NEXT_AGENT_PROMPT.md`を実行 |
| Paper `main`とPages公開 | 公開ゲームでArchive Gateを配信 | focused branch全gate、main再検証、committed `docs/`、live URL/console | rights許可済み、technical未確認 | Paper Glider | integration green後だけmain/build/push/live verify |
| Physical-device受入 | touch/performance/fairnessを確定 | 実機mobile、長時間・高speed playtest | 未確認 | Paper Glider / owner | browser証拠と分離して実施 |
| Workbench v0.2/main判断 | 最新Workbenchをmain authorityへ昇格 | owner review | 未判断 | Repository owner | 今回merge/tagしない |

## Context mapと再開

| Path | Authority |
|---|---|
| `docs/compat/paper-glider-v1/RIGHTS.md` | Owner Decision Aの完全なproject-scoped rights text |
| `docs/compat/paper-glider-v1/README.md` | bundle files、hash、rights、regeneration、evidence boundary |
| `docs/PAPER_GLIDER_COMPATIBILITY_PACKET_V1.md` | compatibility matrix、adapter ownership、technical gate |
| `docs/NEXT_AGENT_PROMPT.md` | Paper integration→main→Pagesの単独Prompt |
| `docs/RECIPE_SCHEMA.md` | 汎用Recipe 0.1.0 authority |

```powershell
git clone https://github.com/YuShimoji/CodexGameAssetWorkbench.git
Set-Location CodexGameAssetWorkbench
git switch codex/paper-glider-compat-v1
npm ci
npx playwright install chromium
npm run verify
```

Paper Glider作業へ移る場合、Workbenchはread-onlyへ切り替えます。Windowsではnpm操作を直列化し、他repositoryのprocessやproject外Tempへ退避された`node_modules`を削除・回収・変更しません。
