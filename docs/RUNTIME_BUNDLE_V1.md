# Runtime Bundle v1 contract

`cgawe-runtime-bundle-1.0.0`は、Recipe 0.1.0のWhole Recipeを、実行時に読み込めるGLBとversioned manifestへ決定論的に変換する汎用contractです。編集正本は引き続きRecipeであり、GLBとmanifestは同じRecipeから再生成できる派生物です。

## 出力

`buildRuntimeBundle(recipe)`は次を返します。

- `<projectId>.runtime.glb`
- `<projectId>.runtime.manifest.json`
- parse済みmanifest object

manifestのJSON Schema正本は`schemas/runtime-bundle-1.0.0.schema.json`です。canonical manifestにはtimestamp、absolute path、username、machine固有識別子を含めません。

## Whole Recipeの範囲

Runtime Bundleは単一選択Assetではなく、次をひとつのrootへ展開します。

- `sceneInstances`: Instance override解決後のAsset、Transform、Variant、Part
- `placementRules`: seed固定で展開した全placement、sequence index、Transform、Variant seed、Part
- `splineDefinitions`: 実際のsweep mesh
- `roomDefinitions`: versioned volume metadataとGLB node
- `socketDefinitions`: room参照、type、position、orientation、compatible tagsとGLB node

Workbench viewportもScene InstanceのPart overrideを`resolveInstanceAsset`で解決するため、画面表示とRuntime Bundleが同じRecipe意味論を共有します。

## Stable node identity

全export nodeは`nodeMap`へ登録されます。`stableId`と`glbNodeName`は一致し、GLTFLoaderで実在nodeへ解決できなければ検証失敗です。

| Kind | 形式 |
|---|---|
| root | `runtime-root--<projectId>` |
| scene instance | `scene-instance--<instanceId>` |
| scene part | `scene-part--<instanceId>--<partId>` |
| placement | `placement--<ruleId>--<sequenceIndex>` |
| placement part | `placement-part--<placementId>--<partId>` |
| spline / room / socket | `<kind>--<sourceId>` |

Three.jsがnode nameを読み替えないASCII安全形式を使用します。Recipe IDに安全文字以外がある場合はcode pointを決定論的にescapeします。

## Coordinate、hash、rights

- right-handed
- `+Y` up
- `-Z` forward
- meter
- rotationはradian
- RecipeはCore canonical JSONのFNV-1a識別子とSHA-256を保持
- GLBはbyte lengthとSHA-256を保持
- Generic exportのrights既定値は`NOASSERTION`

Paper Glider固有の`LicenseRef-PaperGlider-Project-Asset`はGeneric Runtime Bundleへ自動継承しません。明示的なrights入力を与える場合だけ`DECLARED`を使用します。既存`paper-glider-compat-v1` packetとそのbyte identityは別contractとして維持します。

## Fail-closed validation

Recipe validation errorが1件でもあれば`RuntimeBundleValidationError`を返し、GLTFExporterを呼びません。Workbench UIは先頭error messageと総error数を通知し、ダウンロードを開始しません。正常時はGLBとmanifestの2ファイルを保存し、project ID、node count、triangle countをstatusへ表示します。

## 再生成と検証

```powershell
npm run runtime:generate
npm run runtime:check
```

`runtime:generate`は承認対象のactual artifactsを`artifacts/runtime-bundle-v1/`へ書きます。`runtime:check`はStarterとPaper Glider canaryの2入力を同じ公開entryから各2回生成し、次を検証します。

- GLBとmanifestのbyte determinism
- Runtime manifest JSON Schema
- GLTFLoaderによるactual GLB parse
- node map、scene part、placement part、room/socket参照
- finite transforms、bounds、counts
- GLB hashとbytes
- Generic rights `NOASSERTION`
- canonical manifestからlocal disclosureがないこと
- tracked artifactとのbyte一致

actual evidence:

- `starter-atelier.runtime.glb`: 90,708 bytes、41 manifest nodes、2,720 triangles
- `paper-glider-archive-gate-v1.runtime.glb`: 30,820 bytes、13 manifest nodes、1,064 triangles
- `runtime-bundle-readback.json`: 2入力のmachine-readable検証結果
- `runtime-bundle-desktop.png`: desktop export success
- `runtime-bundle-mobile.png`: 390 x 844 export success

Browser smokeはSelected Asset exportとRuntime Bundle exportを別操作として実行し、不正Recipeのdownload 0件、正常Recipeの2件、desktop/mobileのstatusとtopbar収まりを検証します。
