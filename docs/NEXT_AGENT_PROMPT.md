# Current re-entry boundary

この文書が以前保持していたWB-M1 mainline promotion promptは、2026-07-25の`cgawe-runtime-bundle-v1`実装開始時点でactive promptではなくなりました。次の作業を自動的に開始する指示はここには置きません。

再開時は次を正本として読みます。

- `docs/PROJECT_HANDOFF.md`
- `docs/PROJECT_STATUS_AND_ROADMAP.md`
- `docs/RUNTIME_BUNDLE_V1.md`
- `docs/LOWPASS_RUNTIME_ASSET_CANARY_V1.md`

現在のportable stateは **`CGAWE_GENERIC_RUNTIME_BUNDLE_RIGHTS_GATE_REMOTE_GREEN`** です。branchは`codex/runtime-bundle-rights-gate-v1`、baseはexact predecessor `05fe3ce5111b1656fa145dfdc1cf163c9b9b6162`、実装・evidence commitは`15b029d9df533fc4ad8bcc782b6d214e244cb007`です。[GitHub Actions run 30470902752](https://github.com/YuShimoji/CodexGameAssetWorkbench/actions/runs/30470902752)はこのexact SHAでgreenでした。現在のdocs-only handoff tipは`git rev-parse HEAD`で確認します。

Generic Runtime Bundle contract / manifest versionは`cgawe-runtime-bundle-1.0.0` / `1.0.0`のままです。default `NOASSERTION`とsynthetic `DECLARED`がpassし、unknown status、blank notice、DECLARED license ID欠落、blank license IDはscene geometryとexporterより前に専用errorでfail closedになります。4 failuresはexporter invocation 0、output 0で、valid recoveryも成立しました。9 files / 41 testsとfull local/remote verifyがgreenです。

StarterとPaper Glider generic Runtime BundleのGLB/manifest hash、Paper Glider compatibility packet、LOWPASS canary、LOWPASS consumer 1.1.0は不変です。synthetic LicenseRefは構造試験専用で、rights ownerの宣言、license registry、配布許諾、公開承認を意味しません。

`origin/main`は開始時点の`4c8b05e...`のままです。このtaskはPR、main merge、tag、release、deployment、公開・アクセス変更を行っていません。

この文書は次作業を自動選定しません。残るbounded gateはreal rights authority、PR/main promotion、external consumer conformance、dependency advisory closeoutです。いずれも対応ownerと新しい明示authorityを確認してから開始します。

既存Paper Glider Compatibility Packetのdocumentation pinを維持します。

- Recipe hash: `fnv1a-3383aa61`
- Workbench content hash: `sha256:04461554becd391625cc834460196186e32a6c08a393e34c210bd1d45503d397`
- GLB SHA-256: `sha256:e91d1a4b87c2c0a7d3c6698c320c13239b3751c03884b3a4c6b5b6853be1d019`
- Manifest SHA-256: `sha256:b9c41a053e97d061ac4795c77d8f628e93f0a40adef6f718614e614c861e1bd5`
- Schema SHA-256: `sha256:abbd570b742de3ae87904069dfd0b27f26a0e223999e1cfa760dec81a26a4e39`
- Rights SHA-256: `sha256:481eb1980eb1728eefb84c6a5fb5bdf307185e99e7089e511e927ebf49958c9f`
- Rights identifier: `LicenseRef-PaperGlider-Project-Asset`

Generic Runtime BundleはこのLicenseRefを暗黙に流用せず、既定rightsを`NOASSERTION`とします。
