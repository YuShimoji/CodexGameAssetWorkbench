# 次のAgentへ渡す単一Prompt

以下をそのまま次のAgentへ渡してください。

---

`CodexGameAssetWorkbench` v0.2の次の安全なsliceとして、`PaperGliderClone`に変更を加えない読み取り専用互換性監査を行い、将来の統合判断に使える実測ベースの契約表を作成してください。今回の目的は統合実装ではなく、v0.2 Recipe/Spline/GLB/manifest/Room/Socketのどこをそのまま利用でき、どこにadapterまたは新しいexport契約が必要かを明らかにすることです。PaperGliderCloneへの変更、コピー、依存追加、submodule化、PR作成を完了条件にしないでください。

開始時に両リポジトリの絶対パス、branch、HEAD、upstream、remote、worktree、untrackedを個別に実測し、それぞれの`AGENTS.md`、README、architecture、license、package/build設定、asset loader、scene/runtime入口を読んでください。`PaperGliderClone`の場所はユーザーが明示したパス、現在のworkspace root、または同じ親ディレクトリに実在する同名ディレクトリだけを対象とし、見つからない場合は推測でclone、Web検索、別名リポジトリの採用をせず停止してください。dirtyな対象リポジトリをcleanだと仮定せず、既存変更は所有者不明として扱ってください。

`CodexGameAssetWorkbench`側ではv0.1 checkpointとv0.2 Spline直接編集commitが存在し、Schema 0.1.0 golden fixture、Coreのengine-independent boundary、`npm run verify`が成立していることを前提にせず再確認してください。監査中はgit pull、stash、stash pop、merge、rebase、reset、checkoutによる破棄、履歴改変、remote変更、tag、push、PR作成を行わないでください。`PaperGliderClone`配下にはファイル生成、formatter、install、build、test、lockfile更新を含む一切のwriteを行わないでください。認証、課金API、秘密情報、ゲーム固有データの外部送信を行わないでください。

監査では少なくとも次を実測してください。

1. PaperGliderCloneのruntime/engine、座標系、up軸、単位、forward方向、transform表現、material/lighting前提、GLB/glTF loader、procedural mesh入力、scene/level記述、asset IDの扱い。
2. CodexGameAssetWorkbenchのRecipe 0.1.0、Stable ID、generationSeed、Spline MeshData、選択Asset GLB+manifest、Room/Socket、Placementの各契約が、無変換・薄いadapter・新規export・非互換のどれに当たるか。
3. Splineのrod/road/corridorについて、PaperGliderCloneが必要とする用途がrender mesh、collision、flight path、camera path、spawn path、level boundaryのどれか。コード上の証拠がない用途は「不明」とし、推測を事実として書かないこと。
4. GLBだけでは失われるStable ID、Socket、Room、Placement、Seed、profile keyframe等のmetadataと、sidecar manifestまたはRecipe参照が必要な箇所。
5. license、第三者asset、配布形態、runtime依存、bundle/性能制約から見た統合上の停止条件。
6. 最小の互換性spikeを行う場合の入力fixture、期待出力、adapter責任、検証方法。ただし今回そのspike自体は実装しないこと。

主成果物は`CodexGameAssetWorkbench/docs/PAPER_GLIDER_COMPATIBILITY_AUDIT.md`とし、ファイルを開かなくても判断できる概要、両側の実測commit、契約比較表、座標/単位変換表、利用可能な既存出力、欠けている契約、重大度付きrisk、推奨する最小spike、明示的な非対象を含めてください。各判断には両リポジトリ内の具体的なファイル/関数/設定を根拠として示してください。将来Schema変更が必要そうでも、監査だけでSchema versionを上げたり未実装migrationを書いたりせず、変更候補・互換性影響・代替案を表に分離してください。

必要なら`CodexGameAssetWorkbench`内だけに、既存fixtureを入力とするread-only解析scriptまたはcontract testを追加できます。ただし新規依存は追加せず、PaperGliderCloneのコードをimport/copyせず、CoreへThree.js/React/DOM/WebGL依存を持ち込まないでください。文書だけで十分に結論できる場合は、無理にコードを増やさないでください。

検証は、変更が文書のみならMarkdown link/pathの存在確認と`git diff --check`を最低限実行してください。解析script/testを追加した場合は`npm run schema:check`、`npm run build`、`npm run typecheck`、`npm run lint`、`npm test`、`npm run test:browser`、`git diff --check`を実行し、既存v0.2 Active Artifactを壊していないことを確認してください。PaperGliderClone側のbuild/testはwriteを完全に防げることを確認できない限り実行せず、未実行理由を監査文書へ残してください。

次の場合は監査結果を作り話で補わず、確認できた事実、blocking path、ユーザーが与えれば再開できる最小情報を報告して停止してください。PaperGliderCloneがローカルに存在しない、対象名/remoteが曖昧、読み取りだけでworktreeを保護できない、licenseまたは認証情報の扱いが不明、unrelated変更と成果物が衝突する、現在のv0.2検証が失敗する場合です。

終了時は、開始/終了の両Git状態、読み取った境界、変更したのがWorkbench側だけである証拠、比較で判明した互換/変換/不足、Schema変更の有無、検証結果、未解決事項、最小spikeへ進めるかを自然文と実体ある比較表で報告してください。次候補は、違うbottleneckを解く入口として最大3件に絞ってください。ユーザーの追加承認なしにcommit、push、PR、PaperGliderClone変更、統合実装へ進まないでください。

---
