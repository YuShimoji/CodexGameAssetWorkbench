# 次のAgentへ渡す単一Prompt

以下をそのまま次のAgentへ渡してください。

---

`CodexGameAssetWorkbench`の次の安全な開発sliceとして、Spline control pointとprofile keyframeをブラウザで直接編集できるようにしてください。

目的は、既存のRecipe First / Engine Agnostic Core / Human and Codex Symmetry / Deterministic Generation / Stable Identityを維持したまま、現在JSONでしか細かく変更できないSplineDefinitionを、Workbenchの3D viewportとInspectorから操作可能にすることです。既存のrod / road / corridor共通Sweep、adaptive ResolutionPolicy、parallel-transport相当frame、Save/Open/Undo/Redo/Validation、Visual Proofを壊さないでください。

開始前に作業ディレクトリ、Git状態、branch、HEAD、remote、worktreeを実測し、ルートおよびproject-localのAGENTS.mdやdocs/REPO_LOCAL_RULES.mdがあれば最初に読んでください。unrelatedな既存変更を上書きしないでください。git pull、stash、stash pop、merge、rebase、reset、履歴改変、remote変更、push、PR作成は自動実行しないでください。有料API、外部AI、認証や秘密情報を必要とするサービスは使わないでください。

前提として、正本は`Recipe` JSONであり、Three.js Object3D、React state、DOM stateを永続化してはいけません。CoreへThree.js、React、DOM依存を持ち込まず、既存MeshDataとSpline sampling境界を保ってください。UI操作はRecipe transactionとして既存Undo/Redoへ入り、保存→再読込で同じSpline状態へ戻る必要があります。Stable IDや既存schemaVersion 0.1.0の意味を無断で変更しないでください。Schema変更が必要なら、変更前/後/理由/互換性影響を表で整理し、versionを据え置けるadditive changeかを先に判断してください。

成果物は次を含めてください。

1. Scene上のSplineを選ぶとcontrol point handleが表示され、TransformControlsまたは明確なdrag操作で各点を移動できること。OrbitControlsとhandle操作が競合しないこと。
2. Inspectorでcontrol pointの追加、削除、並べ替え、数値編集ができ、2点未満にしようとした場合は操作を拒否するかValidation errorを明示すること。
3. radius / width / height keyframeについて、`t`と`value`の追加、削除、数値編集ができること。keyframeは表示上sortされ、同一`t`や範囲外値を黙って受け入れないこと。
4. closed / interpolation / ResolutionPolicyの編集UI。ただし高度な汎用Curve Editorのような未完成UIへ広げないこと。
5. 各UI操作がRecipe transactionになり、Undo/Redo、dirty表示、Save/Open/Revert/Resetと整合すること。
6. control pointまたはprofile変更後にrod / road / corridorが有効なMeshDataを生成し、NaN、Infinity、空index、範囲外index、frame反転を新たに発生させないこと。
7. unit testとPlaywright smokeを追加し、point移動、keyframe編集、Undo、保存→再読込を自動検証すること。
8. rod / road / corridorそれぞれで編集handleと結果形状が確認できる実画面証跡、およびrecipeHash、seed、triangleCount、validationを含む更新済みreadbackを`output/playwright/`へ保存すること。

UIは既存の暗色technical workbenchの視覚言語、四領域構成、折りたたみ、desktop中心の密度を踏襲してください。Viewport中央を大型modalや説明cardで隠さず、handle選択中だけ必要な補助表示を出してください。存在しないBezier tangent editor、arbitrary sculpt、UV、texture paint、dynamic topology、multiplayer、cloud保存を未実装ボタンとして追加しないでください。

検証は最低限`npm run schema:check`、`npm run build`、`npm run typecheck`、`npm run lint`、`npm test`、`npm run test:browser`、`git diff --check`を実行してください。Visual Evidenceは画像生成成功だけで済ませず、実際に画像を開き、空画面、カメラ外、clipping、極端なねじれ、handleとUIの重複がないか確認してください。

次の場合は広範な代替実装へ進まず、事実と選択肢をまとめて停止してください。unrelated変更と衝突する、CoreをThree.js非依存に保てない、schemaVersionや既存Recipe互換性を破壊しないと実現できない、control point編集を超えて汎用3Dモデラー実装が必要になる、認証・課金・秘密情報が必要になる場合です。

終了時は、開始/終了Git状態、変更した責任境界、実装した操作、Schemaへの影響、実行した検証と結果、Visual Evidence/readbackの場所、既知制約を自然文と必要な比較表で報告してください。設計文書だけで停止せず、ローカルで操作でき検証済みのActive Artifactまで到達してください。

---
