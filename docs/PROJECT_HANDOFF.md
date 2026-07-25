# CodexGameAssetWorkbench project handoff

最終更新: 2026-07-26 JST

## 現在地

現在のlocal開発状態は **`STUDIO_RUNTIME_BUNDLE_V1_CI_REPAIR_LOCAL_GREEN`** です。既存の`cgawe-runtime-bundle-1.0.0`実装と証拠を保持したまま、Paper Glider canonical packetを生成したexact Node `24.13.0`をWindows CIへ固定し、GitHub Actions run `30164433668`の再現性blockerをlocal successorで修復しました。

編集正本はRecipe 0.1.0のままです。Runtime BundleはScene Instance、instance override、expanded placement、Spline mesh、Room volume、SocketをひとつのGLBへ展開し、Stable IDとsource referenceをmanifestへ残す派生物です。

remote branch `origin/codex/runtime-bundle-v1@ee2c9f2`は既に存在します。今回のsuccessorはlocal-onlyで、push、workflow rerun、PR、`main`統合、tag、release、deploymentを行っていません。local stateが技術的にgreenであることと、successor共有・remote CI成功・main昇格・公開承認は独立したgateです。

## Git authority

| 項目 | 状態 |
|---|---|
| Repository | `https://github.com/YuShimoji/CodexGameAssetWorkbench` |
| Local branch | `codex/runtime-bundle-v1` |
| Repair base | `ee2c9f2568a4318ed6cc2b9fe5216a32b1bcf588` |
| Start upstream | `origin/codex/runtime-bundle-v1@ee2c9f2`、開始時parity `0/0` |
| `origin/main` | `0dd09801148ead04d211063b00d5e54f3f1cb10f`、repair baseは12 commits先行 |
| Checkpoint commit | `06e875b` `chore: checkpoint studio re-entry handoff` |
| Contract/core commit | `88a299d` `feat: add deterministic runtime bundle contract` |
| Runtime/UI commit | `ee2c9f2` `feat: expose runtime bundle in the studio` |
| Local successor | `ee2c9f2`のdirect successorであるこの文書を含むcommit。`git rev-parse HEAD`で確定する |
| Upstream | `origin/codex/runtime-bundle-v1@ee2c9f2`; successorはahead 1 / behind 0 |
| Predecessor CI | `Verify` run `30164433668`、Node `22.23.1`、failure |
| Current external mutation | なし |
| Git author | `YuShimoji <160492991+YuShimoji@users.noreply.github.com>` |

開始時の9-file handoff/test deltaは内容、secret、staged範囲を監査して`06e875b`へ固定しました。既存作業を破棄、stash、resetせず、そこからRuntime Bundleを実装しています。

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

## Paper Glider CI reproducibility repair

canonical packet生成ランタイムは、tracked bytesを2回連続で再生成したNode `24.13.0` / V8 `13.6.233.17-node.37`です。失敗runと同じNode `22.23.1` / V8 `12.4.254.21-node.56`もdisposable runtimeで2回実行し、各runtime内ではbyte-identical、runtime間では次の差を再現しました。

| Evidence | Node 24.13.0 | Node 22.23.1 |
|---|---|---|
| GLB bytes | 30,172 | 30,172 |
| GLB SHA-256 | `e91d1a4b87c2c0a7d3c6698c320c13239b3751c03884b3a4c6b5b6853be1d019` | `8db2302086e7d758e218d66ba29be09f891a752b020782c90eb3795bcf622242` |
| Manifest SHA-256 | `b9c41a053e97d061ac4795c77d8f628e93f0a40adef6f718614e614c861e1bd5` | `49062be7c873228f89f9001f2b98025643fe807547524b842c7dd60b0d46f8ee` |
| Content hash | `04461554becd391625cc834460196186e32a6c08a393e34c210bd1d45503d397` | `b8687a16b82988207c337e86a620b00352464ce926f5dfd4fee1a699f63f735e` |

両GLBはheader、30,172-byte total、9,504-byte JSON chunk、20,640-byte BIN chunk、scene/node/mesh/material/accessor/bufferViewのcountとorderが同じです。BIN SHA-256は両方`cef895cc6ed92bc80f0c4ba9f4c4309859e42ea7dd0afac65b74166ced07fab0`で、24 accessorsのindices/positions/normalsに差はありません。最初の差はGLB byte offset 7,272のJSON material値で、9個の`baseColorFactor` componentだけが最大`1.1102230246251565e-16`変化します。first differing accessor / owning node / meshは存在しません。root causeはV8世代間のThree.js color数値表現差であり、geometry、topology、identity、material assignment、referenceのdriftではありません。

修復は`.node-version`の`24.13.0`を`actions/setup-node`の`node-version-file`へ渡すexact-toolchain pathです。`package.json`の`engines.node >=22`は一般アプリケーションsupport範囲を表し、Paper Glider canonical artifactのbit-exact regeneration環境はNode `24.13.0`だけです。生成器、verifier、Core、Adapter、dependencies、lockfile、canonical packetは変更していません。

