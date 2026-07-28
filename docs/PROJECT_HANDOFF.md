# CodexGameAssetWorkbench project handoff

最終更新: 2026-07-28 JST

## 現在地

現在の開発状態は **`STUDIO_DIRECT_MANIPULATION_VISIBLE_PLACEMENT_V1_REVIEW_BRANCH_GREEN`** です。

browser-first authoringでAsset / Material / Partを作成し、Viewport上の実meshからPart / Instanceを直接選び、Move / Rotate / Scaleし、半透明previewを見ながらSceneへ1 Instanceを配置できます。direct gestureはRecipe previewを更新しながらUndo履歴を1件にまとめます。placement previewは確定前にRecipeやStable IDを変更せず、Confirm時だけInstanceを追加します。

implementation / evidence commit `dac9dfea7b95e12be2b1f4ae0045074e033da647`は既存review branch `codex/direct-manipulation-visible-placement-v1`へnon-force push済みです。GitHub Actions `Verify` run `30325159695`はWindows / Node 24.13.0で5分0秒、greenでした。このhandoffを含むdocs-only follow-throughのexact SHAとrunは自己参照固定せず、GitとActionsで実測します。`main`、tag、release、deployment、Paper Glider repositoryへのauthorityはありません。

## 開始状態とGit境界

| 項目 | 実測・境界 |
|---|---|
| Repository | `https://github.com/YuShimoji/CodexGameAssetWorkbench.git` |
| Local / upstream | `codex/direct-manipulation-visible-placement-v1` / 同名origin branch |
| Start SHA | `3f1d4d3d1905a7450a1c9d2183ce1a9f041c7392` |
| Browser-first SHA | `42acbaddde511589dbcadb2d3713e8df85d60130` |
| Runtime base SHA | `59bd610e06b5ab1e40354acf597c7eb938646308` |
| `origin/main` | `0dd09801148ead04d211063b00d5e54f3f1cb10f` |
| Start worktree | clean、detached HEAD、指定origin branchとparity 0/0 |
| Preservation | reset / stash / rebase / mergeなし、既存変更の破棄なし |
| Author | `YuShimoji <160492991+YuShimoji@users.noreply.github.com>` |
| Follow-through | 同じreview branchへnon-force commit / push |
| Explicitly excluded | main merge、tag、release、deployment、Paper Glider互換性拡張 |

最終successor SHAは文書内へ自己参照固定せず、`git rev-parse HEAD`で取得します。remote共有状態は`git rev-list --left-right --count 'HEAD...@{upstream}'`で確認します。

## 実装の要点

### Browser-first authoring

- Asset / Material / Primitive PartをUIで新規作成
- Part複製、並べ替え、最低1 Part制約付き削除
- Instance複製・削除、参照中Asset削除block
- Part削除時のVariant / Placement reference repair
- Stable IDを既存Recipeと照合して衝突回避

### Direct manipulation

- Isolateの実meshからPart IDを選択
- Sceneの実meshからInstance IDとPart contextを選択
- Part / Instanceの選択輪郭とtopbar mode / Inspector同期
- Move world space、Rotate / Scale local space
- Snap 0.25 unit / 15度 / 0.1
- drag中preview、mouse upでUndo 1件
- transform中はOrbitControls停止

### Visible placement

- `Place in Scene`でScene modeとtransient `PlacementDraft`へ遷移
- Asset cloneを半透明化し、cyan輪郭とpreview座標を表示
- X/ZはGround Plane pointer、YはAsset boundsの最下点から接地
- Confirm前はRecipe hash / Instance count不変
- Cancel / Escape / right-clickでdraftだけを破棄
- ConfirmでInstanceをexactly 1件追加し、確定対象を選択
- placement確定全体をUndo/Redo 1件にする

設計正本は`docs/DIRECT_MANIPULATION_VISIBLE_PLACEMENT_V1.md`と`docs/ARCHITECTURE.md`です。

## Verification packet

focused proof:

```powershell
npm run test:authoring
npm run test:direct-manipulation
npm run direct-manipulation:generate
```

full local gate:

