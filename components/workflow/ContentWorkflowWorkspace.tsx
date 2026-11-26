"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Check,
  FileImage,
  ImagePlus,
  Loader2,
  Lock,
  Play,
  ShieldCheck,
  SlidersHorizontal,
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
import { buildActivityContextPayload } from "@/lib/organization";
import { evaluatePublishReview } from "@/lib/publish-review";
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
import { RedactionAndReviewPanel } from "@/components/compliance/RedactionAndReviewPanel";
import type { Style2DPreset } from "@/store/useImageStudioStore";
import { useOrganizationStore } from "@/store/useOrganizationStore";
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
  { id: "ghibli", label: "绘本" },
  { id: "cel", label: "扁平" },
  { id: "watercolor", label: "水彩" },
];

const QUICK_TOPICS = [
  { label: "流浪猫绝育", text: "社区流浪猫绝育与领养倡议，呼吁邻里科学关爱" },
  { label: "乡村图书角", text: "乡村小学图书角募捐：一本书点亮孩子的阅读梦" },
  { label: "河道净滩", text: "周末河道净滩环保志愿活动招募，一起守护身边绿水" },
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

  // Architectural neutral photographic card backdrop
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(0, 0, 960, 600);

  // Subtle architectural grid
  ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= 960; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 600);
    ctx.stroke();
  }
  for (let y = 0; y <= 600; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(960, y);
    ctx.stroke();
  }

  // Top accent bar
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 960, 6);

  // Clean field-record document sheet
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(64, 72, 832, 456);

  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 72, 832, 456);

  // Header metadata inside sheet
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(65, 73, 830, 84);
  ctx.fillStyle = "#E2E8F0";
  ctx.fillRect(65, 157, 830, 1);

  ctx.fillStyle = accent;
  ctx.fillRect(100, 104, 4, 24);

  ctx.fillStyle = "#0F172A";
  ctx.font = "600 24px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(label, 118, 124);

  ctx.fillStyle = "#64748B";
  ctx.font = "500 13px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("FIELD ARCHIVE · SAMPLE DOCUMENT", 618, 121);

  // Structured ledger rows (includes realistic phone/ID for redaction testing)
  const rows = [
    ["档案编号", "EL-2026-0918"],
    ["现场联系人", "138-0000-5678"],
    ["物资核对状态", "已清点入库 · 待脱敏归档"],
    ["拍摄区域", "社区公益服务站点 A 区"],
  ];

  rows.forEach(([k, v], i) => {
    const y = 216 + i * 68;
    ctx.fillStyle = "#64748B";
    ctx.font = "500 15px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(k, 100, y);

    ctx.fillStyle = "#0F172A";
    ctx.font = "600 18px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(v, 280, y);

    if (i < rows.length - 1) {
      ctx.fillStyle = "#F1F5F9";
      ctx.fillRect(100, y + 24, 760, 1);
    }
  });

  return canvas.toDataURL("image/png");
}

type WorkflowStage =
  | "idle"
  | "processing-images"
  | "researching-trends"
  | "writing-copy"
  | "assembling"
  | "done";

function buildDocFromResult(
  result: CopywritingResult,
  images: WorkflowImageItem[]
): AssembledDocument {
  const platformMeta = PLATFORMS[result.platform] ?? PLATFORMS.douyin;
  return {
    title: result.titles[0] || result.topic,
    platform: result.platform,
    platformName: platformMeta.name,
    topic: result.topic,
    body: result.body,
    tags: result.tags,
    hook: result.hook,
    algorithmTips: result.tips?.length
      ? result.tips
      : platformMeta.algorithmTips,
    trendInsights: result.trendInsights,
    images: images.map((img) => ({
      id: img.id,
      name: img.name,
      caption: img.caption,
      dataUrl: img.processedUrl,
      width: img.width,
      height: img.height,
    })),
    createdAt: new Date(result.createdAt).getTime() || Date.now(),
  };
}

