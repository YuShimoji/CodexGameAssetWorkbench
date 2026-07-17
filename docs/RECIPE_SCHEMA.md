# Recipe Schema 0.1.0

正本Schemaは`packages/schema/src/schema.ts`です。配布・他言語参照用の`schemas/recipe-0.1.0.schema.json`は`npm run schema:sync`で生成し、`npm run schema:check`で同期を検証します。

## 現在のtop-level要素

| 要素 | 役割 | 安定性 |
|---|---|---|
| `schemaVersion` | 読込契約。現在は`0.1.0`のみ | 未知versionはerror |
| `projectId` | Recipe全体のStable ID | 表示名と分離 |
| `generationSeed` | 全体の決定論的生成入力 | integer |
| `materialDefinitions` | 単色PBR material | Stable ID参照 |
| `assetDefinitions` | Primitive Partを束ねる複合Asset | Definition正本 |
| `variantSets` | 色/parameterの非破壊差分 | Asset/Part参照 |
| `sceneInstances` | Scene transformとPart Override | Definitionと分離 |
| `splineDefinitions` | 制御点、profile keyframe、adaptive resolution、sweepType | Stable ID付き |
| `roomDefinitions` | box状Room Volume | Stable ID付き |
| `socketDefinitions` | Room上のtype/orientation/tag付き接続点 | Room参照を検証 |
| `placementRules` | linear/grid/spline配列とjitter | local seed付き |
| `extensions` | 将来契約の予約領域 | 動作UIなし |

`extensions`には`lodPolicies`、`morphDefinitions`、`destructionDefinitions`、`environmentDefinitions`、`spawnerDefinitions`の空配列を保持できます。これらは予約名であり、v0.1で評価・描画・編集されません。

## Stable IDと参照検証

Asset、Part、Material、Variant、Instance、Spline、Room、Socket、Placement Ruleは表示名とは別の`id`を持ちます。Core validationはtop-level種類内のID重複と、Material/Asset/Variant/Spline/Room参照の解決を検査します。Part IDはAsset内で安定していることを前提とし、Instance OverrideとVariant targetに使われます。

## 互換性方針

0.1.0は最初のRecipe versionで、migrationはno-opではなく「同じversionのparse」に限定しています。将来versionを追加するときは、旧Schema、入力fixture、明示的なmigration関数、hash/semantic round-trip testを同時に追加します。未知versionを現在型へcastして読み進めることは禁止です。
