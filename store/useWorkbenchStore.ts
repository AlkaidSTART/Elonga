import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ContentTypeId,
  CopywritingResult,
  PlatformId,
  PublishArchiveRecord,
  ToneId,
  WordCountId,
} from "@/lib/platforms";
import type { TextRedactionRecord } from "@/lib/text-redaction";
import type { PublishReviewState } from "@/lib/publish-review";
import { isTextApiFormat, type TextApiFormat } from "@/lib/ai/model-client";
import {
  mergePublishArchiveRecord,
  type BatchSyncPublishItem,
} from "@/lib/metrics-import";
import { indexedDBStorage } from "@/lib/storage/indexeddb-storage";

export type WorkbenchTab = "copywriting" | "image-studio";

export interface ModelConfig {
  textApiKey: string;
  textBaseUrl: string;
  textPort: string;
  textEndpointPath: string;
  textApiFormat: TextApiFormat;
  textModel: string;
  imageApiKey: string;
  imageBaseUrl: string;
  imagePort: string;
  imageEndpointPath: string;
  imageModel: string;
}

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  textApiKey: "",
  textBaseUrl: "https://api.deepseek.com/v1",
  textPort: "",
  textEndpointPath: "",
  textApiFormat: "openai-chat",
  textModel: "deepseek-chat",
  imageApiKey: "",
  imageBaseUrl: "https://ark.cn-beijing.volces.com/api/v3",
  imagePort: "",
  imageEndpointPath: "",
  imageModel: "doubao-seedream-3-0-t2i-250415",
};

interface WorkbenchState {
  activeTab: WorkbenchTab;
  settingsOpen: boolean;
  modelConfig: ModelConfig;

  platform: PlatformId;
  contentType: ContentTypeId;
  tone: ToneId;
  wordCount: WordCountId;
  topic: string;
  keywords: string;
  targetAudience: string;
  selectedActivityId: string | null;

  isGenerating: boolean;
  generationError: string | null;
  currentResult: CopywritingResult | null;
  history: CopywritingResult[];

  setActiveTab: (tab: WorkbenchTab) => void;
  setSettingsOpen: (open: boolean) => void;
  updateModelConfig: (partial: Partial<ModelConfig>) => void;
  setPlatform: (platform: PlatformId) => void;
  setContentType: (type: ContentTypeId) => void;
  setTone: (tone: ToneId) => void;
  setWordCount: (count: WordCountId) => void;
  setTopic: (topic: string) => void;
  setKeywords: (keywords: string) => void;
  setTargetAudience: (audience: string) => void;
  setSelectedActivityId: (activityId: string | null) => void;
  setIsGenerating: (loading: boolean) => void;
  setGenerationError: (error: string | null) => void;
  setCurrentResult: (result: CopywritingResult | null) => void;
  updateCurrentBody: (body: string) => void;
  updateCurrentResult: (partial: Partial<CopywritingResult>) => void;
  updateCurrentResultPatch: (partial: Partial<CopywritingResult>) => void;
  updateCurrentRedactionRecords: (records: TextRedactionRecord[]) => void;
  updateCurrentReviewState: (reviewState: PublishReviewState) => void;
  addToHistory: (result: CopywritingResult) => void;
  selectFromHistory: (id: string) => void;
  removeFromHistory: (id: string) => void;
  togglePublished: (id: string) => void;
  toggleViral: (id: string) => void;
  updatePublishArchive: (id: string, archive: PublishArchiveRecord) => void;
  batchSyncPublishMetrics: (items: BatchSyncPublishItem[]) => { updated: number; created: number };
  toggleArchived: (id: string) => void;
}

