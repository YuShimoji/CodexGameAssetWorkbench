# Direct Manipulation / Visible Placement v1

## 成立したworkflow

このsliceは、browser-firstで作った複合Assetを「Inspectorで数値だけ編集する対象」から「Viewport上で選び、動かし、置ける対象」へ進めます。編集正本はRecipe 0.1.0のままで、Three.js objectや一時previewは保存しません。

| User verb | 対象 | 画面で起きること | Recipe / History |
|---|---|---|---|
| Partをclick | Isolate上の実mesh | Part名、選択輪郭、Inspector、gizmoが同期 | Recipe変更なし |
| Move / Rotate / Scale | 選択Part | drag中もInspector値とRecipe hashが更新 | mouse upでUndo 1件 |
| Instanceをclick | Scene上の実mesh | Instance全体の輪郭とPart contextを表示 | Recipe変更なし |
| InstanceをMove / Rotate / Scale | 選択Instance | cameraをlockし、Instance transformをpreview | mouse upでUndo 1件 |
| Place in Scene | Asset Definition | 半透明previewがGround Planeを追従し、座標をstripに表示 | 確定前はRecipe/History不変 |
| Cancel / Escape / right-click | placement preview | previewとstripだけを閉じる | Recipe/History不変 |
| Confirm placement | preview中Asset | Instanceを1件作り、確定対象を選択 | Undo/Redo 1件 |

## 守るinvariant

- Recipeだけが保存・Undo/Redo・exportの正本です。
- pointerで選ぶIDはRecipeのAsset / Part / Instance Stable IDです。表示順やThree object UUIDを永続化しません。
- Transform gestureは開始時Recipeをbaselineにし、drag中のframe数に関係なく履歴を1件だけ積みます。
- Grid snapはPart / Instance transformとplacement X/Zで共有します。Move 0.25 unit、Rotate 15度、Scale 0.1です。
- Transform handleまたはplacement ground planeがpointerを所有する間、OrbitControlsは無効です。
- placement previewは`PlacementDraft`だけを更新し、Stable IDを予約しません。確定時に既存Recipeを見て衝突しないInstance IDを生成します。
- preview materialは派生objectだけに適用し、共有Material Definitionを変更しません。
- Scene Instanceの明示配置と、seedから展開する`placementRules`は別経路です。後者の決定論とsequence identityを変更しません。
- Recipe schema、Runtime Bundle contract、Paper Glider packet、rightsは変更しません。

## 自動proof

通常のfocused check:

```powershell
npm run test:authoring
npm run test:direct-manipulation
```

root browser gate:

```powershell
npm run test:browser
```

監修用の代表証跡を再生成する場合:

```powershell
npm run direct-manipulation:generate
```

`scripts/browser-direct-manipulation-smoke.mjs`は1600 x 1000 Chromiumで次を実操作します。

| 証明対象 | 実測結果 |
|---|---|
| browser-first入力 | 3 Part、3 Materialの`Direct Review Prop`をUIだけで作成 |
| direct selection | Box、Cylinder、Sphereをrendered meshから個別選択 |
| Part gesture | Move / Rotate / Scaleの3操作、すべてcamera locked、Undo/Redo復元 |
| placement preview | Recipe hash不変、Instance数不変、座標表示、Cancel不変 |
| placement confirm | Instanceをちょうど1件追加、選択同期、Undoで削除、Redoで復元 |
| Scene direct selection | 確定Instanceをrendered Partから再選択 |
| Instance gesture | Move、camera locked、Undo/Redo復元 |
| round-trip | Save→一時変更→Openで`fnv1a-7a6ed385`へ復帰 |
| validation / export | error 0、warning 0、選択Asset GLB 20,352 bytes + manifest |
| browser hygiene | console error 0、number control最小height 28px、native spinner非表示 |

root `test:browser`はこのsmokeに加えて、既存Spline v0.2、browser-first authoring CRUD、安全な削除、Runtime Bundle、Paper Glider compatibility visual smokeを実行します。

## 監修用artifact

`artifacts/direct-manipulation-visible-placement-v1/`に次を保持します。

- `01-isolate-cylinder-direct-selected.png`: 実meshから選択したCylinder、選択輪郭、Move gizmo、Inspector同期
- `02-scene-placement-preview.png`: 半透明preview、cyan輪郭、表示座標、Cancel / Confirm
- `03-scene-confirmed-selected.png`: 確定Instance、Scene Tree / Inspector同期、Instance gizmo
- `direct-review-prop.recipe.json`: Save/Open round-trip後のRecipe
- `readback.json`: gesture前後hash、transform値、placement invariant、validation、export、console結果

readbackはdynamic port、absolute path、timestamp、usernameを含まず、監修packetからlocal machine情報を持ち出しません。画像はdesktop Chromiumの視覚証跡であり、physical mobile/touch、任意surface placement、collision、性能上限を証明しません。

## 意図的な境界

- mobile breakpointでは詳細authoring panelとtransform toolを縮退します。desktop直接操作のphysical touch acceptanceは別gateです。
- placementはGround PlaneとAsset boundsだけを使います。mesh surface、terrain、socket、collisionへのsnapは行いません。
- placement時のrotation/scale調整、複数配置、scatter、physics dropは実装しません。
- selection outlineは編集feedbackであり、GLB / Runtime Bundleへexportしません。
- Paper Glider互換性拡張、main merge、tag、release、deploymentのauthorityをこのsliceから導出しません。
