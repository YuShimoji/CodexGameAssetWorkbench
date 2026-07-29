# CodexGameAssetWorkbench project handoff

最終更新: 2026-07-29 JST

## 現在地

現在のportable開発状態は、LOWPASS canaryとartifact-only consumer conformanceを保持した **`CGAWE_LOWPASS_ARTIFACT_CONSUMER_RIGHTS_GATE_LOCAL_GREEN`** です。既存の **`STUDIO_RUNTIME_BUNDLE_V1_LOCAL_GREEN`** も維持しています。

編集正本はRecipe 0.1.0のままです。Runtime BundleはScene Instance、instance override、expanded placement、Spline mesh、Room volume、SocketをひとつのGLBへ展開し、Stable IDとsource referenceをmanifestへ残す派生物です。

rights gate branchはremoteへ共有され、[GitHub Actions run 30449320168](https://github.com/YuShimoji/CodexGameAssetWorkbench/actions/runs/30449320168)がexact implementation/evidence SHA `c1a4f87e8d5633ee1010bd2f91d4589ced5690ac`でgreenです。PR、`main`統合、tag、release、deploymentは行っていません。local/remoteの技術的green、rights ownerの宣言、配布許諾、人間受入、main昇格、公開承認はそれぞれ独立したgateです。

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

## Artifact-only consumer conformance

`LowpassArtifactConsumer`は、tracked GLB、manifest、schemaだけを入力にし、Recipeやgeneratorを読みません。positive load、repeated load、disabled fallback、11種類のmalformed input、partial attachment 0、recovery、scene sentinel保持、resource disposalを検証します。

- consumer contract: `cgawe-lowpass-artifact-consumer-1.1.0`
- rights gate implementation/evidence commit: `c1a4f87e8d5633ee1010bd2f91d4589ced5690ac`
- assets / stable nodes / meshes / triangles: 5 / 50 / 44 / 1,068
- rights positive: default `NOASSERTION`とsynthetic `DECLARED`
- rights negative: unknown status、blank notice、DECLAREDのlicense ID欠落、asset/pack rights不一致
- negative cases: 11、すべてpartial attachment 0、sentinel保持、recovery成功
- browser: valid / disabled各1280 x 720、HTTP 200、non-blank WebGL、console/page/response error 0
- isolation: generator call 0、Recipe read 0、external request 0、audio initialization/playback 0
- disposal: geometry 44、material 10、unrelated resource 0
- tracked authority: `artifacts/lowpass-consumer-conformance-v1/lowpass-artifact-consumer-conformance.readback.json`

tracked PNGのbytes/hash/寸法はcanonical provenanceとして厳密検証します。runner固有のpixel bytes/hash/non-blank pixel countはcross-run等価条件から除き、寸法、非blank閾値、load/failure/recovery/disposal/network/audioの意味条件はremoteでも厳密に検証します。これはLOWPASS repository/game integration、cross-engine portability、人間のreadability/art acceptanceを確立しません。

synthetic `LicenseRef-CGAWE-Synthetic-Test-Only`は構造的な`DECLARED`処理を検証するだけで、実素材へのlicense付与、配布許諾、rights owner承認ではありません。schema、producer、consumerは、非空notice、`DECLARED`時の非空license ID、asset/pack status一致を同じfail-closed境界で検証します。

## Git authority

| 項目 | 状態 |
|---|---|
| Repository | `https://github.com/YuShimoji/CodexGameAssetWorkbench` |
| Local branch | `codex/lowpass-consumer-rights-gate-v1` |
| Branch start / `origin/main` at start | `4c8b05e9af7582807f42016d9e3d3ceff278592c` |
| Rights gate implementation / evidence | `c1a4f87e8d5633ee1010bd2f91d4589ced5690ac` |
| Remote-green implementation tip | `c1a4f87e8d5633ee1010bd2f91d4589ced5690ac` |
| `origin/main` | `4c8b05e9af7582807f42016d9e3d3ceff278592c`、rights gate implementation tipは1 commit先行 / behind 0 |
| Runtime Bundle baseline | `ee2c9f2` `codex/runtime-bundle-v1` tip |
| Canary commit | `c893374` `feat: add lowpass runtime asset canary pipeline` |
| Current handoff tip | この文書を含むdocs-only successor。`git rev-parse HEAD`で確定する |
| Upstream | `origin/codex/lowpass-consumer-rights-gate-v1` |
| Re-entry parity | 2026-07-29 implementation push/fetch後、`HEAD...@{upstream} = 0/0` |
| Remote CI / PR | run `30449320168` green、PR 0 |
| Git author | `YuShimoji <160492991+YuShimoji@users.noreply.github.com>` |

rights gate branchは、開始時の`origin/main` `4c8b05e...`から作成しました。これは旧consumer conformance branchの5 commitsがすでにmainへ到達した実状態です。このtask自身はPR/mergeを行っていません。既存Runtime Bundle、Paper Glider packet、lockfile、protected direct-manipulation branchは変更していません。

## 2026-07-29 sync / development readiness

- 編集前のprimary worktreeはtracked、staged、unstaged、untrackedがすべて空で、進行中Git operationもありませんでした。
- `git fetch --prune origin`後、旧current branch `feat/lowpass-asset-canary-v1`はupstreamと`0/0`、`origin/main`に対してahead 0 / behind 5でした。upstream自体にincoming commitがないためpullは不要でした。
- 新しいworkはexact `origin/main` `4c8b05e...`から`codex/lowpass-consumer-rights-gate-v1`を作成しました。merge、rebase、reset、restore、stash、cleanは実行していません。
- implementation/evidence `c1a4f87...`をnormal pushし、fetch/readbackでupstream parity `0/0`を確認しました。
- tracked `artifacts/lowpass-canary-v1/**`はcleanです。remote cloneで再取得可能な証拠ですが、人間のart acceptanceやrights承認の代替ではありません。
- `.serena/`、root/workspace `node_modules/`、各`dist/`、`*.tsbuildinfo`、`output/compat/`、`output/playwright/`、`output/lowpass-canary-proof/`はignored / terminal-localです。commit、stash、clean、転送対象にしません。
- `codex/browser-first-authoring-loop-v1`、`codex/direct-manipulation-visible-placement-v1`、`codex/runtime-bundle-v1`の別worktreeは保護し、このtaskでは内容・branch・processを変更していません。

結論として、現在branchはrights-aware artifact consumerを含むfull verifyがlocal/remote Windowsでgreenです。現在のbottleneckは、実在素材のlicense registryとrights owner declarationがrepository内にないこと、およびRepository ownerがこのexact branch/runをPR/main候補へ進めるか未判断であることです。

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

2026-07-29のcurrent branch full実測:

- Node `v24.13.0`、npm `11.6.2`（package engineはNode `>=22`）
- `npm ls --depth=0`: PASS
- `npm run verify`: PASS
- Schema check / production build / typecheck / lint: PASS
- Vitest: 9 files、40 tests PASS
- Generic Runtime Bundle: Starter + Paper Gliderの2 inputs、tracked identity一致
- Paper Glider compatibility: pinned hash/rights、warnings 0、validation errors 0
- LOWPASS canary check: 5 assets、actual GLTFLoader、tracked identity一致
- Artifact consumer 1.1.0: positive/repeated/disabled、negative 11 cases、partial attachment 0、recovery/disposal PASS
- Rights: default `NOASSERTION`、synthetic `DECLARED`、4 rights-specific failures、schema/producer/consumer alignment PASS
- Browser: Workbench export、Paper Glider 5 proofs、LOWPASS PS1-off/on、consumer valid/disabled PASS
- Browser console errors: 0
- LOWPASS external requests: 0
- `git diff --check`: PASS
- Known warning: Vite chunk 1,364.33 kB、500 kB warningのみ

物理Gamepad、Blender Python/headless、LOWPASS本番scene integration、人間art acceptanceは実行していません。

2026-07-29のremote CI:

- workflow: Windows latest、Node `24.13.0`、space-containing checkout path、locked install、dependency tree、Chromium、full `npm run verify`
- exact SHA: `c1a4f87e8d5633ee1010bd2f91d4589ced5690ac`
- run: `30449320168`、windows-verify 3m14s、全step PASS
- branch: `codex/lowpass-consumer-rights-gate-v1`
- locked install、dependency tree、Playwright Chromium、full repository verificationをspace-containing Windows pathでPASS
- 非blocking annotation: `actions/checkout@v4` / `actions/setup-node@v4`のNode 20 deprecation。jobはgreenで、action major更新は別のdependency review対象

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

`npm run verify`はRuntime Bundle、Paper Glider、LOWPASS canary、artifact consumer、browser proofをroot chainへ含みます。`.github/workflows/verify.yml`はWindows、Node 24.13.0、`Game Projects/CodexGameAssetWorkbench`へのcheckout、locked install、dependency tree、Chromium、full verifyを直列実行します。push対象は`main`と`codex/**`で、implementation/evidence commitのrun `30449320168`はgreenです。

Viteの500 kB chunk-size warningは継続しています。build error、Runtime Bundle validation warning、browser console errorではありません。

2026-07-26、exact candidateのisolated worktreeで`npm ci`と`npm ls --depth=0`はpassしました。`npm audit`はcritical 0 / high 6でexit 1でした。この同期ではfresh auditを再実行していません。5件はESLint/minimatch/brace-expansionを中心とする開発toolchain、1件はAjv依存の`fast-uri`です。提示された一括解決はESLint 10へのsemver-major更新を含みます。このsliceでは自動`npm audit fix`、lockfile更新、依存major migrationを実施せず、security residualとして分離します。

## 残作業

| Purpose | Effect | Requirements | State | Owner | Next move |
|---|---|---|---|---|---|
| Remote parity維持 | 別端末がexact branchを取得し続ける | normal push、fetch/readback、`0/0` | `c1a4f87`まで達成 | Repository owner / maintainer | docs successor push後もparity確認 |
| Remote CI | Windows / Node 24.13.0と空白pathで再現性を確認 | exact branch、Actions run | run `30449320168` green | Maintainer | branch更新時にgreenを維持 |
| PR / main昇格 | rights gateをcanonical main候補にする | remote CI green、diff review、rollback確認、owner承認 | PR 0、未実施 | Repository owner | exact branch/runをreviewしてPR判断 |
| External consumer conformance | repository外/実ゲームloaderでcontractを実証 | external fixture、failure cases、version support | Workbench内artifact-only reference consumerまで達成 | Consumer / SDK owner | external consumerを別sliceで選定 |
| LOWPASS canary integration | 実ゲームloaderとsemantic ownerでassetを比較 | exact canary identity、fallback、asset toggle、Gate G-A再受入後 | 未着手 | LOWPASS runtime owner | 独立consumer sliceを承認後に開始 |
| LOWPASS production texture | UV/texture付きproduction候補を作る | Blenderまたは同等tool、導入権限、UV/bake/size contract | tool unavailable | Asset pipeline owner | 外部software導入を別承認 |
| Rights declaration authority | 実在素材の配布条件を確定 | license registry、provenance、owner declaration、audit | 構造検証のみ達成、実rightsは`NOASSERTION` | Rights owner | 実宣言を別gateで登録・審査 |
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
git branch -vv
git rev-list --left-right --count 'HEAD...@{upstream}'
git rev-list --left-right --count 'HEAD...origin/main'
npm ci
npm ls --depth=0
npx playwright install chromium
npm run verify
```

現在branchのupstreamは`origin/codex/lowpass-consumer-rights-gate-v1`です。通常pushの前後に`HEAD...@{upstream}`を確認し、push後はfetch/readbackで`0/0`を要求します。

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
| `artifacts/lowpass-consumer-conformance-v1/lowpass-artifact-consumer-conformance.readback.json` | Artifact-only consumer actual proof |
| `docs/RECIPE_SCHEMA.md` | Recipe 0.1.0 authority |
| `docs/PAPER_GLIDER_COMPATIBILITY_PACKET_V1.md` | 既存consumer固有contract |
| `docs/compat/paper-glider-v1/RIGHTS.md` | Paper Glider project-scoped rights |
