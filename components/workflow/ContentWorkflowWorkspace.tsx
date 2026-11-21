"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Loader2, Trash2 } from "lucide-react";
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

  // Images state
  const [images, setImages] = useState<WorkflowImageItem[]>([]);

  // Copywriting parameters
  const [platform, setPlatform] = useState<PlatformId>("douyin");
  const [contentType, setContentType] = useState<ContentTypeId>("story");
  const [tone, setTone] = useState<ToneId>("warm");
  const [wordCount, setWordCount] = useState<WordCountId>("medium");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  // Execution & Result state
  const [stage, setStage] = useState<WorkflowStage>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [candidateTitles, setCandidateTitles] = useState<string[]>([]);
  const [assembledDoc, setAssembledDoc] = useState<AssembledDocument | null>(
    null
  );
  const [docViewMode, setDocViewMode] = useState<"preview" | "edit">("preview");
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  // Collapsible sections (收纳)
  const [imagesExpanded, setImagesExpanded] = useState(false);
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
          setImagesExpanded(true);
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
      updateImageItem(item.id, { status: "processing", processNote: "处理中..." });
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
          processNote: "处理失败，已保留原图",
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
      // 1. 批量处理上传图片
      let processedImages = images;
      if (images.length > 0) {
        setStage("processing-images");
        processedImages = await processAllImages();
      }

      // 2. 检索抖音爆款文案与热词
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

      // 3. 撰写高推流图文文案
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

      // 4. 组装完整图文文档
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
      setErrorMsg(err instanceof Error ? err.message : "工作流执行失败");
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

  const stageLabel: Record<WorkflowStage, string> = {
    idle: "等待执行",
    "processing-images": "1/4 正在批量处理图片（隐私打码 / 二维风格化）...",
    "researching-douyin": "2/4 正在检索抖音爆款文案与热门钩子...",
    "writing-copy": "3/4 正在撰写高推流图文文章...",
    "assembling": "4/4 正在组装完整图文文档...",
    done: "完整图文文档已生成",
  };

  const documentBlocks = assembledDoc ? buildDocumentBlocks(assembledDoc) : [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Column: Images + Topic & Platform Config */}
      <div className="space-y-5 lg:col-span-5">
        {/* Step 1: Image Upload & Processing (Collapsible) */}
        <section className="overflow-hidden rounded-2xl border border-[#E8E6E1] bg-white shadow-[0_1px_3px_rgba(24,24,27,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(24,24,27,0.05)]">
          <div className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-[#F9F8F6]/60">
            <button
              type="button"
              onClick={() => setImagesExpanded((v) => !v)}
              className="flex flex-1 items-center gap-2.5 text-left"
            >
              <h2 className="text-sm font-semibold text-zinc-900">
                配图处理
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  images.length > 0
                    ? "bg-[#0F6E5D]/10 text-[#0F6E5D]"
                    : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {images.length > 0 ? `已选 ${images.length} 张` : "可选"}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${
                  imagesExpanded ? "rotate-180 text-[#0F6E5D]" : ""
                }`}
              />
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  handleLoadSamples();
                  setImagesExpanded(true);
                }}
                className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                示例图
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-[#0F6E5D]/10 px-2.5 py-1 text-xs font-medium text-[#0F6E5D] transition hover:bg-[#0F6E5D]/15"
              >
                添加图片
              </button>
            </div>
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
          </div>

          <AnimatePresence initial={false}>
            {imagesExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-neutral-100 px-5 py-4"
              >
                {images.length === 0 ? (
            <div
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
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-7 text-center transition ${
                isDragging
                  ? "border-emerald-500 bg-emerald-50/50"
                  : "border-neutral-300 bg-neutral-50/60 hover:border-neutral-400 hover:bg-neutral-50"
              }`}
            >
              <p className="text-xs font-medium text-neutral-700">
                拖拽或点击上传多张配图（可选）
              </p>
              <p className="mt-1 text-[11px] text-neutral-400">
                支持自动隐私打码、二维风格化，生成后自动插入文章
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Batch controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-[11px]">
                <span className="font-medium text-neutral-600">
                  已选 {images.length} 张配图
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setImages((prev) =>
                        prev.map((i) => ({ ...i, enableRedact: !i.enableRedact }))
                      )
                    }
                    className="rounded px-2 py-0.5 text-neutral-600 hover:bg-neutral-200/70"
                  >
                    切换全员打码
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setImages((prev) =>
                        prev.map((i) => ({
                          ...i,
                          enableStylize: !i.enableStylize,
                        }))
                      )
                    }
                    className="rounded px-2 py-0.5 text-neutral-600 hover:bg-neutral-200/70"
                  >
                    切换全员风格化
                  </button>
                  <button
                    type="button"
                    onClick={() => void processAllImages()}
                    disabled={isRunning}
                    className="rounded bg-neutral-900 px-2 py-0.5 font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    立即预览处理
                  </button>
                </div>
              </div>

              {/* Image List */}
              <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
                {images.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 rounded-xl border border-neutral-200/80 bg-white p-2.5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.processedUrl}
                      alt={item.name}
                      className="h-20 w-20 shrink-0 rounded-lg border border-neutral-100 object-cover"
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={item.caption}
                          onChange={(e) =>
                            updateImageItem(item.id, {
                              caption: e.target.value,
                            })
                          }
                          placeholder="输入配图说明..."
                          className="w-full truncate rounded border border-transparent bg-transparent px-1 py-0.5 text-xs font-medium text-neutral-800 focus:border-neutral-300 focus:bg-neutral-50 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => removeImageItem(item.id)}
                          className="shrink-0 rounded p-1 text-neutral-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label="删除图片"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateImageItem(item.id, {
                              enableRedact: !item.enableRedact,
                            })
                          }
                          className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                            item.enableRedact
                              ? "bg-neutral-900 text-white"
                              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                          }`}
                        >
                          智能打码
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateImageItem(item.id, {
                              enableStylize: !item.enableStylize,
                            })
                          }
                          className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                            item.enableStylize
                              ? "bg-emerald-600 text-white"
                              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                          }`}
                        >
                          二维风格化
                        </button>

                        {item.enableStylize && (
                          <select
                            value={item.stylePreset}
                            onChange={(e) =>
                              updateImageItem(item.id, {
                                stylePreset: e.target.value as Style2DPreset,
                              })
                            }
                            className="rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 text-[11px] text-neutral-700 focus:outline-none"
                          >
                            {STYLE_PRESETS.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {item.processNote && (
                        <p className="truncate text-[11px] text-emerald-700">
                          {item.status === "processing" ? "⏳ " : "✓ "}
                          {item.processNote}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Step 2: Topic & Platform Config */}
        <section className="space-y-4 rounded-2xl border border-[#E8E6E1] bg-white p-5 shadow-[0_1px_3px_rgba(24,24,27,0.04)]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">
              主题与平台
            </h2>
            <button
              type="button"
              onClick={handleAutoSelectTopic}
              className="rounded-lg bg-[#0F6E5D]/10 px-2.5 py-1 text-xs font-medium text-[#0F6E5D] transition hover:bg-[#0F6E5D]/15 active:scale-[0.98]"
            >
              自动匹配主题
            </button>
          </div>

          {/* Topic Input */}
          <div>
            <textarea
              rows={2}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="输入你想写的主题，或点击右上角「自动匹配主题」..."
              className="w-full rounded-xl border border-[#E8E6E1] bg-[#F9F8F6] px-3.5 py-2.5 text-xs leading-relaxed text-zinc-900 transition placeholder:text-zinc-400 focus:border-[#0F6E5D] focus:bg-white focus:ring-2 focus:ring-[#0F6E5D]/12 focus:outline-none"
            />
          </div>

          {/* Platform Selector (Compact 4-pill row) */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-600">
              分发平台
            </label>
            <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-[#F4F3EF] p-1">
              {(Object.keys(PLATFORMS) as PlatformId[]).map((pid) => {
                const meta = PLATFORMS[pid];
                const active = platform === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setPlatform(pid)}
                    className={`relative rounded-lg px-2 py-2 text-center text-xs font-medium transition-colors ${
                      active
                        ? "text-white"
                        : "text-zinc-600 hover:text-zinc-900"
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
                        className="absolute inset-0 rounded-lg bg-[#0F6E5D] shadow-xs"
                      />
                    )}
                    <span className="relative z-10">{meta.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Collapsible Advanced Options */}
          <div className="overflow-hidden rounded-xl border border-[#E8E6E1] bg-[#F9F8F6]">
            <button
              type="button"
              onClick={() => setOptionsExpanded((v) => !v)}
              className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs transition-colors hover:bg-[#F3F2EE]"
            >
              <span className="font-medium text-zinc-700">更多参数</span>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                <span>
                  {CONTENT_TYPES.find((c) => c.id === contentType)?.label} ·{" "}
                  {TONES.find((t) => t.id === tone)?.label} ·{" "}
                  {WORD_COUNTS.find((w) => w.id === wordCount)?.label}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    optionsExpanded ? "rotate-180 text-[#0F6E5D]" : ""
                  }`}
                />
              </div>
            </button>

            <AnimatePresence initial={false}>
              {optionsExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-3 overflow-hidden border-t border-neutral-200/70 bg-white p-3.5"
                >
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-neutral-600">
                        内容类型
                      </label>
                      <select
                        value={contentType}
                        onChange={(e) =>
                          setContentType(e.target.value as ContentTypeId)
                        }
                        className="w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-800 focus:outline-none"
                      >
                        {CONTENT_TYPES.map((ct) => (
                          <option key={ct.id} value={ct.id}>
                            {ct.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-neutral-600">
                        语气调性
                      </label>
                      <select
                        value={tone}
                        onChange={(e) => setTone(e.target.value as ToneId)}
                        className="w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-800 focus:outline-none"
                      >
                        {TONES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-neutral-600">
                        文章篇幅
                      </label>
                      <select
                        value={wordCount}
                        onChange={(e) =>
                          setWordCount(e.target.value as WordCountId)
                        }
                        className="w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-800 focus:outline-none"
                      >
                        {WORD_COUNTS.map((wc) => (
                          <option key={wc.id} value={wc.id}>
                            {wc.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="关键词（逗号分隔，可选）"
                      className="rounded-lg border border-neutral-200 bg-neutral-50/50 px-2.5 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:outline-none"
                    />
                    <input
                      type="text"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      placeholder="目标受众（可选）"
                      className="rounded-lg border border-neutral-200 bg-neutral-50/50 px-2.5 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white focus:outline-none"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Primary Action */}
          <button
            type="button"
            onClick={() => void handleRunWorkflow()}
            disabled={isRunning}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F6E5D] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0B5649] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{stageLabel[stage]}</span>
              </>
            ) : (
              <span>一键执行图文工作流</span>
            )}
          </button>
        </section>
      </div>

      {/* Right Column: Complete Assembled Document & Export */}
      <div className="lg:col-span-7">
        <AnimatePresence mode="wait">
          {!assembledDoc ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full min-h-[520px] flex-col items-center justify-center rounded-2xl border border-[#E8E6E1] bg-white p-8 text-center shadow-[0_1px_3px_rgba(24,24,27,0.04)]"
            >
              <div className="mb-3 h-10 w-10 rounded-xl bg-[#0F6E5D]/10 flex items-center justify-center">
                <span className="h-2.5 w-2.5 rounded-full bg-[#0F6E5D]" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900">
                图文文档工作区
              </h3>
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-zinc-500">
                填写主题并选择平台后点击「一键执行图文工作流」，生成后支持导出 Word、PDF 与 Markdown。
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="document"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Export & View Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-neutral-200/80 bg-white px-4 py-3 shadow-2xs">
                <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1">
                  <button
                    type="button"
                    onClick={() => setDocViewMode("preview")}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      docViewMode === "preview"
                        ? "bg-white text-neutral-900 shadow-2xs"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    图文预览
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocViewMode("edit")}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      docViewMode === "edit"
                        ? "bg-white text-neutral-900 shadow-2xs"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    编辑正文
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleExportDocx()}
                    disabled={isExportingDocx}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {isExportingDocx && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    导出 DOCX
                  </button>
                  <button
                    type="button"
                    onClick={() => exportDocumentAsPdf(assembledDoc)}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50"
                  >
                    导出 PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => exportDocumentAsMarkdown(assembledDoc)}
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50"
                  >
                    导出 MD
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopyFullText()}
                    className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-800"
                  >
                    {copiedFull ? "已复制" : "复制全文"}
                  </button>
                </div>
              </div>

              {/* Collapsible Insights & Candidate Titles */}
              {(assembledDoc.trendInsights || candidateTitles.length > 0) && (
                <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setInsightsExpanded((v) => !v)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-xs"
                  >
                    <span className="font-semibold text-neutral-800">
                      爆款参考 &amp; 备选标题
                      {candidateTitles.length > 0 && ` (${candidateTitles.length})`}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-neutral-400 transition-transform ${
                        insightsExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {insightsExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-4 overflow-hidden border-t border-neutral-100 p-4"
                      >
                        {assembledDoc.trendInsights && (
                          <div className="rounded-xl border border-amber-200/70 bg-amber-50/40 p-3.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                                <span>抖音爆款检索摘要</span>
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-normal text-amber-800">
                                  {assembledDoc.trendInsights.sourceLabel}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => void handleRunWorkflow()}
                                disabled={isRunning}
                                className="text-[11px] font-medium text-amber-800 hover:underline"
                              >
                                重新检索生成
                              </button>
                            </div>
                            <p className="mt-1.5 text-xs text-amber-900/80">
                              {assembledDoc.trendInsights.summary}
                            </p>
                            {assembledDoc.trendInsights.hotKeywords.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {assembledDoc.trendInsights.hotKeywords.map((kw) => (
                                  <span
                                    key={kw}
                                    className="rounded-md bg-white/80 px-2 py-0.5 text-[11px] text-amber-900 ring-1 ring-amber-200/60"
                                  >
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {candidateTitles.length > 0 && (
                          <div>
                            <div className="mb-2 text-xs font-semibold text-neutral-700">
                              备选爆款标题（点击切换）
                            </div>
                            <div className="flex flex-wrap gap-1.5">
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
                                    className={`rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                                      active
                                        ? "bg-neutral-900 font-medium text-white"
                                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                                    }`}
                                  >
                                    {t}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Main Document Canvas */}
              <div className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-2xs">
                {docViewMode === "edit" ? (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-600">
                        文章标题
                      </label>
                      <input
                        type="text"
                        value={assembledDoc.title}
                        onChange={(e) =>
                          setAssembledDoc((prev) =>
                            prev ? { ...prev, title: e.target.value } : prev
                          )
                        }
                        className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-900 focus:border-neutral-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-600">
                        文章正文
                      </label>
                      <textarea
                        rows={14}
                        value={assembledDoc.body}
                        onChange={(e) =>
                          setAssembledDoc((prev) =>
                            prev ? { ...prev, body: e.target.value } : prev
                          )
                        }
                        className="w-full rounded-xl border border-neutral-200 p-3 text-sm leading-relaxed text-neutral-800 focus:border-neutral-400 focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <article className="space-y-4">
                    <header className="border-b border-neutral-100 pb-4">
                      <div className="mb-2 flex items-center gap-2 text-[11px] text-neutral-500">
                        <span className="rounded-full bg-neutral-900 px-2 py-0.5 font-medium text-white">
                          {assembledDoc.platformName}
                        </span>
                        <span>
                          {new Date(assembledDoc.createdAt).toLocaleString(
                            "zh-CN"
                          )}
                        </span>
                        {assembledDoc.images.length > 0 && (
                          <span>· 含 {assembledDoc.images.length} 张配图</span>
                        )}
                      </div>
                      <h1 className="text-lg font-bold leading-snug text-neutral-900">
                        {assembledDoc.title}
                      </h1>
                    </header>

                    <div className="space-y-4">
                      {documentBlocks.map((block, idx) =>
                        block.type === "paragraph" ? (
                          <p
                            key={idx}
                            className="whitespace-pre-wrap text-sm leading-7 text-neutral-800"
                          >
                            {block.text}
                          </p>
                        ) : (
                          <figure
                            key={block.image.id}
                            className="my-4 overflow-hidden rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-2"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={block.image.dataUrl}
                              alt={block.image.caption || block.image.name}
                              className="mx-auto max-h-80 rounded-lg object-contain"
                            />
                            {block.image.caption && (
                              <figcaption className="mt-2 text-center text-xs text-neutral-500">
                                {block.image.caption}
                              </figcaption>
                            )}
                          </figure>
                        )
                      )}
                    </div>

                    {assembledDoc.tags.length > 0 && (
                      <footer className="flex flex-wrap items-center gap-1.5 border-t border-neutral-100 pt-4">
                        {assembledDoc.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
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
    </div>
  );
}
