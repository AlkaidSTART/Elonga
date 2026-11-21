"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpenText,
  Check,
  Clapperboard,
  Copy,
  Hash,
  History,
  Lightbulb,
  Loader2,
  MessageSquareHeart,
  Newspaper,
  RefreshCw,
  Sparkles,
  Trash2,
  Video,
} from "lucide-react";
import {
  CONTENT_TYPES,
  PLATFORMS,
  TONES,
  WORD_COUNTS,
  type PlatformId,
} from "@/lib/platforms";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

const PLATFORM_ICONS: Record<PlatformId, typeof Clapperboard> = {
  douyin: Clapperboard,
  toutiao: Newspaper,
  kuaishou: Video,
  wechat: BookOpenText,
};

const QUICK_TOPICS = [
  "普通人下班后如何用 AI 提升副业效率",
  "装修避坑：过来人总结的5个最容易后悔的细节",
  "为什么越自律的人，反而越懂得适度偷懒",
];

export function CopywritingWorkspace() {
  const {
    platform,
    contentType,
    tone,
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
    setTone,
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

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Ignore clipboard permission errors silently
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setGenerationError("请先输入你想创作的文案主题或核心内容");
      return;
    }

    setGenerationError(null);
    setIsGenerating(true);

    try {
      const res = await fetch("/api/copywriting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          contentType,
          tone,
          wordCount,
          topic,
          keywords,
          targetAudience,
          modelConfig: {
            apiKey: modelConfig.apiKey,
            baseUrl: modelConfig.baseUrl,
            textModel: modelConfig.textModel,
          },
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Configuration Panel */}
      <section className="space-y-5 lg:col-span-5">
        {/* Step 1: Platform Selection */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              1. 选择发布平台
            </h2>
            <span className="text-xs text-slate-400">
              {activePlatformMeta.recommendedLength}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {(Object.keys(PLATFORMS) as PlatformId[]).map((pid) => {
              const meta = PLATFORMS[pid];
              const Icon = PLATFORM_ICONS[pid];
              const isSelected = platform === pid;
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => setPlatform(pid)}
                  className={`group flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/15"
                      : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/60"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600 group-hover:bg-slate-200/70"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        isSelected
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {meta.tagline}
                    </span>
                  </div>
                  <span className="mt-2.5 text-sm font-semibold text-slate-900">
                    {meta.name}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {meta.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Content Type & Tone */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
          <div>
            <h2 className="mb-2.5 text-sm font-semibold text-slate-900">
              2. 文案类型与调性
            </h2>
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES.map((ct) => {
                const active = contentType === ct.id;
                return (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => setContentType(ct.id)}
                    title={ct.hint}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    }`}
                  >
                    {ct.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
            <div>
              <span className="mb-2 block text-xs font-medium text-slate-500">
                表达语气
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TONES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTone(t.id)}
                    className={`rounded-md px-2.5 py-1 text-xs transition ${
                      tone === t.id
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-2 block text-xs font-medium text-slate-500">
                目标篇幅
              </span>
              <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1">
                {WORD_COUNTS.map((wc) => (
                  <button
                    key={wc.id}
                    type="button"
                    onClick={() => setWordCount(wc.id)}
                    className={`relative rounded-lg py-1.5 text-xs font-medium transition-colors ${
                      wordCount === wc.id
                        ? "text-slate-900"
                        : "text-slate-500 hover:text-slate-800"
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
                        className="absolute inset-0 rounded-lg bg-white shadow-xs"
                      />
                    )}
                    <span className="relative z-10">{wc.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Topic & Details */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              3. 输入创作主题
            </h2>
            <span className="text-xs text-slate-400">越具体越容易出爆款</span>
          </div>

          <div>
            <textarea
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例如：分享一套适合上班族的极简时间管理法，强调不需要早起也能多出 2 小时..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-3 focus:ring-indigo-500/10"
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400">灵感示例：</span>
              {QUICK_TOPICS.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setTopic(sample)}
                  className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700"
                >
                  {sample.slice(0, 12)}...
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                核心关键词（选填）
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="用逗号分隔，如：效率, 复盘"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                目标受众（选填）
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="如：25-35岁职场新人"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {generationError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
              {generationError}
            </div>
          )}

          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerate}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-medium text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>正在为{activePlatformMeta.name}构思推流文案...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>生成{activePlatformMeta.name}推流文案</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* Right Result & History Panel */}
      <section className="flex flex-col gap-4 lg:col-span-7">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-5 py-3.5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-slate-900">
              创作画布
            </span>
            {currentResult && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  currentResult.mode === "ai"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {currentResult.mode === "ai"
                  ? "大模型智能生成"
                  : "内置推流引擎"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                showHistory
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>历史记录 ({history.length})</span>
            </button>

            {currentResult && (
              <>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>重写</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
                >
                  {copiedKey === "all" ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>已复制全文</span>
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

        {/* History Drawer */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                <h3 className="mb-3 text-xs font-semibold text-slate-700">
                  最近生成记录
                </h3>
                {history.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">
                    暂无历史记录，生成一次文案后将自动保存于此
                  </p>
                ) : (
                  <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between rounded-xl border p-2.5 transition ${
                          currentResult?.id === item.id
                            ? "border-indigo-300 bg-indigo-50/40"
                            : "border-slate-100 bg-slate-50/60 hover:border-slate-200"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            selectFromHistory(item.id);
                            setShowHistory(false);
                          }}
                          className="flex flex-1 flex-col items-start text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-600 shadow-2xs">
                              {PLATFORMS[item.platform].name}
                            </span>
                            <span className="line-clamp-1 text-xs font-medium text-slate-800">
                              {item.topic}
                            </span>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromHistory(item.id)}
                          className="ml-2 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
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

        {/* Empty State or Generated Result */}
        <AnimatePresence mode="wait">
          {!currentResult ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.24 }}
              className="flex min-h-[480px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center"
            >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              准备就绪，开始你的推流创作
            </h3>
            <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500">
              在左侧选择目标平台（抖音、今日头条、快手或微信公众号），填写主题与关键词，即可一键生成结构化爆款文案与推流建议。
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={currentResult.id}
            initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            {/* Titles */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  备选爆款标题
                </span>
                <span className="text-[11px] text-slate-400">
                  点击右侧图标可单独复制
                </span>
              </div>
              <div className="space-y-2">
                {currentResult.titles.map((title, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-[11px] font-semibold text-indigo-700">
                        {idx + 1}
                      </span>
                      <p className="text-sm font-medium text-slate-900">
                        {title}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(title, `title-${idx}`)}
                      className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700"
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

            {/* Golden Hook */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-800">
                  黄金开头 / 留存钩子
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(currentResult.hook, "hook")}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  {copiedKey === "hook" ? "已复制" : "复制开头"}
                </button>
              </div>
              <p className="text-sm leading-relaxed text-slate-800">
                {currentResult.hook}
              </p>
            </div>

            {/* Editable Body */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  正文内容（可直接微调编辑）
                </span>
                <span className="text-xs text-slate-400">
                  {currentResult.body.length} 字
                </span>
              </div>
              <textarea
                rows={10}
                value={currentResult.body}
                onChange={(e) => updateCurrentBody(e.target.value)}
                className="w-full resize-y rounded-xl border border-slate-200/80 bg-slate-50/40 p-4 text-sm leading-7 text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white"
              />
            </div>

            {/* CTA & Tags */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <MessageSquareHeart className="h-3.5 w-3.5 text-indigo-600" />
                  <span>互动引导语</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  {currentResult.cta}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Hash className="h-3.5 w-3.5 text-indigo-600" />
                  <span>推荐推流标签</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentResult.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Platform Algorithm Tips */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                <span>
                  {PLATFORMS[currentResult.platform].name}推流优化建议
                </span>
              </div>
              <ul className="space-y-1.5">
                {currentResult.tips.map((tip, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs leading-relaxed text-slate-600"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </section>
    </div>
  );
}
