新規の共通開発基盤として、仮称「CodexGameAssetWorkbench」を構築する。

目的は、Codexが生成したゲーム用3Dアセット、曲線形状、部屋、配置規則を、人間がブラウザ上で確認・調整し、その編集結果をCodexがテキスト差分として再取得して開発を継続できる、エンジン非依存のプロシージャル・アセット・ワークベンチを作ることである。

特定ゲームの内部ツールにはしない。PaperGliderClone、Unityプロジェクト、Godot等は将来の利用側とし、現在のv0には取り込まない。PaperGliderCloneの絶対パス、ソースファイル、行番号が別会話に存在しても、現在のリポジトリから参照可能であると仮定しない。

開始前確認

- 現在の作業ディレクトリ、Git状態、ブランチ、HEAD、remote、worktreeを実測する。
- 既存ファイルがある場合は、空の新規プロジェクトとして安全に使用できるか確認する。
- AGENTS.mdや既存ルールがある場合は最初に読む。
- unrelatedな既存変更を上書きしない。
- git pull、stash、stash pop、merge、rebase、履歴改変を自動実行しない。
- GitHubリポジトリ作成、remote追加、push、PR作成は行わない。ローカル実装と検証を完了させ、外部公開操作は別判断にする。
- 設計文書だけを作って停止せず、操作可能なActive Artifactへ到達する。
- 有料API、外部生成AI、認証が必要なサービスは使用しない。

プロダクト原則

1. Recipe First
   編集可能な正本はバージョン付きJSON Recipeとする。GLB、スクリーンショット、キャッシュ、ビルド成果物は派生物として扱う。

2. Engine Agnostic Core
   CoreへThree.js、Unity、DOM、React固有オブジェクトを持ち込まない。座標はJSON互換の数値配列、生成形状は中立的なMeshDataとして扱う。

3. Human and Codex Symmetry
   人間がUIで行った変更とCodexがRecipeを編集して行った変更が、同じ保存形式と検証経路を通るようにする。UIだけに存在する隠れた編集状態を作らない。

4. Deterministic Generation
   ランダム生成は必ず明示的なSeedから行う。同じRecipe、Schema version、Seedから同じ形状・配置結果を再生成できること。

5. Stable Identity
   Asset、Part、Material、Spline、Room、Socket、Instanceには表示名とは別のStable IDを持たせる。表示名変更で参照を破壊しない。

6. Definition and Instance Separation
   Asset Definitionそのものの編集と、Scene上の個別Instance Overrideを区別する。Apply、Revert、Resetの意味を曖昧にしない。

7. Reviewable Outputs
   検証結果、生成統計、Recipe hash、スクリーンショットを機械可読なreadbackとともに保存する。ファイルが存在するだけで完了扱いにしない。

推奨技術構成

- npm workspacesによるTypeScriptモノレポ
- apps/workbench：Vite、React、TypeScript
- packages/schema：JSON Schema、TypeScript型、Schema migration
- packages/core：Seeded RNG、Recipe evaluator、Spline sampling、MeshData、placement calculation
- packages/adapter-three：MeshDataとRecipeからThree.js Object3D／BufferGeometryを構築
- packages/cli：inspect、validate、diff、proof関連コマンド
- Three.js：3D viewport、OrbitControls、TransformControls、GLTFExporter
- JSON Schema検証には、既存方針と衝突しなければAjvを使用
- 単体テストにはVitest相当、ブラウザsmokeとVisual ProofにはPlaywright相当を使用
- UIフレームワークや依存を追加する前に、packageの役割と必要性を確認する

想定構造

apps/
  workbench/

packages/
  schema/
  core/
  adapter-three/
  cli/

samples/
  starter-project/

schemas/
artifacts/
docs/

v0 Active Artifact

ブラウザで起動し、次の操作を実際に行えるWorkbenchを完成させる。

- Asset Catalogからモデルを選択
- 3D viewportで単体表示
- OrbitControlsによる回転、ズーム、パン
- TransformControlsによる移動、回転、拡縮
- Scene TreeとPart選択
- Primitive寸法編集
- Materialの色、roughness、metalness編集
- DefinitionとInstance Overrideの識別
- Recipe JSONの保存と再読込
- Seed変更と同一Seedでの再現
- ResetとRevert
- Validation結果の画面表示

