"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenText,
  Check,
  Copy,
  FileText,
  Film,
  Hash,
  History,
  Info,
  Loader2,
  MessageSquare,
  Newspaper,
  RefreshCw,
  Trash2,
  Video,
} from "lucide-react";
import {
  CONTENT_TYPES,
  PLATFORMS,
  WORD_COUNTS,
  type PlatformId,
} from "@/lib/platforms";
import type { DouyinTrendInsights } from "@/lib/skills/types";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

const PLATFORM_ICONS: Record<PlatformId, typeof Film> = {
  douyin: Film,
  toutiao: Newspaper,
  kuaishou: Video,
  wechat: BookOpenText,
};

const QUICK_TOPICS = [
  "社区流浪猫绝育与领养倡议，呼吁邻里科学关爱",
  "乡村小学图书角募捐：一本书点亮孩子的阅读梦",
  "周末河道净滩环保志愿活动招募，一起守护身边绿水",
];

export function CopywritingWorkspace() {
  const {
    platform,
    contentType,
    wordCount,
    topic,
    keywords,
    targetAudience,
    isGenerating,
    generationError,
    currentResult,
    history,
    modelConfig,
    setPlatform,
    setContentType,
    setWordCount,
    setTopic,
    setKeywords,
    setTargetAudience,
    setIsGenerating,
    setGenerationError,
    setCurrentResult,
    updateCurrentBody,
    addToHistory,
    selectFromHistory,
    removeFromHistory,
  } = useWorkbenchStore();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [generationStage, setGenerationStage] = useState<
    "idle" | "researching" | "writing"
  >("idle");

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setGenerationError("请先输入你想创作的公益主题或活动内容");
      return;
    }

    setGenerationError(null);
    setIsGenerating(true);

    const requestModelConfig = {
      apiKey: modelConfig.textApiKey,
      baseUrl: modelConfig.textBaseUrl,
      textModel: modelConfig.textModel,
    };

    try {
      // 第一步：先调用抖音爆款调研接口，分析当前抖音同类爆款文案规律
      setGenerationStage("researching");
      let trendInsights: DouyinTrendInsights | undefined;
      try {
        const trendRes = await fetch("/api/douyin-trends", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic,
            keywords,
            modelConfig: requestModelConfig,
          }),
        });
        if (trendRes.ok) {
          const trendData = await trendRes.json();
          trendInsights = trendData.insights;
        }
      } catch {
        // 若前端预调研异常，后端工作流会自动兜底补齐调研
      }

      // 第二步：结合抖音爆款调研结果，调用封装好的公益推流 Skills 创作文案
      setGenerationStage("writing");
      const res = await fetch("/api/copywriting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          contentType,
          wordCount,
          topic,
          keywords,
          targetAudience,
          trendInsights,
          modelConfig: requestModelConfig,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "生成失败，请稍后重试");
      }

      setCurrentResult(data.result);
      addToHistory(data.result);
    } catch (err) {
      setGenerationError(
        err instanceof Error ? err.message : "请求失败，请检查网络或配置"
      );
    } finally {
      setIsGenerating(false);
      setGenerationStage("idle");
    }
  };

  const handleCopyAll = () => {
    if (!currentResult) return;
    const fullText = [
      currentResult.titles[0] ? `【标题】${currentResult.titles[0]}` : "",
      currentResult.hook ? `\n${currentResult.hook}` : "",
      currentResult.body ? `\n${currentResult.body}` : "",
      currentResult.cta ? `\n${currentResult.cta}` : "",
      currentResult.tags.length > 0
        ? `\n${currentResult.tags.map((t) => `#${t}`).join(" ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    handleCopy(fullText, "all");
  };

  const activePlatformMeta = PLATFORMS[platform];

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-xl border border-neutral-200 bg-white lg:grid-cols-12">
      {/* Left Unified Parameter Rail */}
      <aside className="divide-y divide-neutral-200/70 border-b border-neutral-200 bg-[#FAFAFA] lg:col-span-5 lg:border-b-0 lg:border-r">
        {/* 1. Platform Selection */}
        <div className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-900">
              1. 分发平台
            </span>
            <span className="text-[11px] text-neutral-400">
              {activePlatformMeta.recommendedLength}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PLATFORMS) as PlatformId[]).map((pid) => {
              const meta = PLATFORMS[pid];
              const Icon = PLATFORM_ICONS[pid];
              const isSelected = platform === pid;
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => setPlatform(pid)}
                  className={`flex flex-col items-start rounded-lg border p-3 text-left transition ${
                    isSelected
                      ? "border-neutral-900 bg-white shadow-2xs"
                      : "border-neutral-200/80 bg-white/60 hover:border-neutral-300 hover:bg-white"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <Icon
                      className={`h-4 w-4 ${
                        isSelected ? "text-neutral-900" : "text-neutral-500"
                      }`}
                    />
                    <span className="text-[10px] font-medium text-neutral-400">
                      {meta.tagline}
                    </span>
                  </div>
                  <span className="mt-2 text-xs font-semibold text-neutral-900">
                    {meta.name}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 text-[11px] leading-relaxed text-neutral-500">
            {activePlatformMeta.description}
          </p>
        </div>

        {/* 2. Charity Scenario & Length (Simplified for non-profit workflow) */}
        <div className="space-y-4 p-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-900">
                2. 公益场景
              </span>
              <span className="text-[11px] text-neutral-400">
                精简模式 · 自动匹配真诚公益语气
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {CONTENT_TYPES.map((ct) => {
                const active = contentType === ct.id;
                return (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => setContentType(ct.id)}
                    title={ct.hint}
                    className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900"
                    }`}
                  >
                    {ct.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-[11px] font-medium text-neutral-500">
              目标篇幅
            </span>
            <div className="grid grid-cols-3 rounded-lg border border-neutral-200/80 bg-neutral-100/80 p-0.5">
              {WORD_COUNTS.map((wc) => (
                <button
                  key={wc.id}
                  type="button"
                  onClick={() => setWordCount(wc.id)}
                  className={`relative rounded-md py-1 text-[11px] font-medium transition-colors ${
                    wordCount === wc.id
                      ? "text-neutral-900"
                      : "text-neutral-500 hover:text-neutral-800"
                  }`}
                >
                  {wordCount === wc.id && (
                    <motion.div
                      layoutId="wordCountPill"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                      }}
                      className="absolute inset-0 rounded-md bg-white shadow-2xs"
                    />
                  )}
                  <span className="relative z-10">{wc.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Topic & Submit */}
        <div className="space-y-3.5 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-900">
              3. 公益主题与活动内容
            </span>
            <span className="text-[11px] text-neutral-400">
              撰写前自动调研抖音爆款文案
            </span>
          </div>

          <div>
            <textarea
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例如：这个周末我们在社区组织了流浪猫科学绝育与领养日活动，希望吸引更多周边居民来现场了解或转发支持..."
              className="w-full resize-none rounded-lg border border-neutral-200 bg-white p-3 text-xs leading-relaxed text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-neutral-400">示例：</span>
              {QUICK_TOPICS.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setTopic(sample)}
                  className="rounded border border-neutral-200/80 bg-white px-2 py-0.5 text-[11px] text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900"
                >
                  {sample.slice(0, 11)}...
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="关键词（选填，逗号隔开）"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 outline-none transition focus:border-neutral-900"
            />
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="面向人群（选填，如社区居民）"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900 outline-none transition focus:border-neutral-900"
            />
          </div>

          {generationError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {generationError}
            </div>
          )}

          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerate}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 py-2.5 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>
                  {generationStage === "researching"
                    ? "1/2 正在调研抖音爆款文案..."
                    : `2/2 正在创作${activePlatformMeta.name}公益推流文案...`}
                </span>
              </>
            ) : (
              <>
                <ArrowRight className="h-3.5 w-3.5" />
                <span>先调研抖音爆款 · 再生成{activePlatformMeta.name}文案</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Right Unified Document Canvas */}
      <section className="flex flex-col lg:col-span-7">
        {/* Top Slim Document Toolbar */}
        <div className="flex items-center justify-between border-b border-neutral-200/80 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-neutral-900">
              文稿画布
            </span>
            {currentResult && (
              <span className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                {currentResult.mode === "ai" ? "大模型生成" : "内置推流引擎"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                showHistory
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>历史 ({history.length})</span>
            </button>

            {currentResult && (
              <>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>重写</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-neutral-800"
                >
                  {copiedKey === "all" ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>复制全文</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Collapsible History Strip */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-b border-neutral-200/80 bg-[#FAFAFA]"
            >
              <div className="p-4">
                {history.length === 0 ? (
                  <p className="py-2 text-center text-xs text-neutral-400">
                    暂无历史记录
                  </p>
                ) : (
                  <div className="max-h-44 divide-y divide-neutral-200/60 overflow-y-auto rounded-lg border border-neutral-200 bg-white">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-3 py-2 text-xs hover:bg-neutral-50"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            selectFromHistory(item.id);
                            setShowHistory(false);
                          }}
                          className="flex flex-1 items-center gap-2 text-left min-w-0"
                        >
                          <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                            {PLATFORMS[item.platform].name}
                          </span>
                          <span className="truncate font-medium text-neutral-800">
                            {item.topic}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromHistory(item.id)}
                          className="ml-2 rounded p-1 text-neutral-400 hover:text-rose-600"
                          aria-label="删除记录"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Document Body */}
        <div className="flex-1 p-6">
          <AnimatePresence mode="wait">
            {!currentResult ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex min-h-[460px] flex-col items-center justify-center text-center"
              >
                <FileText className="h-6 w-6 text-neutral-300" />
                <p className="mt-3 text-sm font-medium text-neutral-700">
                  等待生成文稿
                </p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-neutral-400">
                  在左侧选择平台与主题后点击生成，文稿将在此以沉浸式文档形式呈现。
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={currentResult.id}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6"
              >
                {/* Pre-writing Douyin Trend Research & Skills Trace */}
                {currentResult.trendInsights && (
                  <div className="rounded-lg border border-neutral-200/80 bg-[#FAFAFA] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-neutral-900">
                          前置抖音爆款调研参考
                        </span>
                        <span className="rounded border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                          {currentResult.trendInsights.sourceLabel}
                        </span>
                      </div>
                      {currentResult.skillTraces &&
                        currentResult.skillTraces.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            {currentResult.skillTraces.map((trace) => (
                              <span
                                key={trace.skillId}
                                title={trace.summary}
                                className="rounded bg-neutral-200/70 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700"
                              >
                                {trace.skillName}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                      {currentResult.trendInsights.summary}
                    </p>

                    {currentResult.trendInsights.viralHooks.length > 0 && (
                      <div className="mt-2.5 space-y-1">
                        <span className="text-[11px] font-medium text-neutral-500">
                          借鉴的抖音爆款切入点：
                        </span>
                        <ul className="space-y-0.5">
                          {currentResult.trendInsights.viralHooks
                            .slice(0, 2)
                            .map((h, i) => (
                              <li
                                key={i}
                                className="text-[11px] leading-relaxed text-neutral-600"
                              >
                                · {h}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {currentResult.trendInsights.hotKeywords.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-neutral-400">
                          调研热词：
                        </span>
                        {currentResult.trendInsights.hotKeywords.map((kw) => (
                          <span
                            key={kw}
                            className="rounded border border-neutral-200/80 bg-white px-1.5 py-0.5 text-[10px] text-neutral-600"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Titles */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
                      备选标题
                    </span>
                  </div>
                  <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200/80">
                    {currentResult.titles.map((title, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
                      >
                        <div className="flex items-baseline gap-2.5">
                          <span className="font-mono text-[11px] text-neutral-400">
                            0{idx + 1}
                          </span>
                          <p className="font-medium text-neutral-900">
                            {title}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(title, `title-${idx}`)}
                          className="shrink-0 rounded p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-800"
                          aria-label="复制标题"
                        >
                          {copiedKey === `title-${idx}` ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Golden Hook with left editorial rule */}
                <div className="border-l-2 border-neutral-900 pl-4">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-neutral-900">
                      黄金开头 / 前 3 秒钩子
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(currentResult.hook, "hook")}
                      className="text-[11px] text-neutral-400 hover:text-neutral-800"
                    >
                      {copiedKey === "hook" ? "已复制" : "复制"}
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed text-neutral-800">
                    {currentResult.hook}
                  </p>
                </div>

                {/* Editable Body */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
                      正文内容（可直接编辑）
                    </span>
                    <span className="font-mono text-[11px] text-neutral-400">
                      {currentResult.body.length} 字
                    </span>
                  </div>
                  <textarea
                    rows={11}
                    value={currentResult.body}
                    onChange={(e) => updateCurrentBody(e.target.value)}
                    className="w-full resize-y rounded-lg border border-neutral-200/80 bg-[#FAFAFA] p-4 text-sm leading-7 text-neutral-800 outline-none transition focus:border-neutral-900 focus:bg-white"
                  />
                </div>

                {/* CTA, Tags & Tips separated by clean hairline */}
                <div className="space-y-4 border-t border-neutral-100 pt-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                        <MessageSquare className="h-3.5 w-3.5 text-neutral-400" />
                        <span>互动引导语</span>
                      </div>
                      <p className="text-xs leading-relaxed text-neutral-600">
                        {currentResult.cta}
                      </p>
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                        <Hash className="h-3.5 w-3.5 text-neutral-400" />
                        <span>推流标签</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {currentResult.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-700"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-[#FAFAFA] p-3.5">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
                      <Info className="h-3.5 w-3.5 text-neutral-500" />
                      <span>
                        {PLATFORMS[currentResult.platform].name}推流优化建议
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {currentResult.tips.map((tip, i) => (
                        <li
                          key={i}
                          className="text-xs leading-relaxed text-neutral-500"
                        >
                          · {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
