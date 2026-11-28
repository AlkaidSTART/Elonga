import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PlatformId } from "@/lib/platforms";
import { indexedDBStorage } from "@/lib/storage/indexeddb-storage";

export type AnalyticsPlatformScope = "all" | PlatformId;

export interface AnalyticsChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  mode?: "ai" | "local";
  model?: string;
  latencyMs?: number;
  fallbackReason?: string;
}

export interface AnalyticsChatSession {
  id: string;
  title: string;
  platformScope: AnalyticsPlatformScope;
  messages: AnalyticsChatMessage[];
  createdAt: string;
  updatedAt: string;
}

interface AnalyticsChatState {
  sessions: AnalyticsChatSession[];
  activeSessionId: string | null;
  createSession: (platformScope?: AnalyticsPlatformScope) => string;
  selectSession: (id: string) => void;
  deleteSession: (id: string) => void;
  setSessionPlatformScope: (id: string, scope: AnalyticsPlatformScope) => void;
  appendMessage: (sessionId: string, message: AnalyticsChatMessage) => void;
}

const DEFAULT_SESSION_TITLE = "新流量分析会话";

function makeSessionId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function deriveTitleFromPrompt(content: string): string {
  const clean = content.replace(/\s+/g, " ").trim();
  if (!clean) return DEFAULT_SESSION_TITLE;
  return clean.length > 22 ? `${clean.slice(0, 22)}...` : clean;
}

export const useAnalyticsChatStore = create<AnalyticsChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,

      createSession: (platformScope = "all") => {
        const now = new Date().toISOString();
        const id = makeSessionId();
        const next: AnalyticsChatSession = {
          id,
          title: DEFAULT_SESSION_TITLE,
          platformScope,
          messages: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          sessions: [next, ...state.sessions].slice(0, 40),
          activeSessionId: id,
        }));
        return id;
      },

      selectSession: (id) => {
        if (get().sessions.some((s) => s.id === id)) {
          set({ activeSessionId: id });
        }
      },

      deleteSession: (id) =>
        set((state) => {
          const remaining = state.sessions.filter((s) => s.id !== id);
          const nextActive =
            state.activeSessionId === id ? (remaining[0]?.id ?? null) : state.activeSessionId;
          return {
            sessions: remaining,
            activeSessionId: nextActive,
          };
        }),

      setSessionPlatformScope: (id, platformScope) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === id
              ? { ...session, platformScope, updatedAt: new Date().toISOString() }
              : session,
          ),
        })),

      appendMessage: (sessionId, message) =>
        set((state) => ({
          sessions: state.sessions.map((session) => {
            if (session.id !== sessionId) return session;
            const isFirstUserMessage =
              message.role === "user" && session.title === DEFAULT_SESSION_TITLE;
            return {
              ...session,
              title: isFirstUserMessage ? deriveTitleFromPrompt(message.content) : session.title,
              messages: [...session.messages, message],
              updatedAt: message.createdAt,
            };
          }),
        })),
    }),
    {
      name: "elonga-analytics-chat-storage",
      storage: createJSONStorage(() => indexedDBStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
      }),
    },
  ),
);
