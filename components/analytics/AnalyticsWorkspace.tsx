"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowUp,
  Check,
  Copy,
  Database,
  FileSpreadsheet,
  Loader2,
  PanelRight,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { getTextApiFormatMeta } from "@/lib/ai/model-client";
import type { TrafficRecordSummary } from "@/lib/analytics-insight";
import type { BatchSyncPublishItem } from "@/lib/metrics-import";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import {
  useAnalyticsChatStore,
  type AnalyticsChatMessage,
  type AnalyticsPlatformScope,
} from "@/store/useAnalyticsChatStore";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";
import { AnalyticsImportModal } from "./AnalyticsImportModal";
import { AnalyticsLedgerDrawer } from "./AnalyticsLedgerDrawer";

const PLATFORM_IDS: PlatformId[] = ["douyin", "toutiao", "xiaohongshu", "wechat"];

const QUICK_PROMPTS = [
  {
    title: "整体流量复盘",
    prompt: "请基于当前已同步作品数据做一次整体流量复盘，总结亮点、短板与 3 条可执行优化动作。",
  },
  {
    title: "头部作品归因",
    prompt: "请拆解当前播放和互动表现最好的头部作品特征，告诉我如何复用到后续创作中。",
  },
  {
    title: "分平台策略对比",
    prompt: "请对比抖音、今日头条、小红书、微信公众号的流量与互动率差异，给出渠道投放建议。",
  },
  {
    title: "下周优化清单",
    prompt: "结合现有作品表现，制定下周公益内容选题与互动率提升的执行清单。",
  },
] as const;

function formatShortTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getScopeLabel(scope: AnalyticsPlatformScope): string {
  return scope === "all" ? "全部平台" : PLATFORMS[scope].name;
}

