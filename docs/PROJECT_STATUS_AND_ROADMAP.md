# CodexGameAssetWorkbench 監修AI向け現状報告・長期ロードマップ

最終更新: 2026-07-25 JST

## 結論

現在のWorkbenchは **`DEVELOPMENT_READY_WITH_LOCAL_HANDOFF_DELTA`** です。`git fetch --prune origin`と`git pull --ff-only origin codex/paper-glider-compat-v1`を実行し、同期基準HEAD `c58ac302acee3e0dad0ce0d2ce89dc545cec241d`とupstreamのparity `0/0`を確認しました。依存ツリー、Schema、production build、typecheck、lint、unit、compatibility verifier、実ブラウザ12状態、`git diff --check`はgreenです。

今回、Windowsの並列負荷で子プロセス型unit testが5秒を超える既知のflakeを再現しました。対象2 testだけへ15秒上限を設定した後、6 files / 21 testsと全`npm run verify`がgreenになりました。この変更はまだlocal handoff deltaであり、commit、push、PR、`main`統合、tag、release、deploymentは実行していません。

下流のPaper Gliderはread-onlyでlive Gitを確認しました。開始確認では`main` `857afb2c4e0f4d2ba7a7965608be6c313780175c`、`origin/main` parity `0/0`、cleanでした。最終境界監査時に別作業のdocs-only local delta（`PROJECT_HANDOFF.md`変更、`SUPERVISOR_AI_STATUS_2026-07-25.md`追加）が現れました。commit HEADとparityは不変です。このtaskはそれらを変更・退避・stageせず、Paper Gliderのrepository authorityが記録するArchive Gate integration、PG-A2/A3、PG-V1公開完了だけをdownstream現在地として使用しました。Workbenchに残っていたArchive Gate統合Promptは完了履歴へ退避しました。

現在の最重要gapは、Workbenchの最新開発成果が`main` authorityへ昇格していないことです。`origin/main`はv0.1 baseline `0dd0980`で、現行branchは9 commits、58 files、約5,018 insertions / 195 deletions先行しています。次の安全な目標は、CIとclean-room evidenceを持つv0.2 mainline promotion candidateを作り、owner判断へ渡すことです。

## 今回の実測

| 項目 | 実測 | 判定 |
|---|---|---|
| Repository | `https://github.com/YuShimoji/CodexGameAssetWorkbench.git` | origin fetch/push一致 |
| Branch | `codex/paper-glider-compat-v1` | 現行開発authority |
| Entry HEAD | `c58ac302acee3e0dad0ce0d2ce89dc545cec241d` | upstream一致 |
| Pull | `Already up to date.` | remote最新を取込済み |
| Branch parity | `HEAD...origin/codex/paper-glider-compat-v1 = 0/0` | 同期済み |
| Main | `origin/main = 0dd0980` | v0.1 baseline |
| Mainとの差 | `origin/main...HEAD = 0/9` | main昇格未実施 |
| Worktree開始状態 | tracked/untracked変更なし | 既存差分を上書きせず開始 |
| Git改行設定 | repo-local `core.autocrlf=false` | Schema/LF契約に適合 |
| Node / npm | Node `v24.13.0` / npm `11.6.2` | engines `>=22`適合 |
| Dependency tree | `npm ls --depth=0` pass | current checkoutは開発可能 |
| Live process | Workbench `node_modules`を参照するTypeScript language server 6件 | 停止・変更せず保護 |
| Clean install | primary checkoutでは未実施 | live language server保護。lockfile再現は次のexact-candidate clean-room gate |
| Tracked CI | `.github/`なし | local greenをremote継続検証するCIが未整備 |
| Local artifacts | `.serena/`、`node_modules/`、`apps/workbench/dist/`、`output/`等はignored | Git authorityとlocal evidenceを分離 |
| Paper Glider final boundary | committed `main`/upstream `857afb2`、parity `0/0`、concurrent docs-only local deltaあり | user-ownedとして保護。このtaskは内容を独立検証・採用していない |

### 検証結果

最終`npm run verify`は次をすべて通過しました。

- Schema同期check
- production build
- TypeScript project build / typecheck
- ESLint
- Vitest 6 files / 21 tests
- Paper Glider compatibility verifier
- Workbench Playwright 7 states
- Paper Glider compatibility visual 5 states
- `git diff --check`

production buildは742 modulesです。出力はHTML 0.47 kB、CSS 20.53 kB、JavaScript 1,357.10 kB、gzip 380.41 kBでした。500 kBを超えるVite chunk warningは継続中で、build failureではありません。

