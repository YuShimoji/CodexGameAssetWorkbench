import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { createSplineDefinition, diffRecipes, recipeHash, type SplineKeyframeChannel } from '@cgawe/core';
import { parseRecipe, type Recipe, type Vec3 } from '@cgawe/schema';
import starterJson from '../../../samples/starter-project/recipe.json';

export type Selection =
  | { kind: 'asset'; id: string; partId?: string }
  | { kind: 'material'; id: string }
  | { kind: 'instance'; id: string; partId?: string }
  | { kind: 'spline'; id: string; pointIndex?: number; keyframe?: { channel: SplineKeyframeChannel; index: number } }
  | { kind: 'room'; id: string }
  | { kind: 'socket'; id: string };

export type ViewMode = 'asset' | 'scene';
export type TransformMode = 'translate' | 'rotate' | 'scale';

interface SessionState {
  recipe: Recipe;
  savedRecipe: Recipe;
  undo: Recipe[];
  redo: Recipe[];
}

interface WorkbenchContextValue {
  recipe: Recipe;
  savedRecipe: Recipe;
  selection: Selection;
  viewMode: ViewMode;
  transformMode: TransformMode;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  renderEpoch: number;
  gridSnap: boolean;
  splineCreation: { active: boolean; points: Vec3[] };
  setSelection(selection: Selection): void;
  setViewMode(mode: ViewMode): void;
  setTransformMode(mode: TransformMode): void;
  transact(mutator: (draft: Recipe) => void): void;
  beginGesture(): void;
  previewTransaction(mutator: (draft: Recipe) => void): void;
  commitGesture(): void;
  cancelGesture(): void;
  undo(): void;
  redo(): void;
  reset(): void;
  revert(): void;
  save(): void;
  load(input: unknown): void;
  regenerate(): void;
  setGridSnap(enabled: boolean): void;
  startSplineCreation(): void;
  addDraftSplinePoint(point: Vec3): void;
  confirmSplineCreation(): void;
  cancelSplineCreation(): void;
}

