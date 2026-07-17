import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { diffRecipes, recipeHash } from '@cgawe/core';
import { parseRecipe, type Recipe } from '@cgawe/schema';
import starterJson from '../../../samples/starter-project/recipe.json';

export type Selection =
  | { kind: 'asset'; id: string; partId?: string }
  | { kind: 'instance'; id: string; partId?: string }
  | { kind: 'spline'; id: string }
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
  setSelection(selection: Selection): void;
  setViewMode(mode: ViewMode): void;
  setTransformMode(mode: TransformMode): void;
  transact(mutator: (draft: Recipe) => void): void;
  undo(): void;
  redo(): void;
  reset(): void;
  revert(): void;
  save(): void;
  load(input: unknown): void;
  regenerate(): void;
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
    },
    regenerate() { setRenderEpoch((value) => value + 1); },
  }), [renderEpoch, selection, session, transformMode, viewMode]);

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
