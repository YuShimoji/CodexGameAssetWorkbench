CodexGameAssetWorkbenchを、耐久的なv0.1基準版へ固定したうえで、SplineをViewportから直接編集できるv0.2 Active Artifactへ進める。

今回の主成果物は、control pointを3D Viewport上で追加・選択・移動・削除し、幅・半径・高さのprofile keyframeを編集して、rod／road／corridorを即時再生成できる実動Workbenchである。互換性文書、Export最適化、PaperGliderClone統合だけで完了扱いにしない。

開始前確認

- リポジトリルート、現在ブランチ、HEAD、remote、worktree、untrackedファイルを実測する。
- AGENTS.md、README、ARCHITECTURE.md、RECIPE_SCHEMA.md、package.json、既存テスト、既存のNEXT_AGENT_PROMPT.mdを読む。
- 報告に記載されたWindows絶対パスや検証結果を正しいものと仮定せず、現在のリポジトリで再確認する。
- git pull、stash、stash pop、merge、rebase、reset、履歴改変を行わない。
- unrelatedな既存変更を上書きしない。
- 現在はHEAD未作成、全実装がuntrackedと報告されているため、既存成果物の安全な初回checkpointを作れない状態では新機能実装へ進まない。
- PRは作成しない。

PHASE 1：v0.1の耐久化

1. 現在の全候補ファイルを分類する。
   - ソース
   - Schema
   - テスト
   - ドキュメント
   - サンプル
   - 選択的に保存するVisual Evidence
   - ビルド成果物
   - 依存cache
   - Playwright生出力
   - 一時ファイル
2. `.gitignore`を確認し、node_modules、dist、cache、一時ダウンロード、不要なPlaywright生出力をcommit対象から除外する。
3. Visual Evidenceはすべての生出力を追跡するのではなく、v0.1基準版として必要な代表画像、readback、manifestだけを耐久的なartifact領域へ選別する。現在の設計規約が別の保存方法を指定している場合はそれに従う。
4. commit候補にAPI key、token、credential、private key、認証付きURL、個人情報、意図しない絶対パス、大型不要ファイルがないことを確認する。
5. Git author identityを確認する。意図しない個人メールアドレスや誤ったアカウントがcommit metadataへ入る場合はcommitせず停止する。許可なくidentityを書き換えない。
6. `origin`のURLと対象リポジトリを確認する。想定外のremote、公開範囲不明、別プロジェクトのremoteである場合はpushしない。
7. 現在の状態で`npm run verify`と`git diff --check`相当を再実行する。
8. 報告されたv0.1機能と検証が再現し、候補ファイルが安全である場合のみ、v0.1初回commitを作成する。
9. 初回commit後、worktreeがcleanであることを確認する。
10. remote、認証、公開範囲、author identityがすべて明確かつ安全で、現在のリポジトリ運用規約がpushを許可している場合のみmainをpushする。不明点がある場合はローカルcommitまでで停止し、推測でpushしない。
11. ユーザーによる創作的受入が未確認であるため、正式release tagは作成しない。

v0.1耐久化の停止条件

- secret、credential、個人情報、意図しないauthor metadataが見つかった。
- remoteの対象または公開範囲が不明。
- 現在の`npm run verify`が失敗する。
- 報告されたActive Artifactを再現できない。
- untrackedファイルに別作業の所有物が混在する。
- 初回commitの対象境界を安全に確定できない。

停止条件に該当した場合は、feature実装へ進まず、対象、証跡、最小の解決選択肢を報告する。

PHASE 2：v0.2作業境界

v0.1のdurable checkpointが成立した後、現在の運用規約に反しなければ専用作業ブランチを作成する。ブランチ名は既存規約へ合わせ、規約がない場合は`codex/spline-direct-edit-v0-2`を使用する。

Active Artifact

Workbenchの3D Viewport上でSplineを直接編集し、その操作がRecipe、Undo／Redo、保存、再読込、GLB出力、Validation、Visual Proofまで一貫して反映される状態を完成させる。

実装要件

1. Spline選択
   - Scene TreeまたはViewportからSplineを選択できる。
   - 現在選択中のSpline ID、interpolation、profile、Seedを明示する。
   - Asset、Instance、Splineの選択状態を混同しない。