const starterRecipe = parseRecipe(starterJson);
const WorkbenchContext = createContext<WorkbenchContextValue | null>(null);

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(() => ({
    recipe: structuredClone(starterRecipe),
    savedRecipe: structuredClone(starterRecipe),
    undo: [],
    redo: [],
  }));
  const [selection, setSelection] = useState<Selection>({ kind: 'asset', id: starterRecipe.assetDefinitions[0]!.id, partId: starterRecipe.assetDefinitions[0]!.parts[0]!.id });
  const [viewMode, setViewMode] = useState<ViewMode>('scene');
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [renderEpoch, setRenderEpoch] = useState(0);
  const [gridSnap, setGridSnap] = useState(true);
  const [splineCreation, setSplineCreation] = useState<{ active: boolean; points: Vec3[] }>({ active: false, points: [] });
  const gestureBaseline = useRef<Recipe | null>(null);

  const value = useMemo<WorkbenchContextValue>(() => ({
    recipe: session.recipe,
    savedRecipe: session.savedRecipe,
    selection,
    viewMode,
    transformMode,
    dirty: recipeHash(session.recipe) !== recipeHash(session.savedRecipe),
    canUndo: session.undo.length > 0,
    canRedo: session.redo.length > 0,
    renderEpoch,
    gridSnap,
    splineCreation,
    setSelection,
    setViewMode,
    setTransformMode,
    transact(mutator) {
      setSession((current) => {
        const next = structuredClone(current.recipe);
        mutator(next);
        if (recipeHash(next) === recipeHash(current.recipe)) return current;
        return { ...current, recipe: next, undo: [...current.undo.slice(-49), current.recipe], redo: [] };
      });
    },
    beginGesture() {
      if (!gestureBaseline.current) gestureBaseline.current = structuredClone(session.recipe);
    },
    previewTransaction(mutator) {
      setSession((current) => {
        const next = structuredClone(current.recipe);
        mutator(next);
        return { ...current, recipe: next };
      });
    },
    commitGesture() {
      const baseline = gestureBaseline.current;
      gestureBaseline.current = null;
      if (!baseline) return;
      setSession((current) => recipeHash(baseline) === recipeHash(current.recipe) ? current : ({
        ...current,
        undo: [...current.undo.slice(-49), baseline],
        redo: [],
      }));
    },
    cancelGesture() {
      const baseline = gestureBaseline.current;
      gestureBaseline.current = null;
      if (baseline) setSession((current) => ({ ...current, recipe: baseline }));
    },
    undo() {
      setSession((current) => {
        const previous = current.undo.at(-1);
        if (!previous) return current;
        return { ...current, recipe: structuredClone(previous), undo: current.undo.slice(0, -1), redo: [current.recipe, ...current.redo].slice(0, 50) };
      });
    },
    redo() {
      setSession((current) => {
        const next = current.redo[0];
        if (!next) return current;
        return { ...current, recipe: structuredClone(next), undo: [...current.undo, current.recipe].slice(-50), redo: current.redo.slice(1) };
      });
    },
    reset() {
      setSession((current) => ({ ...current, recipe: structuredClone(starterRecipe), undo: [...current.undo, current.recipe].slice(-50), redo: [] }));
      setRenderEpoch((value) => value + 1);
    },
    revert() {
      setSession((current) => ({ ...current, recipe: structuredClone(current.savedRecipe), undo: [...current.undo, current.recipe].slice(-50), redo: [] }));
      setRenderEpoch((value) => value + 1);
    },
    save() {
      const json = `${JSON.stringify(session.recipe, null, 2)}\n`;
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${session.recipe.projectId}.recipe.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      localStorage.setItem('cgawe:last-saved-recipe', json);
      setSession((current) => ({ ...current, savedRecipe: structuredClone(current.recipe) }));
    },
    load(input) {
      const recipe = parseRecipe(input);
      setSession((current) => ({ recipe, savedRecipe: structuredClone(recipe), undo: [...current.undo, current.recipe].slice(-50), redo: [] }));
      setSelection({ kind: 'asset', id: recipe.assetDefinitions[0]?.id ?? '', partId: recipe.assetDefinitions[0]?.parts[0]?.id });
      setRenderEpoch((value) => value + 1);
      setSplineCreation({ active: false, points: [] });
    },
    regenerate() { setRenderEpoch((value) => value + 1); },
    setGridSnap,
    startSplineCreation() {
      setSplineCreation({ active: true, points: [] });
      setViewMode('scene');
    },
    addDraftSplinePoint(point) {
      const snapped = gridSnap ? point.map((value) => Math.round(value * 4) / 4) as Vec3 : [...point] as Vec3;
      setSplineCreation((current) => current.active ? { ...current, points: [...current.points, snapped] } : current);
    },
    confirmSplineCreation() {
      if (splineCreation.points.length < 2) return;
      let suffix = session.recipe.splineDefinitions.length + 1;
      let id = `spline-${suffix}`;
      while (session.recipe.splineDefinitions.some((spline) => spline.id === id)) { suffix += 1; id = `spline-${suffix}`; }
      const material = session.recipe.materialDefinitions.find((item) => item.id === 'mat-slate') ?? session.recipe.materialDefinitions[0];
      if (!material) return;
      const spline = createSplineDefinition({ id, name: `Spline ${suffix}`, controlPoints: splineCreation.points, material, seed: session.recipe.generationSeed + suffix });
      setSession((current) => ({ ...current, recipe: { ...current.recipe, splineDefinitions: [...current.recipe.splineDefinitions, spline] }, undo: [...current.undo.slice(-49), current.recipe], redo: [] }));
      setSelection({ kind: 'spline', id, pointIndex: spline.controlPoints.length - 1 });
      setSplineCreation({ active: false, points: [] });
    },
    cancelSplineCreation() { setSplineCreation({ active: false, points: [] }); },
  }), [gridSnap, renderEpoch, selection, session, splineCreation, transformMode, viewMode]);

  return <WorkbenchContext.Provider value={value}>{children}</WorkbenchContext.Provider>;
}

export function useWorkbench(): WorkbenchContextValue {
  const context = useContext(WorkbenchContext);
  if (!context) throw new Error('useWorkbench must be used inside WorkbenchProvider.');
  return context;
}

export function useRecipeDiff() {
  const { recipe, savedRecipe } = useWorkbench();
  return useMemo(() => diffRecipes(savedRecipe, recipe), [recipe, savedRecipe]);
}
