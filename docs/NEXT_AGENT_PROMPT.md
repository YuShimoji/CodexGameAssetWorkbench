# Current continuation authority

この文書は新しい実装sliceを自動開始させるpromptではありません。現在の正本は次です。

- `docs/PROJECT_HANDOFF.md`
- `docs/PROJECT_STATUS_AND_ROADMAP.md`
- `docs/DIRECT_MANIPULATION_VISIBLE_PLACEMENT_V1.md`
- `docs/ARCHITECTURE.md`

現在のterminal stateは`STUDIO_DIRECT_MANIPULATION_VISIBLE_PLACEMENT_V1_REVIEW_BRANCH_GREEN`です。branchは`codex/direct-manipulation-visible-placement-v1`、slice predecessorは`3f1d4d3d1905a7450a1c9d2183ce1a9f041c7392`です。implementation / evidence commit `dac9dfea7b95e12be2b1f4ae0045074e033da647`のGitHub Actions `Verify` run `30325159695`はgreenです。最終docs-only successorは`git rev-parse HEAD`、remote共有状態は`git rev-list --left-right --count 'HEAD...@{upstream}'`で実測します。

次の候補はstatus文書にありますが、いずれも新しいauthorityを要します。Actions v5 migration、direct manipulation UX audit、surface placement、dependency / bundle costのどれを選ぶかを監修者が決めるまで、merge、tag、release、deployment、Paper Glider互換性拡張を開始しません。

既存Paper Glider Compatibility Packetのdocumentation pinとrights境界を維持します。

- Recipe hash: `fnv1a-3383aa61`
- Workbench content hash: `sha256:04461554becd391625cc834460196186e32a6c08a393e34c210bd1d45503d397`
- GLB SHA-256: `sha256:e91d1a4b87c2c0a7d3c6698c320c13239b3751c03884b3a4c6b5b6853be1d019`
- Manifest SHA-256: `sha256:b9c41a053e97d061ac4795c77d8f628e93f0a40adef6f718614e614c861e1bd5`
- Schema SHA-256: `sha256:abbd570b742de3ae87904069dfd0b27f26a0e223999e1cfa760dec81a26a4e39`
- Rights SHA-256: `sha256:481eb1980eb1728eefb84c6a5fb5bdf307185e99e7089e511e927ebf49958c9f`
- Rights identifier: `LicenseRef-PaperGlider-Project-Asset`

Generic Runtime BundleはこのLicenseRefを暗黙に流用せず、rights既定値を`NOASSERTION`に保ちます。
