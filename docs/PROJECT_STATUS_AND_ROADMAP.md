# CodexGameAssetWorkbench 監修AI向け現状報告・長期ロードマップ

最終更新: 2026-07-26 JST

## 結論

Codex Game Asset Studio Runtime Bundle v1は **`STUDIO_RUNTIME_BUNDLE_V1_CI_REPAIR_LOCAL_GREEN`** です。

Recipe 0.1.0のWhole Recipeを、再現可能なGLBと`cgawe-runtime-bundle-1.0.0` manifestへ変換する共通entryを実装しました。Scene Instance、Part override、seed付きexpanded placement、Spline mesh、Room、Socketが同じbundleへ入り、manifestからGLB nodeへStable IDで全参照を解決できます。

StarterとPaper Glider canaryの2入力について、GLB/manifestのbyte determinism、JSON Schema、actual GLTFLoader parse、参照、finite値、hash/bytes、tracked artifact一致を確認しました。Workbench UIはSelected AssetとWhole Recipeを区別し、不正Recipeのdownloadを0件で止め、正常時だけ2ファイルを出します。desktopと390 x 844 mobileでactual exportとstatusを確認しました。

remote branch `origin/codex/runtime-bundle-v1@ee2c9f2`は既に共有済みです。GitHub Actions `Verify` run `30164433668`はNode `22.23.1`でPaper Glider exact regenerationに失敗しました。local successorはcanonical生成ランタイムNode `24.13.0`をCIへ固定し、Runtime Bundle実装、canonical packet、dependenciesを変更せずfull verificationを回復しています。今回のpush、workflow rerun、PR、main merge、tag、release、deploymentは0件です。

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

このsliceが確立していないもの:

- exact local successorのremote CI成功
- local successorのGitHub共有またはPR
- `main` authority
- dependency audit clean（critical 0 / high 6）
- external consumerによるGeneric Runtime Bundle load
- `DECLARED` rights入力のproduct flow
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
- `.node-version`でexact Node `24.13.0`
- `npm ci`
- `npm ls --depth=0`
- Playwright Chromium
- `npm run verify`
- `contents: read`
- secret、deployment、Pages mutationなし

predecessor run `30164433668`はfailureです。Node `22.23.1`ではGLB JSON materialの9 componentが最大`1.1102230246251565e-16`変化し、exact manifest checkが止まりました。BIN、全24 accessor、node/mesh/material orderとreferenceは同一です。Node `24.13.0`はcanonical bytesを2回再生成し、local full verificationを通過しましたが、successor SHAのremote workflow結果はまだ存在しないため「CI green」とは報告しません。

`package.json`の`engines.node >=22`は一般support範囲です。Paper Glider canonical packetのbit-exact regeneration環境は`.node-version`で固定したNode `24.13.0`です。cross-Node-patch byte determinismは保証しません。

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
- generic rights `NOASSERTION`
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

### External state

今回remote、Paper Glider repository、owner process、release surfaceを変更していません。既存remote branchは`ee2c9f2`のままで、local successorは外部公開を意味しません。

## Gapとrisk

| Gap | 影響 | 現在の緩和 | 解消条件 |
|---|---|---|---|
| Repair successorがlocal only | 別端末はpredecessor `ee2c9f2`までしか取得できない | exact base、差分、再開手順をrepo docsへ記録 | fresh authority後のnon-force branch更新とparity |
| Predecessor CI failure / successor未実行 | hosted Windowsのrepair実証が未完了 | Node `24.13.0` pinとlocal full verify | exact successor push後のworkflow green |
| `npm audit` high 6 | toolchainとAjv依存に既知advisory | critical 0、broad auto-fixを未実行、機能gateと分離 | fast-uri patchとESLint 10 migrationを専用検証 |
| Generic consumer未実証 | contractがThree-based proof内に留まる | GLTFLoader actual parse | independent loader conformance |
| Rights `DECLARED` flowなし | 配布判断を自動化できない | default `NOASSERTION` | owner-supplied registry + negative tests |
| Empty Room/Socket GLB nodes | metadata consumerの実装が必要 | manifestとnodeMapで明示 | reference consumer fixture |
| Large JS chunk | startup/download cost | warningを既知gapとして保持 | code split + budget |
| Large Recipe benchmarkなし | export time/memory上限不明 | Starter/canary deterministic proof | scale fixture + thresholds |
| Schema migrationなし | 将来field追加時の資産保護未確立 | 0.1.0固定、unknown fail closed | explicit migration CLI + golden |