Vitestの安定化前は、初回全verifyでCLI testが5秒timeout、再走ではCLIとcompatibility testがともに5秒timeoutしました。単独実測は1.48秒、負荷下の実測は最大8.35秒でした。対象testだけを15秒へ変更後、負荷下でもCLI 8.35秒、compatibility 6.25秒でpassし、最終verifyでは4.43秒、5.99秒でpassしました。

### Compatibility Packet実測

| Contract | Value |
|---|---|
| Contract version | `paper-glider-compat-v1` |
| Recipe hash | `fnv1a-3383aa61` |
| Content hash | `sha256:04461554becd391625cc834460196186e32a6c08a393e34c210bd1d45503d397` |
| GLB SHA-256 | `sha256:e91d1a4b87c2c0a7d3c6698c320c13239b3751c03884b3a4c6b5b6853be1d019` |
| Manifest SHA-256 | `sha256:b9c41a053e97d061ac4795c77d8f628e93f0a40adef6f718614e614c861e1bd5` |
| Schema SHA-256 | `sha256:abbd570b742de3ae87904069dfd0b27f26a0e223999e1cfa760dec81a26a4e39` |
| Rights identifier | `LicenseRef-PaperGlider-Project-Asset` |
| Rights SHA-256 | `sha256:481eb1980eb1728eefb84c6a5fb5bdf307185e99e7089e511e927ebf49958c9f` |
| Geometry | 594 vertices / 1,064 triangles / 8 visual nodes / 3 colliders |
| Validation | warnings 0 / errors 0 / validation warnings 0 |

Workbench browser smokeはSpline作成、control point編集、rod、road、keyframed corridor、integrated scene、reloadの7 statesを生成し、Recipe、GLB、manifestの3 exportを成功させました。Compatibility visualはoverview、colliders、flight camera、reload、mobile portraitの5 statesを成功させ、console errorsは0でした。

## Project thesisと現在の開発軸

North starは、Codexが編集するversioned Recipe JSONと、人間が操作するブラウザUIを同じparse、validation、deterministic generation、save/reload経路へ接続する、engine-neutralな3D asset workbenchです。最終像は、ひとつのデモAssetを作るツールに留まらず、複数ゲームやengine adapterへ、versioned bundle、provenance、rights、machine verification、visual evidenceを一貫して渡せる制作基盤です。

現在の開発軸は「機能実証」から「canonical product line」への移行です。

- v0.1 mainはPrimitive、Material、Instance、Room、Socket、Seed配置のbaseline。
- v0.2 branchはSpline直接編集、adaptive sweep、保存再読込、GLB/manifest派生、visual proofまで技術的に完成。
- Paper Glider packetは、rights、hash、schema、collision、visual evidenceを持つ最初の実consumer contract。
- Paper Glider側の実統合と公開完了により、Workbench-authored assetが実ゲームへ到達する縦断実証は成立。
- Workbench自身のmain authority、CI、versioned release、汎用bundle export、schema migrationは未確立。

## 完成度の読み方

単一の進捗率は、technical、owner、rights、release、downstream acceptanceを混同するため使用しません。lane別の現在地は次の通りです。

| Lane | 完成度 | 根拠 | 残gate |
|---|---:|---|---|
| v0.1 baseline | 100% | `origin/main`確立 | 保守のみ |
| v0.2 feature implementation | 100% technical | 全local verify、7 browser states | main authority |
| Paper Glider packet / rights | 100% Workbench scope | hashes、schema、rights、5 visual states | 一般license化は範囲外 |
| Downstream playable proof | 100% repository-reported | Paper Glider mainが統合・公開完了を記録 | 今回public URL/CIは再実行していない |
| Windows test stability | 100% local candidate | timeout再現、局所修正、full verify green | commit/remote evidence |
| v0.2 mainline promotion | 20% | branchとhandoffは揃う | CI、clean-room、owner review、main反映 |
| Reproducible delivery | 30% planning estimate | package lockとverifyは存在 | tracked CI、release version、artifact policy |
| General asset platform 1.0 | 25% planning estimate | Recipe/Core/UI/consumer proof成立 | migration、generic bundle、adapter SDK、performance、release |

## 現在のgapと注意

