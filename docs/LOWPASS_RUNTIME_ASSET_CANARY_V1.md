# LOWPASS Runtime Asset Canary v1

最終更新: 2026-07-27 JST

## 結論

`lowpass-readability-canary-v1`は、CodexGameAssetWorkbenchの既存Runtime BundleをLOWPASS: SALVAGE ATLAS向けに小さく拡張した、remote-shared / not-integratedのconsumer canaryです。適合度は **B（小規模拡張で対応可能）** です。

このcanaryは次を実証します。

- Needle / Watcher / Porter / push-cart / field terminalの5役を、project-owned procedural Recipeから同時生成する
- `+Y` up、`-Z` forward、1 unit = 1 meterを固定する
- Stable node、material、socket、collision proxy、interaction anchorをversioned manifestへ束縛する
- 同じRecipeとseedから同一GLB・同一manifestを再生成する
- actual `GLTFLoader`でGLBを再読込し、semantic reference、有限値、bounds、budget、disposeを検査する
- PS1-off / PS1-onの1200 x 675 visual proofで役割と陣営のシルエットを比較する
- invalid Recipeとinvalid LOWPASS definitionを構造化errorでfail closedにする

LOWPASS本体への統合、Phase Gの人間感覚評価、Phase H、既存Security Cellの距離・delay・scan・音・文言の調整はこの成果に含みません。

## 正本と派生物

| 種別 | Path | 役割 |
|---|---|---|
| Recipe正本 | `samples/lowpass-canary/lowpass-readability-canary-v1.recipe.json` | Geometry、material、instance transform、seed |
| Consumer definition | `samples/lowpass-canary/lowpass-readability-canary-v1.definition.json` | LOWPASS role、faction、semantic anchor、budget、provenance |
| Manifest schema | `schemas/lowpass-runtime-asset-pack-1.0.0.schema.json` | Machine-readable delivery contract |
| Adapter entry | `packages/adapter-three/src/lowpass-runtime.ts` | Contract validationとgeneric Runtime Bundleへの変換 |
| Generator/check | `scripts/lowpass-canary.mjs` | Determinism、schema、actual load、budget、tracked artifact照合 |
| Visual proof | `scripts/lowpass-canary-proof.mjs` | local HTTP + PlaywrightによるPS1-off/on証拠生成 |
| Derived artifacts | `artifacts/lowpass-canary-v1/` | GLB、manifest、readback、2 visual proofs |

Recipeとconsumer definitionが編集正本です。GLB、manifest、readback、PNGは正本から再生成できるtracked evidenceで、逆方向の編集正本にはしません。

## Asset contract

| Role | Readability intent | Required semantics |
|---|---|---|
| `hostile-needle` | 細い前方指向、単体追尾を示す狭い輪郭 | `scan`、`lock-on`、collision proxy |
| `hostile-watcher` | Needleより広く高い監視輪郭 | `scan`、`visual-center`、collision proxy。`lock-on`は禁止 |
| `allied-porter` | 味方色、運搬役を示す胴体と腕 | `carry`、`interaction`、`communication`、collision proxy |
| `push-cart` | 後方handle、荷台、4 wheel | `handle`、`load`、2個以上のwheel、collision proxy |
| `field-terminal` | 操作面が読める小型端末 | `interaction`、`screen`、collision proxy |

各Assetは次をmanifestへ持ちます。

- stable asset key、asset ID、instance ID、root/node/material ID
- visual node、collision proxy、socket、interaction anchor
- role、faction、forward axis
- local bounds、triangle/vertex/material count、texture dimensions
- LOD0 node set
- source provenance、rights

現在のpackは5 assets、50 stable nodes、44 parsed meshes、1,068 triangles、728 vertices、10 material objects、9 anchors、5 collision proxiesです。各Assetのmaterial budgetは最大2、triangle budgetは20,000、texture dimension budgetは1,024です。

## Determinismとvalidation

`npm run lowpass:check`は次をfail closedで検査します。

1. 同一Recipe + seedを2回生成し、GLB bytesとcanonical manifest textを比較
2. `lowpass-runtime-asset-pack-1.0.0` JSON Schema
3. actual `GLTFLoader.parseAsync`
4. Stable node/material/socket/collision/anchor reference
5. finite transform/boundsとGLB hash/bytes
6. per-asset triangle/material/texture budget
7. geometry/material dispose smoke
8. invalid Recipeの`RuntimeBundleValidationError`
9. semantic欠落の`LowpassAssetContractError`
10. absolute path、username、`file://`の非混入
11. tracked GLB/manifest/readback/visual proofの現行identity一致

生成:

```powershell
npm run lowpass:generate
```

再検証:

```powershell
npm run lowpass:check
npm run lowpass:visual
```

`npm run verify`は既存Schema、build、typecheck、lint、Vitest、generic Runtime Bundle、Paper Glider compatibility、browser smokeに加えてLOWPASS canary checkとvisual proofを実行します。

## 変更管理

