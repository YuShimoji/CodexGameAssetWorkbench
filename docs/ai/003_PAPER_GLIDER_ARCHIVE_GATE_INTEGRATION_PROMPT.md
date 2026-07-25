# Archived Prompt: Paper GliderへArchive Gateを統合・公開する

このPromptが要求したArchive Gate統合、決定論的room運用、collision/ring/recycle、main統合、GitHub Pages公開は、Paper Glider側で完了済みです。2026-07-25のWorkbench再監査では、Paper Glider `main` は `857afb2c4e0f4d2ba7a7965608be6c313780175c`、`origin/main`とのparityは`0/0`、worktreeはcleanでした。以下は実行済み要求の履歴正本として保持します。

以下を単独で次のAgentへ渡してください。

---

Paper Gliderへ、CodexGameAssetWorkbenchの確定済み`PaperGlider Compatibility Packet v1`とArchive Gate canaryを、実際に飛行・collision・ring回避・room recycleが動くroom archetypeとして統合してください。全technical gateがgreenになった場合に限り、Paper Glider `main`への統合、committed `docs/`生成、GitHub Pages公開、公開URL検証まで完了してください。

## Repositoryと固定基準

- 編集対象Paper Glider: `C:\Users\thank\Storage\Game Projects\paper-glider`
- 読み取り専用Workbench: `C:\Users\thank\Storage\Game Projects\CodexGameAssetWorkbench`
- Paper Glider調査基準commit: `3ad5ac1fbc6715f36f4b2d961754dfd8d7f35750`
- Workbench contract: `paper-glider-compat-v1`
- Workbench packet / rights source commit: `eb4493c8a5810d3b4bb1de11f23d8cb6a024a247`
- packet README: `C:\Users\thank\Storage\Game Projects\CodexGameAssetWorkbench\docs\compat\paper-glider-v1\README.md`
- compatibility matrix: `C:\Users\thank\Storage\Game Projects\CodexGameAssetWorkbench\docs\PAPER_GLIDER_COMPATIBILITY_PACKET_V1.md`
- runtime GLB: `C:\Users\thank\Storage\Game Projects\CodexGameAssetWorkbench\docs\compat\paper-glider-v1\paper-glider-archive-gate.glb`
- runtime manifest: `C:\Users\thank\Storage\Game Projects\CodexGameAssetWorkbench\docs\compat\paper-glider-v1\paper-glider-archive-gate.manifest.json`
- build/test schema: `C:\Users\thank\Storage\Game Projects\CodexGameAssetWorkbench\docs\compat\paper-glider-v1\paper-glider-compat-manifest-v1.schema.json`
- rights authority: `C:\Users\thank\Storage\Game Projects\CodexGameAssetWorkbench\docs\compat\paper-glider-v1\RIGHTS.md`
- provenance Recipe（runtimeへコピーしない）: `C:\Users\thank\Storage\Game Projects\CodexGameAssetWorkbench\docs\compat\paper-glider-v1\paper-glider-canary.recipe.json`

Pinned integrity values:

- Recipe hash: `fnv1a-3383aa61`
- Workbench content hash（記録用）: `sha256:04461554becd391625cc834460196186e32a6c08a393e34c210bd1d45503d397`
- GLB SHA-256: `sha256:e91d1a4b87c2c0a7d3c6698c320c13239b3751c03884b3a4c6b5b6853be1d019`
- manifest file SHA-256: `sha256:b9c41a053e97d061ac4795c77d8f628e93f0a40adef6f718614e614c861e1bd5`
- schema file SHA-256: `sha256:abbd570b742de3ae87904069dfd0b27f26a0e223999e1cfa760dec81a26a4e39`
- rights file SHA-256: `sha256:481eb1980eb1728eefb84c6a5fb5bdf307185e99e7089e511e927ebf49958c9f`
- rights identifier: `LicenseRef-PaperGlider-Project-Asset`

Workbenchはこのターンではread-onlyです。Workbench配下の編集、install、build、生成、commit、branch操作、pushを行わず、Paper Glider側だけを変更してください。

## Rightsと公開境界

Owner Decision A（2026-07-19）により、Archive GateをPaper Gliderへ複製・変更・組み込みし、Paper GliderのGit repository、作業branch、`main`、releaseへ保存し、GitHub Pagesおよび公開ゲームの一部としてブラウザへ配信し、保守・最適化・collision調整の派生変更を行うrights gateは解消済みです。

これはPaper Glider project-scoped permissionです。CC0、CC BY、MIT等の一般ライセンスや第三者向け素材集としての無制限再利用許諾ではありません。Paper Gliderのsource-code licenseがassetへ一般適用されるとも記述しないでください。`RIGHTS.md`を完全な正本として保持し、rights許可とtechnical acceptanceを分離してください。

focused branchへのasset commit/pushは許可済みです。`main`統合とGitHub Pages deploymentは、runtime integration、finite preload timeout/fallback、collision、ring clearance、room recycling、production build、desktop/mobile browser validationが全てgreenになった後だけ実行します。

