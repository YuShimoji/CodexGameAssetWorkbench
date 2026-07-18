# CodexGameAssetWorkbench project handoff

この文書は、別端末でリポジトリをcloneしたAgentまたは開発者が、外部添付や過去のCodex taskを参照せずに現在地点から再開するための正本です。設計の詳細は各専門文書、依頼原文は`docs/ai/`に分離して保存します。

## 現在地点

| 項目 | 確定状態 |
|---|---|
| GitHub | `https://github.com/YuShimoji/CodexGameAssetWorkbench`（public） |
| 基準branch | `main` |
| v0.1 checkpoint | `0dd09801148ead04d211063b00d5e54f3f1cb10f` |
| 継続branch | `codex/spline-direct-edit-v0-2` |
| v0.2 Active Artifact | `8756f0baf63c677f00c49c0c835c8138fc50e2b7` |
| Schema | `0.1.0`。v0.2でversion変更なし |
| Node.js | 22以上 |
| PR / merge / tag | 未作成。`main`はv0.1、v0.2は専用branchに分離 |

## 2026-07-18 ローカル再開検証

`git fetch --prune origin`後、`origin/main`はローカル`main`と`0/0` parityでした。ただし最新の実装と引き継ぎは`origin/codex/spline-direct-edit-v0-2`にあるため、同名のローカルbranchを作成してtrackingを設定しました。現在のHEADとupstreamはともに`403b028c67d4eaff847df5f086f53bbedb448d64`です。

Windowsの`core.autocrlf=true`では生成済みRecipe SchemaがCRLFへ変換され、LF固定の`schema:check`が内容差分なしでも失敗しました。このrepositoryだけ`core.autocrlf=false`へ設定し、`.gitattributes`でもtextをLFへ固定しています。また、空白を含むWindows pathをCLI testが`URL.pathname`で`Game%20Projects`へ変換していたため、`packages/cli/test/cli.test.ts`を`fileURLToPath`へ変更しました。別projectのpreviewが4173番を使用中でも誤接続しないよう、browser smokeは空きloopback portを確保して`--strictPort`で起動します。

Node.js `v24.13.0`、npm `11.6.2`で`npm ci`（274 packages、audit 0 vulnerabilities）、`npm ls --depth=0`、`npx playwright install chromium`を完了しました。その後の`npm run verify`はSchema同期、build、typecheck、lint、5 test files / 20 tests、Playwright smoke、`git diff --check`を含めて成功しています。ブラウザreadbackはRecipe hash `fnv1a-59511f4a`、編集対象`spline-2`で、7 screenshotsとRecipe/GLB/manifestを`output/playwright/`へ再生成しました。

| 残作業 | 目的 | 効果 | 要件 | 状態 | Owner | 次のmove |
|---|---|---|---|---|---|---|
| Windows検証closeout | 空白path、改行、preview port競合を除去する | Windows上で他projectと併存しても`npm run verify`を再現できる | author/remote/staged scopeを確認して継続branchへpush | 実装・フル検証済み | Workbench | このhandoff更新と同じcommitでcloseout |
| v0.2の受入とmain統合判断 | v0.2を基準branchへ昇格するか決める | clone直後に最新Active Artifactへ到達可能になる | 創作的受入、merge/tag方針 | 未判断 | repository owner | `codex/spline-direct-edit-v0-2`をreview後、merge/tagを明示承認 |
| Paper Glider compatibility packet | 将来統合の契約差分を実測しcanary bundleへ固定する | adapter/export要件を統合前に確定できる | `C:\Users\thank\Storage\Game Projects\paper-glider`の`3ad5ac1`をread-only参照 | 開始条件を確認済み | Workbench / Paper Glider owner | focused branchでpacket v1を作成 |

v0.1はPrimitive、Material、Definition/Instance Override、Variant、Placement、Spline Sweep、Room/Socket、Recipe保存、CLI、選択Asset GLB+manifestを含む最初のdurable checkpointです。v0.2では同じRecipe First境界を保ち、ViewportからのSpline作成、control point選択・gizmo移動・追加・挿入・削除、profile keyframe編集、rod/road/corridor切替、adaptive resolution、transaction、保存再読込を追加しました。

## 別端末での再開

```powershell
git clone https://github.com/YuShimoji/CodexGameAssetWorkbench.git
Set-Location CodexGameAssetWorkbench
git switch codex/spline-direct-edit-v0-2
git config --local user.name "YuShimoji"
git config --local user.email "160492991+YuShimoji@users.noreply.github.com"
npm ci
npx playwright install chromium
npm run verify
```

