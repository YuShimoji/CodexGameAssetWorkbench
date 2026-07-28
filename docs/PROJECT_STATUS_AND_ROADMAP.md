# CodexGameAssetWorkbench 監修AI向け現状報告・長期ロードマップ

最終更新: 2026-07-28 JST

## 現在の結論

Codex Game Asset Workbenchは **`STUDIO_DIRECT_MANIPULATION_VISIBLE_PLACEMENT_V1_REVIEW_BRANCH_GREEN`** です。

既存のRecipe 0.1.0、Spline v0.2、Runtime Bundle v1、Paper Glider compatibility packetを維持したまま、ブラウザだけでAsset / Material / Partを作り、Isolate上のPartとScene上のInstanceをrendered meshから直接選び、Move / Rotate / Scaleし、半透明previewを見ながらSceneへ1 Instance配置できるauthoring loopが成立しました。

direct manipulationはdrag中もRecipeとInspectorを同期しますが、履歴はmouse upごとに1件です。visible placementは確定前にRecipeやStable IDを変更せず、Cancelで完全に破棄し、Confirm時だけInstanceを1件作ります。いずれもSave/Open round-trip、Undo/Redo、Validation、Selected Asset GLB exportまで同じRecipe経路を通ります。

このsliceのfollow-throughでは、追加済みsmokeをroot `test:browser` / `verify`へ接続し、3画面・round-trip Recipe・machine readbackを監修用artifactへ固定し、architecture、status、handoffを現在枝へ更新しました。公開review枝以外のbranch、`main`、tag、release、deployment、Paper Glider repositoryは変更していません。

implementation / evidence commit `dac9dfea7b95e12be2b1f4ae0045074e033da647`は同じreview branchへnon-force push済みで、GitHub Actions `Verify` run `30325159695`がWindows / Node 24.13.0で5分0秒、greenです。この文書を含むdocs-only follow-throughのexact SHAとrunは自己参照固定せず、GitとActionsで実測します。

## Workflow上の変化

| 以前の摩擦 | 今回の操作 | 制作判断への効果 | 証拠 |
|---|---|---|---|
| 複合Asset作成が既存Recipe編集に依存 | UIでAsset / Material / 4種Primitive Partを作成・複製・並べ替え・削除 | JSON手編集なしで最初のpropを組み立てられる | browser-authoring smoke |
| Inspector値と実形状の対応を目で探す | rendered Partをclickし、輪郭・context・Inspectorを同期 | どのPartを編集するか一意になる | `01-isolate-cylinder-direct-selected.png` |
| transform結果を数値変更後に確認 | ViewportのMove / Rotate / Scaleをdrag中preview | 空間判断とRecipe transactionが同じ操作になる | gesture hash / transform readback |
| Add to Sceneが位置を選べない即時追加 | 半透明preview、接地、座標strip、明示Confirm | 配置前に見た目と位置を判断でき、Cancelで汚さない | `02-scene-placement-preview.png` |
| 作ったInstanceの継続編集にTree再探索が必要 | Confirm後に新Instanceを選択し、Scene実形状から再選択 | placementから調整までselection contextが連続する | `03-scene-confirmed-selected.png` |
| 新browser機能がfocused scriptだけに留まる | authoring / direct smokeをroot browser chainへ統合 | full verifyが新workflowの退行を検出する | `package.json` browser chain |

## 実装とinvariant

詳細正本は`docs/DIRECT_MANIPULATION_VISIBLE_PLACEMENT_V1.md`です。

- IsolateはPartごとにlocal geometryとRecipe transformを分け、Stable Part IDをpointer selectionへ使います。
- Sceneは解決済みAssetの実meshからInstance IDとPart IDを選びます。
- 選択輪郭はraycastを持たない派生表示で、選択操作やexportへ混入しません。
- gesture開始時のRecipe / Selectionをbaselineにし、preview frame数によらずUndo 1件にします。
- Moveはworld、Rotate / Scaleはlocalです。Snapは0.25 unit / 15度 / 0.1です。
- transform中とplacement中はOrbitControlsを止め、cameraと編集対象の同時移動を防ぎます。
- placement previewはUI-only `PlacementDraft`です。Confirm時だけ既存Recipeに対して衝突しないInstance IDを生成します。
- preview用material変更はcloneされた表示objectだけに適用し、共有Material Definitionを変更しません。
- 明示Scene Instance配置とseeded `placementRules`は別経路です。決定論、sequence identity、Runtime Bundle expansionを変えません。
- Recipe schema、Core generation、Runtime Bundle manifest、Paper Glider packet、rights contractは変更しません。