```powershell
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

`test:browser`は次を直列実行します。

1. Spline v0.2 / Runtime Bundle desktop-mobile smoke
2. browser-first authoring CRUD / safe deletion / Save-Open / export smoke
3. direct manipulation / visible placement / Save-Open / export smoke
4. Paper Glider compatibility visual smoke

Hosted proof:

- workflow: `Verify`
- implementation / evidence SHA: `dac9dfea7b95e12be2b1f4ae0045074e033da647`
- run: `30325159695`
- job: `windows-verify`
- result: success、5分0秒
- annotation: `actions/checkout@v4`と`actions/setup-node@v4`のNode 20 deprecation。runnerはNode 24へ強制し、repository verificationはgreen

focused direct proofの主要値:

| 項目 | 値 |
|---|---|
| Chromium viewport | 1600 x 1000 |
| Recipe | `fnv1a-7a6ed385` |
| Asset | 3 Part / 3 Material |
| Part gesture | Move / Rotate / Scale、全Undo/Redo green |
| Instance gesture | Move、Undo/Redo green |
| placement | preview / Cancel非破壊、Confirm exactly 1、Undo/Redo green |
| Validation | error 0 / warning 0 |
| Selected GLB | 20,352 bytes + manifest |
| Console | error 0 |

監修用artifact:

- `artifacts/direct-manipulation-visible-placement-v1/readback.json`
- `artifacts/direct-manipulation-visible-placement-v1/direct-review-prop.recipe.json`
- `artifacts/direct-manipulation-visible-placement-v1/01-isolate-cylinder-direct-selected.png`
- `artifacts/direct-manipulation-visible-placement-v1/02-scene-placement-preview.png`
- `artifacts/direct-manipulation-visible-placement-v1/03-scene-confirmed-selected.png`

readbackはdynamic port、absolute path、timestamp、usernameを含みません。

## 維持した契約

- Recipe schemaは0.1.0のまま、migrationなし、unknown version fail closed。
- direct previewはThree.js objectを永続化せず、Recipeから再構築。
- seeded Placement Ruleはread-only表示で、明示Instance placementと別経路。
- Runtime Bundle `cgawe-runtime-bundle-1.0.0`のschema、hash、rights、tracked artifactsは不変。
- Paper Glider packetのGLB / manifest / schema / rights / visual evidenceは不変。
- Paper Glider verifierのspace-path proofはcheckout名に依存せず、actual GLB pathと構成した空白入りpathをfile URL round-tripする。
- Generic Runtime Bundle rightsは`NOASSERTION`。
- canonical byte verification runtimeはNode 24.13.0。Node 22系は一般supportだけで、cross-patch bytesは保証しない。

Paper Glider pin:

- Recipe `fnv1a-3383aa61`
- content `sha256:04461554becd391625cc834460196186e32a6c08a393e34c210bd1d45503d397`
- GLB `sha256:e91d1a4b87c2c0a7d3c6698c320c13239b3751c03884b3a4c6b5b6853be1d019`
- manifest `sha256:b9c41a053e97d061ac4795c77d8f628e93f0a40adef6f718614e614c861e1bd5`
- schema `sha256:abbd570b742de3ae87904069dfd0b27f26a0e223999e1cfa760dec81a26a4e39`
- rights `sha256:481eb1980eb1728eefb84c6a5fb5bdf307185e99e7089e511e927ebf49958c9f`
- Rights ID `LicenseRef-PaperGlider-Project-Asset`

## Known residuals

| 残件 | 現在の安全境界 | 再開時の最初の一手 |
|---|---|---|
| physical touch未受入 | desktop authoringを正本、mobileはpanel縮退 | 実機matrixとtouch gesture acceptanceを固定 |
| Ground Plane限定 | bounds接地だけを保証 | surface placement contractを別slice化 |
| overlap pick | Tree / selectをfallbackとして維持 | pick cyclingのUX prototype |
| placement中rotation/scaleなし | Confirm後にInstance選択を保持 | PlacementDraftのtransform項目を設計 |
| JS chunk約1.38 MB | warningとして分離、機能errorではない | build budgetを決めてcode split |
| `npm audit` high 6 | critical 0、auto-fix未実施 | advisory別impactと更新matrix |
| Actions v4 Node 20 deprecation | current runはNode 24 forcedでgreen | actions v5 migrationを専用review |

## 再開順序

```powershell
git status --short --branch --untracked-files=all
git rev-parse HEAD
git fetch --prune origin
git branch -vv
git rev-list --left-right --count 'HEAD...@{upstream}'
git rev-list --left-right --count 'origin/main...HEAD'
node --version
npm ci
npm ls --depth=0
npx playwright install chromium
npm run verify
git diff --check
```

Nodeが24.13.0でなければ、機能checkは実行できてもPaper Glider canonical bytesの最終判定に使いません。`.node-version`とCIのexact runtimeを優先します。

## Context map

| Path | 読む理由 |
|---|---|
| `docs/PROJECT_STATUS_AND_ROADMAP.md` | 監修判断、残るgap、次の入口 |
| `docs/DIRECT_MANIPULATION_VISIBLE_PLACEMENT_V1.md` | 今回のworkflow、invariant、proof |
| `docs/ARCHITECTURE.md` | Recipe transactionと表示objectの境界 |
| `artifacts/direct-manipulation-visible-placement-v1/readback.json` | focused browser実測 |
| `scripts/browser-authoring-smoke.mjs` | browser-first authoring acceptance |
| `scripts/browser-direct-manipulation-smoke.mjs` | direct操作とplacement acceptance |
| `docs/RUNTIME_BUNDLE_V1.md` | 既存runtime contract |
| `docs/RECIPE_SCHEMA.md` | Recipe 0.1.0 authority |
| `docs/PAPER_GLIDER_COMPATIBILITY_PACKET_V1.md` | protected consumer packet |
| `docs/compat/paper-glider-v1/RIGHTS.md` | protected rights scope |
