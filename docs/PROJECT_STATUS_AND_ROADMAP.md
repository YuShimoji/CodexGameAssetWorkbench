# CodexGameAssetWorkbench 監修AI向け現状報告・長期ロードマップ

最終更新: 2026-07-30 JST

## 結論

Codex Game Asset Studioの最新portable stateは、既存LOWPASS consumer rights gateを保持した **`CGAWE_GENERIC_RUNTIME_BUNDLE_RIGHTS_GATE_REMOTE_GREEN`** です。Runtime Bundle contract / manifest versionは`cgawe-runtime-bundle-1.0.0` / `1.0.0`のままです。

Recipe 0.1.0のWhole Recipeを、再現可能なGLBと`cgawe-runtime-bundle-1.0.0` manifestへ変換する共通entryを実装しました。Scene Instance、Part override、seed付きexpanded placement、Spline mesh、Room、Socketが同じbundleへ入り、manifestからGLB nodeへStable IDで全参照を解決できます。

StarterとPaper Glider canaryの2入力について、GLB/manifestのbyte determinism、JSON Schema、actual GLTFLoader parse、参照、finite値、hash/bytes、tracked artifact一致を確認しました。Workbench UIはSelected AssetとWhole Recipeを区別し、不正Recipeのdownloadを0件で止め、正常時だけ2ファイルを出します。desktopと390 x 844 mobileでactual exportとstatusを確認しました。

開始時のexact predecessorは`05fe3ce5111b1656fa145dfdc1cf163c9b9b6162`、`origin/main`は`4c8b05e9af7582807f42016d9e3d3ceff278592c`でした。このtaskはpredecessorからbranch `codex/runtime-bundle-rights-gate-v1`を作成し、Generic Runtime Bundle rights gate実装/evidence `15b029d9df533fc4ad8bcc782b6d214e244cb007`をnormal pushしました。現在の監修報告はそのcode tip上のdocs-only successorであり、最終tipはこの文書を含むcommitを`git rev-parse HEAD`で確認します。このtaskではPR、main merge、tag、release、deploymentを行っていません。

