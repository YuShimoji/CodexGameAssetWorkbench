# Codex Game Asset Workbench

Codexが編集するJSON Recipeと、人間が操作するブラウザUIを同じ保存・検証経路へ接続する、エンジン非依存のプロシージャル3Dアセット基盤です。v0.2は汎用starter projectをActive Artifactとして読み込み、Primitive、Material、Instance、Room、Socket、Seed付き配置に加え、Splineの作成・control point・profile keyframeをViewportとInspectorから直接編集できます。

## 起動

Node.js 22以降を使用します。

```powershell
npm install
npm run dev
```

ブラウザで `http://localhost:4173` を開きます。最初から `samples/starter-project/recipe.json` と同じ内容が読み込まれます。

Visual Proofを含む全ブラウザ検証を初回実行する前に、Playwright用Chromiumを導入します。

```powershell
npx playwright install chromium
npm run test:browser
```

## パッケージ境界

| 場所 | 責任 | 持ち込まないもの |
|---|---|---|
| `packages/schema` | Recipe型、JSON Schema、明示的なversion gate | Three.js、React、生成アルゴリズム |
| `packages/core` | Seeded RNG、Primitive/Spline MeshData、Variant、Placement、参照検証、hash・diff・統計 | DOM、React、Three.js object |
| `packages/adapter-three` | MeshDataからBufferGeometry/Object3Dへの変換、Three material | Recipeの正本状態、UI transaction |
| `packages/cli` | inspect / validate / diff / summarizeのJSON入出力 | ブラウザ状態、描画オブジェクト |
| `apps/workbench` | Recipe transaction、3D viewport、Inspector、保存・再読込、Undo/Redo、GLB派生出力 | Core生成規則の再実装 |

依存方向は `schema ← core ← adapter-three ← workbench` です。CLIは`schema`と`core`だけを利用します。

## Workbenchで実装済みの操作

- Asset Catalogから複合Assetを選び、Isolate表示する
- OrbitControlsで回転・パン・ズームする
- Scene Instanceを選択し、TransformControlsまたは数値入力で移動・回転・拡縮する
- Scene TreeからPart、Spline、Room、SocketをStable IDのまま選択する
- 明示的なSpline作成モードでGround Planeをクリックし、確定または取消する
- 選択Splineのcontrol pointをViewportで選択・gizmo移動し、Ground Planeクリックで追加・segment挿入、ToolbarまたはDeleteキーで削除する
- Grid snap、control point座標、並べ替え、最低2点制約をInspectorとViewportで共有する
- box / cylinder / plane / sphereの寸法とPart transformを編集する
- Materialの色、roughness、metalnessを共有Definitionへ反映する
- Instance OverrideをDefinitionから分離し、Revertまたは明示的にDefinitionへApplyする
- 同一Splineをrod / road / corridor断面へ切り替える
- rodのradius、roadのwidth、corridorのwidth/height keyframeを正規化位置0〜1で追加・選択・編集・削除する
- 経路長、曲率、profile変化量からadaptive segment数を算出し、vertex/triangle countをInspectorへ表示する
- Seed付きVariantとSpline Placementを再生成する
- Room Volumeと壁面SocketをScene上で確認する
- Recipe変更をUndo/Redoし、JSONへ保存、再読込、Revert、starter Resetする
- Schema・参照・生成MeshのValidation、Recipe diff、Seed、生成統計を下部dockで読む
- 選択Assetを実GLBへ書き出し、Recipe hashと生成統計を含むsidecar manifestも同時に保存する

GLB、manifest、スクリーンショットは派生物です。編集上の正本は常にversion付きRecipe JSONです。

## CLI

先に`npm run build:packages`を実行します。

```powershell
node packages/cli/dist/index.js inspect samples/starter-project/recipe.json --json
node packages/cli/dist/index.js validate samples/starter-project/recipe.json --json
node packages/cli/dist/index.js diff before.recipe.json after.recipe.json --json
node packages/cli/dist/index.js summarize samples/starter-project/recipe.json --json
```

`validate`は`severity`、`code`、`assetId`、`recipePath`、`message`を持つissueを返します。未知の`schemaVersion`は暗黙に読み替えません。

## 検証

```powershell
npm run schema:check
npm run build
npm run typecheck
npm run lint
npm test
npm run test:browser
git diff --check
```

実画面証跡、保存→再読込に使ったRecipe、GLB/manifest、機械可読readbackの生出力は`output/playwright/`へ生成され、Gitでは追跡しません。基準版として選別した証跡は[`artifacts`](./artifacts)に保存します。

## Paper Glider compatibility packet

Paper Glider `3ad5ac1`をread-onlyの実装基準として検証した`paper-glider-compat-v1` contract、再生成可能なArchive Gate canary、GLB、manifest、schema、視覚証跡を[`docs/compat/paper-glider-v1`](./docs/compat/paper-glider-v1)に保存しています。runtime境界はGLB + validated manifestであり、Recipe 0.1.0はWorkbench側のbuild-time正本です。

```powershell
npm run compat:generate
npm run compat:check
```

`compat:generate`はcanonical bundleと5状態の画像証跡を再生成します。`compat:check`はmanifest schema、実GLB load、node/collider参照、finite transform、scale、Recipe Save→Reload、hash、Windows空白入りpath、GitHub Pages base URLを検証します。互換性表と統合境界は[`docs/PAPER_GLIDER_COMPATIBILITY_PACKET_V1.md`](./docs/PAPER_GLIDER_COMPATIBILITY_PACKET_V1.md)を参照してください。これはPaper Glider runtimeへの統合済み証明ではありません。

## v0.2で意図的に扱わないもの

Paper Glider runtimeへのloader/world統合、Unity/Godot/Unreal Adapter、汎用Scene全体GLB bundle、Blender add-on、Bezier curve editor、任意頂点モデリング、UV/Texture Paint、Morph/Fracture/物理破壊、天候、高度なSpawner、クラウド保存、共同編集、外部AIサービスは実装していません。存在するように見せる無効なUIも置いていません。

詳しい設計は[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)、Recipe契約は[`docs/RECIPE_SCHEMA.md`](./docs/RECIPE_SCHEMA.md)を参照してください。

別端末で現在地点から再開するときは、commit、branch、author設定、検証値、Context mapをまとめた[`docs/PROJECT_HANDOFF.md`](./docs/PROJECT_HANDOFF.md)から読んでください。過去の実装依頼原文は[`docs/ai`](./docs/ai)に保存しています。
