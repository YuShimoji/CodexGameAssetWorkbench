# Paper Gliderへ最初のWorkbench-authored roomを統合する次Prompt

以下を単独で次のAgentへ渡してください。

---

Paper Gliderへ、CodexGameAssetWorkbenchの確定済み`PaperGlider Compatibility Packet v1`と`Archive Gate` canaryを使った最初のプレイ可能なWorkbench-authored room archetypeを統合してください。

## Repositoryと固定基準

- 編集対象Paper Glider: `C:\Users\thank\Storage\Game Projects\paper-glider`
- 読み取り専用Workbench: `C:\Users\thank\Storage\Game Projects\CodexGameAssetWorkbench`
- Paper Glider開始基準commit: `3ad5ac1fbc6715f36f4b2d961754dfd8d7f35750`
- Workbench contract: `paper-glider-compat-v1`
- Workbench packet entrypoint: `C:\Users\thank\Storage\Game Projects\CodexGameAssetWorkbench\docs\compat\paper-glider-v1\README.md`
- compatibility matrix: `C:\Users\thank\Storage\Game Projects\CodexGameAssetWorkbench\docs\PAPER_GLIDER_COMPATIBILITY_PACKET_V1.md`
- manifest schema: `C:\Users\thank\Storage\Game Projects\CodexGameAssetWorkbench\docs\compat\paper-glider-v1\paper-glider-compat-manifest-v1.schema.json`
- runtime canary GLB: `C:\Users\thank\Storage\Game Projects\CodexGameAssetWorkbench\docs\compat\paper-glider-v1\paper-glider-archive-gate.glb`
- runtime manifest: `C:\Users\thank\Storage\Game Projects\CodexGameAssetWorkbench\docs\compat\paper-glider-v1\paper-glider-archive-gate.manifest.json`
- authoring/provenance Recipe（runtimeへは入れない）: `C:\Users\thank\Storage\Game Projects\CodexGameAssetWorkbench\docs\compat\paper-glider-v1\paper-glider-canary.recipe.json`
- expected content hash: `sha256:f866eacf62263b24d5a102d9460a95d9ab3bc0a803c8159078b17bdc4fb3810b`
- expected GLB SHA-256: `sha256:e91d1a4b87c2c0a7d3c6698c320c13239b3751c03884b3a4c6b5b6853be1d019`
- expected manifest file SHA-256: `sha256:2df0a9c0b021857833636311560961f718d9ecf0671b48d7209d2f09cbdeded9`
- expected manifest schema file SHA-256: `sha256:775708ca3a25189ec938192509ff9a545a88ef9f6415498bbfdf03f768f7d17c`

Workbenchはこのターンではread-onlyです。Workbench配下の編集、install、build、生成、commit、branch操作、pushを行わないでください。Paper Glider側だけを変更します。

## 開始時確認

1. 両repositoryで最寄りの`AGENTS.md`と、それが指す正本文書を読む。Paper Gliderでは`PROJECT_HANDOFF.md`、README、package scripts、Vite/Pages設定、runtime入口、`PaperGliderGame`、`CorridorWorld`、`RingPathPlanner`、既存testsを読む。Workbenchでは上記packet README、manifest/schema、compatibility matrixだけをread-onlyで読む。
2. 両repositoryのbranch、HEAD、upstream、origin parity、worktreeを実測する。Paper Glider HEADが固定commitと異なる場合は勝手にcheckout/resetせず、差分と現在のauthorityを確認する。未知のlocal変更は上書きしない。
3. Paper Gliderの基準がcleanかつpush済みであれば、`codex/workbench-archive-gate-room-v1`のようなfocused branchを作成する。mainへのmerge、tag、deployment、PR作成は行わない。
4. npm操作は直列化する。既存preview processや別repositoryのprocessを停止・変更しない。port競合時は空きportを使う。
5. Workbench bundleをコピーする前にGLBとmanifestのSHA-256を再計算して上記値と照合する。Recipeはprovenance確認用でありPaper Glider runtime/public assetsへコピーしない。

## 実装目的

現在のprocedural roomsを安全なfallbackとして残しながら、run開始前に検証済みのGLB + manifestをpreloadし、決定論的に選ばれたroom segmentへArchive Gateを配置してください。アセットの取得・検証・描画・collision・ring clearance・room recyclingまでを薄いPaper Glider所有adapterで接続し、実際にプレイ可能であることを証拠化します。

runtime assetはPaper Gliderのsource/public asset領域のversion付きdirectory、推奨`public/assets/workbench/paper-glider-v1/`へ配置し、Vite build後の`docs/assets/workbench/paper-glider-v1/`へ正しく複製される構成にしてください。URLは必ず`import.meta.env.BASE_URL`を基準に構築し、root absolute `/assets/...`やrepository名のhardcodeを使わないでください。

## 固定asset contract

- Three右手系、`+Y` up、`-Z` forward、scale 1。
- placementはmanifestのposition/rotation/scaleをそのまま適用する。床面placement Yは`-0.52`。
- room contractはwidth 11.2、height 6.8、length 18。
- 必須visual nodeは8件。Stable IDがGLB node nameとglTF extrasに入っているため、load後に全IDを解決する。
- collisionはmanifestの3 AABBが正本。render mesh boundsから推測しない。各recordのcenter/halfExtentsとvisualNodeIdsを検証してPaper Gliderの`WorldCollider`へ変換する。
- Recipeをruntimeでparseしない。generic Workbench schemaへPaper Glider固有ルールを追加しない。
- materialはtextureなしのsolid MeshStandard。loaded meshをtraverseしてPaperのlighting/fog/shadow契約に合わせ、geometry/materialをcacheしてroom clone間で再利用する。
- manifest/GLB fetch、schema/contract/hash、parse、required node、finite transform、scale、collider参照のどれかが失敗したら、そのrunではcanaryを採用せず現在のprocedural roomへfallbackする。network完了後のmid-run差し替えは禁止。