`.github/workflows/verify.yml`は`main`と`codex/**`のpushを対象にし、Windows、Node 24.13.0、space-containing checkout path、locked install、dependency tree、Chromium、full verifyを実行します。[run 30470902752](https://github.com/YuShimoji/CodexGameAssetWorkbench/actions/runs/30470902752)はexact SHA `15b029d...`で全step greenでした。

## Generic Runtime Bundle rights conformance

`buildRuntimeBundle`はRecipe validationの直後、`Group`作成、scene geometry、`GLTFExporter.parseAsync`より前にeffective rightsを検証します。statusは`NOASSERTION` / `DECLARED`だけ、noticeは非whitespace必須、`DECLARED`は非whitespace license ID必須で、入力のtrim、repair、downgradeはしません。

- positive: default `NOASSERTION`、synthetic `DECLARED`
- negative: unknown status、blank notice、DECLARED license ID欠落、blank license ID
- malformed result: exporter invocation 0、output file 0
- recovery: negative sequence後のdefault valid build成功
- contract / manifest version: `cgawe-runtime-bundle-1.0.0` / `1.0.0`維持
- Starter / Paper Glider generic Runtime BundleのGLB・manifest identity: 不変

synthetic `LicenseRef-CGAWE-Synthetic-Test-Only`は構造試験専用で、実在license、配布許諾、rights owner承認、公開承認を意味しません。

## LOWPASS consumer canary

適合度評価は **B（小規模拡張）** でした。generic Whole Recipe GLB/manifest、Stable ID、deterministic export、actual GLTFLoader proofは再利用できました。LOWPASS向けにはrole/faction、collision proxy、interaction anchor、feature/budget/provenance contract、material ID保持・共有、固定lineupのPS1-off/on proofを追加しました。

Actual identity:

| Item | Value |
|---|---|
| Pack | `lowpass-readability-canary-v1` |
| Recipe hash | `fnv1a-ca6600c5` |
| GLB | 70,892 bytes |
| GLB SHA-256 | `sha256:54b10bf450971139a9cfe8302f671d29bc37fda6f2631dbf5545ef69e1b4d102` |
| Manifest SHA-256 | `sha256:a1dd222f98c109697849279f3f5644266d685bc7b4d543534c8e4191b225c353` |
| Assets / nodes / meshes | 5 / 50 / 44 |
| Triangles / vertices / materials | 1,068 / 728 / 10 |
| Anchors / collision proxies | 9 / 5 |

Roles:

- hostile Needle: narrow、scan、lock-on
- hostile Watcher: wide、scan、visual center、lock-on禁止
- allied Porter: carry、interaction、communication
- push-cart: handle、load、4 wheels
- field terminal: screen、interaction

両visual proofは1200 x 675、29 visible meshes、console/page error 0、external request 0です。foreground pixelsはPS1-off 21,938、PS1-on 21,420で、画像を目視確認しました。

BlenderはPATHに存在しないため、UV、texture、Blender Python/headless export、production texturingは未完了です。外部software導入は行っていません。rightsは`NOASSERTION`で、Paper Glider固有LicenseRefを流用していません。

このsliceはLOWPASS本体を変更していません。Phase G人間評価、Phase H、Security Cellの距離・delay・scan・音・文言は境界外です。

2026-07-30のfull local verificationはNode `v24.13.0`、npm `11.6.2`で実行し、Schema、production build、typecheck、lint、9 files / 41 Vitest tests、generic Runtime Bundle、Paper Glider compatibility、LOWPASS check、artifact consumer、Workbench/Paper Glider/LOWPASS/consumer browser proof、`git diff --check`がPASSしました。Vite 1,365.69 kB chunkの既知warningは残しています。

2026-07-30のremote run `30470902752`は同じNode identityとspace-containing Windows pathでlocked install、dependency tree、Chromium、full `npm run verify`を実行し、exact SHA `15b029d...`で全step PASSしました。

### Artifact-only consumer conformance

`LowpassArtifactConsumer` 1.1.0はtracked GLB、manifest、schemaだけを読み、Recipe/generatorを読みません。positive/repeated load、disabled fallback、11 negative cases、partial attachment 0、recovery、scene preservation、resource disposalを検証します。actual resultは5 assets、50 stable nodes、44 meshes、1,068 triangles、geometry disposal 44、material disposal 10です。

browser proofはvalid/disabled各1280 x 720、HTTP 200、non-blank WebGL、console/page/response error 0、external request 0、audio initialization/playback 0です。tracked PNGのbytes/hash/寸法はcanonical provenanceとして固定し、cross-runではrunner依存のpixel bytes/hash/countを除いたload/failure/recovery/disposal/network/audio意味条件を比較します。

rights境界はdefault `NOASSERTION`とsynthetic `DECLARED`をpositive確認し、unknown status、blank notice、DECLAREDのlicense ID欠落、asset/pack rights不一致をattachment前にfail closedにします。LOWPASS schema、producer、consumerは同じ制約へ揃えました。synthetic `LicenseRef-CGAWE-Synthetic-Test-Only`は構造試験専用であり、実在素材のlicense、配布許諾、rights owner承認ではありません。

このconsumerはWorkbench内のartifact-only referenceであり、LOWPASS repository/game integration、cross-engine portability、人間のreadability/art acceptance、実在素材のrights authorityは確立しません。machine readbackは`artifacts/lowpass-consumer-conformance-v1/lowpass-artifact-consumer-conformance.readback.json`です。

## 成果の意味

これまでのWorkbenchは、選択AssetのGLB exportと、Paper Glider専用Compatibility Packetという2つのdelivery経路を持っていました。Runtime Bundle v1により、通常のStarter Recipeとconsumer canaryを同じ公開entryへ渡し、consumer固有scriptなしで複合sceneを出力できる最初の汎用経路が成立しました。

このsliceが確立したもの:

- Whole Recipeを実行時artifactへ変換するversioned contract
- UIとNode proofが共有するexport実装
- Scene Instance overrideとViewport表示の意味論一致
- Placement Ruleのdeterministic expansionとsequence identity
- GLB nodeとmanifest source entityの双方向追跡に使えるStable ID
- canonical manifestからtimestamp、local path、usernameを排除
- rights未指定時に`NOASSERTION`を明示するfail-safe
- actual two-input artifacts、desktop/mobile screenshots、machine readback
- root `verify`とWindows CI候補への統合
- artifact-only reference consumer 1.1.0、11 negative cases、fail-closed recovery/disposal
- LOWPASS schema/producer/consumerでrights status、notice、DECLARED license ID、asset/pack一致を構造検証
- exact `codex/**` branchのWindows remote CI成功

このsliceが確立していないもの:

- rights gate branchのPRまたは`main` authority
- dependency audit clean（critical 0 / high 6）
- repository外/実ゲームconsumerによるload
- 実在素材の`DECLARED` rights registry / owner approval / product flow
- Recipe schema 0.2 migration
- product releaseまたはpublic deployment

## 実装面

### Contract / adapter

`packages/adapter-three/src/runtime-bundle.ts`が共有entryです。Recipe validationを先に実行し、errorがあれば`RuntimeBundleValidationError`で終了します。GLB生成後にGLB byte hash、world bounds、実geometry countsをmanifestへ束縛します。

Scene InstanceはCore `resolveInstanceAsset`でPart overrideを適用し、Variantを同じseed規則で評価します。PlacementはCore `generateAllPlacements`の順序と`ruleId:index`を保持します。Splineは実mesh、Room/Socketはruntime metadataとGLB nodeを持ちます。

### Manifest

Schema正本: `schemas/runtime-bundle-1.0.0.schema.json`

主要field:

- `contractVersion` / `manifestSchemaVersion`
- `projectId`
- `source`
- `coordinateSystem`
- `files`
- `rootNodeId`
- `sceneInstances`
- `placements`
- `splines`
- `rooms`
- `sockets`
- `nodeMap`
- `counts`
- `bounds`
- `validation`
- `rights`

manifest自身のhashをmanifest内へ循環参照させません。tracked evidenceのmanifest SHA-256はreadbackが保持します。

### UI / browser

Top barには次の独立操作があります。

- `Export Selected Asset GLB`: 選択Definitionだけの既存出力
- `Export Runtime Bundle`: Whole Recipeのversioned出力

Runtime Bundle成功statusはproject ID、nodes、trianglesを表示します。不正Recipeでは先頭validation messageと総error数を表示し、download eventが発生しないことをbrowser smokeで検証します。

390px mobileではTransform toolをtop barから隠し、Runtime BundleとSave Recipeを維持します。document overflow、button bounds、actual 2-download、console error 0を検証しました。

### CI

`.github/workflows/verify.yml`:

- `windows-latest`
- Node 24.13.0
- `Game Projects/CodexGameAssetWorkbench`へのspace-containing checkout
- `npm ci`
- `npm ls --depth=0`
- Playwright Chromium
- `npm run verify`
- `contents: read`
- secret、deployment、Pages mutationなし

exact branch/SHAのremote workflow結果は[run 30470902752](https://github.com/YuShimoji/CodexGameAssetWorkbench/actions/runs/30470902752)です。`15b029d9df533fc4ad8bcc782b6d214e244cb007`で全step greenですが、PR、main merge、実rights declaration、release、deployment、owner acceptanceの代替ではありません。`actions/checkout@v4` / `actions/setup-node@v4`のNode 20 deprecation annotationは非blockingで、action major更新は別のdependency review対象です。

## Actual evidence

| Input | GLB bytes | GLB SHA-256 | Manifest SHA-256 | Nodes | Meshes | Vertices | Triangles |
|---|---:|---|---|---:|---:|---:|---:|
| Starter | 90,708 | `sha256:5b39c86b7bb7999e8401a27c1dc34cb3172cc58e5cbdabc36fe071aff8d437ea` | `sha256:9378e8cb189cba95ec21cec337cf8c85aa1d0f88b93637d79a506eee9a81160c` | 41 | 26 | 1,700 | 2,720 |
| Paper Glider canary | 30,820 | `sha256:27e13b5ed5b9b6d521d39936127e73f75c8c7de5fc3724e2240b39d6e2cd12fe` | `sha256:b8cbaee3d1b8ff155ffc19a0a4285c0389b97aca98c10b317abd87d18643cc99` | 13 | 8 | 594 | 1,064 |

検証結果:

- input count 2
- deterministic GLB true
- deterministic manifest true
- JSON Schema true
- GLTFLoader parse true
- Stable node refs true
- finite numbers true
- hashes/bytes true
- generic rights default `NOASSERTION` true
- generic rights synthetic `DECLARED` true
- generic malformed exporter invocation 0
- generic malformed output file 0
- generic valid recovery true
- local disclosure absent
- browser validation blocked download true
- desktop Runtime Bundle download 2
- mobile Runtime Bundle download 2
- desktop/mobile console errors 0

visual evidence:

- `artifacts/runtime-bundle-v1/runtime-bundle-desktop.png`
- `artifacts/runtime-bundle-v1/runtime-bundle-mobile.png`

## 保護境界

### Paper Glider

Paper Glider固有bundleはbyte不変です。Generic Runtime Bundleは同じcanary Recipeを入力に使いますが、固有GLB、manifest、Schema、RIGHTS、screenshotsを上書きせず、新identityへ出力します。

- Recipe hash `fnv1a-3383aa61`
- Content hash `sha256:04461554becd391625cc834460196186e32a6c08a393e34c210bd1d45503d397`
- GLB `sha256:e91d1a4b87c2c0a7d3c6698c320c13239b3751c03884b3a4c6b5b6853be1d019`
- Manifest `sha256:b9c41a053e97d061ac4795c77d8f628e93f0a40adef6f718614e614c861e1bd5`
- Schema `sha256:abbd570b742de3ae87904069dfd0b27f26a0e223999e1cfa760dec81a26a4e39`
- Rights `sha256:481eb1980eb1728eefb84c6a5fb5bdf307185e99e7089e511e927ebf49958c9f`
- Rights ID `LicenseRef-PaperGlider-Project-Asset`

Generic Runtime Bundleの`NOASSERTION`は「権利が自由である」という主張ではありません。固有LicenseRefの無断流用を避け、consumer側が独立してrightsを判断できる状態です。

### Recipe 0.1.0

Runtime BundleはRecipe schemaや既存意味論を変更しません。migrationも追加していません。未知versionは引き続きfail closedです。

### Portable stateとterminal-local state

remoteで取得できるportable stateは、tracked source/docs/schema/sampleと`artifacts/**`です。2026-07-30の同期前にtracked/staged/unstaged/untracked差分はなく、tracked Runtime Bundle / LOWPASS artifactsもcleanでした。

`.serena/`、root/workspaceの`node_modules/`、各`dist/`、`*.tsbuildinfo`、`output/compat/`、`output/playwright/`、`output/lowpass-canary-proof/`はignoredまたはterminal-localです。これらをcommit、clean、stash、別worktreeへのコピー対象にしません。

同じGit common dir配下には`codex/browser-first-authoring-loop-v1`、`codex/direct-manipulation-visible-placement-v1`、`codex/runtime-bundle-v1`の別worktreeがあります。現在branchへ取り込まず、checkout、reset、clean、process停止を行わない保護対象です。Paper Glider repository、owner process、release surfaceもこの同期では変更していません。

## Gapとrisk

| Gap | 影響 | 現在の緩和 | 解消条件 |
|---|---|---|---|
| PR/main未判断 | remote-green branchがcanonical mainではない | exact branch/SHA/runを固定、PR 0を明示 | owner review後にPR/main方針を決定 |
| `npm audit` high 6（2026-07-26観測、この同期では未再実行） | toolchainとAjv依存に既知advisory | critical 0、broad auto-fixを未実行、機能gateと分離 | fresh audit後、fast-uri patchとESLint 10 migrationを専用検証 |
| External consumer未実証 | artifact-only reference consumerがWorkbench/Three内に留まる | generator/Recipe非依存、11 negative cases、remote CI | repository外または実ゲームconsumer conformance |
| Rights authorityなし | 構造的に有効でも実在素材の配布可否は判断できない | default `NOASSERTION`、synthetic DECLARED test、fail-closed producer / consumer | owner-supplied registry + provenance audit + explicit approval |
| Empty Room/Socket GLB nodes | metadata consumerの実装が必要 | manifestとnodeMapで明示 | reference consumer fixture |
| Large JS chunk | startup/download cost | warningを既知gapとして保持 | code split + budget |
| Large Recipe benchmarkなし | export time/memory上限不明 | Starter/canary deterministic proof | scale fixture + thresholds |
| Schema migrationなし | 将来field追加時の資産保護未確立 | 0.1.0固定、unknown fail closed | explicit migration CLI + golden |

## 可能な限り先の目標設定

以下は現在の成果から依存順に進める提案です。各goalは独立acceptanceを持ち、remote、merge、release権限を自動的に広げません。

| ID | Purpose | Effect | Requirements | State | Owner | Next move |
|---|---|---|---|---|---|---|
| RB-H1 | Remote exact handoffを維持 | 別端末がexact branchを取得 | normal push、fetch/readback、parity | implementation tip `15b029d`まで達成、docs successorは都度readback | Repository owner / maintainer | 各normal push後に`0/0`を確認 |
| RB-CI1 | Windows verifyをremote継続実行 | regressionをbranch/PR時に検知 | Actions許可、workflow green | run `30470902752` green | Maintainer | branch更新時にexact SHA greenを維持 |
| RB-M1 | Generic rights gateをmainline candidate化 | canonical Runtime Bundle contractを更新 | full diff、CI、rollback、owner review | pending owner gate | Repository owner | PR/merge方針を決定 |
| RB-C1 | Independent consumer conformance | Generic contractの可搬性を証明 | generator/Recipe非依存loader、positive/negative fixtures | Workbench artifact-only reference consumer達成、external未実証 | Consumer SDK owner | repository外consumerを別sliceで選定 |
| RB-C2 | Contract failure suite | 互換破壊を早期検知 | unknown version、hash/bytes mismatch、missing node/ref、malformed GLB、rights cases | Generic rights 4 casesとLOWPASS consumer 11 casesをrepository内で達成、externalはRB-C1 | Schema / SDK owner | in-repo fixturesを維持し、external evidenceはRB-C1で扱う |
| RB-SEC1 | Dependency advisory closeout | known high 6を解消 | advisory影響評価、Ajv/fast-uri patch、ESLint 10互換、full verify | pending | Dependency / security owner | broad `npm audit fix`を使わず更新計画 |
| RB-R1 | Declared rights profile | 配布可否とprovenanceを明確化 | license registry、source refs、owner declaration、audit | 構造検証のみ達成、実宣言なし | Rights owner | `NOASSERTION`からowner-approved profile化 |
| RB-I1 | Bundle import/readback | 配布artifactからsource Recipeへ戻れる | source locator、hash照合、derived artifact非正本化 | future | UI / Core owner | manifest inspectorから開始 |
| RB-S1 | Recipe schema 0.2 migration | 長期編集資産を保護 | lossless 0.1→0.2 migration、golden、rollback | future | Schema owner | migration RFC |
| RB-G1 | Runtime geometry profile | 実ゲーム品質を拡張 | normals/tangents、UV、texture、LOD、collision separation | future | Core / adapter owner | textured prop 1種でcontract |
| RB-P1 | Performance budget | 大規模sceneの操作・exportを保証 | benchmark Recipes、time/memory/size thresholds、cache | future | UI / adapter owner | 10x placement fixture |
| RB-SDK1 | Adapter SDK / conformance kit | 複数engineの実装差を抑制 | stable bundle API、fixture suite、lifecycle policy | future | Architecture owner | Three adapterをreference化 |
| RB-U1 | UnityまたはGodot consumer | engine-neutral deliveryを実証 | SDK、rights、version matrix、sample | future owner choice | Dedicated adapter owner | engineを1つだけ選定 |
| RB-Q1 | Supply-chain attestation | hash、rights、generator lineageを監査可能に | attestation version、signing policy、secret boundary | far | Tooling / rights owner | unsigned receipt profile |
| RB-AI1 | Agent-safe automation | 大量Recipe操作を安全に自動化 | dry-run diff、validate/apply、policy gate、receipt | far | CLI / Core owner | machine transaction protocol |
| RB-CAT1 | Versioned asset catalog | 再利用素材を依存・権利付きで蓄積 | package IDs、dependency graph、rights filter、previews | far | Product / rights owner | first-party 3 assets |
| RB-10 | Owner-gated 1.0 | 制作・配布基盤として安定宣言 | main、CI、migration、consumer、rights、performance、docs、人間受入 | far terminal | Repository owner | acceptance checklistを別途固定 |
| LP-GA | LOWPASS Gate G-A再受入 | 復旧した操作性でPhase G感覚評価を再開 | LOWPASS exact commit、Gamepad実機、ミュートなし、人間PASS/G-TUNE/FAIL | 別repoでpending human | Human evaluator | canary統合より先にGate G-Aを再評価可能 |
| LP-I1 | Canary loader fixture | LOWPASS実runtimeでcontractを読込む | exact artifact hash、version fail-close、asset fallback | 未着手 | LOWPASS runtime owner | 独立integration branch |
| LP-I2 | Side-by-side readability | 既存assetとcanaryを同一条件で比較 | same camera/seed/scenario、toggle、resource metrics | 未着手 | Runtime / art owner | LP-I1後 |
| LP-A1 | Human art acceptance | silhouette、faction、interaction affordanceを判定 | PS1-off/on、実game fog/light/distance、human rubric | 未着手 | Human art owner | 技術greenと分離 |
| LP-T1 | UV/texture canary | production material routeを実証 | Blender等の利用承認、UV、bake、atlas、mipmap、budget | tool unavailable | Asset pipeline owner | external tool gate |
| LP-L1 | LOD/collision profile | 距離別costとphysics境界を安定化 | LOD1/2、screen threshold、proxy policy、popping test | future | Runtime / asset owner | accepted asset 1種から |
| LP-R1 | Distribution rights | LOWPASS内外での利用条件を確定 | owner declaration、license registry、provenance review | `NOASSERTION` | Rights owner | 配布前の独立gate |
| LP-C1 | Canary contract promotion | consumer固有canaryをversioned supported profileへ | LP-I1/I2/A1、migration policy、CI、rollback | future | Architecture / owner | acceptance後 |

### 推奨順

1. **共有と再現**: RB-H1 / RB-CI1（達成・維持）→ owner-gated RB-M1
2. **contract実証とsecurity**: RB-C1 external consumer → RB-SEC1 → RB-R1
3. **資産寿命**: RB-I1 → RB-S1
4. **production quality**: RB-G1 → RB-P1 → RB-SDK1
5. **ecosystem**: RB-U1 → RB-Q1 → RB-AI1 → RB-CAT1
6. **release maturity**: RB-10

RB-C2はrepository-localなGeneric Runtime Bundle rightsについて完了しました。この文書は次作業を自動選定しません。残るbounded gateはRepository ownerによるPR/main判断、Consumer / SDK ownerによるexternal conformance、Dependency / security ownerによるadvisory closeout、Rights ownerによる実在素材のregistry/declarationです。LOWPASS consumer integration（LP-I1）は別repository・別ownerの承認後だけ開始します。

## 再開コマンド

```powershell
Set-Location 'C:\Users\thank\Storage\Game Projects\CodexGameAssetWorkbench'
git status --short --branch --untracked-files=all
git rev-parse HEAD
git log --oneline -5
git fetch --prune origin
git branch -vv
git rev-list --left-right --count 'HEAD...@{upstream}'
git rev-list --left-right --count 'HEAD...origin/main'
npm ci
npm ls --depth=0
npx playwright install chromium
npm run verify
git diff --check
```

現在branchのupstreamは`origin/codex/runtime-bundle-rights-gate-v1`です。通常pushの前後に`HEAD...@{upstream}`を確認し、push後はfetch/readbackで`0/0`を要求します。開始時のexact predecessorは`05fe3ce...`、`origin/main`は`4c8b05e...`で、implementation tip `15b029d...`はmainに対してahead 3 / behind 0です。これはrights gateのmain統合を意味しません。

## Authority map

| Path | Authority |
|---|---|
| `docs/PROJECT_HANDOFF.md` | 現在地、保護境界、再開 |
| `docs/PROJECT_STATUS_AND_ROADMAP.md` | この監修報告と長期目標 |
| `docs/RUNTIME_BUNDLE_V1.md` | Contract、Stable ID、validation、evidence |
| `docs/LOWPASS_RUNTIME_ASSET_CANARY_V1.md` | LOWPASS contract、visual proof、integration boundary |
| `schemas/runtime-bundle-1.0.0.schema.json` | Machine schema |
| `schemas/lowpass-runtime-asset-pack-1.0.0.schema.json` | LOWPASS machine schema |
| `artifacts/runtime-bundle-v1/runtime-bundle-readback.json` | Two-input actual result |
| `artifacts/lowpass-canary-v1/lowpass-readability-canary-v1.readback.json` | LOWPASS actual result |
| `artifacts/lowpass-consumer-conformance-v1/lowpass-artifact-consumer-conformance.readback.json` | Artifact-only consumer actual result |
| `.github/workflows/verify.yml` | Windows remote verification |
| `docs/RECIPE_SCHEMA.md` | Recipe 0.1.0 |
| `docs/PAPER_GLIDER_COMPATIBILITY_PACKET_V1.md` | Paper Glider固有packet |
| `docs/compat/paper-glider-v1/RIGHTS.md` | Paper Glider project-scoped rights |