## 開始時確認

1. 両repositoryで最寄りの`AGENTS.md`と正本文書を読む。Paper Gliderでは`PROJECT_HANDOFF.md`、README、package scripts、Vite/Pages設定、runtime入口、`PaperGliderGame`、`CorridorWorld`、`RingPath`、tests、Playwright設定を読む。Workbenchでは上記packet文書と4つの配布ファイルだけをread-onlyで読む。
2. 両repositoryのbranch、HEAD、upstream、origin parity、worktreeを実測する。Workbenchでは`git cat-file -e eb4493c8a5810d3b4bb1de11f23d8cb6a024a247^{commit}`でpacket / rights source authorityが取得可能であることを確認する。後続handoff-only commitがあってもcheckoutせず、配布ファイルをpinned SHA-256で照合する。Paper Glider HEADが調査基準と異なる場合はreset/checkoutせず、正規の後続commitか未知差分かを確認して現在authorityへ適応する。
3. 未知のlocal変更は上書きしない。Paper Gliderがcleanかつpush済みなら、`codex/workbench-archive-gate-room-v1`のようなfocused branchを作成する。
4. npm操作は直列化する。既存preview processや別repositoryのprocessを停止・変更せず、空きportを使う。
5. copy前後にGLB、manifest、schema、RIGHTSのSHA-256を上記値と照合する。Recipeはprovenance確認専用であり、Paper Gliderへコピー・parse・配信しない。

## Active Artifact

最終成果物はloaderや文書だけではありません。Archive GateがPaper Gliderの実roomとして表示され、中央を飛行でき、pier/top beam collisionが発火し、ring plannerが3 AABBを避け、9-room recycling後も再利用され、asset failure時にはprocedural roomでゲーム開始できるプレイ可能な状態を作ってください。

推奨配置は`public/assets/workbench/paper-glider-v1/`です。GLB、manifest、schema、`RIGHTS.md`をversion付きで保存し、Vite build後に`docs/assets/workbench/paper-glider-v1/`へ複製されることを確認します。URLは必ず`import.meta.env.BASE_URL`から組み立て、root absolute `/assets/...`やrepository名hardcodeを使いません。

## 固定asset contract

- Three右手系、`+Y` up、`-Z` forward、scale 1。
- room-local placementはposition `[0,-0.52,0]`、rotation `[0,0,0]`、scale `[1,1,1]`。
- roomはwidth 11.2、height 6.8、length 18。
- required visual nodesは8件。Stable IDをGLB node name/glTF extrasから解決する。
- collision正本はmanifestの3 AABB。render mesh boundsから暗黙生成しない。
- materialはtextureなしのMeshStandard。Paper lighting/fog/shadowへ合わせ、geometry/materialをcacheしてclone間で共有する。
- Recipeはruntimeで読まない。Workbench schemaやgeneratorコードをPaper Gliderへcopyしない。

## Hashとvalidation境界

1. Paper Gliderが取得前にpinできるmanifest file SHA-256と、manifest内のGLB SHA-256をruntimeで検証する。Web Crypto等を使う。
2. full JSON Schema validationはbuild/testで行う。runtimeではcontract version、required keys/types、finite transform/scale、relative path、required nodes、collider refsなど小さな構造検証に分離してよい。
3. Workbench `contentHash`は、`contentHash` fieldを除いたmanifestをWorkbench Coreの`stableStringify`でcanonicalizeした生成整合値である。canonicalizationはcross-repository runtime standardとしてversion化されていないため、Paper Gliderへ独自再実装させない。記録値として保持し、runtime acceptanceはpinned manifest/GLB file SHA-256と構造検証を正本にする。
4. schemaとRIGHTSもbuild/testでpinned SHA-256を確認する。

## Finite preloadとfallback

1. manifest/GLB preloadには`AbortController`等による有限timeoutを設ける。初期値は`ASSET_PRELOAD_TIMEOUT_MS = 5_000`とする。
2. 根拠: 現行Paper Gliderは`main.ts`で同期的にgameを構築してstart overlayを即表示し、既存Playwrightには5秒のoutcome pollがある。30 KB GLBの同一Pages配信に5秒は十分な余裕を持ちつつ、通信停滞でbootを永久blockしない、fake timer/test injectionが容易な上限である。変更する場合はboot UXとtest結果に基づく理由を文書化する。
3. timeout、AbortError、manifest/GLB fetch failure、hash mismatch、schema/structure failure、parse failure、missing node/collider refの全てでvalidated asset libraryを破棄し、current procedural roomでgameを開始する。
4. load結果はrun/world生成前に確定する。timeout後やrun開始後にnetworkが完了してもmid-run差し替えしない。
5. fallbackはユーザーのrunを止めない。diagnosticはlocal/dev範囲に留め、外部telemetryを追加しない。

## World統合