## Actual browser proof

focused direct-manipulation runはChromium 1600 x 1000で次を実測しました。

| 項目 | 実測 |
|---|---|
| authored Asset | `asset-direct-review-prop`、3 Part、3 Material |
| direct Part selection | Direct Box / Cylinder / Sphere |
| Part gestures | Move / Rotate / Scale、すべてcamera locked、Undo/Redo復元 |
| Instance gesture | Move、camera locked、Undo/Redo復元 |
| placement preview | Recipe hash不変、Instance count不変、Cancel不変 |
| placement confirm | exactly 1 Instance、座標`[2.5, 0.06, 2.75]`、Undo/Redo復元 |
| Scene direct pick | confirmed Instanceをrendered Partから再選択 |
| Save/Open | `fnv1a-7a6ed385`へ復帰 |
| Validation | error 0 / warning 0 |
| Selected Asset export | GLB 20,352 bytes + manifest |
| Browser hygiene | console error 0、number input height 28px以上 |

browser-first authoring focused runは、3 Part / 2 Materialの`Review Prop`、Asset / Part / Material / InstanceのCRUDとUndo/Redo、referenced Asset削除block、Part参照repair、Save/Open hash一致、GLB 20,312 bytes + manifest、Validation error 0 / warning 0、console error 0を確認しました。

監修用正本:

- `artifacts/direct-manipulation-visible-placement-v1/readback.json`
- `artifacts/direct-manipulation-visible-placement-v1/direct-review-prop.recipe.json`
- `artifacts/direct-manipulation-visible-placement-v1/01-isolate-cylinder-direct-selected.png`
- `artifacts/direct-manipulation-visible-placement-v1/02-scene-placement-preview.png`
- `artifacts/direct-manipulation-visible-placement-v1/03-scene-confirmed-selected.png`

画像は選択輪郭、gizmo、Inspector同期、placement strip、半透明preview、確定後Instanceを目視確認済みです。persistent UIは左右panelと上部barに留まり、中央の編集対象を塞ぐ新しいoverlayはありません。

## Regressionと基盤の継承

| 既存能力 | 現在の扱い | 変更有無 |
|---|---|---|
| Recipe 0.1.0 | 編集・保存・検証の唯一の正本 | schema / migration変更なし |
| Spline v0.2 | 作成、点編集、profile、adaptive sweep | 既存browser smokeで回帰 |
| Runtime Bundle v1 | Whole Recipe GLB + versioned manifest | contract / artifact変更なし |
| Paper Glider compatibility | pinned GLB / manifest / schema / rights | read-only、拡張なし |
| Node canonical runtime | `.node-version`の24.13.0 | pin変更なし |
| Windows GitHub Actions | exact Node、locked install、Chromium、root verify | `dac9dfe` run `30325159695` green |

compatibility verifierの空白path proofは、旧開発機のcheckout名`Game Projects`を必須にする環境依存assertから、actual GLB pathと明示的な空白入りproof pathをそれぞれfile URL round-tripするportable checkへ修正しました。packet bytes、schema、公開URL、rights、生成器は変更していません。

Paper Glider固有bundleのpinは維持します。

- Recipe `fnv1a-3383aa61`
- content `sha256:04461554becd391625cc834460196186e32a6c08a393e34c210bd1d45503d397`
- GLB `sha256:e91d1a4b87c2c0a7d3c6698c320c13239b3751c03884b3a4c6b5b6853be1d019`
- manifest `sha256:b9c41a053e97d061ac4795c77d8f628e93f0a40adef6f718614e614c861e1bd5`
- schema `sha256:abbd570b742de3ae87904069dfd0b27f26a0e223999e1cfa760dec81a26a4e39`
- rights `sha256:481eb1980eb1728eefb84c6a5fb5bdf307185e99e7089e511e927ebf49958c9f`
- Rights ID `LicenseRef-PaperGlider-Project-Asset`

Generic Runtime Bundleのrights既定値は引き続き`NOASSERTION`です。

## Gitと公開境界

| 項目 | 現在地 |
|---|---|
| Review branch | `codex/direct-manipulation-visible-placement-v1` |
| Upstream | `origin/codex/direct-manipulation-visible-placement-v1` |
| Slice predecessor | `3f1d4d3d1905a7450a1c9d2183ce1a9f041c7392` |
| Browser-first predecessor | `42acbaddde511589dbcadb2d3713e8df85d60130` |
| Runtime base | `59bd610e06b5ab1e40354acf597c7eb938646308` |
| `origin/main` | `0dd09801148ead04d211063b00d5e54f3f1cb10f` |
| Author | `YuShimoji <160492991+YuShimoji@users.noreply.github.com>` |
| Allowed follow-through | 同じreview branchへのnon-force commit / push |
| Not authorized | merge、tag、release、deployment、Paper Glider互換性拡張 |