## 必須実装

1. Paper Glider所有の小さなmanifest型/validatorと`WorkbenchRoomAssetLoader`相当を追加する。過剰な汎用asset frameworkやWorkbenchコードのcopyは避ける。
2. `main.ts`からgame/worldを構築する前にmanifestとGLBを一度preloadする。成功時はvalidated immutable asset library、失敗時は`null`または明示的failure resultを渡す。failureはユーザーのrunを止めずprocedural fallbackへ進める。
3. Web Crypto等で配布GLBのSHA-256を検証し、contract version、Paper baseline compatibility、relative path、hash、required node、finite transform/scale、collider visual refsを確認する。productionで不要なRecipeやWorkbench依存を持ち込まない。
4. loaded rootはcacheし、選択されたroom group配下へcloneする。各room recycleで再fetch/reparseせず、geometry/materialを共有する。library shutdown以外で共有resourceをdisposeしない。
5. manifest AABBごとにroom-local anchorを作り、既存の`WorldCollider`形式へ変換する。game固有のplayer clearance/tuningはPaper Glider側の責任として既存collision contractに統合する。
6. 同じAABBを純データとしてring route計画へ渡し、ring生成前にcanary障害物を回避させる。飛行tuning、seed、ring、score、visibilityの既存契約を変更しない。
7. room archetype選択はrun seedとroom sequenceの既存`randomUnit`座標だけで決める。`Math.random()`、fetch順、load時間、frame時間で選択しない。同じseed/sequenceではasset availabilityが同じなら同じ配置・ring pathになることをtestする。
8. assetあり/なしの両方で現行procedural pathを維持する。error diagnosticはlocal/開発用途に限定し、外部telemetry、backend、login、CDNを追加しない。
9. READMEまたはasset contract文書と`PROJECT_HANDOFF.md`を更新し、copy元hash、配置先、loader/fallback、collision/ring/recycling、Pages URL、license gate、検証方法を単独再開可能に記録する。

## License gate

bundle provenanceはrepository-owned Recipeでthird-party assetなしですが、Workbench repositoryには明示的asset licenseがなくmanifestは`NOASSERTION`です。local integrationと検証は進めてよいですが、ownerが再配布許諾を記録するまではGitHub Pagesへのpublic deploymentを実行せず、public release readinessをPASSにしないでください。既に明示的許諾がrepository-local authorityに追加されている場合だけ、その根拠を記録してgateを更新します。

## 必須検証

- repositoryで定められたclean installと`npm ls --depth=0`
- typecheck、lint、unit/integration tests、production build
- manifest valid/invalid、GLB hash mismatch、missing node、failed fetchのloader tests
- Pages base `/paper-glider/`を通るmanifest/GLB URLとproduction preview load
- asset availability確定後の同seed/sequence同一room選択・ring path
- 3 colliderが正しいroom-local/world位置へ変換され、ring clearanceが侵入しないこと
- 9 room recycling中のclone再利用、fetch/parseが一度だけであること、共有resourceを早期disposeしないこと
- asset failure時にcurrent procedural roomが継続し、runが開始できること
- desktopとmobile portraitのPlaywright smoke、console errors 0、validation errors/warnings 0
- 実プレイでgate中央を通過でき、pier/top beam collisionが発火し、ring/score/visibility/fair-speed契約に回帰がないこと
- `git diff --check`、staged diff review、secret scan、不要生成物確認

visual proofには少なくとも、room内のArchive Gate全体、collider debug表示、Paper flight cameraからの見え方、ringがcolliderを避ける状態、recycle後の再出現、mobile portraitを残してください。desktop/browser証跡をphysical-device proofと表現しないでください。

## 禁止事項

- Workbench repositoryを変更しない。
- Paper Gliderのmainへmergeしない、tag/PR/deployを行わない。
- GitHub Pages方式を変更しない。
- flight tuning、run seed意味論、ring、score、visibility契約を無関係に変更しない。
- colliderをrender meshから暗黙生成しない。
- async load timingを決定論へ混ぜない。
- 外部telemetry、backend、login、asset CDN、大規模refactor、UI再設計、無関係な依存更新を追加しない。
- local/browser検証だけでphysical device、public deployment、license acceptanceを主張しない。

## Commitと完了判定

変更はasset + loader contract、world/collision/ring integration、tests/visual proof、handoffの意味ある単位でcommitし、focused branchへpushしてください。各commit前にdiffを確認します。main merge、tag、PR、deploymentは行いません。

最後に次のいずれかを明示してください。

- `READY_FOR_LOCAL_PLAYTEST`: loader/fallback、決定論、world/collision/ring/recycle、automated/browser evidenceがgreenでlocalプレイ可能。license/public deploymentは別owner gateとして残せる。
- `CONDITIONAL`: 実装は進んだがplayable acceptanceに必要な具体的contractが残る。
- `BLOCKED`: 安全な統合を開始または検証できない。

`CONDITIONAL`/`BLOCKED`ではblocking contract、owner、対象file、最小修正、再実行commandを示してください。完了報告は結論を先頭に置き、開始/終了Git状態、copyした全assetとhash、実装変更、fallback/決定論/collision/ring/recycleの証拠、自動green、visual確認、未確認、test件数、全command、commit/push、Workbench無変更証拠、license/public/device gateを分離してください。

---
