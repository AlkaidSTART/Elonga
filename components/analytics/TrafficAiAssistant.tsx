"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Copy,
  Loader2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import { getTextApiFormatMeta } from "@/lib/ai/model-client";
import type { TrafficRecordSummary } from "@/lib/analytics-insight";
import type { CopywritingResult } from "@/lib/platforms";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

interface TrafficAiAssistantProps {
  records: CopywritingResult[];
  scopeLabel: string;
}

interface InsightResultState {
  content: string;
  mode: "ai" | "local";
  model: string;
  latencyMs?: number;
  fallbackReason?: string;
  generatedAt: string;
}

const PRESET_PROMPTS = [
  {
    id: "review",
    label: "整体流量复盘",
    prompt: "请基于当前已同步作品数据做一次整体流量复盘，总结亮点、短板及 3 条可立即执行的优化动作。",
  },
  {
    id: "viral",
    label: "头部作品归因",
    prompt: "请分析当前播放与互动表现最好的头部作品有哪些共同特征，以及如何复用到后续内容创作中。",
  },
  {
    id: "platform",
    label: "分平台策略对比",
    prompt: "请对比抖音、今日头条、小红书、微信公众号各平台的播放量与互动率差异，给出各渠道差异化内容策略。",
  },
  {
    id: "next-week",
    label: "下周优化清单",
    prompt: "结合现有作品数据，制定一份下周公益内容发布与互动提升的执行清单（含标题方向与互动引导建议）。",
  },
] as const;

export function TrafficAiAssistant({ records, scopeLabel }: TrafficAiAssistantProps) {
  const router = useRouter();
  const modelConfig = useWorkbenchStore((s) => s.modelConfig);

  const [prompt, setPrompt] = useState<string>(PRESET_PROMPTS[0].prompt);
  const [activePreset, setActivePreset] = useState<string>(PRESET_PROMPTS[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InsightResultState | null>(null);
  const [copied, setCopied] = useState(false);

  const hasApiKey = Boolean(modelConfig.textApiKey.trim());
  const formatMeta = getTextApiFormatMeta(modelConfig.textApiFormat);

  const toSummaryPayload = (): TrafficRecordSummary[] =>
    records.map((item) => ({
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

  const handleAnalyze = async (overridePrompt?: string) => {
    const finalPrompt = (overridePrompt ?? prompt).trim();
    if (!finalPrompt) {
      setError("请输入想要分析的问题或选择一个快捷分析指令。");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analytics-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          records: toSummaryPayload(),
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

      setResult({
        content: data.content ?? "",
        mode: data.mode ?? "local",
        model: data.model ?? modelConfig.textModel,
        latencyMs: data.latencyMs,
        fallbackReason: data.fallbackReason,
        generatedAt: new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "调用模型失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.content) return;
    try {
      await navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore clipboard failures
    }
  };

  return (
    <section className="space-y-4 border-b border-[#E2DDD3] pb-8">
      {/* Section Header + Configured Model Status */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-editorial text-base font-semibold text-[#181816]">
              AI 流量诊断助手
            </h2>
            <span className="rounded bg-[#EFECE4] px-1.5 py-0.5 font-mono text-[11px] text-[#57534E] tabular-nums">
              数据范围：{scopeLabel} · {records.length} 篇
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[#78716C]">
            直接调用平台已配置的文本大模型，结合当前作品流量数据进行归因诊断与策略建议
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded border border-[#E2DDD3] bg-[#FCFBF8] px-2.5 py-1 text-[11px]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                hasApiKey ? "bg-[#1B4D3E]" : "bg-[#B85D3B]"
              }`}
            />
            <span className="font-mono font-medium text-[#181816]">
              {modelConfig.textModel || "deepseek-chat"}
            </span>
            <span className="text-[#8C857B]">· {formatMeta.shortLabel}</span>
            <span className={hasApiKey ? "text-[#1B4D3E]" : "text-[#9A4A22]"}>
              {hasApiKey ? "云端已就绪" : "本地降级"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="inline-flex items-center gap-1 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2.5 py-1 text-xs font-medium text-[#57534E] transition hover:border-[#181816] hover:text-[#181816]"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>切换/配置模型</span>
          </button>
        </div>
      </div>

      {/* Preset Prompt Chips */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESET_PROMPTS.map((preset) => {
          const active = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setActivePreset(preset.id);
                setPrompt(preset.prompt);
              }}
              className={`rounded border px-2.5 py-1 text-xs font-medium transition ${
                active
                  ? "border-[#1B4D3E]/35 bg-[#E9F0ED] text-[#1B4D3E]"
                  : "border-[#D5CFC3] bg-[#FCFBF8] text-[#57534E] hover:border-[#181816] hover:text-[#181816]"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Prompt Input & Trigger */}
      <div className="space-y-2.5">
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => {
            setActivePreset("");
            setPrompt(e.target.value);
          }}
          placeholder="输入你想让文本大模型分析的问题，例如：为什么抖音播放高但评论偏低？下周应该重点推哪类公益选题？"
          className="w-full resize-none rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 text-xs leading-relaxed text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-[#8C857B]">
            将自动附带当前筛选范围内的作品指标与分平台汇总作为模型上下文
          </p>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void handleAnalyze()}
            className="inline-flex items-center gap-1.5 rounded bg-[#1B4D3E] px-4 py-2 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F] disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>模型分析中...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>调用模型分析</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="flex items-center gap-2 border-l-2 border-[#B42318] bg-[#FDF2F2] px-3.5 py-2 text-xs text-[#B42318]">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {/* Analysis Result Panel */}
      {result && (
        <div className="rounded border border-[#E2DDD3] bg-[#FCFBF8] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2DDD3] pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                  result.mode === "ai"
                    ? "border border-[#1B4D3E]/25 bg-[#E9F0ED] text-[#1B4D3E]"
                    : "bg-[#FBF3EC] text-[#9A4A22]"
                }`}
              >
                {result.mode === "ai" ? `云端模型 · ${result.model}` : "本地分析降级"}
              </span>
              {result.latencyMs !== undefined && (
                <span className="font-mono text-[11px] text-[#8C857B] tabular-nums">
                  耗时 {(result.latencyMs / 1000).toFixed(2)}s
                </span>
              )}
              <span className="font-mono text-[11px] text-[#8C857B] tabular-nums">
                {result.generatedAt}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="inline-flex items-center gap-1 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2.5 py-1 text-[11px] font-medium text-[#57534E] transition hover:border-[#181816] hover:text-[#181816]"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-[#1B4D3E]" />
                    <span className="text-[#1B4D3E]">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>复制结论</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setResult(null)}
                aria-label="清空分析结果"
                className="rounded p-1 text-[#8C857B] transition hover:bg-[#EFECE4] hover:text-[#181816]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {result.fallbackReason && (
            <p className="mt-3 border-l-2 border-[#B85D3B] bg-[#FBF3EC] px-3 py-1.5 text-[11px] text-[#9A4A22]">
              {result.fallbackReason}
            </p>
          )}

          <div className="mt-4 whitespace-pre-wrap text-xs leading-relaxed text-[#181816]">
            {result.content}
          </div>
        </div>
      )}
    </section>
  );
}