1. 小さなmanifest型/validatorと`WorkbenchRoomAssetLoader`相当をPaper Glider所有で追加する。
2. preload成功時はvalidated immutable asset library、失敗時は明示的failure resultまたは`null`を`PaperGliderGame`/`CorridorWorld`へ渡す。
3. loaded rootを一度cacheし、選択room groupへcloneする。recycleごとに再fetch/reparseせず、共有geometry/materialをlibrary shutdown前にdisposeしない。
4. manifest AABBごとにroom-local anchorとhalf extentsを作り、既存`WorldCollider`へ変換する。player clearanceとcollision tuningはPaper Glider側で調整する。
5. 同じpure AABBをring route計画へ事前入力し、ringがpier/top beam clearanceへ侵入しないようにする。render geometryからcollisionを推測しない。
6. room選択はrun seed + room sequenceの既存`randomUnit`座標だけで決める。`Math.random()`、fetch順、load時間、frame時間を使わない。同seed/sequenceと同asset availabilityでは同じroom/ring pathになるtestを追加する。
7. flight tuning、run-seed意味論、ring score、visibility、fair-speed契約を無関係に変更しない。

## 必須検証

- repositoryで定められたclean install、`npm ls --depth=0`
- typecheck、lint、unit/integration tests、production build
- copied GLB/manifest/schema/RIGHTSのSHA-256
- build/testでのmanifest schema full validation
- runtime manifest small validation
- valid load、timeout、AbortError、failed fetch、manifest hash mismatch、GLB hash mismatch、parse failure、missing node/collider refのtests
- fallback時にprocedural roomでstart overlayとrunが利用できること
- same seed/sequenceのroom選択、ring path、replay決定論
- 3 AABBのroom-local/world変換とring clearance
- 9-room recycling、single fetch/parse、clone再利用、shared resource lifetime
- `import.meta.env.BASE_URL`と`/paper-glider/` production URL
- desktop/mobile portrait Playwright、console errors 0
- Archive Gate全体、collider debug、flight camera、ring clearance、recycle後再出現、fallbackのvisual proof
- central passageを飛行でき、pier/top beam collisionが発火する実プレイ
- score、visibility、fair-speed、既存screenshotsの回帰
- `git diff --check`、staged diff review、secret scan、不要生成物確認

physical-device performance/touchをdesktop emulationから主張しないでください。未実施なら明示的なevidence gapとして残します。

## Commit、main統合、公開

1. focused branchでasset+rights、loader/hash/timeout、world/collision/ring、tests/visual proof、handoffを意味ある単位でcommitし、branchへpushする。
2. focused branchの全technical gateがgreenで、worktree clean、origin parity `0/0`、staged/secret audit済みの場合だけ`main`統合へ進む。
3. Paper Gliderのrepository-local方針に従ってfocused branchを`main`へ統合する。履歴改変やforce pushは行わない。競合や新しいremote commitがある場合は停止して報告する。
4. `main`でclean installと全unit/E2E/buildを再実行し、Viteのcommitted `docs/`を正規buildで更新する。source/public assetとgenerated `docs/`を同じcommitへ揃える。
5. `main`をpushした後、GitHub Pages `https://yushimoji.github.io/paper-glider/`でGLB/manifestのsubpath load、Archive Gate gameplay、console、fallback契約を検証する。deployment反映待ちはbounded pollingにする。
6. PR、tag、release作成はrepository authorityまたは明示指示がない限り行わない。

## 禁止事項

- Workbench repositoryを変更しない。
- Archive Gateを一般的なopen asset licenseとして記述しない。
- technical green前にPaper Glider `main`へ統合・deployしない。
- preloadを無期限に待たせない、mid-run差し替えしない。
- RecipeをPaper Glider runtimeへコピー・parseしない。
- colliderをrender meshから暗黙生成しない。
- async load timingを決定論へ混ぜない。
- GitHub Pages方式、flight tuning、seed、ring、score、visibilityを無関係に変更しない。
- 外部telemetry、backend、login、asset CDN、大規模refactor、無関係な依存更新、UI再設計を追加しない。

## 完了判定と報告

最後に次のいずれかを明示してください。

- `PUBLISHED_WITH_VERIFIED_ARCHIVE_GATE`: focused branchと`main`のtechnical gateがgreenで、committed `docs/`、main push、live GitHub PagesのArchive Gateとasset URLまで確認済み。
- `READY_FOR_MAIN_INTEGRATION`: focused branchのActive Artifactと全検証はgreenだが、remote/main/deploymentの外部条件によりmain統合または公開を実行していない。
- `CONDITIONAL`: playable acceptanceに具体的な不足が残る。
- `BLOCKED`: 安全な統合・検証を進められない。

`CONDITIONAL`/`BLOCKED`ではblocking contract、owner、対象file、最小修正、再実行commandを示してください。

完了報告は結論を先頭に置き、開始/終了Git状態、copyした全asset/hash/rights、実装変更、5秒timeout/fallback、決定論、collision/ring/recycleの証拠、unit/E2E件数、visual確認、未確認、全command、focused/main commitとpush、live Pages URL、Workbench無変更証拠、rights permissionとtechnical acceptanceの区別を示してください。`PROJECT_HANDOFF.md`を単独再開可能な正本へ更新してください。

---