1. **Main authority lag**: downstreamで使われたasset authorityがfeature branch上にあり、`main`はv0.1のままです。新規Agentがmainだけを読むとv0.2とpacketを見失います。
2. **Remote CI不在**: `.github/`が存在せず、local `verify`の継続性をremoteで証明できません。
3. **Exact-candidate clean install**: primary checkoutはTypeScript language server 6件が稼働しており、`npm ci`による`node_modules`交換を避けました。現行依存ツリーとfull verifyはgreenです。main候補ではisolated clean-roomを追加します。
4. **Branch-local handoff delta**: test timeout安定化と今回の文書は未commitです。別端末へ渡すにはowner承認後の意図的commit/pushが必要です。
5. **Bundle size**: Workbench JavaScriptは約1.36 MBです。local authoringには許容されますが、起動時間とmemory budgetをまだ契約化していません。
6. **Schema evolution**: Recipe schemaは0.1.0のversion gateを持ちます。旧版migration、forward/backward compatibility、deprecation policyは未実装です。
7. **Export breadth**: 現行GLB exportは選択Asset Definitionが中心です。Scene、Room、Spline、Placement展開を一つの汎用runtime bundleへする契約は未実装です。
8. **Adapter breadth**: Three adapterは存在します。Unity/Godot/Unreal、Blender、DCC interchangeは設計・権利・保守costが未評価です。
9. **Evidence boundary**: Workbench visual proof、Paper Glider technical acceptance、physical-device acceptance、owner release approvalは別gateです。
10. **Concurrent downstream docs**: Paper Gliderの最終監査では別作業の未commit監修文書が存在します。Paper Glider側でreview、commit、push、破棄の所有判断が完了するまでWorkbenchから操作しません。

## 推奨ロードマップ

各項目はpurpose、effect、requirements、state、owner、next moveを明示します。順序は依存関係に基づく推奨であり、owner判断でscopeを固定します。

| ID | Purpose | Effect | Requirements | State | Owner | Next move |
|---|---|---|---|---|---|---|
| WB-H0 | 2026-07-25 handoff delta確定 | test flakeと正本の矛盾を解消 | diff review、full verify、ownerのcommit/push許可 | local green | Workbench maintainer / owner | 2 test + docs差分をreview |
| WB-CI1 | Windows verification CI | remoteで再現性を継続証明 | Node 22+、`npm ci`、Chromium、`npm run verify`、artifact policy | 未着手 | Workbench maintainer | 最小workflow候補を作る |
| WB-M1 | v0.2 mainline promotion | mainだけで最新製品とpacketへ到達 | clean-room、CI green、9-commit review、hash不変、owner承認 | owner gate | Repository owner | `docs/NEXT_AGENT_PROMPT.md`を実行 |
| WB-R02 | v0.2 release baseline | 再利用可能なversionとrollback point | semver、changelog、tag/release方針、exact artifact hashes | 未着手 | Owner + maintainer | main昇格後にrelease decision |
| WB-B1 | Generic Runtime Bundle v1 | consumer固有手作業を減らす | versioned manifest、GLB、schema、rights/provenance refs、validator | concept | Core/CLI owner | Paper packetを汎用contractへ抽象化 |
| WB-E1 | Scene/Room/Spline export v1 | 実ゲームへ複合空間を渡す | selection semantics、placement bake、stable node IDs、collider/route contract | 未着手 | Core + adapter + CLI | 1 room bundleのthin slice |
| WB-SM1 | Recipe schema 0.2 migration | 長期互換と編集資産保護 | migration CLI、golden fixtures、unknown-version fail-closed、rollback | 未着手 | Schema owner | 0.1→0.2 no-loss migration spec |
| WB-I1 | Bundle import/reopen | consumer artifactをWorkbenchで追跡可能に | provenance resolution、Recipe authority保持、derived GLBを正本化しない | 未着手 | Workbench UI + Core | manifest→source Recipe locator |
| WB-A1 | Advanced spline authoring | 高低差・曲面・曲線の制作力を拡張 | arbitrary plane、3D points、Bezier/tangent contract、deterministic sampling | future | UI + Core | vertical spline thin sliceを先行 |
| WB-G1 | Geometry production quality | runtime利用範囲を拡張 | UV、tangent、normal、texture/material policy、LOD、collision separation | future | Core + adapter | textured static prop 1種で契約化 |
| WB-P1 | Workbench performance budget | large recipeでも操作性を維持 | code splitting、load budget、mesh cache、large-scene benchmarks | known gap | Workbench UI | bundle splitとstartup計測 |
| WB-SDK1 | Adapter SDK | 複数consumerへ一貫して配布 | stable MeshData/bundle API、conformance fixtures、lifecycle/dispose contract | future | Architecture owner | Three reference adapterを規格化 |
| WB-U1 | Unity/Godot reference consumer | engine-neutral性を実証 | SDK確立、rights、version support matrix、sample project | future | Dedicated adapter owner | ownerが最初のengineを選ぶ |
| WB-Q1 | Supply-chain evidence | asset provenanceと権利監査を強化 | digest manifest、license registry、attestation version、secret scan | future | Tooling + owner | current rights packetをfixture化 |
| WB-AI1 | Agent automation surface | 大量Recipe編集を安全に自動化 | machine commands、transaction preview、policy gates、evidence receipts | future | CLI + Core | dry-run diff/validate/apply protocol |
| WB-CAT1 | Versioned asset catalog | reusable contentを蓄積 | package identity、dependency graph、rights filter、preview/evidence index | future | Product + rights owner | 3 first-party assetsでpilot |
| WB-10 | Owner-gated 1.0 | 制作基盤として安定宣言 | main/CI/release、migration、generic bundle、one reference consumer、docs、human acceptance | far goal | Repository owner | 1.0 acceptance checklistを確定 |

