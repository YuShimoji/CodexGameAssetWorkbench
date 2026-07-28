# Direct manipulation / visible placement evidence

このdirectoryは`npm run direct-manipulation:generate`で`output/playwright/direct-manipulation/`から選別される監修用証跡です。Recipeが編集正本であり、PNGとreadbackは派生proofです。

| File | Review point |
|---|---|
| `01-isolate-cylinder-direct-selected.png` | Part direct pick、選択輪郭、Move gizmo、Inspector値 |
| `02-scene-placement-preview.png` | 半透明preview、接地、表示座標、Cancel / Confirm |
| `03-scene-confirmed-selected.png` | 1 Instance確定後のScene Tree、Inspector、gizmo |
| `direct-review-prop.recipe.json` | UI authoring、direct transform、placement、Save/Openのround-trip Recipe |
| `readback.json` | gesture hash、Undo/Redo、placement非破壊性、validation、export、console結果 |

証拠境界と再生成手順は`docs/DIRECT_MANIPULATION_VISIBLE_PLACEMENT_V1.md`を参照してください。
