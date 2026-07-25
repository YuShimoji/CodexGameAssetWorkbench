# CodexGameAssetWorkbench project handoff

最終更新: 2026-07-26 JST

## 現在地

現在のlocal開発状態は **`LOWPASS_ASSET_CANARY_V1_LOCAL_GREEN`** です。既存の **`STUDIO_RUNTIME_BUNDLE_V1_LOCAL_GREEN`** を保持したまま、LOWPASS: SALVAGE ATLAS向けconsumer canaryを独立branchで追加しました。

編集正本はRecipe 0.1.0のままです。Runtime BundleはScene Instance、instance override、expanded placement、Spline mesh、Room volume、SocketをひとつのGLBへ展開し、Stable IDとsource referenceをmanifestへ残す派生物です。

push、PR、`main`統合、tag、release、deploymentは行っていません。local stateが技術的にgreenであることと、remote共有・main昇格・公開承認は独立したgateです。

## LOWPASS canary v1 current slice

`lowpass-readability-canary-v1`は、Needle、Watcher、Porter、push-cart、field terminalの5役をproject-owned procedural Recipeから生成し、LOWPASS固有definitionでrole、faction、semantic anchor、collision proxy、budget、provenanceを付与します。

- suitability: `B_SMALL_EXTENSION`
- GLB: 70,892 bytes
- Recipe hash: `fnv1a-ca6600c5`
- GLB SHA-256: `sha256:54b10bf450971139a9cfe8302f671d29bc37fda6f2631dbf5545ef69e1b4d102`
- assets: 5
- stable nodes: 50
- parsed meshes: 44
- triangles: 1,068
- vertices: 728
- material objects: 10
- anchors: 9
- collision proxies: 5
- visual proofs: PS1-off / PS1-on、各1200 x 675

同じRecipe + seedからのGLB/manifest byte determinism、JSON Schema、actual GLTFLoader parse、Stable ID/material/socket/collision/anchor、finite values、bounds、budget、dispose、structured failure、local disclosure absence、tracked artifact一致を検証します。

BlenderはPATHに存在しません。外部softwareは導入せず、UVなし、texture 0、Blender Python/headless未試験、production texturing未完了をmanifest/readbackへ明示しました。

LOWPASS本体への統合、Phase G人間評価、Phase H、Security Cellの距離・delay・scan・音・文言の変更は実施していません。詳細は`docs/LOWPASS_RUNTIME_ASSET_CANARY_V1.md`です。

## Git authority

| 項目 | 状態 |
|---|---|
| Repository | `https://github.com/YuShimoji/CodexGameAssetWorkbench` |
| Local branch | `feat/lowpass-asset-canary-v1` |
| Branch start | `ee2c9f2568a4318ed6cc2b9fe5216a32b1bcf588` |
| Start upstream | `origin/codex/runtime-bundle-v1`、開始時parity `0/0` |
| `origin/main` start | `0dd0980`、開始branchは12 commits先行 |
| Runtime Bundle baseline | `ee2c9f2` `codex/runtime-bundle-v1` tip |
| Planned canary commit | `feat: add lowpass runtime asset canary pipeline` |
| Final local tip | この文書を含む`feat/lowpass-asset-canary-v1` tip。`git rev-parse HEAD`で確定する |
| Upstream | この新branchには未設定 |
| Remote mutation | なし |
| Git author | `YuShimoji <160492991+YuShimoji@users.noreply.github.com>` |

開始時は`codex/runtime-bundle-v1`がcleanかつremote parity `0/0`でした。既存Runtime Bundle、Paper Glider packet、lockfileを変更せず、そこからLOWPASS canary用branchを作成しています。

## Runtime Bundle v1

contract正本は`docs/RUNTIME_BUNDLE_V1.md`、machine schemaは`schemas/runtime-bundle-1.0.0.schema.json`、共有entryは`buildRuntimeBundle(recipe)`です。WorkbenchとNode proofが同じentryを使います。

manifestは次を含みます。

- contract / manifest version、project ID
- source Recipe schema、FNV-1a hash、SHA-256、generation seed
- right-handed / `+Y` up / `-Z` forward / meter / radian
- GLB filename、media type、bytes、SHA-256
- root node
- scene instances、expanded placements、splines、rooms、sockets
- Stable IDとGLB node nameの全node map
- node / mesh / vertex / triangle / material / semantic counts
- world bounds
- validation errors/warnings
- rights status

canonical manifestにはtimestamp、absolute path、usernameを含めません。generic rightsの既定値は`NOASSERTION`です。Paper Glider固有LicenseRefは暗黙に再利用しません。

