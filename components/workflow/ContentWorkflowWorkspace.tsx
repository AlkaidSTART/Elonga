"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Check,
  ChevronDown,
  Eye,
  FileImage,
  ImagePlus,
  Loader2,
  Lock,
  PanelRightOpen,
  Play,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import {
  CONTENT_TYPES,
  PLATFORMS,
  TONES,
  WORD_COUNTS,
  type ContentTypeId,
  type CopywritingResult,
  type ToneId,
  type WordCountId,
} from "@/lib/platforms";
import { buildActivityContextPayload } from "@/lib/organization";
import { evaluatePublishReview } from "@/lib/publish-review";
import { isAllowedRasterImageType } from "@/lib/url-safety";
import type { DouyinTrendInsights } from "@/lib/skills/types";
import { getPlatformWritingSkill } from "@/lib/skills/platform-writing-skills";
import { processWorkflowImage } from "@/lib/workflow-image-processor";
import {
  buildPublishableBody,
  buildPublishableFullText,
  getPlatformOptionList,
  getPlatformTriggerMeta,
  getWorkflowOptionsSummary,
  resolvePreviewOpenAfterGeneration,
  resolveWorkflowLayoutState,
} from "@/lib/workflow-view";
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
  "idle" | "processing-images" | "researching-trends" | "writing-copy" | "assembling" | "done";