2. Control Point表示
   - control pointを視認可能なハンドルとして表示する。
   - 経路線、接線または補助線を必要な範囲で表示する。
   - 通常のゲーム用メッシュ、コントロールハンドル、Socket、Room表示をレイヤーまたは表示設定で区別する。

3. Control Point操作
   - 追加
   - 選択
   - 移動
   - 削除
   - 既存segment間への挿入
   - Grid snapの有効／無効
   - 数値Inspectorからの座標編集
   - 不正な操作をRecipeへ保存しない

4. ViewportからのSpline新規作成
   - 明示的な「Spline作成モード」を用意する。
   - Ground Planeまたは現在の作業平面をクリックしてcontrol pointを追加する。
   - 作成確定と取消を区別する。
   - Orbit操作とSpline作成操作が競合しない。
   - 右クリック、Escape、Toolbar等の操作は既存UI規約へ合わせる。

5. Profile切り替え
   - rod
   - road
   - corridor
   同じSplineDefinitionを維持したままprofileを切り替え、形状を即時再生成する。

6. Profile keyframe
   - 経路長を0〜1へ正規化した位置にkeyframeを置ける。
   - rodではradiusを編集できる。
   - roadではwidthを編集できる。
   - corridorではwidthとheightを編集できる。
   - keyframeの追加、選択、値変更、削除を可能にする。
   - 最低限、InspectorとViewport上の位置表示を連動させる。
   - v0.2では高度なBezierカーブエディタを実装しない。

7. Adaptive Resolution
   - control point数を単純に頂点数へ対応させない。
   - 経路長、曲率、profile値の変化量に応じて必要なsegmentを増減する。
   - 同じRecipeから同じMeshDataを生成する決定論性を維持する。
   - 不必要な過剰細分化を避け、triangle countを表示する。

8. Frame安定性
   - 曲線に沿う断面のローカル座標系が不意に反転しないようにする。
   - 既存実装にparallel transportまたは相当の安定化処理がある場合は再利用する。
   - 極端な曲線、重複点、ゼロ長segmentでNaNや破断を生成しない。
   - 完全対応できない入力はValidation warningとして表現する。

9. Transaction
   - control point追加、移動、削除、keyframe変更をRecipe transactionとして扱う。
   - Undo／Redoで操作単位に戻せる。
   - Drag中の毎フレーム状態を無制限に履歴へ積まない。
   - Drag開始から終了までを一つのtransactionにまとめる。
   - unsaved changesを表示する。

10. 保存と再読込
    - UIから保存したRecipeを再読込すると、control point、profile、keyframe、Seed、生成形状が復元される。
    - 再読込後のRecipe hashまたは正規化結果が一致する。
    - UI上だけに存在するSpline編集状態を残さない。

11. Validation
    最低限、次を検出する。
    - control point不足
    - 重複点
    - ゼロ長segment
    - 非有限座標
    - keyframe位置の範囲外
    - 同一位置の競合keyframe
    - radius、width、heightの無効値
    - profileに不要または不足するparameter
    - 過剰な推定triangle count
    - 断面反転または不安定化が疑われる入力

12. Golden Fixture
    - 現在のSchema 0.1.0 starter Recipeを変更不能な互換性fixtureとして追加する。
    - 現行loaderが0.1.0 fixtureを読み込み、同じ意味内容へ正規化できることを検証する。
    - 今回、Schema変更が不要ならversionを上げない。
    - Schema変更が必要な場合は、理由、互換性影響、旧fixtureの扱い、migrationまたは明示的拒否を実装する。
    - 未実装migrationを存在するように見せない。

13. Engine-independent boundary
    - `packages/core`がThree.js、React、DOM、WebGLへ直接依存していないことを確認する。
    - Spline編集operation、adaptive sampling、profile keyframe評価、Validationは可能な限りcoreへ置く。
    - Gizmo、Raycast、Viewport handleはworkbenchまたはadapter-threeへ置く。
    - 境界確認をテストまたは依存監査で証明する。

14. Regression
    - Asset編集
    - Definition／Instance Override
    - Variant
    - Placement
    - Room／Socket
    - Recipe保存・再読込
    - GLB＋manifest出力
    - CLI inspect／validate／diff／summarize
    既存v0.1機能を維持する。