| contract | before | after | compatibility | migration / user impact |
|---|---|---|---|---|
| Generic Runtime Bundle adapter options | Partごとにmaterial objectを生成し、material名保持のconsumer optionなし | `preserveMaterialIds`と`reuseMaterials`をopt-in追加 | 既定値はfalse/未指定。既存Starter、Paper Glider、Workbench出力は不変 | 既存Recipe、manifest、consumerのmigrationなし |
| LOWPASS runtime artifact | contractなし | `lowpass-runtime-asset-pack-1.0.0` schema、definition、adapter entry、GLB/manifest/readback/proof | Generic `cgawe-runtime-bundle-1.0.0`を内包し、別artifact identity | LOWPASS consumerはversionと`assetKey`を明示的に読込む必要あり |
| Root verification | Generic Runtime BundleとPaper Gliderまで | `lowpass:check`とLOWPASS visual proofを追加 | 既存gateを削除・緩和しない | verify時間が増加し、Playwright Chromiumが必要 |
| Runtime material disposal | Meshごとにdisposeを呼ぶ | geometry/material objectをSetで一度ずつdispose | 重複disposeを避けるだけで公開API不変 | migrationなし |
| Visual proof output | LOWPASS proofなし | tracked evidenceとignored local proof outputを分離 | 既存`output/playwright`/`output/compat`を維持 | local `output/lowpass-canary-proof/`は非正本 |

## Visual proof

`scripts/lowpass-canary-proof.mjs`はloopback serverだけを使用し、外部requestを0件に固定します。Chromium cold-startで最初のWebGL readbackが未合成になる環境を考慮し、明示的なwarm-up pageの後に証拠を採取します。

- `lowpass-readability-canary-v1.ps1-off.png`: bilinear CPU upscale
- `lowpass-readability-canary-v1.ps1-on.png`: nearest-neighbor upscale
- 両方1200 x 675
- collision、anchor、visual-center markerはmanifest参照に残し、visual proofでは非表示
- console/page error 0
- external request 0
- 29 visible meshes
- role/faction色のforeground pixelが各1,000以上
- screenshot後にgeometry/material disposeを実行

このvisual proofは固定lineupでの可読性証拠です。LOWPASS本体のカメラ、霧、照明、距離、動作、プレイヤー入力を含む人間評価の代替ではありません。

## Blender、texture、rights

作業環境では`blender` commandがPATHに存在しませんでした。外部softwareは導入していません。

そのため現在のtexture stageは次の通りです。

- status: `UNAVAILABLE_NO_BLENDER`
- UV: なし
- texture: 0
- Blender Python/headless export: 未試験
- production texturing: 未完了

geometry、flat material、semantic node、runtime packageは検証済みです。UV unwrap、texture bake、atlas、mipmap、compressionは別sliceです。

source typeは`project-owned-procedural-recipe`ですが、rights statusは`NOASSERTION`です。このcanaryは第三者配布許諾や一般licenseを主張しません。Paper Glider固有の`LicenseRef-PaperGlider-Project-Asset`を流用していません。

## LOWPASS統合の最小境界

統合を開始する場合、LOWPASS側で必要な最小作業は次です。

1. exact canary commitとartifact hashを固定する
2. GLBを既存Asset loaderの新しいconsumer fixtureとして読込む
3. manifest schema versionをfail closedで確認する
4. `assetKey`から既存runtime roleへ明示的に割り当てる
5. collision proxyとinteraction anchorを既存state ownerへ接続する
6. Security Cellの状態所有、距離、delay、scan、音、文言を変更せずvisualだけ比較する
7. asset off/onを同一scenario、同一camera、同一seedで比較する
8. resource disposalとfallbackを確認する

canary assetが不採用でも、既存LOWPASS assetへ即時復帰できるfeature flagまたはfixture-level switchを保持します。実ゲーム統合の技術greenとPhase G人間評価は別gateです。

## 既知の残作業

| Purpose | Effect | Requirements | State | Owner | Next move |
|---|---|---|---|---|---|
| LOWPASS consumer fixture | 実ゲームloaderでcontractを実証 | exact artifact identity、fail-closed version、fallback | 未着手 | LOWPASS runtime owner | 独立integration slice |
| In-game readability | 実カメラ・霧・距離で役割を判定 | Gate G-A再受入後、固定scenario、asset toggle | 未評価 | Human evaluator / art owner | 技術統合後に別評価 |
| UV/texture profile | production texturingを可能に | Blenderまたは同等tool、UV contract、bake、budget | tool unavailable | Asset pipeline owner | software導入権限を別途取得 |
| LOD progression | 距離別costを制御 | LOD1/2、screen-size threshold、popping test | LOD0のみ | Runtime/asset owner | 1 assetでthin slice |
| Rights declaration | 配布条件を明示 | owner declaration、license registry、provenance audit | `NOASSERTION` | Rights owner | distribution前の独立gate |
| Remote/CI | 別端末とremote Windowsで再現 | exact branch、PRまたはworkflow trigger、Actions run | branch shared / upstream parity、run 0 | Repository owner | PRかtrigger変更を別承認 |
