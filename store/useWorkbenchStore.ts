import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ContentTypeId,
  CopywritingResult,
  PlatformId,
  ToneId,
  WordCountId,
} from "@/lib/platforms";

export type WorkbenchTab = "copywriting" | "image-studio";

export interface ModelConfig {
  textApiKey: string;
  textBaseUrl: string;
  textModel: string;
  imageApiKey: string;
  imageBaseUrl: string;
  imageModel: string;
}

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  textApiKey: "",
  textBaseUrl: "https://api.deepseek.com/v1",
  textModel: "deepseek-chat",
  imageApiKey: "",
  imageBaseUrl: "https://ark.cn-beijing.volces.com/api/v3",
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
  setIsGenerating: (loading: boolean) => void;
  setGenerationError: (error: string | null) => void;
  setCurrentResult: (result: CopywritingResult | null) => void;
  updateCurrentBody: (body: string) => void;
  addToHistory: (result: CopywritingResult) => void;
  selectFromHistory: (id: string) => void;
  removeFromHistory: (id: string) => void;
  togglePublished: (id: string) => void;
  toggleViral: (id: string) => void;
}

export const useWorkbenchStore = create<WorkbenchState>()(
  persist(
    (set, get) => ({
      activeTab: "copywriting",
      settingsOpen: false,
      modelConfig: { ...DEFAULT_MODEL_CONFIG },

      platform: "douyin",
      contentType: "knowledge",
      tone: "authentic",
      wordCount: "medium",
      topic: "",
      keywords: "",
      targetAudience: "",

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
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      setGenerationError: (generationError) => set({ generationError }),
      setCurrentResult: (currentResult) => set({ currentResult }),
      updateCurrentBody: (body) =>
        set((state) => {
          if (!state.currentResult) return state;
          const updated = { ...state.currentResult, body };
          return {
            currentResult: updated,
            history: state.history.map((item) =>
              item.id === updated.id ? updated : item
            ),
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
          currentResult:
            state.currentResult?.id === id ? null : state.currentResult,
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
                ? item.publishedAt ?? new Date().toISOString()
                : undefined,
            };
          };
          return {
            history: state.history.map(updateItem),
            currentResult: state.currentResult
              ? updateItem(state.currentResult)
              : null,
          };
        }),
      toggleViral: (id) =>
        set((state) => {
          const updateItem = (item: CopywritingResult): CopywritingResult =>
            item.id === id ? { ...item, isViral: !item.isViral } : item;
          return {
            history: state.history.map(updateItem),
            currentResult: state.currentResult
              ? updateItem(state.currentResult)
              : null,
          };
        }),
    }),
    {
      name: "jianyue-workbench-storage",
      storage: createJSONStorage(() => localStorage),
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
          oldConfig?.baseUrl &&
          oldConfig.baseUrl !== "https://api.openai.com/v1"
            ? oldConfig.baseUrl
            : undefined;

        return {
          ...currentState,
          ...persisted,
          modelConfig: {
            ...DEFAULT_MODEL_CONFIG,
            ...(oldConfig ?? {}),
            textApiKey:
              oldConfig?.textApiKey ?? oldConfig?.apiKey ?? "",
            textBaseUrl:
              oldConfig?.textBaseUrl ??
              legacyBaseUrl ??
              DEFAULT_MODEL_CONFIG.textBaseUrl,
            textModel:
              oldConfig?.textModel && oldConfig.textModel !== "gpt-4o-mini"
                ? oldConfig.textModel
                : DEFAULT_MODEL_CONFIG.textModel,
            imageApiKey: oldConfig?.imageApiKey ?? "",
            imageBaseUrl:
              oldConfig?.imageBaseUrl ?? DEFAULT_MODEL_CONFIG.imageBaseUrl,
            imageModel:
              oldConfig?.imageModel && oldConfig.imageModel !== "gpt-image-1"
                ? oldConfig.imageModel
                : DEFAULT_MODEL_CONFIG.imageModel,
          },
        };
      },
    }
  )
);
