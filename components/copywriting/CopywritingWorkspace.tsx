"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Copy,
  History,
  Loader2,
  RotateCw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  CONTENT_TYPES,
  PLATFORMS,
  WORD_COUNTS,
  type PlatformId,
} from "@/lib/platforms";
import type { DouyinTrendInsights } from "@/lib/skills/types";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

const QUICK_TOPICS = [
  { label: "流浪猫绝育", text: "社区流浪猫绝育与领养倡议，呼吁邻里科学关爱" },
  { label: "乡村图书角", text: "乡村小学图书角募捐：一本书点亮孩子的阅读梦" },
  { label: "河道净滩", text: "周末河道净滩环保志愿活动招募，一起守护身边绿水" },
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
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [selectedTitleIdx, setSelectedTitleIdx] = useState(0);
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
      setGenerationError("请先输入主题");
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
        // Fallback handled on server
      }

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

      setSelectedTitleIdx(0);
      setCurrentResult(data.result);
      addToHistory(data.result);
    } catch (err) {
      setGenerationError(
        err instanceof Error ? err.message : "请求失败，请检查配置"
      );
    } finally {
      setIsGenerating(false);
      setGenerationStage("idle");
    }
  };

  const handleCopyAll = () => {
    if (!currentResult) return;
    const activeTitle =
      currentResult.titles[selectedTitleIdx] ?? currentResult.titles[0] ?? "";
    const fullText = [
      activeTitle ? `【标题】${activeTitle}` : "",
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
    <div className="space-y-8">
      {/* Top Open Control Ribbon (No Card Border) */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DFDCD2] pb-4">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-xl font-semibold tracking-tight text-[#141413]">
            推流文案
          </h1>

          {/* Platform Segmented Strip */}
          <div className="flex items-center gap-1 rounded-full bg-[#ECE9E1] p-1">
            {(Object.keys(PLATFORMS) as PlatformId[]).map((pid) => {
              const meta = PLATFORMS[pid];
              const isSelected = platform === pid;
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => setPlatform(pid)}
                  className={`relative rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${
                    isSelected
                      ? "text-white"
                      : "text-zinc-600 hover:text-[#141413]"
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="copyPlatformPill"
                      transition={{
                        type: "spring",
                        stiffness: 440,
                        damping: 32,
                      }}
                      className="absolute inset-0 rounded-full bg-[#161715]"
                    />
                  )}
                  <span className="relative z-10">{meta.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Compact Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Scenario */}
          <div className="flex items-center gap-1">
            {CONTENT_TYPES.map((ct) => {
              const active = contentType === ct.id;
              return (
                <button
                  key={ct.id}
                  type="button"
                  onClick={() => setContentType(ct.id)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-[#0F6E5D]/12 text-[#0F6E5D]"
                      : "text-zinc-500 hover:bg-black/[0.04] hover:text-zinc-900"
                  }`}
                >
                  {ct.label}
                </button>
              );
            })}
          </div>

          <span className="h-3.5 w-px bg-[#DFDCD2]" />

          {/* Word Count */}
          <div className="flex items-center gap-0.5 rounded-full bg-[#ECE9E1] p-0.5">
            {WORD_COUNTS.map((wc) => (
              <button
                key={wc.id}
                type="button"
                onClick={() => setWordCount(wc.id)}
                className={`relative rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                  wordCount === wc.id
                    ? "text-[#141413]"
                    : "text-zinc-500 hover:text-zinc-800"
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
                    className="absolute inset-0 rounded-full bg-white shadow-2xs"
                  />
                )}
                <span className="relative z-10">{wc.label}</span>
              </button>
            ))}
          </div>

          {/* History Toggle */}
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
              showHistory
                ? "bg-[#161715] text-white"
                : "text-zinc-600 hover:bg-black/[0.04] hover:text-[#141413]"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span className="font-mono">{history.length}</span>
          </button>
        </div>
      </header>

      {/* Collapsible History Drawer */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-b border-[#DFDCD2] pb-5"
          >
            {history.length === 0 ? (
              <p className="py-3 text-xs text-zinc-400">暂无记录</p>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {history.slice(0, 12).map((item) => (
                  <div
                    key={item.id}
                    className="group flex shrink-0 items-center gap-2 rounded-full border border-[#DFDCD2] bg-white/80 py-1.5 pl-3 pr-2 text-xs transition hover:border-[#161715]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        selectFromHistory(item.id);
                        setSelectedTitleIdx(0);
                        setShowHistory(false);
                      }}
                      className="flex items-center gap-2 text-left"
                    >
                      <span className="text-[10px] font-medium text-[#0F6E5D]">
                        {PLATFORMS[item.platform].name}
                      </span>
                      <span className="max-w-[180px] truncate text-[#141413]">
                        {item.topic}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromHistory(item.id)}
                      className="rounded-full p-0.5 text-zinc-400 opacity-60 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                      aria-label="删除"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sculptural Floating Command Bar */}
      <section className="mx-auto max-w-4xl">
        <div className="rounded-3xl bg-white p-3 shadow-[0_12px_36px_rgba(20,20,19,0.06)] ring-1 ring-black/[0.06] sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <textarea
              rows={2}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={`输入${activePlatformMeta.name}创作主题...`}
              className="min-h-[52px] flex-1 resize-none bg-transparent px-2 py-1 text-sm leading-relaxed text-[#141413] outline-none placeholder:text-zinc-400"
            />
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerate}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#0F6E5D] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#0B5649] active:scale-[0.98] disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>
                    {generationStage === "researching" ? "调研中" : "撰稿中"}
                  </span>
                </>
              ) : (
                <>
                  <span>生成文案</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Slim Bottom Utility Strip inside Command Bar */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#F0EDE6] px-2 pt-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_TOPICS.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => setTopic(sample.text)}
                  className="rounded-full bg-[#F5F3EE] px-2.5 py-0.5 text-[11px] text-zinc-600 transition hover:bg-[#E7E4DC] hover:text-[#141413]"
                >
                  {sample.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowMoreOptions((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                showMoreOptions
                  ? "bg-[#161715] text-white"
                  : "text-zinc-500 hover:text-[#141413]"
              }`}
            >
              <SlidersHorizontal className="h-3 w-3" />
              <span>参数</span>
            </button>
          </div>

          <AnimatePresence initial={false}>
            {showMoreOptions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.16 }}
                className="overflow-hidden"
              >
                <div className="mt-3 grid grid-cols-1 gap-2.5 border-t border-[#F0EDE6] px-2 pt-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="关键词（逗号隔开）"
                    className="rounded-xl bg-[#F5F3EE] px-3 py-2 text-xs text-[#141413] outline-none placeholder:text-zinc-400 focus:ring-1 focus:ring-[#161715]"
                  />
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="目标受众"
                    className="rounded-xl bg-[#F5F3EE] px-3 py-2 text-xs text-[#141413] outline-none placeholder:text-zinc-400 focus:ring-1 focus:ring-[#161715]"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {generationError && (
          <p className="mt-2.5 px-3 text-xs text-rose-600">{generationError}</p>
        )}
      </section>

      {/* Open Editorial Manuscript Spread */}
      <AnimatePresence mode="wait">
        {!currentResult ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[300px] flex-col items-center justify-center text-center"
          >
            <div className="h-8 w-px bg-[#D6D2C8]" />
            <p className="mt-4 font-editorial text-lg text-zinc-400">
              等待落笔
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={currentResult.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12"
          >
            {/* Left 8 Cols: Crisp Manuscript Sheet */}
            <article className="rounded-3xl bg-white p-6 shadow-[0_2px_24px_rgba(20,20,19,0.04)] sm:p-9 lg:col-span-8">
              {/* Sheet Action Bar */}
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#F0EDE6] pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-full bg-[#161715] px-2.5 py-0.5 text-[11px] font-medium text-white">
                    {PLATFORMS[currentResult.platform].name}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400">
                    {currentResult.body.length} 字
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-zinc-600 transition hover:bg-[#F5F3EE] hover:text-[#141413] disabled:opacity-40"
                  >
                    <RotateCw className="h-3 w-3" />
                    <span>重写</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyAll}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#161715] px-3.5 py-1 text-xs font-medium text-white transition hover:bg-zinc-800"
                  >
                    {copiedKey === "all" ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>{copiedKey === "all" ? "已复制" : "复制全文"}</span>
                  </button>
                </div>
              </div>

              {/* Selectable Headlines */}
              <div className="space-y-2">
                {currentResult.titles.map((title, idx) => {
                  const active = selectedTitleIdx === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedTitleIdx(idx)}
                      className={`group flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 transition ${
                        active
                          ? "bg-[#F5F3EE] text-[#141413]"
                          : "text-zinc-500 hover:bg-[#F9F8F5] hover:text-[#141413]"
                      }`}
                    >
                      <div className="flex items-baseline gap-3">
                        <span className="font-mono text-[11px] text-zinc-400">
                          0{idx + 1}
                        </span>
                        <span
                          className={`text-sm ${
                            active ? "font-semibold" : "font-normal"
                          }`}
                        >
                          {title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(title, `title-${idx}`);
                        }}
                        className="shrink-0 rounded-full p-1 text-zinc-400 opacity-0 transition hover:bg-white hover:text-[#141413] group-hover:opacity-100"
                        aria-label="复制标题"
                      >
                        {copiedKey === `title-${idx}` ? (
                          <Check className="h-3.5 w-3.5 text-[#0F6E5D]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Golden Hook */}
              <div className="my-7 border-l-2 border-[#0F6E5D] pl-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#0F6E5D]">
                    前 3 秒钩子
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(currentResult.hook, "hook")}
                    className="text-[11px] text-zinc-400 hover:text-[#141413]"
                  >
                    {copiedKey === "hook" ? "已复制" : "复制"}
                  </button>
                </div>
                <p className="text-[15px] leading-relaxed font-medium text-[#141413]">
                  {currentResult.hook}
                </p>
              </div>

              {/* Editable Manuscript Body */}
              <textarea
                rows={12}
                value={currentResult.body}
                onChange={(e) => updateCurrentBody(e.target.value)}
                className="w-full resize-y border-0 bg-transparent p-0 text-[15px] leading-8 text-zinc-800 outline-none"
              />
            </article>

            {/* Right 4 Cols: Open Hairline Margin Notes (No Cards) */}
            <aside className="space-y-6 lg:col-span-4 lg:pt-2">
              {/* Trend Keywords */}
              {currentResult.trendInsights && (
                <div className="border-t border-[#DFDCD2] pt-4">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#141413]">
                      热词参考
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">
                      {currentResult.trendInsights.sourceLabel}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentResult.trendInsights.hotKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-full bg-[#ECE9E1] px-2.5 py-0.5 text-[11px] text-zinc-700"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              {currentResult.cta && (
                <div className="border-t border-[#DFDCD2] pt-4">
                  <span className="mb-2 block text-xs font-semibold text-[#141413]">
                    互动引导
                  </span>
                  <p className="text-xs leading-relaxed text-zinc-600">
                    {currentResult.cta}
                  </p>
                </div>
              )}

              {/* Tags */}
              {currentResult.tags.length > 0 && (
                <div className="border-t border-[#DFDCD2] pt-4">
                  <span className="mb-2.5 block text-xs font-semibold text-[#141413]">
                    话题标签
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentResult.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs font-medium text-[#0F6E5D]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Platform Tips */}
              {currentResult.tips.length > 0 && (
                <div className="border-t border-[#DFDCD2] pt-4">
                  <span className="mb-2 block text-xs font-semibold text-[#141413]">
                    发布建议
                  </span>
                  <ul className="space-y-1.5">
                    {currentResult.tips.map((tip, i) => (
                      <li
                        key={i}
                        className="text-xs leading-relaxed text-zinc-500"
                      >
                        — {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
