"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ImagePlus,
  Loader2,
  Play,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import {
  CONTENT_TYPES,
  PLATFORMS,
  TONES,
  WORD_COUNTS,
  type ContentTypeId,
  type CopywritingResult,
  type PlatformId,
  type ToneId,
  type WordCountId,
} from "@/lib/platforms";
import type { DouyinTrendInsights } from "@/lib/skills/types";
import { processWorkflowImage } from "@/lib/workflow-image-processor";
import {
  buildDocumentBlocks,
  exportDocumentAsDocx,
  exportDocumentAsMarkdown,
  exportDocumentAsPdf,
  type AssembledDocument,
} from "@/lib/document-exporter";
import type { AutoRedactCategory } from "@/lib/auto-redact";
import type { Style2DPreset } from "@/store/useImageStudioStore";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

interface WorkflowImageItem {
  id: string;
  name: string;
  originalUrl: string;
  processedUrl: string;
  width: number;
  height: number;
  caption: string;
  enableRedact: boolean;
  redactCategories: AutoRedactCategory[];
  enableStylize: boolean;
  stylePreset: Style2DPreset;
  status: "idle" | "processing" | "done" | "error";
  processNote?: string;
}

const STYLE_PRESETS: { id: Style2DPreset; label: string }[] = [
  { id: "anime", label: "日漫" },
  { id: "ghibli", label: "吉卜力" },
  { id: "cel", label: "赛璐璐" },
  { id: "watercolor", label: "水彩" },
];

const PIPELINE_STEPS: { id: WorkflowStage; num: string; label: string }[] = [
  { id: "processing-images", num: "01", label: "配图" },
  { id: "researching-douyin", num: "02", label: "检索" },
  { id: "writing-copy", num: "03", label: "撰文" },
  { id: "assembling", num: "04", label: "成稿" },
];

const AUTO_TOPIC_PRESETS: Array<{
  topic: string;
  keywords: string;
  contentType: ContentTypeId;
  matchHints: string[];
}> = [
  {
    topic: "社区流浪猫科学绝育与领养倡议：用一次温柔守护，换它一生安稳",
    keywords: "流浪猫救助, TNR绝育, 领养代替购买, 社区公益",
    contentType: "story",
    matchHints: ["cat", "猫", "pet", "流浪", "动物"],
  },
  {
    topic: "周末河道净滩环保志愿行动：弯腰捡起的不是垃圾，是城市呼吸感",
    keywords: "河道净滩, 环保公益, 志愿者招募, 绿色生活",
    contentType: "activity",
    matchHints: ["river", "beach", "环保", "净滩", "绿水", "志愿"],
  },
  {
    topic: "乡村小学图书角募捐计划：把闲置好书寄给远方渴望阅读的孩子",
    keywords: "乡村阅读, 图书角募捐, 公益助学, 知识传递",
    contentType: "activity",
    matchHints: ["book", "school", "书", "小学", "助学", "阅读"],
  },
  {
    topic: "公益现场实录：那些不被镜头放大，却真实改变社区的微光时刻",
    keywords: "公益现场, 真实记录, 社区微光, 志愿故事",
    contentType: "story",
    matchHints: ["scene", "sample", "现场", "记录", "公益"],
  },
  {
    topic: "3分钟看懂日常环保减碳小习惯：普通人也能轻松参与的绿色公益",
    keywords: "环保科普, 低碳生活, 日常公益, 可持续",
    contentType: "science",
    matchHints: ["science", "科普", "低碳", "垃圾分类"],
  },
];

function createSampleImageDataUrl(label: string, accent: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 600;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, 960, 600);
  grad.addColorStop(0, "#f8fafc");
  grad.addColorStop(1, "#e2e8f0");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 960, 600);

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(760, 140, 72, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#334155";
  ctx.beginPath();
  ctx.moveTo(0, 400);
  ctx.lineTo(260, 220);
  ctx.lineTo(520, 360);
  ctx.lineTo(780, 210);
  ctx.lineTo(960, 350);
  ctx.lineTo(960, 600);
  ctx.lineTo(0, 600);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.beginPath();
  ctx.roundRect(64, 380, 390, 155, 16);
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(label, 92, 430);
  ctx.fillStyle = "#475569";
  ctx.font = "16px sans-serif";
  ctx.fillText("现场编号：EL-2026-0918", 92, 470);
  ctx.fillText("联系人：138-0000-5678", 92, 504);

  return canvas.toDataURL("image/png");
}