export function ContentWorkflowWorkspace() {
  const {
    modelConfig,
    platform,
    contentType,
    tone,
    wordCount,
    topic,
    keywords,
    targetAudience,
    selectedActivityId,
    currentResult,
    setPlatform,
    setContentType,
    setTone,
    setWordCount,
    setTopic,
    setKeywords,
    setTargetAudience,
    setSelectedActivityId,
    setCurrentResult,
    updateCurrentResultPatch,
    updateCurrentRedactionRecords,
    updateCurrentReviewState,
    addToHistory,
  } = useWorkbenchStore();

  const { profile: orgProfile, activities } = useOrganizationStore();

  const selectedActivity = useMemo(
    () => activities.find((a) => a.id === selectedActivityId) ?? null,
    [activities, selectedActivityId]
  );

  const linkedResultActivity = useMemo(() => {
    const id = currentResult?.activityId ?? selectedActivityId;
    if (!id) return null;
    return activities.find((a) => a.id === id) ?? null;
  }, [activities, currentResult?.activityId, selectedActivityId]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [images, setImages] = useState<WorkflowImageItem[]>([]);
  const [stage, setStage] = useState<WorkflowStage>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [docViewMode, setDocViewMode] = useState<"preview" | "edit">("preview");
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [titlesExpanded, setTitlesExpanded] = useState(false);

  const candidateTitles = useMemo(
    () => currentResult?.titles ?? [],
    [currentResult]
  );

  const assembledDoc = useMemo<AssembledDocument | null>(
    () => (currentResult ? buildDocFromResult(currentResult, images) : null),
    [currentResult, images]
  );

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
            redactCategories: ["text"],
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
      "#1D4ED8"
    );
    const sample2 = createSampleImageDataUrl(
      "物资捐赠清单 · 图书角",
      "#0F172A"
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
        redactCategories: ["text"],
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
        redactCategories: ["text"],
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

      setStage("researching-trends");
      let trendInsights: DouyinTrendInsights | undefined;
      try {
        const trendRes = await fetch("/api/douyin-trends", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform,
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

      const activityContext = buildActivityContextPayload(
        orgProfile,
        selectedActivity
      );

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
          activityContext,
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

      const enrichedResult: CopywritingResult = {
        ...result,
        topic: effectiveTopic,
        trendInsights: finalTrends,
      };

      setStage("assembling");
      setCurrentResult(enrichedResult);
      addToHistory(enrichedResult);
      setStage("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "执行失败");
      setStage("idle");
    }
  };

  const handleTitleChange = (nextTitle: string) => {
    if (currentResult) {
      const nextTitles =
        currentResult.titles.length > 0
          ? [nextTitle, ...currentResult.titles.slice(1)]
          : [nextTitle];
      updateCurrentResultPatch({ titles: nextTitles });
    }
  };

  const handleBodyChange = (nextBody: string) => {
    if (currentResult) {
      updateCurrentResultPatch({ body: nextBody });
    }
  };

  const unredactedImageCount = useMemo(
    () => images.filter((img) => !img.enableRedact).length,
    [images]
  );

  const reviewReport = useMemo(() => {
    if (!assembledDoc) return null;
    return evaluatePublishReview({
      title: assembledDoc.title,
      hook: assembledDoc.hook ?? "",
      body: assembledDoc.body,
      orgRedlines: orgProfile.complianceRedlines,
      unredactedImageCount,
      redactionRecords: currentResult?.redactionRecords,
      reviewState: currentResult?.reviewState,
    });
  }, [
    assembledDoc,
    orgProfile.complianceRedlines,
    unredactedImageCount,
    currentResult?.redactionRecords,
    currentResult?.reviewState,
  ]);

  const handleExportDocx = async () => {
    if (!assembledDoc || (reviewReport && !reviewReport.isEligible)) return;
    setIsExportingDocx(true);
    try {
      await exportDocumentAsDocx(assembledDoc);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleCopyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore
    }
  };

  const handleCopyFullText = () => {
    if (!assembledDoc || (reviewReport && !reviewReport.isEligible)) return;
    const text = [
      assembledDoc.title,
      assembledDoc.hook ? `\n${assembledDoc.hook}` : "",
      assembledDoc.body ? `\n${assembledDoc.body}` : "",
      currentResult?.cta ? `\n${currentResult.cta}` : "",
      assembledDoc.tags.length > 0
        ? `\n${assembledDoc.tags.map((t) => `#${t.replace(/^#/, "")}`).join(" ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
    void handleCopyText(text, "full");
  };

  const isRunning =
    stage === "processing-images" ||
    stage === "researching-trends" ||
    stage === "writing-copy" ||
    stage === "assembling";

  const activePlatformMeta = PLATFORMS[platform] ?? PLATFORMS.douyin;
  const pipelineSteps: { id: WorkflowStage; num: string; label: string }[] =
    images.length > 0
      ? [
          { id: "processing-images", num: "01", label: "配图处理" },
          {
            id: "researching-trends",
            num: "02",
            label: `${activePlatformMeta.name}调研`,
          },
          { id: "writing-copy", num: "03", label: "撰文" },
          { id: "assembling", num: "04", label: "成稿" },
        ]
      : [
          {
            id: "researching-trends",
            num: "01",
            label: `${activePlatformMeta.name}调研`,
          },
          { id: "writing-copy", num: "02", label: "撰文" },
          { id: "assembling", num: "03", label: "成稿" },
        ];

  const activeStepIdx = pipelineSteps.findIndex((s) => s.id === stage);
  const documentBlocks = assembledDoc ? buildDocumentBlocks(assembledDoc) : [];

  const docPlatformMeta = assembledDoc
    ? PLATFORMS[assembledDoc.platform] ?? PLATFORMS.douyin
    : activePlatformMeta;
  const matchedTrendInsights =
    assembledDoc?.trendInsights &&
    (!assembledDoc.trendInsights.platform ||
      assembledDoc.trendInsights.platform === assembledDoc.platform)
      ? assembledDoc.trendInsights
      : undefined;

  return (
    <div className="space-y-5">
      {/* Top Page Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
        <h1 className="text-lg font-semibold tracking-tight text-[#111827]">
          内容创作
        </h1>

        <ol className="flex items-center gap-4 sm:gap-5">
          {pipelineSteps.map((step, idx) => {
            const isActive = stage === step.id;
            const isCompleted =
              stage === "done" || (activeStepIdx > idx && activeStepIdx !== -1);
            return (
              <li
                key={step.id}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  isActive
                    ? "font-semibold text-[#1D4ED8]"
                    : isCompleted
                      ? "text-[#0F172A]"
                      : "text-slate-400"
                }`}
              >
                <span className="font-mono text-[10px]">
                  {isCompleted ? (
                    <Check className="h-3 w-3 text-[#1D4ED8]" />
                  ) : (
                    step.num
                  )}
                </span>
                <span>{step.label}</span>
              </li>
            );
          })}
        </ol>
      </header>

      {/* Primary Structured Composer Panel */}
      <section className="divide-y divide-[#F1F5F9] rounded-lg border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        {/* Row 1: Activity Archive Context Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F8FAFC] px-4 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <Building2 className="h-3.5 w-3.5 text-[#1D4ED8]" />
              <span>关联活动档案</span>
            </span>
            <select
              value={selectedActivityId ?? ""}
              onChange={(e) => {
                const nextId = e.target.value || null;
                setSelectedActivityId(nextId);
                const found = activities.find((a) => a.id === nextId);
                if (found) {
                  setTopic(found.title);
                  setContentType(found.category);
                }
              }}
              className="max-w-[300px] rounded-md border border-[#D5DAE2] bg-white px-2.5 py-1 text-xs text-[#0F172A] outline-none transition focus:border-[#1D4ED8]"
            >
              <option value="">不关联（仅读取机构基础档案）</option>
              {activities.map((act) => (
                <option key={act.id} value={act.id}>
                  {act.title}（{act.date}）
                </option>
              ))}
            </select>
            {selectedActivity && (
              <span className="text-[11px] text-slate-500">
                已载入：
                {selectedActivity.participantCount || selectedActivity.location}
              </span>
            )}
          </div>
          <Link
            href="/organization"
            className="text-[11px] font-medium text-slate-500 transition hover:text-[#1D4ED8] hover:underline"
          >
            管理机构档案
          </Link>
        </div>

        {/* Row 2: Main Topic Input + Platform Selector + Action */}
        <div className="space-y-3 p-4">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-md border border-[#D5DAE2] bg-white px-3 py-1.5 transition focus-within:border-[#1D4ED8] focus-within:ring-2 focus-within:ring-[#1D4ED8]/10">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={`输入${activePlatformMeta.name}创作主题...`}
                className="w-full bg-transparent text-sm text-[#0F172A] outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={handleAutoSelectTopic}
                className="shrink-0 rounded border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-[#0F172A]"
              >
                自动匹配
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Platform Segmented Control */}
              <div className="flex items-center gap-0.5 rounded-md border border-[#E2E8F0] bg-[#F1F5F9] p-0.5">
                {(Object.keys(PLATFORMS) as PlatformId[]).map((pid) => {
                  const meta = PLATFORMS[pid];
                  const active = platform === pid;
                  return (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => setPlatform(pid)}
                      className={`rounded-[5px] px-2.5 py-1 text-xs font-medium transition ${
                        active
                          ? "bg-white text-[#0F172A] shadow-2xs"
                          : "text-slate-500 hover:text-[#0F172A]"
                      }`}
                    >
                      {meta.name}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setOptionsExpanded((v) => !v)}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition ${
                  optionsExpanded
                    ? "border-[#0F172A] bg-[#0F172A] text-white"
                    : "border-[#E2E8F0] bg-white text-slate-600 hover:bg-slate-50 hover:text-[#0F172A]"
                }`}
                title="高级参数"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => void handleRunWorkflow()}
                disabled={isRunning}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-[#1D4ED8] px-4 text-xs font-medium text-white shadow-2xs transition hover:bg-[#1E40AF] disabled:opacity-60"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>
                      {stage === "processing-images"
                        ? "处理配图"
                        : stage === "researching-trends"
                          ? `调研${activePlatformMeta.name}`
                          : "撰稿中"}
                    </span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 fill-current" />
                    <span>
                      {images.length > 0 ? "一键生成图文" : "生成推流文案"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Topic Presets + Platform Spec */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400">快速主题：</span>
              {QUICK_TOPICS.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => setTopic(sample.text)}
                  className="rounded border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[11px] text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-[#0F172A]"
                >
                  {sample.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-400">
              {activePlatformMeta.name} · {activePlatformMeta.tagline}（建议{" "}
              {activePlatformMeta.recommendedLength}）
            </span>
          </div>

          {/* Collapsible Advanced Options */}
          <AnimatePresence initial={false}>
            {optionsExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.14 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-2.5 border-t border-[#F1F5F9] pt-3 sm:grid-cols-5">
                  <select
                    value={contentType}
                    onChange={(e) =>
                      setContentType(e.target.value as ContentTypeId)
                    }
                    className="rounded-md border border-[#D5DAE2] bg-white px-2.5 py-1.5 text-xs text-[#0F172A] outline-none focus:border-[#1D4ED8]"
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
                    className="rounded-md border border-[#D5DAE2] bg-white px-2.5 py-1.5 text-xs text-[#0F172A] outline-none focus:border-[#1D4ED8]"
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
                    className="rounded-md border border-[#D5DAE2] bg-white px-2.5 py-1.5 text-xs text-[#0F172A] outline-none focus:border-[#1D4ED8]"
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
                    placeholder="核心关键词"
                    className="rounded-md border border-[#D5DAE2] bg-white px-2.5 py-1.5 text-xs text-[#0F172A] outline-none placeholder:text-slate-400 focus:border-[#1D4ED8]"
                  />
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="目标受众"
                    className="rounded-md border border-[#D5DAE2] bg-white px-2.5 py-1.5 text-xs text-[#0F172A] outline-none placeholder:text-slate-400 focus:border-[#1D4ED8]"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {errorMsg && <p className="text-xs text-rose-600">{errorMsg}</p>}
        </div>

        {/* Row 3: Optional Attachable Image Strip */}
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
          className={`transition ${
            images.length === 0 ? "px-4 py-2.5" : "p-3.5"
          } ${isDragging ? "bg-[#EFF6FF]/60 ring-2 ring-inset ring-[#1D4ED8]" : "bg-[#FAFBFD]"}`}
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

          {images.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <ImagePlus className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-medium text-[#0F172A]">附加配图</span>
                <span className="text-slate-400">
                  可选 · 支持拖拽上传，自动隐私打码与 2D 风格化
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md border border-[#D5DAE2] bg-white px-2.5 py-1 text-xs font-medium text-[#0F172A] transition hover:border-[#0F172A] hover:bg-[#0F172A] hover:text-white"
                >
                  添加配图
                </button>
                <button
                  type="button"
                  onClick={handleLoadSamples}
                  className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-[#0F172A]"
                >
                  <FileImage className="h-3 w-3 text-slate-400" />
                  <span>载入示例图</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 overflow-x-auto">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-[#CBD5E1] bg-white text-slate-500 transition hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
              >
                <ImagePlus className="h-4 w-4" />
                <span className="text-[11px] font-medium">继续加图</span>
              </button>

              {images.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex h-24 shrink-0 items-center gap-2.5 rounded-md border border-[#E2E8F0] bg-white p-2 pr-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.processedUrl}
                    alt={item.name}
                    className="h-20 w-20 shrink-0 rounded border border-[#E2E8F0] object-cover"
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
                        className="w-full truncate bg-transparent text-xs font-medium text-[#0F172A] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeImageItem(item.id)}
                        className="rounded p-0.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
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
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition ${
                          item.enableRedact
                            ? "bg-[#0F172A] text-white"
                            : "bg-slate-100 text-slate-500 hover:text-slate-700"
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
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition ${
                          item.enableStylize
                            ? "bg-[#1D4ED8] text-white"
                            : "bg-slate-100 text-slate-500 hover:text-slate-700"
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
                          className="rounded border border-[#E2E8F0] bg-[#F8FAFC] px-1 py-0.5 text-[10px] text-slate-700 outline-none"
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
                className="shrink-0 rounded-md bg-[#0F172A] px-3 py-2 text-[11px] font-medium text-white transition hover:bg-slate-800 disabled:opacity-40"
              >
                预览处理
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Editorial Publication Canvas + Compliance & Research Rail */}
      <AnimatePresence mode="wait">
        {!assembledDoc ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-[#CBD5E1] bg-white/60 text-center"
          >
            <div className="h-6 w-px bg-[#CBD5E1]" />
            <p className="mt-3 text-sm font-medium text-slate-500">
              成稿将在此呈现
            </p>
            <p className="mt-1 text-xs text-slate-400">
              选择活动档案或输入主题，点击「生成推流文案」启动创作流程
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="document"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12"
          >
            {/* Main Publication Column (8 cols) */}
            <div className="space-y-3.5 lg:col-span-8">
              {/* Document Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-0.5 rounded-md border border-[#E2E8F0] bg-[#F1F5F9] p-0.5">
                  <button
                    type="button"
                    onClick={() => setDocViewMode("preview")}
                    className={`rounded-[5px] px-3 py-1 text-xs font-medium transition ${
                      docViewMode === "preview"
                        ? "bg-white text-[#0F172A] shadow-2xs"
                        : "text-slate-500 hover:text-[#0F172A]"
                    }`}
                  >
                    预览
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocViewMode("edit")}
                    className={`rounded-[5px] px-3 py-1 text-xs font-medium transition ${
                      docViewMode === "edit"
                        ? "bg-white text-[#0F172A] shadow-2xs"
                        : "text-slate-500 hover:text-[#0F172A]"
                    }`}
                  >
                    编辑
                  </button>
                  {candidateTitles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setTitlesExpanded((v) => !v)}
                      className={`rounded-[5px] px-3 py-1 text-xs font-medium transition ${
                        titlesExpanded
                          ? "bg-[#0F172A] text-white"
                          : "text-slate-500 hover:text-[#0F172A]"
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
                    disabled={
                      isExportingDocx ||
                      Boolean(reviewReport && !reviewReport.isEligible)
                    }
                    title={
                      reviewReport && !reviewReport.isEligible
                        ? "完成右侧「发布前审查」获得发布资格后解锁导出"
                        : "导出 DOCX"
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isExportingDocx && (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    )}
                    DOCX
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (reviewReport && !reviewReport.isEligible) return;
                      exportDocumentAsPdf(assembledDoc);
                    }}
                    disabled={Boolean(reviewReport && !reviewReport.isEligible)}
                    className="rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (reviewReport && !reviewReport.isEligible) return;
                      exportDocumentAsMarkdown(assembledDoc);
                    }}
                    disabled={Boolean(reviewReport && !reviewReport.isEligible)}
                    className="rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    MD
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyFullText}
                    disabled={Boolean(reviewReport && !reviewReport.isEligible)}
                    title={
                      reviewReport && !reviewReport.isEligible
                        ? "完成右侧「发布前审查」获得发布资格后解锁复制"
                        : "已获发布资格，复制全文去外部平台发布"
                    }
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                      reviewReport?.isEligible
                        ? "bg-[#1D4ED8] text-white hover:bg-[#1E40AF]"
                        : "cursor-not-allowed border border-[#E2E8F0] bg-[#F1F5F9] text-slate-500"
                    }`}
                  >
                    {reviewReport?.isEligible ? (
                      copiedKey === "full" ? (
                        <Check className="h-3 w-3 text-emerald-300" />
                      ) : (
                        <ShieldCheck className="h-3 w-3" />
                      )
                    ) : (
                      <Lock className="h-3 w-3" />
                    )}
                    <span>
                      {reviewReport?.isEligible
                        ? copiedKey === "full"
                          ? "已复制"
                          : "已获资格 · 复制全文"
                        : "审查通过后解锁"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Expandable Candidate Titles Strip */}
              <AnimatePresence initial={false}>
                {titlesExpanded && candidateTitles.length > 0 && (
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
                          onClick={() => handleTitleChange(t)}
                          className={`rounded-md border px-2.5 py-1 text-xs transition ${
                            active
                              ? "border-[#1D4ED8] bg-[#EFF6FF] font-medium text-[#1D4ED8]"
                              : "border-[#E2E8F0] bg-white text-slate-600 hover:border-slate-300 hover:text-[#0F172A]"
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
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-9">
                {docViewMode === "edit" ? (
                  <div className="space-y-5">
                    <input
                      type="text"
                      value={assembledDoc.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      className="w-full border-b border-[#E2E8F0] pb-3 font-editorial text-2xl font-semibold text-[#0F172A] outline-none focus:border-[#1D4ED8]"
                    />
                    <textarea
                      rows={16}
                      value={assembledDoc.body}
                      onChange={(e) => handleBodyChange(e.target.value)}
                      className="w-full resize-y bg-transparent text-[15px] leading-8 text-slate-800 outline-none"
                    />
                  </div>
                ) : (
                  <article className="space-y-6">
                    <header className="space-y-3 border-b border-[#F1F5F9] pb-5">
                      <div className="flex items-center gap-2.5 text-[11px] text-slate-400">
                        <span className="rounded bg-[#0F172A] px-2 py-0.5 font-medium text-white">
                          {assembledDoc.platformName}
                        </span>
                        <span className="font-mono tabular-nums">
                          {assembledDoc.body.length} 字
                        </span>
                        <span className="font-mono tabular-nums">
                          {new Date(assembledDoc.createdAt).toLocaleString(
                            "zh-CN"
                          )}
                        </span>
                      </div>
                      <h2 className="font-editorial text-2xl font-semibold leading-snug text-[#0F172A] sm:text-[28px]">
                        {assembledDoc.title}
                      </h2>
                    </header>

                    {assembledDoc.hook && (
                      <div className="border-l-2 border-[#1D4ED8] bg-[#F8FAFC] py-2.5 pl-4 pr-3">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#1D4ED8]">
                            {assembledDoc.platform === "douyin"
                              ? "前 3 秒钩子"
                              : "黄金开头"}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              void handleCopyText(assembledDoc.hook!, "hook")
                            }
                            className="text-[11px] text-slate-400 transition hover:text-[#0F172A]"
                          >
                            {copiedKey === "hook" ? "已复制" : "复制"}
                          </button>
                        </div>
                        <p className="text-[15px] font-medium leading-relaxed text-[#0F172A]">
                          {assembledDoc.hook}
                        </p>
                      </div>
                    )}

                    <div className="space-y-5">
                      {documentBlocks.map((block, idx) =>
                        block.type === "paragraph" ? (
                          <p
                            key={idx}
                            className="whitespace-pre-wrap text-[15px] leading-8 text-slate-800"
                          >
                            {block.text}
                          </p>
                        ) : (
                          <figure key={block.image.id} className="my-6">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={block.image.dataUrl}
                              alt={block.image.caption || block.image.name}
                              className="mx-auto max-h-96 rounded-md border border-[#E2E8F0] object-contain"
                            />
                            {block.image.caption && (
                              <figcaption className="mt-2 text-center text-xs text-slate-400">
                                {block.image.caption}
                              </figcaption>
                            )}
                          </figure>
                        )
                      )}
                    </div>

                    {assembledDoc.tags.length > 0 && (
                      <footer className="flex flex-wrap items-center gap-2 border-t border-[#F1F5F9] pt-5">
                        {assembledDoc.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-[#EFF6FF] px-2 py-0.5 text-xs font-medium text-[#1D4ED8]"
                          >
                            #{tag.replace(/^#/, "")}
                          </span>
                        ))}
                      </footer>
                    )}
                  </article>
                )}
              </div>
            </div>

            {/* Right 4 Cols: Compliance Review + Text Redaction + Platform Research */}
            <aside className="space-y-4 lg:col-span-4 lg:pt-11">
              <RedactionAndReviewPanel
                title={assembledDoc.title}
                hook={assembledDoc.hook ?? ""}
                body={assembledDoc.body}
                onApplyTextChange={({
                  title: nextTitle,
                  hook: nextHook,
                  body: nextBody,
                }) => {
                  if (currentResult) {
                    const nextTitles =
                      currentResult.titles.length > 0
                        ? [nextTitle, ...currentResult.titles.slice(1)]
                        : [nextTitle];
                    updateCurrentResultPatch({
                      titles: nextTitles,
                      hook: nextHook,
                      body: nextBody,
                    });
                  }
                }}
                activity={linkedResultActivity}
                orgRedlines={orgProfile.complianceRedlines}
                unredactedImageCount={unredactedImageCount}
                redactionRecords={currentResult?.redactionRecords ?? []}
                onChangeRedactionRecords={updateCurrentRedactionRecords}
                reviewState={currentResult?.reviewState}
                onChangeReviewState={updateCurrentReviewState}
              />

              {matchedTrendInsights && (
                <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#0F172A]">
                      {docPlatformMeta.name}调研参考
                    </span>
                    <span className="rounded bg-[#EFF6FF] px-1.5 py-0.5 text-[10px] font-medium text-[#1D4ED8]">
                      {matchedTrendInsights.sourceLabel}
                    </span>
                  </div>
                  <p className="mb-3 text-xs leading-relaxed text-slate-500">
                    {matchedTrendInsights.summary}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {matchedTrendInsights.hotKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="rounded border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[11px] text-slate-700"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {currentResult?.cta && (
                <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                  <span className="mb-1.5 block text-xs font-semibold text-[#0F172A]">
                    互动引导
                  </span>
                  <p className="text-xs leading-relaxed text-slate-600">
                    {currentResult.cta}
                  </p>
                </div>
              )}

              {assembledDoc.algorithmTips.length > 0 && (
                <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                  <span className="mb-2 block text-xs font-semibold text-[#0F172A]">
                    {docPlatformMeta.name}发布建议
                  </span>
                  <ul className="space-y-1.5">
                    {assembledDoc.algorithmTips.map((tip, i) => (
                      <li
                        key={i}
                        className="text-xs leading-relaxed text-slate-500"
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