## 可能な限り先の目標設定

以下は現在の成果から依存順に進める提案です。各goalは独立acceptanceを持ち、remote、merge、release権限を自動的に広げません。

| ID | Purpose | Effect | Requirements | State | Owner | Next move |
|---|---|---|---|---|---|---|
| RB-H1 | CI repair successorをremoteで再開可能に | 別端末がexact repairを取得 | fresh branch-update authority、non-force push、parity | predecessor共有済み / successor local | Repository owner / maintainer | 監修受入後にsuccessor SHAだけを共有 |
| RB-CI1 | Windows verifyをremote継続実行 | regressionをPR時に検知 | successor共有、Actions許可、exact SHA workflow green | predecessor failed / repair local green | Maintainer | successor runを観測 |
| RB-M1 | Runtime Bundleをmainline candidate化 | canonical code pathを一本化 | full diff、CI、rollback、owner review | pending external gate | Repository owner | PR/merge方針を決定 |
| RB-C1 | Independent consumer conformance | Generic contractの可搬性を証明 | Three実装と独立したloader、positive/negative fixtures | 未着手 | Consumer SDK owner | Starter loaderをthin slice化 |
| RB-C2 | Contract failure suite | 互換破壊を早期検知 | unknown version、hash mismatch、missing node/ref、NaN、rights cases | 未着手 | Schema / SDK owner | malformed manifest fixtures追加 |
| RB-SEC1 | Dependency advisory closeout | known high 6を解消 | advisory影響評価、Ajv/fast-uri patch、ESLint 10互換、full verify | pending | Dependency / security owner | broad `npm audit fix`を使わず更新計画 |
| RB-R1 | Declared rights profile | 配布可否とprovenanceを明確化 | license registry、source refs、owner declaration、audit | 未着手 | Rights owner | `NOASSERTION`から別profile化 |
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

### 推奨順

1. **共有と再現**: RB-H1 → RB-CI1 → RB-M1
2. **contract実証とsecurity**: RB-C1 → RB-C2 → RB-SEC1 → RB-R1
3. **資産寿命**: RB-I1 → RB-S1
4. **production quality**: RB-G1 → RB-P1 → RB-SDK1
5. **ecosystem**: RB-U1 → RB-Q1 → RB-AI1 → RB-CAT1
6. **release maturity**: RB-10

最短の次価値はRB-C1です。Workbench内部のGLTFLoader proofから一歩離れ、実consumerがStarter Runtime Bundleを読み、root/nodeMap/placements/rooms/socketsを利用できれば、Generic contractの名称だけでなく可搬性が立証されます。

## 再開コマンド

```powershell
Set-Location 'C:\Users\thank\Storage\Game Projects\CodexGameAssetWorkbench-runtime-bundle-v1-ci-repair'
git status --short --branch --untracked-files=all
git rev-parse HEAD
git log --oneline -5
git fetch --prune origin
git branch -vv
git rev-list --left-right --count 'origin/main...HEAD'
git rev-list --left-right --count 'HEAD...@{upstream}'
npm ci
npm ls --depth=0
npx playwright install chromium
npm run verify
git diff --check
```

upstreamは`origin/codex/runtime-bundle-v1@ee2c9f2`です。local successorはpushされていないため、remote先端が`ee2c9f2`のままかを再確認し、fresh branch-update authorityが与えられた場合だけnon-force push後の`HEAD...@{upstream} = 0/0`を確認します。

## Authority map

| Path | Authority |
|---|---|
| `docs/PROJECT_HANDOFF.md` | 現在地、保護境界、再開 |
| `docs/PROJECT_STATUS_AND_ROADMAP.md` | この監修報告と長期目標 |
| `docs/RUNTIME_BUNDLE_V1.md` | Contract、Stable ID、validation、evidence |
| `schemas/runtime-bundle-1.0.0.schema.json` | Machine schema |
| `artifacts/runtime-bundle-v1/runtime-bundle-readback.json` | Two-input actual result |
| `.github/workflows/verify.yml` | Windows remote verification candidate |
| `.node-version` | Paper Glider canonical regeneration用exact Node runtime |
| `docs/RECIPE_SCHEMA.md` | Recipe 0.1.0 |
| `docs/PAPER_GLIDER_COMPATIBILITY_PACKET_V1.md` | Paper Glider固有packet |
| `docs/compat/paper-glider-v1/RIGHTS.md` | Paper Glider project-scoped rights |