### 推奨する開発順

1. **Canonicalization**: WB-H0 → WB-CI1 → WB-M1 → WB-R02
2. **Reusable delivery**: WB-B1 → WB-E1 → WB-SM1 → WB-I1
3. **Production quality**: WB-P1 → WB-A1/G1 → WB-SDK1
4. **Ecosystem**: WB-U1 → WB-Q1 → WB-AI1 → WB-CAT1
5. **Release**: WB-10

main authorityとCIを先に確立すると、以後のv0.3開発がbranch archaeologyへ依存しません。製品価値を最も早く増やす次のfeatureはWB-B1/WB-E1の「汎用versioned room bundle」です。Paper Gliderで実証したGLB + manifest + schema + rights + collider contractを、consumer固有名称から切り離して再利用可能にします。

## 監修AI・ownerの判断キュー

| Decision | 推奨 | 理由 | 未決時の扱い |
|---|---|---|---|
| 15秒test timeout差分を採用するか | 採用 | 実測最大8.35秒、対象2 test限定、runtime契約不変 | local deltaのまま保持 |
| v0.2をmainへ昇格するか | CI/clean-room後に承認判断 | downstream実績があり、main lagが最大の再開risk | feature branchをauthorityとして明記 |
| PRか非rewriting mergeか | ownerが履歴方針を選択 | remote state変更を伴う | このtaskでは未実施 |
| main後の第一feature | Generic Runtime Bundle v1 | consumer再利用性とWorkbench本体価値を同時に増やす | roadmap conceptに留める |
| 最初の外部engine | 1.0 scope決定時に選択 | adapter保守costが高い | Three referenceを規格化して待つ |

## 実施しなかったこと

- commit、stage、push、PR、main merge、tag、release、deployment
- Paper Gliderのfile変更、install、build、test、process停止
- Paper Gliderのconcurrent `PROJECT_HANDOFF.md` / `SUPERVISOR_AI_STATUS_2026-07-25.md`差分のstage、commit、push、破棄
- live TypeScript language serverの停止
- primary checkoutでの`npm ci`
- ignored `.serena/` memoryの更新
- public Paper Glider URLとGitHub Actions/Pagesの再検証
- rights範囲の拡張、一般license化

## 再開コマンド

```powershell
Set-Location 'C:\Users\thank\Storage\Game Projects\CodexGameAssetWorkbench'
git fetch --prune origin
git status --short --branch --untracked-files=all
git rev-parse HEAD
git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}'
git rev-list --left-right --count 'HEAD...@{upstream}'
git rev-list --left-right --count 'origin/main...HEAD'
git diff --check
node --version
npm --version
npm ls --depth=0
npm run verify
```

exact candidateのclean-install証拠が必要な場合は、current working treeの差分を先にreviewしてcandidate SHAへ固定し、owner-owned processを避けたdetached worktreeまたはclean cloneで`npm ci`、`npm ls --depth=0`、`npx playwright install chromium`、`npm run verify`を直列実行してください。

## Authority map

| Path | Authority |
|---|---|
| `docs/PROJECT_HANDOFF.md` | 現在地と再開順序 |
| `docs/PROJECT_STATUS_AND_ROADMAP.md` | 監修報告、gap、長期目標、owner判断 |
| `docs/NEXT_AGENT_PROMPT.md` | WB-M1単独実行Prompt |
| `docs/ARCHITECTURE.md` | 現行設計境界 |
| `docs/RECIPE_SCHEMA.md` | Recipe 0.1.0 contract |
| `docs/PAPER_GLIDER_COMPATIBILITY_PACKET_V1.md` | consumer compatibility contract |
| `docs/compat/paper-glider-v1/RIGHTS.md` | project-scoped rights authority |
| `docs/ai/003_PAPER_GLIDER_ARCHIVE_GATE_INTEGRATION_PROMPT.md` | 完了済みdownstream integration要求の履歴 |
