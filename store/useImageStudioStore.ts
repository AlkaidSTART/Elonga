import { create } from "zustand";

export type ImageStudioMode = "mosaic" | "stylize";
export type MosaicType = "stackblur" | "pixelate" | "solid";
export type ToolShape = "brush" | "rect";
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
  undoAction: () => void;
  redoAction: () => void;
  resetActions: () => void;

  setStylePreset: (preset: Style2DPreset) => void;
  setStylePrompt: (prompt: string) => void;
  setStylizeStrength: (strength: number) => void;
  setIsStylizing: (loading: boolean) => void;
  setStylizeResult: (
    image: string | null,
    mode: "ai" | "local" | null,
    error?: string | null
  ) => void;
}

export const useImageStudioStore = create<ImageStudioState>((set) => ({
  activeMode: "mosaic",
  originalImage: null,
  imageMeta: null,

  mosaicType: "stackblur",
  toolShape: "brush",
  brushSize: 32,
  intensity: 18,
  actions: [],
  redoStack: [],

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
      stylizedImage: null,
      stylizeMode: null,
      stylizeError: null,
    }),

  setMosaicType: (mosaicType) => set({ mosaicType }),
  setToolShape: (toolShape) => set({ toolShape }),
  setBrushSize: (brushSize) => set({ brushSize }),
  setIntensity: (intensity) => set({ intensity }),

  pushAction: (action) =>
    set((state) => ({
      actions: [...state.actions, action],
      redoStack: [],
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

  setStylePreset: (stylePreset) => set({ stylePreset }),
  setStylePrompt: (stylePrompt) => set({ stylePrompt }),
  setStylizeStrength: (stylizeStrength) => set({ stylizeStrength }),
  setIsStylizing: (isStylizing) => set({ isStylizing }),
  setStylizeResult: (stylizedImage, stylizeMode, stylizeError = null) =>
    set({ stylizedImage, stylizeMode, stylizeError }),
}));