v0で扱うAsset Definition

- box
- cylinder
- plane
- sphereまたは低分割polyhedron
- 複数PrimitiveをGroup化した複合Asset

v0で扱うRecipe要素

- schemaVersion
- projectId
- assetDefinitions
- materialDefinitions
- variantSets
- sceneInstances
- splineDefinitions
- roomDefinitions
- socketDefinitions
- placementRules
- generationSeed

将来用のLODPolicy、MorphDefinition、DestructionDefinition、EnvironmentDefinition、SpawnerDefinitionはSchema拡張点として記録してよいが、動作しているように見せる未実装UIは作らない。

Spline Sweep垂直断面

一本の制御点列またはSplineDefinitionを、共通Sweep演算から以下の三種類へ切り替えられるようにする。

- rod：円形または低角数の断面を持つ棒・杖
- road：平坦な道路断面
- corridor：床、左右壁、天井を持つ通路

SplineDefinitionは最低限、次を保持する。

- Stable ID
- controlPoints
- closed
- interpolation
- widthまたはradiusのキーフレーム
- heightのキーフレーム
- ResolutionPolicy
- Material参照
- Seed

ResolutionPolicyは固定分割数だけに依存せず、経路長と曲率を考慮する。幅、半径、高さが大きく変化する部分も追加分割の対象にする。利用者がクビレの位置へ事前に多数の頂点を追加する必要がないこと。

曲線の各点で安定したローカル座標系を構築し、急角度や垂直方向の変化で断面が不意に反転しないようにする。極端な入力を完全対応できない場合は、Validationで警告を返す。

VariantSet

元Assetを複製せず、次の差分を非破壊で適用する。

- hue
- saturation
- valueまたはbrightness
- material parameter override
- part単位の対象指定
- Seed付き範囲指定

Normal Mapや非色情報を色調変換しない。v0では単色Materialを中心に扱う。

Placement

最低限、次を実装する。

- linear array
- grid array
- spline placement
- countまたはspacing
- position jitter
- rotation jitter
- scale jitter
- variant selection
- Seed
- regeneration

同じSeedで同じ配置へ戻ること。Math.random()を生成処理へ直接使用しない。

RoomとSocket

v0では高度なダンジョン生成を行わず、次だけを実装する。

- Box状のRoom Volume
- Room Stable ID
- 床面、幅、高さ、奥行き
- 壁面上へ置けるSocket
- Socket type
- orientation
- compatible tags
- Scene内でのSocket可視化

自動部屋接続や経路探索は後続へ回す。

Codex向けCLI

最低限、次の機械可読操作を提供する。コマンド名は既存規約に合わせて調整してよい。

- inspect <recipe> --json
- validate <recipe> --json
- diff <before> <after> --json
- summarize <recipe> --json

inspect結果にはAsset数、Part数、Material数、Spline数、Room数、Socket数、Instance数、Seed、Schema versionを含める。

validate結果にはseverity、code、assetId、recipePath、messageを含める。

可能ならproof生成も追加するが、CLI設計だけでブラウザ実画面の証跡を省略しない。

GLBとManifest

GLB出力は編集上の正本にしない。GLBを生成する場合は、次を含むsidecar manifestを同時生成する。

- schemaVersion
- projectId
- sourceRecipeHash
- assetIds
- generationSeed
- vertexCount
- triangleCount
- materialCount
- boundingBox
- generatedAt
- generatorVersion

Node環境でのGLTFExporter互換性が不安定な場合は、ブラウザ上の出力またはPlaywright経由の出力を使用する。GLBを書き出せない状態を、空ファイルや偽fixtureで成功扱いにしない。

UI

最低限、次の四領域を持たせる。

- 左：Asset CatalogとScene Tree
- 中央：3D Viewport
- 右：Inspector
- 下：Recipe差分、Validation、Seed、生成統計

持続的な大型パネルでViewportを圧迫しない。パネルは折りたたみ可能にし、現在選択中のDefinition、Instance、Part、Spline、Roomを明示する。

Undo／Redo

UI操作をRecipeに対するTransactionとして扱う。v0では完全な分散履歴管理は不要だが、少なくとも同一セッション中のUndo／Redoと、保存前変更の有無を表示する。