validation errorがあればexporterを呼ばず、UIは先頭messageと総error数を表示してdownloadを0件に保ちます。成功時だけ`<projectId>.runtime.glb`と`<projectId>.runtime.manifest.json`を保存し、project ID、node count、triangle countをstatusへ表示します。

## Actual two-input evidence

`artifacts/runtime-bundle-v1/runtime-bundle-readback.json`がmachine-readable正本です。

| Input | GLB | SHA-256 | Manifest SHA-256 | Nodes | Triangles |
|---|---:|---|---|---:|---:|
| `samples/starter-project/recipe.json` | 90,708 bytes | `sha256:5b39c86b7bb7999e8401a27c1dc34cb3172cc58e5cbdabc36fe071aff8d437ea` | `sha256:9378e8cb189cba95ec21cec337cf8c85aa1d0f88b93637d79a506eee9a81160c` | 41 | 2,720 |
| `docs/compat/paper-glider-v1/paper-glider-canary.recipe.json` | 30,820 bytes | `sha256:27e13b5ed5b9b6d521d39936127e73f75c8c7de5fc3724e2240b39d6e2cd12fe` | `sha256:b8cbaee3d1b8ff155ffc19a0a4285c0389b97aca98c10b317abd87d18643cc99` | 13 | 1,064 |

両入力は各2回生成し、GLBとmanifestのbyte一致を確認します。その後JSON Schema、GLTFLoader parse、Stable ID解決、scene/placement part、room/socket reference、finite transform/bounds、counts、hash/bytes、rights、local disclosure、tracked artifact再生成一致を検証します。

Browser proof:

- `artifacts/runtime-bundle-v1/runtime-bundle-desktop.png`
- `artifacts/runtime-bundle-v1/runtime-bundle-mobile.png`（390 x 844）
- invalid RecipeのRuntime Bundle download 0件
- valid RecipeのGLB + manifest download 2件
- Selected Asset GLBとRuntime Bundleが別button、別filename、別status
- desktop/mobile console errors 0
- mobile document overflowなし、Runtime Bundle controlがviewport内

## Existing Paper Glider contract protection

`docs/compat/paper-glider-v1/**`のRecipe、GLB、manifest、Schema、RIGHTS、5 visual images、readbackは変更していません。Generic Bundleのcanary入力はread-onlyで使用し、出力は新しい`artifacts/runtime-bundle-v1/` identityへ書きました。

Pinned `paper-glider-compat-v1` identity:

- Recipe hash: `fnv1a-3383aa61`
- Workbench content hash: `sha256:04461554becd391625cc834460196186e32a6c08a393e34c210bd1d45503d397`
- GLB SHA-256: `sha256:e91d1a4b87c2c0a7d3c6698c320c13239b3751c03884b3a4c6b5b6853be1d019`
- Manifest SHA-256: `sha256:b9c41a053e97d061ac4795c77d8f628e93f0a40adef6f718614e614c861e1bd5`
- Schema SHA-256: `sha256:abbd570b742de3ae87904069dfd0b27f26a0e223999e1cfa760dec81a26a4e39`
- Rights SHA-256: `sha256:481eb1980eb1728eefb84c6a5fb5bdf307185e99e7089e511e927ebf49958c9f`
- Rights identifier: `LicenseRef-PaperGlider-Project-Asset`

Paper Glider repository、owner process、public deploymentはこのtaskで変更・再検証していません。

## Verification

2026-07-26のcurrent branch実測:

- Node `v24.13.0`、npm `11.6.2`（package engineはNode `>=22`）
- `npm ls --depth=0`: PASS
- `npm run verify`: PASS
- Schema check / production build / typecheck / lint: PASS
- Vitest: 8 files、25 tests PASS
- Generic Runtime Bundle: Starter + Paper Gliderの2 inputs、tracked identity一致
- Paper Glider compatibility: pinned hash/rights、warnings 0、validation errors 0
- LOWPASS canary check: 5 assets、actual GLTFLoader、tracked identity一致
- Browser: Workbench export、Paper Glider 5 proofs、LOWPASS PS1-off/on PASS
- Browser console errors: 0
- LOWPASS external requests: 0
- `git diff --check`: PASS
- Known warning: Vite chunk 1,364.33 kB、500 kB warningのみ

物理Gamepad、Blender Python/headless、LOWPASS本番scene integration、remote CIは実行していません。

通常の再検証:

```powershell
npm ci
npm ls --depth=0
npx playwright install chromium
npm run schema:check
npm run build
npm run typecheck
npm run lint
npm test
npm run runtime:check
npm run compat:check
npm run test:browser
npm run verify
git diff --check
```

