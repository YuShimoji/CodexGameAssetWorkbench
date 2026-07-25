# CodexGameAssetWorkbench project handoff

最終更新: 2026-07-25 JST

## 現在地

現在のlocal開発状態は **`STUDIO_RUNTIME_BUNDLE_V1_LOCAL_GREEN`** です。`cgawe-runtime-bundle-1.0.0` contract、Whole Recipeからのactual GLB + versioned manifest、Schema、二入力determinism/readback、Selected AssetとRuntime Bundleを分けたUI、desktop/mobile browser proof、Windows CI候補まで実装しました。

編集正本はRecipe 0.1.0のままです。Runtime BundleはScene Instance、instance override、expanded placement、Spline mesh、Room volume、SocketをひとつのGLBへ展開し、Stable IDとsource referenceをmanifestへ残す派生物です。

push、PR、`main`統合、tag、release、deploymentは行っていません。local stateが技術的にgreenであることと、remote共有・main昇格・公開承認は独立したgateです。

## Git authority

| 項目 | 状態 |
|---|---|
| Repository | `https://github.com/YuShimoji/CodexGameAssetWorkbench` |
| Local branch | `codex/runtime-bundle-v1` |
| Branch start | `c58ac302acee3e0dad0ce0d2ce89dc545cec241d` |
| Start upstream | `origin/codex/paper-glider-compat-v1`、開始時parity `0/0` |
| `origin/main` start | `0dd0980`、開始branchは9 commits先行 |
| Checkpoint commit | `06e875b` `chore: checkpoint studio re-entry handoff` |
| Contract/core commit | `88a299d` `feat: add deterministic runtime bundle contract` |
| Final local tip | この文書を含む`codex/runtime-bundle-v1` tip。`git rev-parse HEAD`で確定する |
| Upstream | この新branchには未設定 |
| Remote mutation | なし |
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

`npm run verify`はRuntime Bundle gateをroot chainへ含みます。`.github/workflows/verify.yml`はWindows、Node 22、locked install、dependency tree、Chromium、full verifyを直列実行する最小CIです。workflowはlocal追加だけで、remote実行実績はまだありません。

Viteの500 kB chunk-size warningは継続しています。build error、Runtime Bundle validation warning、browser console errorではありません。

exact candidateのisolated worktreeで`npm ci`と`npm ls --depth=0`はpassしました。`npm audit`はcritical 0 / high 6でexit 1です。5件はESLint/minimatch/brace-expansionを中心とする開発toolchain、1件はAjv依存の`fast-uri`です。提示された一括解決はESLint 10へのsemver-major更新を含みます。このsliceでは自動`npm audit fix`、lockfile更新、依存major migrationを実施せず、security residualとして分離します。

## 残作業

| Purpose | Effect | Requirements | State | Owner | Next move |
|---|---|---|---|---|---|
| Remote branch共有 | 別端末がexact local workへ到達可能 | ownerのpush許可、remote認証、push後parity | local only | Repository owner / maintainer | `codex/runtime-bundle-v1`をnon-force push |
| PR / main昇格 | Runtime Bundleをcanonical mainへ統合 | remote CI green、diff review、rollback確認、owner承認 | 未実施 | Repository owner | PRまたは履歴方針をownerが選択 |
| Runtime consumer conformance | 実ゲーム側loaderでcontractを実証 | independent loader fixture、failure cases、version support | 未着手 | Consumer / SDK owner | Starter bundleを最小consumerへ読ませる |
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
| `schemas/runtime-bundle-1.0.0.schema.json` | Manifest machine contract |
| `artifacts/runtime-bundle-v1/runtime-bundle-readback.json` | actual two-input proof |
| `docs/RECIPE_SCHEMA.md` | Recipe 0.1.0 authority |
| `docs/PAPER_GLIDER_COMPATIBILITY_PACKET_V1.md` | 既存consumer固有contract |
| `docs/compat/paper-glider-v1/RIGHTS.md` | Paper Glider project-scoped rights |
