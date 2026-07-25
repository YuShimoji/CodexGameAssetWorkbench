# Workbench v0.2 mainline promotion readiness 次Prompt

以下を単独で次のAgentへ渡してください。

---

CodexGameAssetWorkbenchのWB-M1「v0.2 Mainline Promotion Readiness」を完成させてください。現在の`codex/paper-glider-compat-v1`にあるSpline直接編集、Windows修正、Paper Glider Compatibility Packet v1、rights、visual evidenceを、ownerが`main`昇格を判断できる再現可能な候補へ整えることが目的です。ownerの明示承認がない状態ではcommit、push、PR、`main`統合、tag、release、deploymentを実行せず、`READY_FOR_OWNER_MAIN_DECISION`で停止してください。

## 固定基準

- 編集対象: `C:\Users\thank\Storage\Game Projects\CodexGameAssetWorkbench`
- 現行開発branch: `codex/paper-glider-compat-v1`
- 2026-07-25同期基準HEAD: `c58ac302acee3e0dad0ce0d2ce89dc545cec241d`
- upstream: `origin/codex/paper-glider-compat-v1`
- 2026-07-25時点のbranch parity: `0/0`
- `origin/main`: `0dd0980`（v0.1 baseline）
- branchは`origin/main`より9 commits先行、58 files、約5,018 insertions / 195 deletions
- downstream Paper Glider read-only基準: `main` `857afb2c4e0f4d2ba7a7965608be6c313780175c`、`origin/main` parity `0/0`
- Workbench current-state authority: `docs/PROJECT_HANDOFF.md`
- 監修資料と長期計画: `docs/PROJECT_STATUS_AND_ROADMAP.md`
- runtime packet authority: `eb4493c8a5810d3b4bb1de11f23d8cb6a024a247`
- rights authority: `docs/compat/paper-glider-v1/RIGHTS.md`

Pinned packet identity:

- Recipe hash: `fnv1a-3383aa61`
- Workbench content hash: `sha256:04461554becd391625cc834460196186e32a6c08a393e34c210bd1d45503d397`
- GLB SHA-256: `sha256:e91d1a4b87c2c0a7d3c6698c320c13239b3751c03884b3a4c6b5b6853be1d019`
- Manifest SHA-256: `sha256:b9c41a053e97d061ac4795c77d8f628e93f0a40adef6f718614e614c861e1bd5`
- Schema SHA-256: `sha256:abbd570b742de3ae87904069dfd0b27f26a0e223999e1cfa760dec81a26a4e39`
- Rights SHA-256: `sha256:481eb1980eb1728eefb84c6a5fb5bdf307185e99e7089e511e927ebf49958c9f`
- Rights identifier: `LicenseRef-PaperGlider-Project-Asset`

2026-07-25のローカル整備では、Windows負荷時に5秒を超えるCLI子プロセステスト2件へ、テスト専用の15秒上限を設定しました。Paper Glider runtimeの5,000 ms asset preload/fallback契約は変更していません。この差分と監修文書が未commitで残っている場合は、破棄や上書きをせず、まず内容と全gateを確認してください。

## 開始時確認

1. 最寄りの`AGENTS.md`、`docs/PROJECT_HANDOFF.md`、`docs/PROJECT_STATUS_AND_ROADMAP.md`、README、package scripts、Architecture、Recipe Schema、Compatibility Packet、RIGHTSを読む。
2. `git status --short --branch --untracked-files=all`、branch、HEAD、upstream、`origin/main`、remote parityを実測する。
3. `git fetch --prune origin`後に未知のremote advance、local変更、staged変更がある場合は、その所有者と意味を特定する。reset、checkout、stash、cleanで消さない。
4. このcheckoutを参照するNode/npm processをPID・command lineで確認する。TypeScript language server、preview、別Agentのtestを停止しない。npm操作は直列化する。
5. repo-local `core.autocrlf=false`を確認する。Schema生成物とtracked blobはLFを維持する。
6. Paper Gliderはread-onlyとし、asset、manifest、schema、RIGHTS、Recipe、公開成果物を再生成・変更しない。

## Active Artifact

成果物は単なる「全テストgreen」報告ではありません。ownerが次の一手を安全に決められる、次を含むmainline promotion candidateです。

1. 現行branchと`origin/main`のcommit map、変更領域、互換性リスク、rollback point。
2. Windowsで再現可能なclean-install/full-verify証拠。
3. 5秒test timeout flakeを解消した局所的変更と、その実測根拠。
4. Packet/rights/Recipe/GLB/manifest/schema/visual hashの不変証拠。
5. branch push・PR・main merge・tag/releaseの各gateを分離したowner decision packet。
6. main昇格後に着手する最初の製品sliceとして、汎用versioned runtime bundle exportの受入条件。