export const useWorkbenchStore = create<WorkbenchState>()(
  persist(
    (set, get) => ({
      activeTab: "copywriting",
      settingsOpen: false,
      modelConfig: { ...DEFAULT_MODEL_CONFIG },

      platform: "douyin",
      contentType: "story",
      tone: "warm",
      wordCount: "medium",
      topic: "",
      keywords: "",
      targetAudience: "",
      selectedActivityId: null,

      isGenerating: false,
      generationError: null,
      currentResult: null,
      history: [],

      setActiveTab: (activeTab) => set({ activeTab }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
      updateModelConfig: (partial) =>
        set((state) => ({
          modelConfig: { ...state.modelConfig, ...partial },
        })),
      setPlatform: (platform) => set({ platform }),
      setContentType: (contentType) => set({ contentType }),
      setTone: (tone) => set({ tone }),
      setWordCount: (wordCount) => set({ wordCount }),
      setTopic: (topic) => set({ topic }),
      setKeywords: (keywords) => set({ keywords }),
      setTargetAudience: (targetAudience) => set({ targetAudience }),
      setSelectedActivityId: (selectedActivityId) => set({ selectedActivityId }),
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      setGenerationError: (generationError) => set({ generationError }),
      setCurrentResult: (currentResult) => set({ currentResult }),
      updateCurrentBody: (body) =>
        set((state) => {
          if (!state.currentResult) return state;
          const updated = { ...state.currentResult, body };
          return {
            currentResult: updated,
            history: state.history.map((item) => (item.id === updated.id ? updated : item)),
          };
        }),
      updateCurrentResult: (partial) =>
        set((state) => {
          if (!state.currentResult) return state;
          const updated = { ...state.currentResult, ...partial };
          return {
            currentResult: updated,
            history: state.history.map((item) => (item.id === updated.id ? updated : item)),
          };
        }),
      updateCurrentResultPatch: (partial) =>
        set((state) => {
          if (!state.currentResult) return state;
          const updated = { ...state.currentResult, ...partial };
          return {
            currentResult: updated,
            history: state.history.map((item) => (item.id === updated.id ? updated : item)),
          };
        }),
      updateCurrentRedactionRecords: (redactionRecords) =>
        set((state) => {
          if (!state.currentResult) return state;
          const updated = { ...state.currentResult, redactionRecords };
          return {
            currentResult: updated,
            history: state.history.map((item) => (item.id === updated.id ? updated : item)),
          };
        }),
      updateCurrentReviewState: (reviewState) =>
        set((state) => {
          if (!state.currentResult) return state;
          const updated = { ...state.currentResult, reviewState };
          return {
            currentResult: updated,
            history: state.history.map((item) => (item.id === updated.id ? updated : item)),
          };
        }),
      addToHistory: (result) =>
        set((state) => ({
          history: [result, ...state.history.filter((h) => h.id !== result.id)].slice(0, 100),
        })),
      selectFromHistory: (id) => {
        const found = get().history.find((h) => h.id === id);
        if (found) {
          set({
            currentResult: found,
            platform: found.platform,
            contentType: found.contentType,
            tone: found.tone,
            topic: found.topic,
          });
        }
      },
      removeFromHistory: (id) =>
        set((state) => ({
          history: state.history.filter((h) => h.id !== id),
          currentResult: state.currentResult?.id === id ? null : state.currentResult,
        })),
      togglePublished: (id) =>
        set((state) => {
          const updateItem = (item: CopywritingResult): CopywritingResult => {
            if (item.id !== id) return item;
            const nextPublished = !item.isPublished;
            return {
              ...item,
              isPublished: nextPublished,
              publishedAt: nextPublished
                ? (item.publishedAt ?? new Date().toISOString())
                : undefined,
            };
          };
          return {
            history: state.history.map(updateItem),
            currentResult: state.currentResult ? updateItem(state.currentResult) : null,
          };
        }),
      toggleViral: (id) =>
        set((state) => {
          const updateItem = (item: CopywritingResult): CopywritingResult =>
            item.id === id ? { ...item, isViral: !item.isViral } : item;
          return {
            history: state.history.map(updateItem),
            currentResult: state.currentResult ? updateItem(state.currentResult) : null,
          };
        }),
      updatePublishArchive: (id, archive) =>
        set((state) => {
          const updateItem = (item: CopywritingResult): CopywritingResult => {
            if (item.id !== id) return item;
            const publishedAt = archive.publishedAt || item.publishedAt || new Date().toISOString();
            return {
              ...item,
              isPublished: true,
              publishedAt,
              publishArchive: {
                ...archive,
                publishedAt,
                archivedAt: archive.archived
                  ? archive.archivedAt || new Date().toISOString()
                  : undefined,
              },
            };
          };
          return {
            history: state.history.map(updateItem),
            currentResult: state.currentResult ? updateItem(state.currentResult) : null,
          };
        }),
      batchSyncPublishMetrics: (items) => {
        if (items.length === 0) return { updated: 0, created: 0 };

        const nowIso = new Date().toISOString();
        let updated = 0;
        let created = 0;

        set((state) => {
          const nextHistory = [...state.history];
          let nextCurrent = state.currentResult;
          const newlyCreated: CopywritingResult[] = [];

          items.forEach((incoming, index) => {
            if (incoming.targetHistoryId) {
              const idx = nextHistory.findIndex((item) => item.id === incoming.targetHistoryId);
              if (idx !== -1) {
                const existing = nextHistory[idx];
                const mergedArchive = mergePublishArchiveRecord(
                  existing.publishArchive,
                  incoming,
                  nowIso,
                );
                const updatedItem: CopywritingResult = {
                  ...existing,
                  isPublished: true,
                  publishedAt: mergedArchive.publishedAt ?? existing.publishedAt ?? nowIso,
                  publishArchive: mergedArchive,
                };
                nextHistory[idx] = updatedItem;
                if (nextCurrent?.id === updatedItem.id) {
                  nextCurrent = updatedItem;
                }
                updated += 1;
                return;
              }
            }

            const archive = mergePublishArchiveRecord(undefined, incoming, nowIso);
            const createdItem: CopywritingResult = {
              id: `import-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
              platform: incoming.platform,
              contentType: "story",
              tone: "warm",
              topic: incoming.title,
              titles: [incoming.title],
              hook: "",
              body: incoming.notes
                ? `【报表同步作品】${incoming.notes}`
                : "【报表同步作品】来自创作者后台导出报表同步归档。",
              tags: [],
              cta: "",
              tips: [],
              mode: "local",
              createdAt: archive.publishedAt ?? nowIso,
              isPublished: true,
              publishedAt: archive.publishedAt ?? nowIso,
              publishArchive: archive,
            };
            newlyCreated.push(createdItem);
            created += 1;
          });

          return {
            history: [...newlyCreated, ...nextHistory].slice(0, 100),
            currentResult: nextCurrent,
          };
        });

        return { updated, created };
      },
      toggleArchived: (id) =>
        set((state) => {
          const updateItem = (item: CopywritingResult): CopywritingResult => {
            if (item.id !== id) return item;
            const prev = item.publishArchive;
            const nextArchived = !(prev?.archived ?? false);
            return {
              ...item,
              isPublished: nextArchived ? true : item.isPublished,
              publishedAt:
                nextArchived && !item.publishedAt ? new Date().toISOString() : item.publishedAt,
              publishArchive: {
                publishedUrl: prev?.publishedUrl,
                publishedAt: prev?.publishedAt ?? item.publishedAt ?? new Date().toISOString(),
                metrics: prev?.metrics ?? {},
                notes: prev?.notes,
                archived: nextArchived,
                archivedAt: nextArchived ? new Date().toISOString() : undefined,
              },
            };
          };
          return {
            history: state.history.map(updateItem),
            currentResult: state.currentResult ? updateItem(state.currentResult) : null,
          };
        }),
    }),
    {
      name: "jianyue-workbench-storage",
      storage: createJSONStorage(() => indexedDBStorage),
      partialize: (state) => ({
        modelConfig: state.modelConfig,
        history: state.history,
        platform: state.platform,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as
          | (Partial<WorkbenchState> & {
              modelConfig?: Partial<ModelConfig> & {
                apiKey?: string;
                baseUrl?: string;
              };
            })
          | undefined;
        const oldConfig = persisted?.modelConfig;
        const legacyBaseUrl =
          oldConfig?.baseUrl && oldConfig.baseUrl !== "https://api.openai.com/v1"
            ? oldConfig.baseUrl
            : undefined;

        const normalizePlatform = (p?: string): PlatformId => {
          if (p === "douyin" || p === "toutiao" || p === "xiaohongshu" || p === "wechat") {
            return p;
          }
          if (p === "kuaishou") return "xiaohongshu";
          return "douyin";
        };

        const migratedHistory = Array.isArray(persisted?.history)
          ? persisted.history.map((item) => ({
              ...item,
              platform: normalizePlatform(item.platform as string),
            }))
          : currentState.history;

        return {
          ...currentState,
          ...persisted,
          platform: normalizePlatform(persisted?.platform as string | undefined),
          history: migratedHistory,
          modelConfig: {
            ...DEFAULT_MODEL_CONFIG,
            ...oldConfig,
            textApiKey: oldConfig?.textApiKey ?? oldConfig?.apiKey ?? "",
            textBaseUrl:
              oldConfig?.textBaseUrl ?? legacyBaseUrl ?? DEFAULT_MODEL_CONFIG.textBaseUrl,
            textPort: oldConfig?.textPort ?? "",
            textEndpointPath: oldConfig?.textEndpointPath ?? "",
            textApiFormat: isTextApiFormat(oldConfig?.textApiFormat)
              ? oldConfig.textApiFormat
              : DEFAULT_MODEL_CONFIG.textApiFormat,
            textModel:
              oldConfig?.textModel && oldConfig.textModel !== "gpt-4o-mini"
                ? oldConfig.textModel
                : DEFAULT_MODEL_CONFIG.textModel,
            imageApiKey: oldConfig?.imageApiKey ?? "",
            imageBaseUrl: oldConfig?.imageBaseUrl ?? DEFAULT_MODEL_CONFIG.imageBaseUrl,
            imagePort: oldConfig?.imagePort ?? "",
            imageEndpointPath: oldConfig?.imageEndpointPath ?? "",
            imageModel:
              oldConfig?.imageModel && oldConfig.imageModel !== "gpt-image-1"
                ? oldConfig.imageModel
                : DEFAULT_MODEL_CONFIG.imageModel,
          },
        };
      },
    },
  ),
);