サンプル

特定ゲームを模倣しない汎用starter projectを作成する。

最低限、次を含める。

- 箱と円柱を組み合わせた簡単な家具
- 3種類以上のMaterial
- 色バリアント
- 一本のSpline
- rod、road、corridorの切り替え
- Room Volume
- 2個以上のSocket
- Spline上に配置する小物Array

明示的な非対象

v0では以下を実装しない。

- PaperGliderCloneとの統合
- Unity／Godot／Unreal Adapter
- Blenderアドオン
- 任意頂点スカルプト
- Dynamic Topology
- UV展開
- 面選択テクスチャ切り出し
- Texture Paint
- Voxel Remesh
- Fluid
- Metaball
- Shape Key編集
- Morph合成
- Fracture
- 破壊物理
- 雨雪
- 高度なランタイムSpawner
- マルチユーザー共同編集
- クラウド保存
- 外部AIサービス

これらを未実装ボタンとして並べ、機能が存在するように見せない。

テスト

最低限、次を自動検証する。

- Recipeの保存・再読込で意味が変化しない
- Stable ID参照が解決できる
- 同一Seedで同一生成結果になる
- 異なるSeedで許可範囲内の差分が生じる
- rod、road、corridorが有効なMeshDataを生成する
- NaN、Infinity、空index、範囲外indexを生成しない
- triangleCountとboundingBoxを取得できる
- Variantが元Definitionを書き換えない
- Definition変更がInstanceへ反映される
- Instance Overrideが別Instanceを変更しない
- 無効なSocket参照をValidationが検出する
- Schema version不明時に黙って読み込まない
- build、typecheck、lint、unit test、browser smoke、git diff --checkが成功する

Visual Evidence

ブラウザ上で次の実画面を撮影する。

- Asset Catalogとモデル単体プレビュー
- rod表示
- road表示
- corridor表示
- RoomとSocket表示
- VariantまたはArray配置表示

スクリーンショットとともに、Recipe hash、Seed、Asset数、triangleCount、Validation結果をまとめたreadback.jsonを保存する。画像が生成されたことだけでなく、画像を実際に確認し、空画面、カメラ外、クリッピング、極端なねじれ、UI重複がないことを報告する。

完了条件

- Workbenchがローカルで起動する。
- starter projectをブラウザで編集できる。
- UIで変更した結果がRecipeへ保存される。
-保存したRecipeを再読込すると同一状態へ戻る。
- 同一Splineからrod、road、corridorを切り替えられる。
- Seed付きVariantとPlacementが再現可能である。
- RoomとSocketがViewport上で確認できる。
- CLIのinspectとvalidateがJSONを返す。
- 関連する自動テストが通る。
- 実画面証跡とreadbackが存在する。
- 未実装機能を完成扱いにしていない。

停止条件

次の場合は広範な代替実装へ進まず、事実と選択肢をまとめて停止する。

- 作業ディレクトリが既存プロジェクトで、新規基盤を安全に作れない。
- CoreをThree.js非依存に保てない重大な設計衝突がある。
- パッケージ導入が認証、課金、外部秘密情報を要求する。
- GLB生成に環境固有の重大な制約がある。
- v0の垂直断面を超えて、汎用モデラー実装が必要になる。
- unrelatedな既存変更と衝突する。

自走方法

環境確認後、計画文書だけで止まらず、最小のWorkbenchを起動し、実画面を観測しながら修正を反復する。各反復ではActive Artifactを前進させる。テスト整備だけ、文書追加だけ、保守的な停止だけを進捗として扱わない。

終了報告

以下を明示する。

- 開始時と終了時のGit状態
- 作成したパッケージと責任境界
- Active Artifactの起動方法
- 実装済み機能
- 明示的な未実装機能
- Recipe Schemaの現在要素
- CLIコマンド
- 実行した検証と結果
- Visual Evidenceとreadbackの場所
- 既知の制約
- PaperGliderClone統合を開始できる状態か
- 次の安全な開発候補を最大3件
- 次のAgentへそのまま渡せる、目的・前提・禁止事項・成果物・検証・停止条件を含む完全な単一Prompt

既存Prompt、主要仕様、Schema方針を作業中に変更した場合は、変更前、変更後、変更理由、互換性への影響を表形式で報告する。