保証境界:

- canonical packet byte integrity: 維持
- pinned Node `24.13.0` byte determinism: 2回再生成とfull local verifyで確認
- cross-Node-patch byte determinism: 保証しない
- Node `22.23.1`とのsemantic equivalence: BIN/accessor、構造、identity、material assignment、reference一致とbounded material numeric deltaで確認

## Verification

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

`npm run verify`はRuntime Bundle gateをroot chainへ含みます。`.github/workflows/verify.yml`はWindows、`.node-version`のexact Node `24.13.0`、locked install、dependency tree、Chromium、full verifyを直列実行します。predecessor run `30164433668`はfloating Node 22が`22.23.1`を選び、Paper Glider manifest exact regenerationで失敗しました。successor workflowのremote実行はまだありません。

Viteの500 kB chunk-size warningは継続しています。build error、Runtime Bundle validation warning、browser console errorではありません。

exact candidateのisolated worktreeで`npm ci`と`npm ls --depth=0`はpassしました。`npm audit`はcritical 0 / high 6でexit 1です。5件はESLint/minimatch/brace-expansionを中心とする開発toolchain、1件はAjv依存の`fast-uri`です。提示された一括解決はESLint 10へのsemver-major更新を含みます。このsliceでは自動`npm audit fix`、lockfile更新、依存major migrationを実施せず、security residualとして分離します。

## 残作業

| Purpose | Effect | Requirements | State | Owner | Next move |
|---|---|---|---|---|---|
| Successor branch更新 | 別端末がexact repairへ到達可能 | fresh branch-update authority、non-force push、remote先端確認、push後parity | predecessor `ee2c9f2`のみremote; successor local | Repository owner / maintainer | exact successor SHAを監修受入後に共有 |
| Successor CI | pinned runtime repairをGitHub-hosted Windowsで実証 | successor push、exact SHA run、run/log確認 | local green / remote未実行 | Repository owner / maintainer | fresh authority後にexact successor runを観測 |
| PR / main昇格 | Runtime Bundleをcanonical mainへ統合 | successor remote CI green、diff review、rollback確認、別権限、owner承認 | 未実施 | Repository owner | CI成功後に独立判断 |
| Runtime consumer conformance | 実ゲーム側loaderでcontractを実証 | independent loader fixture、failure cases、version support | 未着手 | Consumer / SDK owner | Starter bundleを最小consumerへ読ませる |
| Rights declaration flow | `DECLARED`入力を安全に扱う | license registry、provenance、owner input、negative tests | Generic defaultのみ | Rights / tooling owner | `NOASSERTION`を維持して別slice化 |
| Dependency audit | known high advisoryを解消 | advisory影響評価、Ajv/fast-uri patch、ESLint 10互換確認、full regression | critical 0 / high 6 | Dependency / security owner | broad auto-fixを避けて専用slice化 |
| Performance budget | 大規模Recipeでも編集・exportを維持 | fixture、time/memory budgets、cache、bundle splitting | known gap | UI / adapter owner | large Recipe benchmarkを作る |
| Release | immutable versionとrollbackを提供 | main、CI、versioning、changelog、owner acceptance | 未承認 | Repository owner | technical merge後も独立判断 |

## 再開手順

```powershell
Set-Location 'C:\Users\thank\Storage\Game Projects\CodexGameAssetWorkbench-runtime-bundle-v1-ci-repair'
git status --short --branch --untracked-files=all
git rev-parse HEAD
git log --oneline -5
git fetch --prune origin
git rev-list --left-right --count 'origin/main...HEAD'
git rev-list --left-right --count 'HEAD...@{upstream}'
git branch -vv
npm ci
npm ls --depth=0
npx playwright install chromium
npm run verify
```

upstreamは`origin/codex/runtime-bundle-v1@ee2c9f2`です。local successorはpushされていないため、再開時はremote先端が`ee2c9f2`のままかを先に確認し、fresh authorityなしにpushや履歴変更を行いません。

## Authority map

| Path | Authority |
|---|---|
| `docs/PROJECT_HANDOFF.md` | 現在地、保護境界、再開順序 |
| `docs/PROJECT_STATUS_AND_ROADMAP.md` | 監修向け現状報告と長期目標 |
| `docs/RUNTIME_BUNDLE_V1.md` | Runtime Bundle contractと検証境界 |
| `schemas/runtime-bundle-1.0.0.schema.json` | Manifest machine contract |
| `artifacts/runtime-bundle-v1/runtime-bundle-readback.json` | actual two-input proof |
| `docs/RECIPE_SCHEMA.md` | Recipe 0.1.0 authority |
| `docs/PAPER_GLIDER_COMPATIBILITY_PACKET_V1.md` | 既存consumer固有contract |
| `docs/compat/paper-glider-v1/RIGHTS.md` | Paper Glider project-scoped rights |