明示的な非対象

- PaperGliderCloneへの変更または統合
- Unity、Godot、Unreal Adapter
- Scene全体GLB bundle
- bundle size最適化キャンペーン
- UV、texture paint、面選択
- 頂点スカルプト
- Dynamic Topology
- Voxel Remesh
- Fluid
- Morph編集
- Fracture
- Weather
- 高度なSpawner
- Schemaを将来要件のためだけに大量拡張すること
- 完成していない機能のplaceholder UI

テスト

既存検証に加えて、最低限次を追加する。

- control point追加、挿入、移動、削除
- 最低control point数の制約
- keyframe追加、変更、削除
- profile切り替え
- adaptive resolutionの決定論性
- 同一入力から同一MeshData
- Undo／Redo transaction
- 保存→再読込
- Schema 0.1.0 golden fixture
- coreのThree.js非依存境界
- rod、road、corridorの有効なpositions、indices、normals、bounds
- NaN、Infinity、範囲外indexがないこと
- PlaywrightでSpline作成、point移動、profile切り替え、keyframe変更、保存、再読込
- browser console error 0
- GLB／manifest regression
- `npm run verify`
- `git diff --check`

Visual Proof

同じ証跡ディレクトリ規約を使い、少なくとも次を保存する。

1. Viewport上でcontrol pointを直接編集中の画面
2. 曲線rod
3. 曲線road
4. 幅または高さkeyframeを持つcorridor
5. Room／Socket／PlacementとSplineが同時に見える統合画面
6. 保存・再読込後の同一状態

readbackには次を含める。

- schemaVersion
- Recipe hash
- Seed
- Spline ID
- control point数
- profile
- keyframe数
- vertexCount
- triangleCount
- boundingBox
- Validation error／warning数
- 保存前後の一致結果
- console error数
- 各画像と対応する状態

画像ファイルの存在だけでVisual Proofを代替しない。実際に各画像を開き、以下を目視確認する。

- control pointとメッシュの対応
- カメラ外やクリッピングがない
- 断面反転や極端なねじれがない
- corridorの床、壁、天井が連続している
- UIパネルとViewportが重ならない
- 選択対象が判別できる
- handleが過剰に画面を覆わない

完了条件

- v0.1の安全な初回checkpointが存在する。
- WorkbenchでSplineを新規作成できる。
- control pointをViewportから追加、移動、挿入、削除できる。
- rod、road、corridorを同一Splineから切り替えられる。
- profile keyframeで途中の太さ、幅、高さを変更できる。
- 操作がUndo／Redo、Recipe保存、再読込へ反映される。
- Schema 0.1.0 golden fixtureが検証される。
- coreのエンジン非依存境界が維持される。
- 既存v0.1機能が回帰していない。
- 自動検証、ブラウザsmoke、Visual Proofが揃う。
- 未実装領域を完成扱いにしていない。

作業完了後

- branch diffをセルフレビューする。
- `git diff --check`を実行する。
- 作業規約が許可し、author identityとremoteが安全な場合は作業内容を意図的にcommitする。
- pushはremoteと公開範囲が確認できた場合のみ行う。
- PRは作成しない。
- mainへのmergeは行わない。

終了報告には以下を含める。

- 開始時と終了時のbranch、HEAD、upstream、worktree
- v0.1初回checkpointの成否
- commit／pushの有無と境界
- Active Artifactの可視的変化
- Spline操作一覧
- TransactionとRecipe保存の実装境界
- Schema変更の有無
- Golden Fixture結果
- core依存境界の監査結果
- 実行した検証と結果
- Visual Proofとreadbackの場所
- 既知の制約
- PaperGliderClone読み取り専用互換性監査を開始できるか
- 次の安全な候補を最大3件
- 次のAgentへ渡せる、目的・前提・禁止事項・成果物・検証・停止条件を含む完全な単一Prompt

Prompt、Schema、主要仕様を変更した場合は、変更前、変更後、変更理由、互換性への影響を表形式で報告する。説明だけで完了とせず、実際に操作可能なSpline直接編集とVisual Proofを完了条件にする。