type WorkflowStage =
  | "idle"
  | "processing-images"
  | "researching-douyin"
  | "writing-copy"
  | "assembling"
  | "done";

export function ContentWorkflowWorkspace() {
  const modelConfig = useWorkbenchStore((s) => s.modelConfig);
  const addToHistory = useWorkbenchStore((s) => s.addToHistory);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [images, setImages] = useState<WorkflowImageItem[]>([]);
  const [platform, setPlatform] = useState<PlatformId>("douyin");
  const [contentType, setContentType] = useState<ContentTypeId>("story");
  const [tone, setTone] = useState<ToneId>("warm");
  const [wordCount, setWordCount] = useState<WordCountId>("medium");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  const [stage, setStage] = useState<WorkflowStage>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [candidateTitles, setCandidateTitles] = useState<string[]>([]);
  const [assembledDoc, setAssembledDoc] = useState<AssembledDocument | null>(
    null
  );
  const [docViewMode, setDocViewMode] = useState<"preview" | "edit">("preview");
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [insightsExpanded, setInsightsExpanded] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    Array.from(fileList).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const baseName = file.name.replace(/\.[^.]+$/, "");
          const item: WorkflowImageItem = {
            id: `wf_img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            originalUrl: dataUrl,
            processedUrl: dataUrl,
            width: img.width,
            height: img.height,
            caption: baseName,
            enableRedact: true,
            redactCategories: ["text", "face", "qrcode"],
            enableStylize: false,
            stylePreset: "anime",
            status: "idle",
          };
          setImages((prev) => [...prev, item]);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLoadSamples = () => {
    const sample1 = createSampleImageDataUrl(
      "公益活动现场 · 社区志愿角",
      "#10b981"
    );
    const sample2 = createSampleImageDataUrl(
      "物资捐赠清单 · 图书角",
      "#f59e0b"
    );
    setImages([
      {
        id: `wf_sample_1_${Date.now()}`,
        name: "公益活动现场.png",
        originalUrl: sample1,
        processedUrl: sample1,
        width: 960,
        height: 600,
        caption: "社区志愿服务活动现场",
        enableRedact: true,
        redactCategories: ["text", "face", "qrcode"],
        enableStylize: false,
        stylePreset: "anime",
        status: "idle",
      },
      {
        id: `wf_sample_2_${Date.now() + 1}`,
        name: "物资捐赠清单.png",
        originalUrl: sample2,
        processedUrl: sample2,
        width: 960,
        height: 600,
        caption: "图书角捐赠物资整理",
        enableRedact: false,
        redactCategories: ["text", "face", "qrcode"],
        enableStylize: true,
        stylePreset: "ghibli",
        status: "idle",
      },
    ]);
  };

  const updateImageItem = (
    id: string,
    patch: Partial<WorkflowImageItem>
  ) => {
    setImages((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const removeImageItem = (id: string) => {
    setImages((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAutoSelectTopic = () => {
    const combinedNames = images
      .map((i) => `${i.name} ${i.caption}`)
      .join(" ")
      .toLowerCase();

    const matched = AUTO_TOPIC_PRESETS.find((preset) =>
      preset.matchHints.some((hint) => combinedNames.includes(hint))
    );
    const chosen =
      matched ??
      AUTO_TOPIC_PRESETS[
        Math.floor(Math.random() * AUTO_TOPIC_PRESETS.length)
      ];

    setTopic(chosen.topic);
    setKeywords(chosen.keywords);
    setContentType(chosen.contentType);
  };

  const processAllImages = async (): Promise<WorkflowImageItem[]> => {
    if (images.length === 0) return [];
    const updatedList: WorkflowImageItem[] = [];

    for (const item of images) {
      updateImageItem(item.id, { status: "processing", processNote: "处理中" });
      try {
        const res = await processWorkflowImage(
          item.originalUrl,
          item.width,
          item.height,
          {
            enableRedact: item.enableRedact,
            redactCategories: item.redactCategories,
            enableStylize: item.enableStylize,
            stylePreset: item.stylePreset,
          },
          modelConfig
        );
        const updated: WorkflowImageItem = {
          ...item,
          processedUrl: res.processedUrl,
          status: "done",
          processNote: res.notes.join(" · "),
        };
        updateImageItem(item.id, updated);
        updatedList.push(updated);
      } catch {
        const errored: WorkflowImageItem = {
          ...item,
          status: "error",
          processNote: "已保留原图",
        };
        updateImageItem(item.id, errored);
        updatedList.push(errored);
      }
    }

    return updatedList;
  };

  const handleRunWorkflow = async () => {
    setErrorMsg(null);

    let effectiveTopic = topic.trim();
    let effectiveKeywords = keywords.trim();
    if (!effectiveTopic) {
      const autoPreset = AUTO_TOPIC_PRESETS[0];
      effectiveTopic = autoPreset.topic;
      effectiveKeywords = effectiveKeywords || autoPreset.keywords;
      setTopic(effectiveTopic);
      setKeywords(effectiveKeywords);
    }

    const requestModelConfig = {
      apiKey: modelConfig.textApiKey,
      baseUrl: modelConfig.textBaseUrl,
      textModel: modelConfig.textModel,
    };

    try {
      let processedImages = images;
      if (images.length > 0) {
        setStage("processing-images");
        processedImages = await processAllImages();
      }

      setStage("researching-douyin");
      let trendInsights: DouyinTrendInsights | undefined;
      try {
        const trendRes = await fetch("/api/douyin-trends", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: effectiveTopic,
            keywords: effectiveKeywords,
            modelConfig: requestModelConfig,
          }),
        });
        if (trendRes.ok) {
          const trendData = await trendRes.json();
          trendInsights = trendData.insights;
        }
      } catch {
        // Fallback inside copywriting workflow
      }

      setStage("writing-copy");
      const imageContextNote =
        processedImages.length > 0
          ? `（本文配有 ${processedImages.length} 张实拍/风格化图片：${processedImages
              .map((img) => img.caption || img.name)
              .join("、")}，请合理分段以便图文混排）`
          : "";

      const copyRes = await fetch("/api/copywriting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          contentType,
          tone,
          wordCount,
          topic: `${effectiveTopic}${imageContextNote}`,
          keywords: effectiveKeywords,
          targetAudience,
          trendInsights,
          modelConfig: requestModelConfig,
        }),
      });

      const copyData = await copyRes.json();
      if (!copyRes.ok) {
        throw new Error(copyData.error || "文案生成失败");
      }

      const result = copyData.result as CopywritingResult;
      const finalTrends = (copyData.trendInsights ??
        trendInsights ??
        result.trendInsights) as DouyinTrendInsights | undefined;

      setStage("assembling");
      const doc: AssembledDocument = {
        title: result.titles[0] || effectiveTopic,
        platform,
        platformName: PLATFORMS[platform].name,
        topic: effectiveTopic,
        body: result.body,
        tags: result.tags,
        hook: result.hook,
        algorithmTips: PLATFORMS[platform].algorithmTips,
        trendInsights: finalTrends,
        images: processedImages.map((img) => ({
          id: img.id,
          name: img.name,
          caption: img.caption,
          dataUrl: img.processedUrl,
          width: img.width,
          height: img.height,
        })),
        createdAt: Date.now(),
      };

      setCandidateTitles(result.titles);
      setAssembledDoc(doc);
      addToHistory(result);
      setStage("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "执行失败");
      setStage("idle");
    }
  };

  const handleExportDocx = async () => {
    if (!assembledDoc) return;
    setIsExportingDocx(true);
    try {
      await exportDocumentAsDocx(assembledDoc);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleCopyFullText = async () => {
    if (!assembledDoc) return;
    const text = [
      assembledDoc.title,
      "",
      assembledDoc.body,
      "",
      assembledDoc.tags.map((t) => `#${t.replace(/^#/, "")}`).join(" "),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 1800);
    } catch {
      // ignore
    }
  };

  const isRunning =
    stage === "processing-images" ||
    stage === "researching-douyin" ||
    stage === "writing-copy" ||
    stage === "assembling";

  const activeStepIdx = PIPELINE_STEPS.findIndex((s) => s.id === stage);
  const documentBlocks = assembledDoc ? buildDocumentBlocks(assembledDoc) : [];

  return (
    <div className="space-y-7">
      {/* Top Horizontal Pipeline Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#DFDCD2] pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-[#141413]">
          图文工作流
        </h1>

        <ol className="flex items-center gap-3 sm:gap-5">
          {PIPELINE_STEPS.map((step, idx) => {
            const isActive = stage === step.id;
            const isCompleted =
              stage === "done" || (activeStepIdx > idx && activeStepIdx !== -1);
            return (
              <li
                key={step.id}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  isActive
                    ? "font-semibold text-[#0F6E5D]"
                    : isCompleted
                    ? "text-[#141413]"
                    : "text-zinc-400"
                }`}
              >
                <span className="font-mono text-[10px]">
                  {isCompleted ? <Check className="h-3 w-3 text-[#0F6E5D]" /> : step.num}
                </span>
                <span>{step.label}</span>
              </li>
            );
          })}
        </ol>
      </header>

      {/* Horizontal Media Filmstrip (No Vertical Card Stack) */}
      <section
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex items-center gap-3 overflow-x-auto rounded-2xl bg-[#ECE9E1]/80 p-3 transition ${
          isDragging ? "ring-2 ring-[#0F6E5D]" : ""
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Add Tile */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#C9C5BA] bg-[#F5F3EE] text-zinc-600 transition hover:border-[#161715] hover:text-[#141413]"
        >
          <ImagePlus className="h-4 w-4" />
          <span className="text-[11px] font-medium">添加配图</span>
        </button>

        {images.length === 0 ? (
          <div className="flex flex-1 items-center justify-between px-3">
            <span className="text-xs text-zinc-500">拖拽配图到此处</span>
            <button
              type="button"
              onClick={handleLoadSamples}
              className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-zinc-700 transition hover:bg-white"
            >
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>示例图</span>
            </button>
          </div>
        ) : (
          <>
            {images.map((item) => (
              <div
                key={item.id}
                className="group relative flex h-24 shrink-0 items-center gap-2.5 rounded-xl bg-white p-2 pr-3 shadow-2xs"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.processedUrl}
                  alt={item.name}
                  className="h-20 w-20 shrink-0 rounded-lg object-cover"
                />

                <div className="flex w-36 flex-col justify-between self-stretch py-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <input
                      type="text"
                      value={item.caption}
                      onChange={(e) =>
                        updateImageItem(item.id, { caption: e.target.value })
                      }
                      placeholder="图注..."
                      className="w-full truncate bg-transparent text-xs font-medium text-[#141413] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeImageItem(item.id)}
                      className="rounded-full p-0.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="删除"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateImageItem(item.id, {
                          enableRedact: !item.enableRedact,
                        })
                      }
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium transition ${
                        item.enableRedact
                          ? "bg-[#161715] text-white"
                          : "bg-[#F5F3EE] text-zinc-500"
                      }`}
                    >
                      打码
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateImageItem(item.id, {
                          enableStylize: !item.enableStylize,
                        })
                      }
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium transition ${
                        item.enableStylize
                          ? "bg-[#0F6E5D] text-white"
                          : "bg-[#F5F3EE] text-zinc-500"
                      }`}
                    >
                      2D
                    </button>
                    {item.enableStylize && (
                      <select
                        value={item.stylePreset}
                        onChange={(e) =>
                          updateImageItem(item.id, {
                            stylePreset: e.target.value as Style2DPreset,
                          })
                        }
                        className="rounded bg-[#F5F3EE] px-1 py-0.5 text-[10px] text-zinc-700 outline-none"
                      >
                        {STYLE_PRESETS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => void processAllImages()}
              disabled={isRunning}
              className="shrink-0 rounded-xl bg-[#161715] px-3 py-2 text-[11px] font-medium text-white transition hover:bg-zinc-800 disabled:opacity-40"
            >
              预览处理
            </button>
          </>
        )}
      </section>

      {/* Open Inline Composer Strip (No Card Wrapper) */}
      <section className="space-y-3 border-b border-[#DFDCD2] pb-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-2xl bg-white px-4 py-2.5 ring-1 ring-black/[0.06] focus-within:ring-[#0F6E5D]">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="输入文章主题..."
              className="w-full bg-transparent text-sm text-[#141413] outline-none placeholder:text-zinc-400"
            />
            <button
              type="button"
              onClick={handleAutoSelectTopic}
              className="shrink-0 rounded-full bg-[#F5F3EE] px-2.5 py-1 text-[11px] font-medium text-zinc-600 transition hover:bg-[#E7E4DC] hover:text-[#141413]"
            >
              自动匹配
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Platform Pills */}
            <div className="flex items-center gap-1 rounded-full bg-[#ECE9E1] p-1">
              {(Object.keys(PLATFORMS) as PlatformId[]).map((pid) => {
                const meta = PLATFORMS[pid];
                const active = platform === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setPlatform(pid)}
                    className={`relative rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "text-white"
                        : "text-zinc-600 hover:text-[#141413]"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="workflowPlatformPill"
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

            <button
              type="button"
              onClick={() => setOptionsExpanded((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium transition ${
                optionsExpanded
                  ? "bg-[#161715] text-white"
                  : "bg-[#ECE9E1] text-zinc-600 hover:text-[#141413]"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => void handleRunWorkflow()}
              disabled={isRunning}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0F6E5D] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#0B5649] active:scale-[0.98] disabled:opacity-60"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>执行中</span>
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 fill-current" />
                  <span>一键执行</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Options */}
        <AnimatePresence initial={false}>
          {optionsExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.16 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2.5 pt-2 sm:grid-cols-5">
                <select
                  value={contentType}
                  onChange={(e) =>
                    setContentType(e.target.value as ContentTypeId)
                  }
                  className="rounded-xl bg-white px-3 py-2 text-xs text-[#141413] ring-1 ring-black/[0.06] outline-none"
                >
                  {CONTENT_TYPES.map((ct) => (
                    <option key={ct.id} value={ct.id}>
                      {ct.label}
                    </option>
                  ))}
                </select>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as ToneId)}
                  className="rounded-xl bg-white px-3 py-2 text-xs text-[#141413] ring-1 ring-black/[0.06] outline-none"
                >
                  {TONES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <select
                  value={wordCount}
                  onChange={(e) =>
                    setWordCount(e.target.value as WordCountId)
                  }
                  className="rounded-xl bg-white px-3 py-2 text-xs text-[#141413] ring-1 ring-black/[0.06] outline-none"
                >
                  {WORD_COUNTS.map((wc) => (
                    <option key={wc.id} value={wc.id}>
                      {wc.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="关键词"
                  className="rounded-xl bg-white px-3 py-2 text-xs text-[#141413] ring-1 ring-black/[0.06] outline-none placeholder:text-zinc-400"
                />
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="目标受众"
                  className="rounded-xl bg-white px-3 py-2 text-xs text-[#141413] ring-1 ring-black/[0.06] outline-none placeholder:text-zinc-400"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {errorMsg && <p className="text-xs text-rose-600">{errorMsg}</p>}
      </section>

      {/* Full-Width Editorial Publication Canvas */}
      <AnimatePresence mode="wait">
        {!assembledDoc ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[280px] flex-col items-center justify-center text-center"
          >
            <div className="h-8 w-px bg-[#D6D2C8]" />
            <p className="mt-4 font-editorial text-lg text-zinc-400">
              成稿将在此呈现
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="document"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-4xl space-y-4"
          >
            {/* Slim Floating Export Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 rounded-full bg-[#ECE9E1] p-1">
                <button
                  type="button"
                  onClick={() => setDocViewMode("preview")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    docViewMode === "preview"
                      ? "bg-white text-[#141413] shadow-2xs"
                      : "text-zinc-500 hover:text-[#141413]"
                  }`}
                >
                  预览
                </button>
                <button
                  type="button"
                  onClick={() => setDocViewMode("edit")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    docViewMode === "edit"
                      ? "bg-white text-[#141413] shadow-2xs"
                      : "text-zinc-500 hover:text-[#141413]"
                  }`}
                >
                  编辑
                </button>
                {candidateTitles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setInsightsExpanded((v) => !v)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      insightsExpanded
                        ? "bg-[#161715] text-white"
                        : "text-zinc-500 hover:text-[#141413]"
                    }`}
                  >
                    备选标题 ({candidateTitles.length})
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void handleExportDocx()}
                  disabled={isExportingDocx}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 ring-1 ring-black/[0.06] transition hover:bg-[#F5F3EE] disabled:opacity-50"
                >
                  {isExportingDocx && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  DOCX
                </button>
                <button
                  type="button"
                  onClick={() => exportDocumentAsPdf(assembledDoc)}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 ring-1 ring-black/[0.06] transition hover:bg-[#F5F3EE]"
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => exportDocumentAsMarkdown(assembledDoc)}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 ring-1 ring-black/[0.06] transition hover:bg-[#F5F3EE]"
                >
                  MD
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopyFullText()}
                  className="rounded-full bg-[#161715] px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800"
                >
                  {copiedFull ? "已复制" : "复制全文"}
                </button>
              </div>
            </div>

            {/* Expandable Candidate Titles Strip */}
            <AnimatePresence initial={false}>
              {insightsExpanded && candidateTitles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-1.5 overflow-hidden py-1"
                >
                  {candidateTitles.map((t, i) => {
                    const active = assembledDoc.title === t;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          setAssembledDoc((prev) =>
                            prev ? { ...prev, title: t } : prev
                          )
                        }
                        className={`rounded-full px-3 py-1 text-xs transition ${
                          active
                            ? "bg-[#0F6E5D] font-medium text-white"
                            : "bg-white text-zinc-600 ring-1 ring-black/[0.06] hover:text-[#141413]"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Publication Sheet */}
            <div className="rounded-3xl bg-white p-7 shadow-[0_2px_24px_rgba(20,20,19,0.04)] sm:p-11">
              {docViewMode === "edit" ? (
                <div className="space-y-5">
                  <input
                    type="text"
                    value={assembledDoc.title}
                    onChange={(e) =>
                      setAssembledDoc((prev) =>
                        prev ? { ...prev, title: e.target.value } : prev
                      )
                    }
                    className="w-full border-b border-[#ECE9E1] pb-3 font-editorial text-2xl font-semibold text-[#141413] outline-none focus:border-[#0F6E5D]"
                  />
                  <textarea
                    rows={16}
                    value={assembledDoc.body}
                    onChange={(e) =>
                      setAssembledDoc((prev) =>
                        prev ? { ...prev, body: e.target.value } : prev
                      )
                    }
                    className="w-full resize-y bg-transparent text-[15px] leading-8 text-zinc-800 outline-none"
                  />
                </div>
              ) : (
                <article className="mx-auto max-w-2xl space-y-6">
                  <header className="space-y-3 border-b border-[#F0EDE6] pb-6">
                    <div className="flex items-center gap-2.5 text-[11px] text-zinc-400">
                      <span className="rounded-full bg-[#161715] px-2.5 py-0.5 font-medium text-white">
                        {assembledDoc.platformName}
                      </span>
                      <span className="font-mono">
                        {new Date(assembledDoc.createdAt).toLocaleString(
                          "zh-CN"
                        )}
                      </span>
                    </div>
                    <h2 className="font-editorial text-2xl font-semibold leading-snug text-[#141413] sm:text-3xl">
                      {assembledDoc.title}
                    </h2>
                  </header>

                  <div className="space-y-5">
                    {documentBlocks.map((block, idx) =>
                      block.type === "paragraph" ? (
                        <p
                          key={idx}
                          className="whitespace-pre-wrap text-[15px] leading-8 text-zinc-800"
                        >
                          {block.text}
                        </p>
                      ) : (
                        <figure key={block.image.id} className="my-6">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={block.image.dataUrl}
                            alt={block.image.caption || block.image.name}
                            className="mx-auto max-h-96 rounded-2xl object-contain"
                          />
                          {block.image.caption && (
                            <figcaption className="mt-2.5 text-center text-xs text-zinc-400">
                              {block.image.caption}
                            </figcaption>
                          )}
                        </figure>
                      )
                    )}
                  </div>

                  {assembledDoc.tags.length > 0 && (
                    <footer className="flex flex-wrap items-center gap-2 border-t border-[#F0EDE6] pt-5">
                      {assembledDoc.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs font-medium text-[#0F6E5D]"
                        >
                          #{tag.replace(/^#/, "")}
                        </span>
                      ))}
                    </footer>
                  )}
                </article>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
