import { create } from "zustand";
import type { AutoRedactCategory } from "@/lib/auto-redact";

export type ImageStudioMode = "mosaic" | "stylize";
export type MosaicType = "stackblur" | "pixelate" | "solid";
export type ToolShape = "lasso" | "rect" | "brush";
export type Style2DPreset = "anime" | "ghibli" | "cel" | "watercolor";

export interface Point {
  x: number;
  y: number;
}

export interface RedactionAction {
  id: string;
  type: MosaicType;
  shape: ToolShape;
  intensity: number;
  brushSize: number;
  points?: Point[];
  rect?: { x: number; y: number; w: number; h: number };
  source?: "auto" | "manual";
  label?: string;
  category?: AutoRedactCategory;
}

export interface ImageMeta {
  name: string;
  width: number;
  height: number;
}

interface ImageStudioState {
  activeMode: ImageStudioMode;
  originalImage: string | null;
  imageMeta: ImageMeta | null;

  mosaicType: MosaicType;
  toolShape: ToolShape;
  brushSize: number;
  intensity: number;
  actions: RedactionAction[];
  redoStack: RedactionAction[];

  autoCategories: AutoRedactCategory[];
  isAutoDetecting: boolean;
  autoDetectMode: "ai" | "local" | null;
  manualEnabled: boolean;

  stylePreset: Style2DPreset;
  stylePrompt: string;
  stylizeStrength: number;
  isStylizing: boolean;
  stylizedImage: string | null;
  stylizeMode: "ai" | "local" | null;
  stylizeError: string | null;

  setActiveMode: (mode: ImageStudioMode) => void;
  setImage: (dataUrl: string, meta: ImageMeta) => void;
  clearImage: () => void;

  setMosaicType: (type: MosaicType) => void;
  setToolShape: (shape: ToolShape) => void;
  setBrushSize: (size: number) => void;
  setIntensity: (intensity: number) => void;
  pushAction: (action: RedactionAction) => void;
  replaceAutoActions: (autoActions: RedactionAction[]) => void;
  removeActionById: (id: string) => void;
  undoAction: () => void;
  redoAction: () => void;
  resetActions: () => void;

  toggleAutoCategory: (category: AutoRedactCategory) => void;
  setAutoDetectStatus: (loading: boolean, mode?: "ai" | "local" | null) => void;
  setManualEnabled: (enabled: boolean) => void;

  setStylePreset: (preset: Style2DPreset) => void;
  setStylePrompt: (prompt: string) => void;
  setStylizeStrength: (strength: number) => void;
  setIsStylizing: (loading: boolean) => void;
  setStylizeResult: (
    image: string | null,
    mode: "ai" | "local" | null,
    error?: string | null,
  ) => void;
}

export const useImageStudioStore = create<ImageStudioState>((set) => ({
  activeMode: "mosaic",
  originalImage: null,
  imageMeta: null,

  mosaicType: "stackblur",
  toolShape: "lasso",
  brushSize: 32,
  intensity: 18,
  actions: [],
  redoStack: [],

  autoCategories: ["text"],
  isAutoDetecting: false,
  autoDetectMode: null,
  manualEnabled: true,

  stylePreset: "anime",
  stylePrompt: "",
  stylizeStrength: 0.65,
  isStylizing: false,
  stylizedImage: null,
  stylizeMode: null,
  stylizeError: null,

  setActiveMode: (activeMode) => set({ activeMode }),
  setImage: (originalImage, imageMeta) =>
    set({
      originalImage,
      imageMeta,
      actions: [],
      redoStack: [],
      autoDetectMode: null,
      stylizedImage: null,
      stylizeMode: null,
      stylizeError: null,
    }),
  clearImage: () =>
    set({
      originalImage: null,
      imageMeta: null,
      actions: [],
      redoStack: [],
      autoDetectMode: null,
      stylizedImage: null,
      stylizeMode: null,
      stylizeError: null,
    }),

  setMosaicType: (mosaicType) =>
    set((state) => ({
      mosaicType,
      actions: state.actions.map((a) => (a.source === "auto" ? { ...a, type: mosaicType } : a)),
    })),
  setToolShape: (toolShape) => set({ toolShape }),
  setBrushSize: (brushSize) => set({ brushSize }),
  setIntensity: (intensity) =>
    set((state) => ({
      intensity,
      actions: state.actions.map((a) => (a.source === "auto" ? { ...a, intensity } : a)),
    })),

  pushAction: (action) =>
    set((state) => ({
      actions: [...state.actions, action],
      redoStack: [],
    })),
  replaceAutoActions: (autoActions) =>
    set((state) => ({
      actions: [...autoActions, ...state.actions.filter((a) => a.source === "manual")],
      redoStack: [],
    })),
  removeActionById: (id) =>
    set((state) => ({
      actions: state.actions.filter((a) => a.id !== id),
    })),
  undoAction: () =>
    set((state) => {
      if (state.actions.length === 0) return state;
      const last = state.actions[state.actions.length - 1];
      return {
        actions: state.actions.slice(0, -1),
        redoStack: [...state.redoStack, last],
      };
    }),
  redoAction: () =>
    set((state) => {
      if (state.redoStack.length === 0) return state;
      const next = state.redoStack[state.redoStack.length - 1];
      return {
        actions: [...state.actions, next],
        redoStack: state.redoStack.slice(0, -1),
      };
    }),
  resetActions: () => set({ actions: [], redoStack: [] }),

  toggleAutoCategory: (category) =>
    set((state) => {
      const exists = state.autoCategories.includes(category);
      const next = exists
        ? state.autoCategories.filter((c) => c !== category)
        : [...state.autoCategories, category];
      return { autoCategories: next };
    }),
  setAutoDetectStatus: (isAutoDetecting, autoDetectMode) =>
    set((state) => ({
      isAutoDetecting,
      autoDetectMode: autoDetectMode !== undefined ? autoDetectMode : state.autoDetectMode,
    })),
  setManualEnabled: (manualEnabled) => set({ manualEnabled }),

  setStylePreset: (stylePreset) => set({ stylePreset }),
  setStylePrompt: (stylePrompt) => set({ stylePrompt }),
  setStylizeStrength: (stylizeStrength) => set({ stylizeStrength }),
  setIsStylizing: (isStylizing) => set({ isStylizing }),
  setStylizeResult: (stylizedImage, stylizeMode, stylizeError = null) =>
    set({ stylizedImage, stylizeMode, stylizeError }),
}));
