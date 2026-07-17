# Derived artifacts

このディレクトリは将来の明示的なexport先の予約領域です。Recipeの正本は`sample`または利用者が保存したJSONであり、GLB、manifest、cache、screenshotをここへ置いても編集正本にはなりません。

自動Visual Proofの生出力はPlaywright運用規約に合わせて`output/playwright/`へ生成し、Gitでは追跡しません。耐久的な基準版として必要な代表画像、readback、manifestだけをversion別のサブディレクトリへ選別します。

- `v0.1/`: 初回checkpointのAsset isolate、corridor、Room/Socket/Placement統合画面、readback、選択Asset manifest
- `v0.2/`: Spline作成・control point直接編集、rod/road/corridor、統合Scene、保存再読込の代表画像と、各画像のRecipe状態を対応付けたreadback、round-trip Recipe、GLB回帰manifest