export function AnalyticsWorkspace() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { history, modelConfig, batchSyncPublishMetrics } = useWorkbenchStore();
  const {
    sessions,
    activeSessionId,
    createSession,
    selectSession,
    deleteSession,
    setSessionPlatformScope,
    appendMessage,
  } = useAnalyticsChatStore();

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? sessions[0] ?? null,
    [sessions, activeSessionId],
  );

  const platformScope: AnalyticsPlatformScope = activeSession?.platformScope ?? "all";

  const syncedRecords = useMemo(() => {
    return history.filter((item) => {
      const m = item.publishArchive?.metrics;
      return Boolean(
        m &&
          (m.views !== undefined ||
            m.likes !== undefined ||
            m.comments !== undefined ||
            m.shares !== undefined),
      );
    });
  }, [history]);

  const scopedRecords = useMemo(() => {
    if (platformScope === "all") return syncedRecords;
    return syncedRecords.filter((item) => item.platform === platformScope);
  }, [syncedRecords, platformScope]);

  const totals = useMemo(() => {
    let views = 0;
    let likes = 0;
    let comments = 0;
    let shares = 0;
    scopedRecords.forEach((item) => {
      const m = item.publishArchive?.metrics;
      if (!m) return;
      views += m.views ?? 0;
      likes += m.likes ?? 0;
      comments += m.comments ?? 0;
      shares += m.shares ?? 0;
    });
    const interactions = likes + comments + shares;
    return {
      count: scopedRecords.length,
      views,
      interactions,
      rate: views > 0 ? `${((interactions / views) * 100).toFixed(2)}%` : "—",
    };
  }, [scopedRecords]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages.length, isSending]);

  const hasApiKey = Boolean(modelConfig.textApiKey.trim());
  const formatMeta = getTextApiFormatMeta(modelConfig.textApiFormat);

  const handleNewSession = () => {
    createSession(platformScope);
    setError(null);
    setMobileSidebarOpen(false);
  };

  const handleScopeChange = (nextScope: AnalyticsPlatformScope) => {
    if (activeSession) {
      setSessionPlatformScope(activeSession.id, nextScope);
    } else {
      createSession(nextScope);
    }
  };

  const handleConfirmSync = (items: BatchSyncPublishItem[]) => {
    const res = batchSyncPublishMetrics(items);
    setImportModalOpen(false);
    const parts: string[] = [];
    if (res.updated > 0) parts.push(`更新 ${res.updated} 篇已有稿件`);
    if (res.created > 0) parts.push(`新建 ${res.created} 条外部作品归档`);
    setSyncNotice(`报表已通过接口同步完成：${parts.join("，")}。`);
  };

  const sendMessage = async (overridePrompt?: string) => {
    const content = (overridePrompt ?? input).trim();
    if (!content || isSending) return;

    const sessionId = activeSession?.id ?? createSession(platformScope);
    const priorMessages = activeSession?.messages ?? [];

    const userMsg: AnalyticsChatMessage = {
      id: `msg-u-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    appendMessage(sessionId, userMsg);
    if (!overridePrompt) setInput("");
    setIsSending(true);
    setError(null);

    const recordSummaries: TrafficRecordSummary[] = scopedRecords.map((item) => ({
      title: item.titles[0] || item.topic,
      platform: item.platform,
      publishedAt: item.publishArchive?.publishedAt ?? item.publishedAt,
      views: item.publishArchive?.metrics.views ?? 0,
      likes: item.publishArchive?.metrics.likes ?? 0,
      comments: item.publishArchive?.metrics.comments ?? 0,
      shares: item.publishArchive?.metrics.shares ?? 0,
      conversions: item.publishArchive?.metrics.conversions,
      notes: item.publishArchive?.notes,
    }));

    try {
      const response = await fetch("/api/analytics-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: content,
          messages: priorMessages.map((m) => ({ role: m.role, content: m.content })),
          records: recordSummaries,
          modelConfig: {
            apiKey: modelConfig.textApiKey,
            baseUrl: modelConfig.textBaseUrl,
            port: modelConfig.textPort,
            endpointPath: modelConfig.textEndpointPath,
            apiFormat: modelConfig.textApiFormat,
            textModel: modelConfig.textModel,
          },
        }),
      });

      const data = (await response.json()) as {
        content?: string;
        mode?: "ai" | "local";
        model?: string;
        latencyMs?: number;
        fallbackReason?: string;
        error?: string;
      };

      if (!response.ok || data.error) {
        throw new Error(data.error || `请求失败 (${response.status})`);
      }

      const assistantMsg: AnalyticsChatMessage = {
        id: `msg-a-${Date.now()}`,
        role: "assistant",
        content: data.content ?? "",
        createdAt: new Date().toISOString(),
        mode: data.mode ?? "local",
        model: data.model ?? modelConfig.textModel,
        latencyMs: data.latencyMs,
        fallbackReason: data.fallbackReason,
      };
      appendMessage(sessionId, assistantMsg);
    } catch (err) {
      setError(err instanceof Error ? err.message : "调用模型失败，请稍后重试");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(null), 1500);
    } catch {
      // ignore clipboard errors
    }
  };

  const renderSessionRail = () => (
    <div className="flex h-full flex-col">
      {/* Flush New Session Action (no boxy card) */}
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <span className="text-[11px] font-medium tracking-[0.12em] text-[#8C857B]">
          会话（{sessions.length}）
        </span>
        <button
          type="button"
          onClick={handleNewSession}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[#1B4D3E] transition hover:bg-[#E9F0ED]"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>新建会话</span>
        </button>
      </div>

      {/* Seamless Session List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {sessions.length === 0 ? (
          <p className="px-3 py-8 text-xs leading-relaxed text-[#8C857B]">
            暂无历史会话，直接在右侧输入问题即可自动开启。
          </p>
        ) : (
          <div className="space-y-0.5">
            {sessions.map((session) => {
              const isActive = activeSession?.id === session.id;
              return (
                <div
                  key={session.id}
                  onClick={() => {
                    selectSession(session.id);
                    setError(null);
                    setMobileSidebarOpen(false);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectSession(session.id);
                      setMobileSidebarOpen(false);
                    }
                  }}
                  className={`group relative flex cursor-pointer items-start justify-between gap-2 rounded-md px-3 py-2 transition ${
                    isActive
                      ? "bg-[#EFECE4]/90 text-[#181816]"
                      : "text-[#57534E] hover:bg-[#EFECE4]/50 hover:text-[#181816]"
                  }`}
                >
                  {isActive && (
                    <span className="absolute bottom-2 left-0 top-2 w-[2px] rounded-r bg-[#1B4D3E]" />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{session.title}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-[#8C857B] tabular-nums">
                      {getScopeLabel(session.platformScope)} · {session.messages.length} 条
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label="删除会话"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="rounded p-1 text-[#8C857B] opacity-0 transition hover:bg-[#FDF2F2] hover:text-[#B42318] group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Flush Model Status Footer */}
      <div className="shrink-0 border-t border-[#E2DDD3] px-4 py-3">
        <button
          type="button"
          onClick={() => router.push("/settings")}
          className="flex w-full items-center justify-between gap-2 rounded py-1 text-left transition hover:text-[#1B4D3E]"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  hasApiKey ? "bg-[#1B4D3E]" : "bg-[#B85D3B]"
                }`}
              />
              <span className="truncate font-mono text-[11px] font-medium text-[#181816]">
                {modelConfig.textModel || "deepseek-chat"}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[10px] text-[#8C857B]">
              {formatMeta.shortLabel} · {hasApiKey ? "云端模型就绪" : "本地降级模式"}
            </p>
          </div>
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-[#8C857B]" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative flex h-[calc(100vh-3.5rem)] min-h-[560px] w-full bg-[#F6F4EF] lg:h-screen">
      {/* Main Seamless Conversation Canvas */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Flush Top Header */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[#E2DDD3] px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <h1 className="truncate font-editorial text-base font-semibold text-[#181816]">
              {activeSession?.title ?? "流量分析"}
            </h1>

            <span className="text-[#CFC8BA]">/</span>

            <select
              aria-label="分析平台范围"
              value={platformScope}
              onChange={(e) => handleScopeChange(e.target.value as AnalyticsPlatformScope)}
              className="cursor-pointer bg-transparent py-1 text-xs font-medium text-[#57534E] outline-none transition hover:text-[#181816] focus:text-[#1B4D3E]"
            >
              <option value="all">全部平台</option>
              {PLATFORM_IDS.map((pid) => (
                <option key={pid} value={pid}>
                  {PLATFORMS[pid].name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLedgerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-[#57534E] transition hover:bg-[#EFECE4] hover:text-[#181816]"
            >
              <Database className="h-3.5 w-3.5" />
              <span className="font-mono tabular-nums">台账 {syncedRecords.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium text-[#1B4D3E] transition hover:bg-[#E9F0ED]"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>导入报表</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="打开历史会话栏"
              className="rounded p-1.5 text-[#57534E] hover:bg-[#EFECE4] md:hidden"
            >
              <PanelRight className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Sync Feedback Strip */}
        {syncNotice && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#1B4D3E]/20 bg-[#E9F0ED]/80 px-5 py-2 text-xs text-[#1B4D3E] sm:px-8">
            <span>{syncNotice}</span>
            <button
              type="button"
              onClick={() => setSyncNotice(null)}
              aria-label="关闭提示"
              className="rounded p-0.5 text-[#1B4D3E]/70 hover:text-[#1B4D3E]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Messages Viewport */}
        <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-10">
          {!activeSession || activeSession.messages.length === 0 ? (
            <div className="mx-auto flex max-w-3xl flex-col justify-center py-8">
              <div className="flex items-center gap-2 text-xs font-medium text-[#1B4D3E]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>流量分析 · {getScopeLabel(platformScope)}</span>
              </div>

              <h2 className="mt-3 font-editorial text-3xl font-semibold tracking-tight text-[#181816]">
                想从哪一组作品数据开始复盘？
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[#78716C]">
                直接提问或点选下方分析方向，系统会自动注入当前已同步的作品播放与互动数据作为模型上下文。
              </p>

              {/* Flush Hairline KPI Row */}
              <div className="mt-8 grid grid-cols-2 gap-y-4 border-y border-[#E2DDD3] py-4 sm:grid-cols-4 sm:divide-x sm:divide-[#E2DDD3]">
                <div className="sm:pr-5">
                  <p className="text-[11px] text-[#78716C]">已同步作品</p>
                  <p className="mt-1 font-editorial text-2xl font-semibold text-[#181816] tabular-nums">
                    {totals.count.toLocaleString("zh-CN")}
                  </p>
                </div>
                <div className="sm:px-5">
                  <p className="text-[11px] text-[#78716C]">累计播放 / 阅读</p>
                  <p className="mt-1 font-editorial text-2xl font-semibold text-[#1B4D3E] tabular-nums">
                    {totals.views.toLocaleString("zh-CN")}
                  </p>
                </div>
                <div className="sm:px-5">
                  <p className="text-[11px] text-[#78716C]">累计互动</p>
                  <p className="mt-1 font-editorial text-2xl font-semibold text-[#181816] tabular-nums">
                    {totals.interactions.toLocaleString("zh-CN")}
                  </p>
                </div>
                <div className="sm:pl-5">
                  <p className="text-[11px] text-[#78716C]">综合互动率</p>
                  <p className="mt-1 font-editorial text-2xl font-semibold text-[#B85D3B] tabular-nums">
                    {totals.rate}
                  </p>
                </div>
              </div>

              {/* Flush Prompt Suggestions (hairline list, no floating cards) */}
              <div className="mt-6 grid grid-cols-1 divide-y divide-[#E2DDD3] border-b border-[#E2DDD3] sm:grid-cols-2 sm:gap-x-8">
                {QUICK_PROMPTS.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    disabled={isSending}
                    onClick={() => void sendMessage(item.prompt)}
                    className="group py-3.5 text-left transition hover:text-[#1B4D3E]"
                  >
                    <p className="font-editorial text-sm font-semibold text-[#181816] group-hover:text-[#1B4D3E]">
                      {item.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#78716C]">
                      {item.prompt}
                    </p>
                  </button>
                ))}
              </div>

              {syncedRecords.length === 0 && (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => setImportModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1B4D3E] hover:underline"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    <span>尚未同步作品数据？点此导入创作者后台 CSV 报表</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-7">
              {activeSession.messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div key={msg.id} className={isUser ? "flex justify-end" : "block"}>
                    {isUser ? (
                      <div className="max-w-[82%] rounded-lg bg-[#E9F0ED] px-4 py-2.5 text-xs leading-relaxed text-[#181816]">
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ) : (
                      <article className="space-y-2.5 border-l-2 border-[#E2DDD3] pl-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            <span
                              className={
                                msg.mode === "ai"
                                  ? "font-mono font-medium text-[#1B4D3E]"
                                  : "font-medium text-[#9A4A22]"
                              }
                            >
                              {msg.mode === "ai"
                                ? msg.model ?? modelConfig.textModel
                                : "本地分析降级"}
                            </span>
                            {msg.latencyMs !== undefined && (
                              <span className="font-mono text-[#8C857B] tabular-nums">
                                · {(msg.latencyMs / 1000).toFixed(2)}s
                              </span>
                            )}
                            <span className="font-mono text-[#8C857B] tabular-nums">
                              · {formatShortTime(msg.createdAt)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => void handleCopyMessage(msg.id, msg.content)}
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-[#8C857B] transition hover:bg-[#EFECE4] hover:text-[#181816]"
                          >
                            {copiedMsgId === msg.id ? (
                              <>
                                <Check className="h-3 w-3 text-[#1B4D3E]" />
                                <span className="text-[#1B4D3E]">已复制</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>复制</span>
                              </>
                            )}
                          </button>
                        </div>

                        {msg.fallbackReason && (
                          <p className="text-[11px] text-[#9A4A22]">{msg.fallbackReason}</p>
                        )}

                        <div className="whitespace-pre-wrap text-[13px] leading-7 text-[#181816]">
                          {msg.content}
                        </div>
                      </article>
                    )}
                  </div>
                );
              })}

              {isSending && (
                <div className="flex items-center gap-2 pl-4 text-xs text-[#78716C]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1B4D3E]" />
                  <span>正在调用 {modelConfig.textModel || "deepseek-chat"} 分析数据...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-auto mb-2 flex w-full max-w-3xl items-center gap-2 border-l-2 border-[#B42318] bg-[#FDF2F2] px-3.5 py-1.5 text-xs text-[#B42318]">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Seamless Composer (blends directly into #F6F4EF warm paper, no boxed footer bar) */}
        <div className="shrink-0 px-5 pb-5 pt-2 sm:px-10">
          <div className="mx-auto max-w-3xl border-t border-[#D5CFC3] pt-3 transition-colors focus-within:border-[#1B4D3E]">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="向模型提问，例如：对比抖音与今日头条的互动率，或追问某篇作品的优化方向（Enter 发送）..."
              className="w-full resize-none bg-transparent text-sm leading-relaxed text-[#181816] outline-none placeholder:text-[#A8A29E]"
            />

            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-[11px] text-[#78716C]">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-1 font-medium text-[#57534E] transition hover:bg-[#EFECE4] hover:text-[#181816]"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-[#1B4D3E]" />
                  <span>导入报表</span>
                </button>
                <span className="hidden font-mono text-[#8C857B] tabular-nums sm:inline">
                  {getScopeLabel(platformScope)} · {scopedRecords.length} 篇数据已接入
                </span>
              </div>

              <button
                type="button"
                disabled={!input.trim() || isSending}
                onClick={() => void sendMessage()}
                aria-label="发送消息"
                className="inline-flex items-center gap-1 rounded bg-[#1B4D3E] px-3.5 py-1.5 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F] disabled:opacity-40"
              >
                {isSending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowUp className="h-3.5 w-3.5" />
                )}
                <span>发送</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Flush Right-Side History Sessions Rail (no outer box) */}
      <aside className="hidden w-64 shrink-0 border-l border-[#E2DDD3] md:block">
        {renderSessionRail()}
      </aside>

      {/* Mobile Right-Side Sessions Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 flex justify-end md:hidden">
          <div
            className="fixed inset-0 bg-[#181816]/35"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 h-full w-64 border-l border-[#E2DDD3] bg-[#F6F4EF]">
            {renderSessionRail()}
          </aside>
        </div>
      )}

      {/* On-demand Modals / Drawers */}
      <AnimatePresence>
        {importModalOpen && (
          <AnalyticsImportModal
            history={history}
            onClose={() => setImportModalOpen(false)}
            onConfirmSync={handleConfirmSync}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ledgerOpen && (
          <AnalyticsLedgerDrawer
            records={syncedRecords}
            onClose={() => setLedgerOpen(false)}
            onOpenImport={() => setImportModalOpen(true)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
