# Superseded execution prompt

この文書が以前保持していたWB-M1 mainline promotion promptは、2026-07-25の`cgawe-runtime-bundle-v1`実装開始時点でactive promptではなくなりました。次の作業を自動的に開始する指示はここには置きません。

再開時は次を正本として読みます。

- `docs/PROJECT_HANDOFF.md`
- `docs/PROJECT_STATUS_AND_ROADMAP.md`
- `docs/RUNTIME_BUNDLE_V1.md`

現在のlocal terminal stateは`STUDIO_RUNTIME_BUNDLE_V1_LOCAL_GREEN`です。local branchは`codex/runtime-bundle-v1`、branch開始SHAは`c58ac302acee3e0dad0ce0d2ce89dc545cec241d`、preexisting handoff checkpointは`06e875b`、Runtime Bundle contract/core commitは`88a299d`です。push、PR、main merge、tag、release、deploymentは未実施です。

既存Paper Glider Compatibility Packetのdocumentation pinを維持します。

- Recipe hash: `fnv1a-3383aa61`
- Workbench content hash: `sha256:04461554becd391625cc834460196186e32a6c08a393e34c210bd1d45503d397`
- GLB SHA-256: `sha256:e91d1a4b87c2c0a7d3c6698c320c13239b3751c03884b3a4c6b5b6853be1d019`
- Manifest SHA-256: `sha256:b9c41a053e97d061ac4795c77d8f628e93f0a40adef6f718614e614c861e1bd5`
- Schema SHA-256: `sha256:abbd570b742de3ae87904069dfd0b27f26a0e223999e1cfa760dec81a26a4e39`
- Rights SHA-256: `sha256:481eb1980eb1728eefb84c6a5fb5bdf307185e99e7089e511e927ebf49958c9f`
- Rights identifier: `LicenseRef-PaperGlider-Project-Asset`

Generic Runtime BundleはこのLicenseRefを暗黙に流用せず、既定rightsを`NOASSERTION`とします。