## 実装範囲

### A. テスト安定化

- `packages/cli/test/cli.test.ts`と`packages/cli/test/paper-glider-compat.test.ts`の子プロセス型テストだけに、実測に基づく上限を設定する。
- 全suiteのglobal timeoutを一括緩和しない。
- timeout値変更がruntime timeout、network timeout、gameplay contractへ波及していないことを確認する。

### B. 再現可能なpromotion gate

- repositoryにCIが存在しない場合、Windows + Node 22以上を基準に、`npm ci`、Playwright Chromium、`npm ls --depth=0`、`npm run verify`を直列実行する最小workflow候補を設計する。
- workflow追加はownerのbranch変更許可範囲でのみ実装する。外部service、secret、deployment、Pages設定を追加しない。
- primary checkoutのlanguage serverやpreviewを壊す場合、短いTemp pathのdetached worktreeまたはclean cloneを使う。候補SHAと検証SHAを一致させる。
- current working treeに未commit差分がある間は、HEADだけのclean-room passをその差分の証明として扱わない。

### C. Mainline review packet

- `origin/main...candidate`の9 commitsと58 filesを、Schema/Core/Adapter/CLI/Workbench UI/evidence/docs/compatibility/rightの責任単位で整理する。
- `main`昇格時の互換性、生成物、rights、downstream Paper Gliderへの影響を説明する。
- merge方式はowner判断とし、履歴改変、force-push、squashによるauthority SHA消失を勝手に選ばない。
- downstreamが参照する`eb4493c`、packet hash、rights textへ到達可能な履歴を維持する。

## 維持契約

- version付きRecipe JSONが編集正本。GLB、manifest、screenshots、readbackは派生物。
- 依存方向は`schema ← core ← adapter-three ← workbench`。CLIはschema/coreだけを使う。
- seeded generation、Stable ID、Recipe save/reload、schema version gate、Coreのengine-neutral性を維持する。
- Paper Glider runtime境界はpinned GLB + schema-validated manifest。Recipeをdownstream runtimeへ持ち込まない。
- `LicenseRef-PaperGlider-Project-Asset`はPaper Glider project-scoped permission。一般素材ライセンスへ拡張しない。
- rights permission、Workbench technical gate、Paper Glider technical acceptance、owner main approval、release/publicationを独立したgateとして報告する。
- 無関係な依存更新、UI再設計、cloud、login、telemetry、external AI API、Unity/Godot/Unreal adapter実装へ広げない。

## 必須検証

- `git status --short --branch`
- `git rev-list --left-right --count 'HEAD...@{upstream}'`
- `git rev-list --left-right --count 'origin/main...HEAD'`
- `node --version`、`npm --version`
- clean candidateで`npm ci`
- `npm ls --depth=0`
- `npx playwright install chromium`
- `npm run verify`
- 6 test files / 21 tests
- Workbench browser 7 states、export 3 files
- compatibility visual 5 states、console errors 0
- compatibility verifierのwarnings 0、validation errors 0、validation warnings 0
- GLB、manifest、schema、rights、Recipe/content hash
- `git diff --check`
- staged diff、secret、ignored/local evidence、不要untrackedの監査
- Paper Glider read-only stateとpacket hash不変

## Owner decision packet

最後に次を明示してください。

- candidate branch/HEAD/upstream/parity/worktree
- `origin/main`との差分とmerge-base
- local/clean-room/CIの各証拠がどのexact SHAを検証したか
- test timeout安定化のbefore/after実測
- full verifyの件数、hash、browser証拠
- Vite chunk-size warning、Schema migration不在、汎用Scene/Room bundle未実装などの残課題
- commit、push、PR、main merge、tag、release、deploymentの実施有無
- ownerが選ぶ必要がある最小判断

## 完了判定

- `READY_FOR_OWNER_MAIN_DECISION`: candidateと全technical evidenceがgreen。main変更は未実施。
- `MAINLINE_V0_2_ESTABLISHED`: ownerの明示承認後にだけ使用。main反映、remote parity、main上の再検証までgreen。
- `CONDITIONAL`: 候補は動くが、特定のtechnical evidenceまたは再現性が不足。
- `BLOCKED`: unknown remote/local ownership、権利、認証、履歴衝突などにより安全な候補化ができない。

`CONDITIONAL`/`BLOCKED`ではpurpose、effect、requirements、state、owner、next moveを必ず記録してください。`docs/PROJECT_HANDOFF.md`と`docs/PROJECT_STATUS_AND_ROADMAP.md`を次端末が単独再開できる内容へ更新し、決定的な事実をchatだけに残さないでください。

---
