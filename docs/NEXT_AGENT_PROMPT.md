# Current re-entry boundary

この文書が以前保持していたWB-M1 mainline promotion promptは、2026-07-25の`cgawe-runtime-bundle-v1`実装開始時点でactive promptではなくなりました。次の作業を自動的に開始する指示はここには置きません。

再開時は次を正本として読みます。

- `docs/PROJECT_HANDOFF.md`
- `docs/PROJECT_STATUS_AND_ROADMAP.md`
- `docs/RUNTIME_BUNDLE_V1.md`
- `docs/LOWPASS_RUNTIME_ASSET_CANARY_V1.md`

現在のportable stateは **`CGAWE_LOWPASS_ARTIFACT_CONSUMER_RIGHTS_GATE_LOCAL_GREEN`** です。branchは`codex/lowpass-consumer-rights-gate-v1`、baseは`origin/main`の`4c8b05e9af7582807f42016d9e3d3ceff278592c`、実装・evidence commitは`c1a4f87e8d5633ee1010bd2f91d4589ced5690ac`です。[GitHub Actions run 30449320168](https://github.com/YuShimoji/CodexGameAssetWorkbench/actions/runs/30449320168)はこのexact SHAでgreenでした。現在のdocs-only handoff tipは`git rev-parse HEAD`で確認します。

`LowpassArtifactConsumer` contract 1.1.0は`NOASSERTION`とsynthetic `DECLARED`を構造検証し、unknown status、blank notice、DECLAREDでlicense ID欠落、asset/pack rights不一致をattachment前にfail closedにします。schema、producer、consumerは同じ制約へ揃え、11 negative cases、9 files / 40 tests、full local/remote verifyを通過しました。synthetic LicenseRefはテスト専用で、rights ownerの宣言、license registry、配布許諾、公開承認を意味しません。

`origin/main`は開始時点で旧consumer conformance docs tip `4c8b05e...`まで進んでいました。このtaskはそこからbranchを作成し、PR、main merge、tag、release、deployment、公開・アクセス変更を行っていません。

次のrepository-local候補は、Generic Runtime Bundle側のrights schema/producer/failure fixtureをLOWPASSと同じfail-closed境界へ揃えるthin sliceです。実装前にcurrent authorityとremote parityを再確認し、LOWPASS本体integration、Phase G/H、Security Cell tuning、UV/texture tool導入、実際のrights宣言はそれぞれ別owner gateとして扱います。

既存Paper Glider Compatibility Packetのdocumentation pinを維持します。

- Recipe hash: `fnv1a-3383aa61`
- Workbench content hash: `sha256:04461554becd391625cc834460196186e32a6c08a393e34c210bd1d45503d397`
- GLB SHA-256: `sha256:e91d1a4b87c2c0a7d3c6698c320c13239b3751c03884b3a4c6b5b6853be1d019`
- Manifest SHA-256: `sha256:b9c41a053e97d061ac4795c77d8f628e93f0a40adef6f718614e614c861e1bd5`
- Schema SHA-256: `sha256:abbd570b742de3ae87904069dfd0b27f26a0e223999e1cfa760dec81a26a4e39`
- Rights SHA-256: `sha256:481eb1980eb1728eefb84c6a5fb5bdf307185e99e7089e511e927ebf49958c9f`
- Rights identifier: `LicenseRef-PaperGlider-Project-Asset`

Generic Runtime BundleはこのLicenseRefを暗黙に流用せず、既定rightsを`NOASSERTION`とします。