author設定はこのリポジトリに限って許可された値です。別端末へGit configは転送されないため、commit前に上のrepository-local設定を行い、global設定を変更しないでください。push前には`git show -s --format='%an <%ae>' HEAD`、`git diff --cached --name-status`、`git remote -v`を再確認します。

## Context map

| 文書・artifact | 読めば分かること |
|---|---|
| `README.md` | 起動、実装済み操作、package境界、CLI、検証 |
| `docs/ARCHITECTURE.md` | Recipe transaction、決定論、Spline frame、Definition/Instance境界、派生出力 |
| `docs/RECIPE_SCHEMA.md` | Schema 0.1.0、Stable ID、互換性、golden fixture |
| `docs/NEXT_AGENT_PROMPT.md` | 次の安全なsliceであるPaperGliderClone読み取り専用互換性監査の完全Prompt |
| `docs/ai/001_INITIAL_WORKBENCH_PROMPT.md` | v0.1初期構築依頼の原文 |
| `docs/ai/002_SPLINE_V0_2_PROMPT.md` | v0.1耐久化とSpline v0.2依頼の原文 |
| `artifacts/v0.1/` | v0.1 checkpointの選別済みVisual Proof/readback/manifest |
| `artifacts/v0.2/` | v0.2の7画面、round-trip Recipe、readback、GLB回帰manifest |

編集可能な正本はversion付きRecipe JSONです。GLB、manifest、screenshots、readbackは派生物であり、Three.js Object3DやReact/DOM stateを永続化しません。依存方向は`schema ← core ← adapter-three ← workbench`で、CoreへThree.js、React、DOM、WebGLを持ち込まないことがテストされています。

## 最終検証のreadback

`npm run verify`はSchema同期、build、typecheck、lint、Vitest/CLI、Playwright、`git diff --check`を含み、v0.2 commit前に成功しています。

| 指標 | 値 |
|---|---|
| test files / tests | 5 / 20、全成功 |
| Recipe hash | `fnv1a-59511f4a` |
| generationSeed | `1847` |
| 編集Spline | `spline-2`、4 control points、corridor |
| profile keyframes | radius 2、width 3、height 3、合計8 |
| generated mesh | 320 vertices、632 triangles |
| Validation | errors 0、warnings 0 |
| 保存→再読込 | hash一致 |
| Undo / Redo | point移動前後を復元 |
| Browser console | errors 0 |
| GLB / manifest回帰 | 成功 |

詳細と各画像の対応状態は`artifacts/v0.2/readback-v0.2.json`を参照してください。Playwright生出力は`output/playwright/`へ生成されGitでは追跡せず、耐久証跡だけを`artifacts/`へ選別します。

## 実装境界と既知の制約

- Spline作成と既存点の追加・挿入はY=0のGround Planeを使います。任意作業平面、surface snap、Bezier tangent editorは未実装です。
- gizmo drag中はRecipeをpreviewし、mouse upで1件のUndo履歴へcommitします。作成draftはConfirmまでRecipeへ入りません。
- Schema 0.1.0はradius/width/height channelをすべて保持します。現在のprofileに不要なchannelを破棄せず、UIにはactive channelだけを表示します。
- GLB exportは選択Asset Definitionだけが対象です。Scene bundle、Spline/Room/Placement一括exportは未実装です。
- 初期JavaScript bundleは約1.36 MB、gzip約380 KBです。bundle最適化はv0.2の非対象でした。
- PaperGliderCloneは現在のローカルworkspaceに存在しないため、統合も互換性監査も未着手です。監査を始めるには対象repositoryの明示的なローカルパスが必要です。

## 次の安全な進路

1. v0.2の創作的受入を行い、必要なら専用branchから`main`へ取り込むかrelease tagを付ける。現在はどちらも未実施です。
2. PaperGliderCloneのローカルパスを与え、`docs/NEXT_AGENT_PROMPT.md`で読み取り専用互換性監査を行う。対象側の変更や統合は別承認にします。
3. Splineの任意作業平面・surface snap・segment直接選択を新しいsliceとして設計する。Schema拡張が不要かを先に判断します。

開始時は必ずbranch、HEAD、upstream、remote、worktree、project-localルールを実測してください。git pull、stash、merge、rebase、reset、履歴改変、mainへの直接実装、PR作成を過去Promptが許可したと推測して実行しないでください。
