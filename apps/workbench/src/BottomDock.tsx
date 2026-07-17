import { useMemo, useState } from 'react';
import { generateAllPlacements, recipeHash, recipeStats, validateRecipe } from '@cgawe/core';
import { useRecipeDiff, useWorkbench } from './store';

type DockTab = 'validation' | 'changes' | 'seed' | 'statistics' | 'recipe';

export function BottomDock() {
  const { recipe, transact, regenerate } = useWorkbench();
  const [tab, setTab] = useState<DockTab>('validation');
  const issues = useMemo(() => validateRecipe(recipe), [recipe]);
  const diff = useRecipeDiff();
  const stats = useMemo(() => recipeStats(recipe), [recipe]);
  const placements = useMemo(() => generateAllPlacements(recipe), [recipe]);
  const tabs: Array<[DockTab, string, string]> = [
    ['validation', 'Validation', String(issues.length)], ['changes', 'Recipe changes', String(diff.length)],
    ['seed', 'Generation seed', String(recipe.generationSeed)], ['statistics', 'Statistics', `${stats.triangleCount} tris`],
    ['recipe', 'Recipe JSON', recipeHash(recipe).slice(-8)],
  ];
  return <section className="bottom-dock" aria-label="Recipe status"><div className="dock-tabs">{tabs.map(([id, label, meta]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><span>{label}</span><small>{meta}</small></button>)}</div><div className="dock-content">
    {tab === 'validation' && <div className="validation-content">{issues.length === 0 ? <div className="success-state"><b>✓</b><span><strong>Recipe is valid</strong><small>Schema, references and generated spline meshes passed.</small></span></div> : issues.map((issue) => <div key={`${issue.code}:${issue.recipePath}`} className={`issue ${issue.severity}`}><b>{issue.severity}</b><code>{issue.code}</code><span>{issue.message}</span><small>{issue.recipePath}</small></div>)}</div>}
    {tab === 'changes' && <div className="changes-content">{diff.length === 0 ? <div className="success-state muted"><b>○</b><span><strong>No unsaved recipe changes</strong><small>UI transactions and loaded JSON share this baseline.</small></span></div> : diff.slice(0, 20).map((entry) => <div className="change-row" key={entry.path}><code>{entry.path}</code><span>{JSON.stringify(entry.before)}</span><b>→</b><span>{JSON.stringify(entry.after)}</span></div>)}</div>}
    {tab === 'seed' && <div className="seed-content"><div className="seed-orbit" aria-hidden="true"><i /><i /><i /></div><div><span className="eyebrow">DETERMINISTIC INPUT</span><strong>{recipe.generationSeed}</strong><small>Placement and color variance resolve from this recipe seed plus local rule seeds.</small></div><label><span>Set seed</span><input data-testid="generation-seed" type="number" value={recipe.generationSeed} onChange={(event) => transact((draft) => { draft.generationSeed = Math.floor(Number(event.target.value)); })} /></label><button onClick={regenerate}>Rebuild same seed</button></div>}
    {tab === 'statistics' && <div className="stats-grid"><span><b>{recipe.assetDefinitions.length}</b>assets</span><span><b>{recipe.assetDefinitions.reduce((sum, asset) => sum + asset.parts.length, 0)}</b>parts</span><span><b>{placements.length}</b>placements</span><span><b>{stats.vertexCount}</b>vertices</span><span><b>{stats.triangleCount}</b>triangles</span><span><b>{recipe.socketDefinitions.length}</b>sockets</span></div>}
    {tab === 'recipe' && <div className="recipe-preview"><code>{JSON.stringify(recipe, null, 2)}</code></div>}
  </div></section>;
}