開始時はdetached HEADでしたが、worktreeはcleanで指定remote先端と一致していました。同名local tracking branchを作り、既存変更をreset / stash / overwriteしていません。最終SHAとremote parityは自己参照を避け、`git rev-parse HEAD`と`git rev-list --left-right --count HEAD...@{upstream}`で実測します。

## 残る不確実性

| Gap | 影響 | 現在の緩和 | 解消条件 |
|---|---|---|---|
| physical touch未確認 | mobile/tabletでgizmo精度を保証できない | desktopをauthoring主対象にし、mobileはpanelを縮退 | 実機touch matrixと専用gesture acceptance |
| Ground Plane限定 | terrainやmesh surfaceへ正しく接地しない | Y=0とbounds resting Yを明示 | surface raycast / normal / collision-aware contract |
| placementでrotation/scale不可 | 向きと大きさは確定後に調整が必要 | Confirm後にInstanceを選択したままにする | placement draft transform UI |
| selection overlap | 奥の小Partは手前objectに遮られる | Tree / Part selectをfallbackとして維持 | pick cycling、outline layers、focus command |
| 初期JS chunk約1.38 MB | 初回load cost | local workbenchで機能一貫性を優先 | code splitとbundle budget |
| `npm audit` high 6 | dev toolchain / Ajv依存に既知advisory | critical 0、broad auto-fixを分離 | 専用dependency sliceとfull regression |
| Actions v4 Node 20 deprecation annotation | checkout/setup-node v4が将来runnerで非推奨runtimeを参照 | hosted runはNode 24へ強制されgreen、appのNode pinは24.13.0 | actions v5 migrationを専用差分で検証 |

## 次に進める入口

| 入口 | 解くbottleneck | 選ぶと可能になること | Authority |
|---|---|---|---|
| Audit: Actions runtime | v4 actionのNode 20 deprecation | 将来runner更新前にworkflow warningを消せる | action major更新の専用review |
| Audit: direct manipulation UX | overlap、gizmo精度、keyboard/pointer中断 | production authoringでの操作失敗を減らす | 新しいUX acceptanceが必要 |
| Advance: surface placement | Ground Plane限定 | terrain / mesh / socketへ意味のある配置 | placement contractの別slice |
| Excise: bundle/dependency cost | 1.38 MB chunkとhigh advisory | load/security residualを機能sliceから切り離して解消 | 依存更新authorityが必要 |

mainline化はgreen review branchの監修受入後に行う独立判断です。`main` merge、tag、release、deploymentを次作業の暗黙の一部にしません。

## 再開コマンド

```powershell
git status --short --branch --untracked-files=all
git rev-parse HEAD
git fetch --prune origin
git rev-list --left-right --count 'HEAD...@{upstream}'
git rev-list --left-right --count 'origin/main...HEAD'
git branch -vv
node --version
npm ci
npm ls --depth=0
npx playwright install chromium
npm run verify
git diff --check
```

canonical artifactのbit-exact verificationは`.node-version`のNode 24.13.0で実行します。Node 22系は一般support範囲ですが、Paper Glider GLB JSON material値がV8 patch間で微小差を持つため、cross-Node-patch byte determinismは保証しません。

## Authority map

| Path | Authority |
|---|---|
| `docs/PROJECT_HANDOFF.md` | 現在地、Git境界、再開順序 |
| `docs/PROJECT_STATUS_AND_ROADMAP.md` | 監修向け現在状態と次の入口 |
| `docs/DIRECT_MANIPULATION_VISIBLE_PLACEMENT_V1.md` | direct manipulation / placementの操作・invariant・proof |
| `artifacts/direct-manipulation-visible-placement-v1/readback.json` | focused browser実測 |
| `docs/ARCHITECTURE.md` | Recipe transactionと表示objectの境界 |
| `docs/RUNTIME_BUNDLE_V1.md` | Runtime Bundle contract |
| `schemas/runtime-bundle-1.0.0.schema.json` | Runtime manifest machine contract |
| `docs/RECIPE_SCHEMA.md` | Recipe 0.1.0 |
| `docs/PAPER_GLIDER_COMPATIBILITY_PACKET_V1.md` | Paper Glider固有packet |
| `docs/compat/paper-glider-v1/RIGHTS.md` | Paper Glider project-scoped rights |