`npm run verify`はRuntime Bundle gateをroot chainへ含みます。`.github/workflows/verify.yml`はWindows、Node 22、locked install、dependency tree、Chromium、full verifyを直列実行する最小CIです。workflowはlocal追加だけで、remote実行実績はまだありません。

Viteの500 kB chunk-size warningは継続しています。build error、Runtime Bundle validation warning、browser console errorではありません。

exact candidateのisolated worktreeで`npm ci`と`npm ls --depth=0`はpassしました。`npm audit`はcritical 0 / high 6でexit 1です。5件はESLint/minimatch/brace-expansionを中心とする開発toolchain、1件はAjv依存の`fast-uri`です。提示された一括解決はESLint 10へのsemver-major更新を含みます。このsliceでは自動`npm audit fix`、lockfile更新、依存major migrationを実施せず、security residualとして分離します。

## 残作業

| Purpose | Effect | Requirements | State | Owner | Next move |
|---|---|---|---|---|---|
| Remote branch共有 | 別端末がexact local workへ到達可能 | ownerのpush許可、remote認証、push後parity | local only | Repository owner / maintainer | `codex/runtime-bundle-v1`をnon-force push |
| PR / main昇格 | Runtime Bundleをcanonical mainへ統合 | remote CI green、diff review、rollback確認、owner承認 | 未実施 | Repository owner | PRまたは履歴方針をownerが選択 |
| Runtime consumer conformance | 実ゲーム側loaderでcontractを実証 | independent loader fixture、failure cases、version support | 未着手 | Consumer / SDK owner | Starter bundleを最小consumerへ読ませる |
| LOWPASS canary integration | 実ゲームloaderとsemantic ownerでassetを比較 | exact canary identity、fallback、asset toggle、Gate G-A再受入後 | 未着手 | LOWPASS runtime owner | 独立consumer sliceを承認後に開始 |
| LOWPASS production texture | UV/texture付きproduction候補を作る | Blenderまたは同等tool、導入権限、UV/bake/size contract | tool unavailable | Asset pipeline owner | 外部software導入を別承認 |
| Rights declaration flow | `DECLARED`入力を安全に扱う | license registry、provenance、owner input、negative tests | Generic defaultのみ | Rights / tooling owner | `NOASSERTION`を維持して別slice化 |
| Dependency audit | known high advisoryを解消 | advisory影響評価、Ajv/fast-uri patch、ESLint 10互換確認、full regression | critical 0 / high 6 | Dependency / security owner | broad auto-fixを避けて専用slice化 |
| Performance budget | 大規模Recipeでも編集・exportを維持 | fixture、time/memory budgets、cache、bundle splitting | known gap | UI / adapter owner | large Recipe benchmarkを作る |
| Release | immutable versionとrollbackを提供 | main、CI、versioning、changelog、owner acceptance | 未承認 | Repository owner | technical merge後も独立判断 |

## 再開手順

```powershell
Set-Location 'C:\Users\thank\Storage\Game Projects\CodexGameAssetWorkbench'
git status --short --branch --untracked-files=all
git rev-parse HEAD
git log --oneline -5
git fetch --prune origin
git rev-list --left-right --count 'origin/main...HEAD'
git branch -vv
npm ci
npm ls --depth=0
npx playwright install chromium
npm run verify
```

新branchにupstreamがない間は`@{upstream}`を前提にしません。remote branchが作成された後だけ`git rev-list --left-right --count 'HEAD...@{upstream}'`を使用します。

## Authority map

| Path | Authority |
|---|---|
| `docs/PROJECT_HANDOFF.md` | 現在地、保護境界、再開順序 |
| `docs/PROJECT_STATUS_AND_ROADMAP.md` | 監修向け現状報告と長期目標 |
| `docs/RUNTIME_BUNDLE_V1.md` | Runtime Bundle contractと検証境界 |
| `docs/LOWPASS_RUNTIME_ASSET_CANARY_V1.md` | LOWPASS consumer contract、evidence、統合境界 |
| `schemas/runtime-bundle-1.0.0.schema.json` | Manifest machine contract |
| `schemas/lowpass-runtime-asset-pack-1.0.0.schema.json` | LOWPASS manifest machine contract |
| `artifacts/runtime-bundle-v1/runtime-bundle-readback.json` | actual two-input proof |
| `artifacts/lowpass-canary-v1/lowpass-readability-canary-v1.readback.json` | LOWPASS actual proof |
| `docs/RECIPE_SCHEMA.md` | Recipe 0.1.0 authority |
| `docs/PAPER_GLIDER_COMPATIBILITY_PACKET_V1.md` | 既存consumer固有contract |
| `docs/compat/paper-glider-v1/RIGHTS.md` | Paper Glider project-scoped rights |
