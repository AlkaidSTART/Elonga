import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  buildLibraryImageCaption,
  buildLibraryImageName,
  computeImageFingerprint,
  type ImageLibraryItem,
  type SaveLibraryImageInput,
} from "@/lib/image-library";
import { indexedDBStorage } from "@/lib/storage/indexeddb-storage";

interface ImageLibraryState {
  items: ImageLibraryItem[];
  pendingImportIds: string[];

  saveImage: (input: SaveLibraryImageInput) => {
    item: ImageLibraryItem;
    created: boolean;
  };
  updateImage: (
    id: string,
    partial: Partial<Pick<ImageLibraryItem, "name" | "caption">>,
  ) => void;
  deleteImage: (id: string) => void;
  clearImages: () => void;
  queueImportToWorkflow: (ids: string[]) => void;
  consumePendingImportIds: () => string[];
}

export const useImageLibraryStore = create<ImageLibraryState>()(
  persist(
    (set, get) => ({
      items: [],
      pendingImportIds: [],

      saveImage: (input) => {
        const fingerprint = computeImageFingerprint(input.dataUrl, input.source);
        const existing = get().items.find((item) => item.fingerprint === fingerprint);
        if (existing) {
          return { item: existing, created: false };
        }

        const now = new Date().toISOString();
        const created: ImageLibraryItem = {
          id: `imglib_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name:
            input.name?.trim() ||
            buildLibraryImageName(undefined, input.source, input.stylePreset),
          caption:
            input.caption?.trim() || buildLibraryImageCaption(input.name, input.source),
          dataUrl: input.dataUrl,
          width: input.width,
          height: input.height,
          source: input.source,
          stylePreset: input.stylePreset,
          processMode: input.processMode,
          redactionCount: input.redactionCount,
          fingerprint,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          items: [created, ...state.items],
        }));

        return { item: created, created: true };
      },

      updateImage: (id, partial) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...(partial.name !== undefined ? { name: partial.name } : {}),
                  ...(partial.caption !== undefined ? { caption: partial.caption } : {}),
                  updatedAt: new Date().toISOString(),
                }
              : item,
          ),
        })),

      deleteImage: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
          pendingImportIds: state.pendingImportIds.filter((pendingId) => pendingId !== id),
        })),

      clearImages: () => set({ items: [], pendingImportIds: [] }),

      queueImportToWorkflow: (ids) =>
        set((state) => {
          const merged = new Set([...state.pendingImportIds, ...ids]);
          return { pendingImportIds: Array.from(merged) };
        }),

      consumePendingImportIds: () => {
        const ids = get().pendingImportIds;
        if (ids.length > 0) {
          set({ pendingImportIds: [] });
        }
        return ids;
      },
    }),
    {
      name: "elonga-image-library-storage",
      storage: createJSONStorage(() => indexedDBStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