function buildDocFromResult(
  result: CopywritingResult,
  images: WorkflowImageItem[],
): AssembledDocument {
  const platformMeta = PLATFORMS[result.platform] ?? PLATFORMS.douyin;
  const fullBody = buildPublishableBody({
    hook: result.hook,
    body: result.body,
    cta: result.cta,
  });
  return {
    title: result.titles[0] || result.topic,
    platform: result.platform,
    platformName: platformMeta.name,
    topic: result.topic,
    body: fullBody,
    tags: result.tags,
    algorithmTips: [],
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
    removeFromHistory,
  } = useWorkbenchStore();

  const { profile: orgProfile, activities } = useOrganizationStore();

  const selectedActivity = useMemo(
    () => activities.find((a) => a.id === selectedActivityId) ?? null,
    [activities, selectedActivityId],
  );

  const linkedResultActivity = useMemo(() => {
    const id = currentResult?.activityId ?? selectedActivityId;
    if (!id) return null;
    return activities.find((a) => a.id === id) ?? null;
  }, [activities, currentResult?.activityId, selectedActivityId]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const platformMenuRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [images, setImages] = useState<WorkflowImageItem[]>([]);
  const [stage, setStage] = useState<WorkflowStage>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [docViewMode, setDocViewMode] = useState<"preview" | "edit">("preview");
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [platformMenuOpen, setPlatformMenuOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [titlesExpanded, setTitlesExpanded] = useState(false);
  const [rightTab, setRightTab] = useState<"manuscript" | "compliance">("manuscript");

  useEffect(() => {
    if (!platformMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (platformMenuRef.current && !platformMenuRef.current.contains(event.target as Node)) {
        setPlatformMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPlatformMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [platformMenuOpen]);

  const candidateTitles = useMemo(() => currentResult?.titles ?? [], [currentResult]);

  const assembledDoc = useMemo<AssembledDocument | null>(
    () => (currentResult ? buildDocFromResult(currentResult, images) : null),
    [currentResult, images],
  );

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    Array.from(fileList).forEach((file) => {
      if (!isAllowedRasterImageType(file.type)) return;
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
    const sample1 = createSampleImageDataUrl("公益活动现场 · 社区志愿角", "#1D4ED8");
    const sample2 = createSampleImageDataUrl("物资捐赠清单 · 图书角", "#0F172A");
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

  const updateImageItem = (id: string, patch: Partial<WorkflowImageItem>) => {
    setImages((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
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
      preset.matchHints.some((hint) => combinedNames.includes(hint)),
    );
    const chosen =
      matched ?? AUTO_TOPIC_PRESETS[Math.floor(Math.random() * AUTO_TOPIC_PRESETS.length)];

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
          modelConfig,
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
      port: modelConfig.textPort,
      endpointPath: modelConfig.textEndpointPath,
      apiFormat: modelConfig.textApiFormat,
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

      const activityContext = buildActivityContextPayload(orgProfile, selectedActivity);

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
      const finalTrends = (copyData.trendInsights ?? trendInsights ?? result.trendInsights) as
        DouyinTrendInsights | undefined;

      const enrichedResult: CopywritingResult = {
        ...result,
        topic: effectiveTopic,
        trendInsights: finalTrends,
      };

      setStage("assembling");
      setCurrentResult(enrichedResult);
      addToHistory(enrichedResult);
      setIsPreviewOpen((prev) => resolvePreviewOpenAfterGeneration(prev));
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
      updateCurrentResultPatch({ body: nextBody, hook: "", cta: "" });
    }
  };

  const handleDeleteManuscript = () => {
    if (currentResult?.id) {
      removeFromHistory(currentResult.id);
    }
    setCurrentResult(null);
    setIsPreviewOpen(false);
    setStage("idle");
    setTitlesExpanded(false);
    setDocViewMode("preview");
    setRightTab("manuscript");
  };

  const unredactedImageCount = useMemo(
    () => images.filter((img) => !img.enableRedact).length,
    [images],
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
    const text = buildPublishableFullText({
      title: assembledDoc.title,
      body: assembledDoc.body,
      tags: assembledDoc.tags,
    });
    void handleCopyText(text, "full");
  };

  const isRunning =
    stage === "processing-images" ||
    stage === "researching-trends" ||
    stage === "writing-copy" ||
    stage === "assembling";

  const activePlatformMeta = getPlatformTriggerMeta(platform);
  const activePlatformSkill = getPlatformWritingSkill(platform);
  const platformOptions = useMemo(() => getPlatformOptionList(), []);
  const layoutState = resolveWorkflowLayoutState({
    hasDocument: Boolean(assembledDoc),
    isPreviewOpen,
  });
  const optionsSummary = useMemo(
    () =>
      getWorkflowOptionsSummary({
        selectedActivityTitle: selectedActivity?.title,
        contentType,
        tone,
        wordCount,
        targetAudience,
        keywords,
      }),
    [selectedActivity?.title, contentType, tone, wordCount, targetAudience, keywords],
  );
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

  return (
    <div className="space-y-8">
      {/* Top Page Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#181816]/15 pb-5">
        <div>
          <h1 className="font-editorial text-2xl font-semibold tracking-tight text-[#181816]">
            内容创作
          </h1>
          <p className="mt-1 text-xs text-[#78716C]">
            输入主题并在输入框内选择传播渠道，生成后按需展开样稿预览、合规脱敏与导出
          </p>
        </div>

        <div className="flex items-center gap-4">
          {isRunning && (
            <ol className="flex items-center gap-4 sm:gap-5">
              {pipelineSteps.map((step, idx) => {
                const isActive = stage === step.id;
                const isCompleted = activeStepIdx > idx && activeStepIdx !== -1;
                return (
                  <li
                    key={step.id}
                    className={`flex items-center gap-1.5 text-xs transition-colors ${
                      isActive
                        ? "font-semibold text-[#1B4D3E]"
                        : isCompleted
                          ? "text-[#181816]"
                          : "text-[#8C857B]"
                    }`}
                  >
                    <span className="font-mono text-[10px] tabular-nums">
                      {isCompleted ? <Check className="h-3 w-3 text-[#1B4D3E]" /> : step.num}
                    </span>
                    <span>{step.label}</span>
                  </li>
                );
              })}
            </ol>
          )}

          {!isRunning && layoutState.showPreviewTrigger && !layoutState.showPreviewPanel && (
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 rounded bg-[#1B4D3E] px-4 py-2 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F]"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>预览样稿</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace: Solo Centered Composer -> Split Desk When Preview Opens */}
      <div
        className={
          layoutState.showPreviewPanel
            ? "grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-0 lg:divide-x lg:divide-[#E2DDD3]"
            : "mx-auto w-full max-w-3xl"
        }
      >
        {/* COMPOSER COLUMN */}
        <motion.section
          layout
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className={
            layoutState.showPreviewPanel ? "space-y-4 lg:col-span-5 lg:pr-9" : "space-y-4 py-4"
          }
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

          {/* Unified Editorial Composer Box */}
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
            className={`rounded-lg border transition-colors ${
              isDragging
                ? "border-[#1B4D3E] bg-[#E9F0ED]/35"
                : "border-[#D5CFC3] bg-[#FCFBF8] focus-within:border-[#1B4D3E]"
            }`}
          >
            {/* Linked Activity Pill (only when selected) */}
            {selectedActivity && (
              <div className="flex items-center justify-between gap-2 border-b border-[#E2DDD3] bg-[#F6F4EF]/70 px-4 py-2 text-[11px] text-[#57534E]">
                <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-[#1B4D3E]" />
                  <span className="truncate font-medium text-[#181816]">
                    已关联档案：{selectedActivity.title}
                  </span>
                  {(selectedActivity.participantCount || selectedActivity.location) && (
                    <span className="hidden truncate text-[#8C857B] sm:inline">
                      · {selectedActivity.participantCount || selectedActivity.location}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedActivityId(null)}
                  className="shrink-0 rounded p-0.5 text-[#8C857B] transition hover:text-[#181816]"
                  aria-label="取消关联档案"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Primary Topic Input */}
            <div className="px-4 pt-4 pb-2">
              <textarea
                rows={layoutState.showPreviewPanel ? 4 : 5}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={`写下本次${activePlatformMeta.name}创作主题、现场故事或核心诉求...（支持直接拖拽配图到此输入框）`}
                className="w-full resize-none bg-transparent text-sm leading-relaxed text-[#181816] outline-none placeholder:text-[#A8A29E]"
              />
            </div>

            {/* Attached Images Strip (only when images exist) */}
            {images.length > 0 && (
              <div className="space-y-2 border-t border-[#E2DDD3] bg-[#F6F4EF]/45 px-4 py-3">
                {images.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2.5 border-b border-[#E2DDD3] pb-2 last:border-b-0 last:pb-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.processedUrl}
                      alt={item.name}
                      className="h-11 w-11 shrink-0 rounded border border-[#E2DDD3] object-cover"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <input
                        type="text"
                        value={item.caption}
                        onChange={(e) => updateImageItem(item.id, { caption: e.target.value })}
                        placeholder="图注..."
                        className="w-full truncate bg-transparent text-xs font-medium text-[#181816] outline-none"
                      />
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
                              ? "bg-[#181816] text-[#FCFBF8]"
                              : "bg-[#EFECE4] text-[#78716C]"
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
                              ? "bg-[#1B4D3E] text-[#FCFBF8]"
                              : "bg-[#EFECE4] text-[#78716C]"
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
                            className="rounded border border-[#E2DDD3] bg-[#FCFBF8] px-1 py-0.5 text-[10px] text-[#57534E] outline-none"
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
                    <button
                      type="button"
                      onClick={() => removeImageItem(item.id)}
                      className="rounded p-1 text-[#8C857B] hover:text-[#B42318]"
                      aria-label="删除配图"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => void processAllImages()}
                  disabled={isRunning}
                  className="text-[11px] font-medium text-[#1B4D3E] hover:underline disabled:opacity-40"
                >
                  立即预览配图处理效果 →
                </button>
              </div>
            )}

            {/* Composer Bottom Toolbar: Platform Picker + Attachments + Options + Generate */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E2DDD3] px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {/* In-Input Platform Selector Popover */}
                <div ref={platformMenuRef} className="relative">
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={platformMenuOpen}
                    onClick={() => setPlatformMenuOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded border border-[#1B4D3E]/25 bg-[#E9F0ED] px-2.5 py-1.5 text-xs font-medium text-[#1B4D3E] transition hover:border-[#1B4D3E]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1B4D3E]" />
                    <span>{activePlatformMeta.name}</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${
                        platformMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {platformMenuOpen && (
                      <motion.div
                        role="listbox"
                        aria-label="选择传播渠道"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute bottom-full left-0 z-30 mb-2 w-72 rounded-md border border-[#E2DDD3] bg-[#FCFBF8] p-1.5 shadow-[0_14px_34px_-16px_rgba(24,24,22,0.22)]"
                      >
                        <div className="flex items-center justify-between border-b border-[#E2DDD3] px-2.5 py-1.5 text-[10px] text-[#8C857B]">
                          <span className="font-medium tracking-wider uppercase">传播渠道</span>
                          <span>建议 {activePlatformMeta.recommendedLength}</span>
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {platformOptions.map((meta) => {
                            const active = platform === meta.id;
                            return (
                              <button
                                key={meta.id}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => {
                                  setPlatform(meta.id);
                                  setPlatformMenuOpen(false);
                                }}
                                className={`flex w-full items-center justify-between gap-2 rounded px-2.5 py-2 text-left transition ${
                                  active
                                    ? "bg-[#E9F0ED] text-[#1B4D3E]"
                                    : "text-[#181816] hover:bg-[#EFECE4]/70"
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold">{meta.name}</div>
                                  <div className="truncate text-[10px] text-[#78716C]">
                                    {meta.tagline}
                                  </div>
                                </div>
                                {active && <Check className="h-3.5 w-3.5 shrink-0 text-[#1B4D3E]" />}
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-1.5 border-t border-[#E2DDD3] px-2.5 pt-2 pb-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-[#1B4D3E]">
                              已挂载：{activePlatformSkill.name}
                            </span>
                            <span className="font-mono text-[10px] tabular-nums text-[#8C857B]">
                              {activePlatformSkill.id}
                            </span>
                          </div>
                          <ul className="mt-1 space-y-1 text-[11px] leading-relaxed text-[#57534E]">
                            {activePlatformSkill.quickHighlights.map((tip) => (
                              <li key={tip} className="flex items-start gap-1.5">
                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#1B4D3E]/60" />
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Upload Field Photo Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded border border-transparent px-2.5 py-1.5 text-xs font-medium text-[#57534E] transition hover:bg-[#EFECE4] hover:text-[#181816]"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  <span className="font-mono tabular-nums">
                    {images.length > 0 ? `配图 (${images.length})` : "配图"}
                  </span>
                </button>

                {/* Collapsible Archive & Advanced Options Trigger */}
                <button
                  type="button"
                  onClick={() => setOptionsExpanded((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-medium transition ${
                    optionsExpanded
                      ? "border-[#D5CFC3] bg-[#EFECE4] text-[#181816]"
                      : "border-transparent text-[#57534E] hover:bg-[#EFECE4] hover:text-[#181816]"
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>档案与参数</span>
                  {optionsSummary.activeCount > 0 && (
                    <span className="rounded bg-[#FBF3EC] px-1.5 py-0.2 font-mono text-[10px] font-medium text-[#9A4A22] tabular-nums">
                      {optionsSummary.activeCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Primary Generate Button */}
              <button
                type="button"
                onClick={() => void handleRunWorkflow()}
                disabled={isRunning}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded bg-[#1B4D3E] px-4 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F] disabled:opacity-60"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>
                      {stage === "processing-images"
                        ? "处理配图..."
                        : stage === "researching-trends"
                          ? `调研${activePlatformMeta.name}...`
                          : "撰稿中..."}
                    </span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 fill-current" />
                    <span>{images.length > 0 ? "生成图文" : "生成文案"}</span>
                  </>
                )}
              </button>
            </div>

            {/* Collapsible Archive & Advanced Parameters Drawer Inside Composer */}
            <AnimatePresence initial={false}>
              {optionsExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden border-t border-[#E2DDD3] bg-[#F6F4EF]/65"
                >
                  <div className="space-y-3.5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-[#181816]">
                        <Building2 className="h-3.5 w-3.5 text-[#8C857B]" />
                        <span>关联活动档案与撰稿参数</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <button
                          type="button"
                          onClick={handleLoadSamples}
                          className="inline-flex items-center gap-1 text-[#78716C] transition hover:text-[#181816]"
                        >
                          <FileImage className="h-3 w-3" />
                          <span>载入示例配图</span>
                        </button>
                        <Link
                          href="/organization"
                          className="font-medium text-[#1B4D3E] hover:underline"
                        >
                          管理档案
                        </Link>
                      </div>
                    </div>

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
                      className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2.5 py-1.5 text-xs text-[#181816] outline-none transition focus:border-[#1B4D3E]"
                    >
                      <option value="">不关联活动（仅读取机构基础档案）</option>
                      {activities.map((act) => (
                        <option key={act.id} value={act.id}>
                          {act.title}（{act.date}）
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-2 gap-2.5">
                      <select
                        value={contentType}
                        onChange={(e) => setContentType(e.target.value as ContentTypeId)}
                        className="rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2.5 py-1.5 text-xs text-[#181816] outline-none focus:border-[#1B4D3E]"
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
                        className="rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2.5 py-1.5 text-xs text-[#181816] outline-none focus:border-[#1B4D3E]"
                      >
                        {TONES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={wordCount}
                        onChange={(e) => setWordCount(e.target.value as WordCountId)}
                        className="rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2.5 py-1.5 text-xs text-[#181816] outline-none focus:border-[#1B4D3E]"
                      >
                        {WORD_COUNTS.map((wc) => (
                          <option key={wc.id} value={wc.id}>
                            {wc.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        placeholder="目标受众"
                        className="rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2.5 py-1.5 text-xs text-[#181816] outline-none placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                      />
                      <input
                        type="text"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        placeholder="核心关键词（逗号分隔）"
                        className="col-span-2 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2.5 py-1.5 text-xs text-[#181816] outline-none placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Lightweight Quick Topics Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-[#8C857B]">试试选题：</span>
              {QUICK_TOPICS.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  onClick={() => setTopic(sample.text)}
                  className="rounded border border-[#E2DDD3] bg-[#FCFBF8] px-2 py-0.5 text-[11px] text-[#57534E] transition hover:border-[#1B4D3E] hover:text-[#1B4D3E]"
                >
                  {sample.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAutoSelectTopic}
              className="text-[11px] font-medium text-[#1B4D3E] hover:underline"
            >
              智能匹配选题
            </button>
          </div>

          {errorMsg && (
            <p className="border-l-2 border-[#B42318] bg-[#FDF2F2] px-3 py-2 text-xs text-[#B42318]">
              {errorMsg}
            </p>
          )}

          {/* Ready-to-Preview Strip (visible after generation while preview is collapsed) */}
          <AnimatePresence>
            {assembledDoc && !layoutState.showPreviewPanel && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-3 border-t-2 border-[#181816] border-x border-b border-x-[#E2DDD3] border-b-[#E2DDD3] bg-[#FCFBF8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#8C857B]">
                    <span className="rounded bg-[#E9F0ED] px-1.5 py-0.5 font-medium text-[#1B4D3E]">
                      {assembledDoc.platformName}
                    </span>
                    <span className="font-mono tabular-nums">{assembledDoc.body.length} 字</span>
                    <span>·</span>
                    <span>{reviewReport?.isEligible ? "已通过发布审查" : "待审校脱敏"}</span>
                  </div>
                  <p className="truncate font-editorial text-base font-semibold text-[#181816]">
                    {assembledDoc.title}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteManuscript}
                    className="inline-flex items-center justify-center gap-1.5 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 text-xs font-medium text-[#57534E] transition hover:border-[#B42318] hover:text-[#B42318]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>删除样稿</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 rounded bg-[#1B4D3E] px-4 py-2 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F]"
                  >
                    <PanelRightOpen className="h-3.5 w-3.5" />
                    <span>预览样稿</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* RIGHT COLUMN: Expanded Manuscript Preview (mounted only after user clicks Preview) */}
        <AnimatePresence>
          {layoutState.showPreviewPanel && assembledDoc && (
            <motion.section
              key="manuscript-preview-pane"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-5 lg:col-span-7 lg:pl-9"
            >
              {/* Right Stage Underline Tabs + Export Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DDD3]">
                <div className="flex items-center gap-5">
                  {(
                    [
                      { id: "manuscript", label: "完整文案" },
                      {
                        id: "compliance",
                        label: reviewReport?.isEligible ? "发布审查 ✓" : "发布审查与脱敏",
                      },
                    ] as const
                  ).map((t) => {
                    const active = rightTab === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setRightTab(t.id)}
                        className={`relative pb-3 text-xs font-medium transition ${
                          active ? "text-[#1B4D3E]" : "text-[#78716C] hover:text-[#181816]"
                        }`}
                      >
                        {t.label}
                        {active && (
                          <span className="absolute inset-x-0 -bottom-px h-[2px] bg-[#1B4D3E]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pb-2">
                  <button
                    type="button"
                    onClick={() => void handleExportDocx()}
                    disabled={
                      isExportingDocx || Boolean(reviewReport && !reviewReport.isEligible)
                    }
                    className="inline-flex items-center gap-1 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2 py-1 text-[11px] font-medium text-[#57534E] transition hover:border-[#181816] hover:text-[#181816] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isExportingDocx && <Loader2 className="h-3 w-3 animate-spin" />}
                    DOCX
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (reviewReport && !reviewReport.isEligible) return;
                      exportDocumentAsPdf(assembledDoc);
                    }}
                    disabled={Boolean(reviewReport && !reviewReport.isEligible)}
                    className="rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2 py-1 text-[11px] font-medium text-[#57534E] transition hover:border-[#181816] hover:text-[#181816] disabled:cursor-not-allowed disabled:opacity-45"
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
                    className="rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2 py-1 text-[11px] font-medium text-[#57534E] transition hover:border-[#181816] hover:text-[#181816] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    MD
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyFullText}
                    disabled={Boolean(reviewReport && !reviewReport.isEligible)}
                    className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium transition ${
                      reviewReport?.isEligible
                        ? "bg-[#1B4D3E] text-[#FCFBF8] hover:bg-[#143A2F]"
                        : "cursor-not-allowed border border-[#E2DDD3] bg-[#EFECE4] text-[#8C857B]"
                    }`}
                  >
                    {reviewReport?.isEligible ? (
                      copiedKey === "full" ? (
                        <Check className="h-3 w-3 text-[#86EFAC]" />
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
                          : "复制全文"
                        : "审查后解锁"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteManuscript}
                    className="inline-flex items-center gap-1 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2 py-1 text-[11px] font-medium text-[#57534E] transition hover:border-[#B42318] hover:text-[#B42318]"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>删除样稿</span>
                  </button>
                </div>
              </div>

              {/* Tab 1: Complete Publishable Copy */}
              {rightTab === "manuscript" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-0.5 rounded border border-[#E2DDD3] bg-[#EFECE4] p-0.5">
                      <button
                        type="button"
                        onClick={() => setDocViewMode("preview")}
                        className={`rounded-[3px] px-2.5 py-0.5 text-xs font-medium transition ${
                          docViewMode === "preview"
                            ? "bg-[#FCFBF8] text-[#181816]"
                            : "text-[#78716C]"
                        }`}
                      >
                        预览
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocViewMode("edit")}
                        className={`rounded-[3px] px-2.5 py-0.5 text-xs font-medium transition ${
                          docViewMode === "edit"
                            ? "bg-[#FCFBF8] text-[#181816]"
                            : "text-[#78716C]"
                        }`}
                      >
                        编辑
                      </button>
                    </div>

                    {candidateTitles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setTitlesExpanded((v) => !v)}
                        className="text-xs font-medium text-[#1B4D3E] hover:underline"
                      >
                        {titlesExpanded
                          ? "收起备选标题"
                          : `切换备选标题 (${candidateTitles.length})`}
                      </button>
                    )}
                  </div>

                  <AnimatePresence initial={false}>
                    {titlesExpanded && candidateTitles.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-1.5 overflow-hidden"
                      >
                        {candidateTitles.map((t, i) => {
                          const active = assembledDoc.title === t;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleTitleChange(t)}
                              className={`rounded border px-2.5 py-1 text-xs transition ${
                                active
                                  ? "border-[#1B4D3E] bg-[#E9F0ED] font-medium text-[#1B4D3E]"
                                  : "border-[#E2DDD3] bg-[#FCFBF8] text-[#57534E] hover:border-[#181816]"
                              }`}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="border-t-2 border-[#181816] bg-[#FCFBF8] px-7 py-8 sm:px-9">
                    {docViewMode === "edit" ? (
                      <div className="space-y-5">
                        <input
                          type="text"
                          value={assembledDoc.title}
                          onChange={(e) => handleTitleChange(e.target.value)}
                          className="w-full border-b border-[#E2DDD3] pb-3 font-editorial text-2xl font-semibold text-[#181816] outline-none focus:border-[#1B4D3E]"
                        />
                        <textarea
                          rows={16}
                          value={assembledDoc.body}
                          onChange={(e) => handleBodyChange(e.target.value)}
                          className="w-full resize-y bg-transparent text-[15px] leading-8 text-[#292524] outline-none"
                        />
                      </div>
                    ) : (
                      <article className="space-y-6">
                        <header className="space-y-3 border-b border-[#E2DDD3] pb-5">
                          <div className="flex items-center gap-2.5 text-[11px] text-[#8C857B]">
                            <span className="rounded bg-[#181816] px-2 py-0.5 font-medium text-[#FCFBF8]">
                              {assembledDoc.platformName}
                            </span>
                            <span className="font-mono tabular-nums">
                              {assembledDoc.body.length} 字
                            </span>
                            <span className="font-mono tabular-nums">
                              {new Date(assembledDoc.createdAt).toLocaleString("zh-CN")}
                            </span>
                          </div>
                          <h2 className="font-editorial text-2xl font-semibold leading-snug text-[#181816]">
                            {assembledDoc.title}
                          </h2>
                        </header>

                        <div className="space-y-5">
                          {documentBlocks.map((block, idx) =>
                            block.type === "paragraph" ? (
                              <p
                                key={idx}
                                className="whitespace-pre-wrap text-[15px] leading-8 text-[#292524]"
                              >
                                {block.text}
                              </p>
                            ) : (
                              <figure key={block.image.id} className="my-6">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={block.image.dataUrl}
                                  alt={block.image.caption || block.image.name}
                                  className="mx-auto max-h-96 rounded border border-[#E2DDD3] object-contain"
                                />
                                {block.image.caption && (
                                  <figcaption className="mt-2 text-center text-xs text-[#8C857B]">
                                    {block.image.caption}
                                  </figcaption>
                                )}
                              </figure>
                            ),
                          )}
                        </div>

                        {assembledDoc.tags.length > 0 && (
                          <footer className="flex flex-wrap items-center gap-2 border-t border-[#E2DDD3] pt-5">
                            {assembledDoc.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-[#E9F0ED] px-2 py-0.5 text-xs font-medium text-[#1B4D3E]"
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
              )}

              {/* Tab 2: Compliance & Redaction */}
              {rightTab === "compliance" && (
                <RedactionAndReviewPanel
                  title={assembledDoc.title}
                  hook=""
                  body={assembledDoc.body}
                  onApplyTextChange={({ title: nextTitle, body: nextBody }) => {
                    if (currentResult) {
                      const nextTitles =
                        currentResult.titles.length > 0
                          ? [nextTitle, ...currentResult.titles.slice(1)]
                          : [nextTitle];
                      updateCurrentResultPatch({
                        titles: nextTitles,
                        hook: "",
                        body: nextBody,
                        cta: "",
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
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
