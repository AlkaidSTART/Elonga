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
import { isAllowedRasterImageType } from "@/lib/url-safety";
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
  const [rightTab, setRightTab] = useState<"manuscript" | "compliance" | "research">("manuscript");

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
    <div className="space-y-8">
      {/* Top Page Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#181816]/15 pb-5">
        <div>
          <h1 className="font-editorial text-2xl font-semibold tracking-tight text-[#181816]">
            内容创作
          </h1>
          <p className="mt-1 text-xs text-[#78716C]">
            左侧编排选题与配图，右侧实时成稿、合规脱敏与导出
          </p>
        </div>

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
                    ? "font-semibold text-[#1B4D3E]"
                    : isCompleted
                      ? "text-[#181816]"
                      : "text-[#8C857B]"
                }`}
              >
                <span className="font-mono text-[10px]">
                  {isCompleted ? (
                    <Check className="h-3 w-3 text-[#1B4D3E]" />
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

      {/* Main Split Editorial Desk: Left Creation Brief (5) + Right Manuscript & Proof Sheet (7) */}
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-0 lg:divide-x lg:divide-[#E2DDD3]">
        {/* LEFT COLUMN: Structured Creation Brief */}
        <section className="space-y-6 lg:col-span-5 lg:pr-9">
          {/* Step 1: Target Channel */}
          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold text-[#181816]">
                01 传播渠道
              </span>
              <span className="text-[11px] text-[#8C857B]">
                建议 {activePlatformMeta.recommendedLength}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(PLATFORMS) as PlatformId[]).map((pid) => {
                const meta = PLATFORMS[pid];
                const active = platform === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setPlatform(pid)}
                    className={`flex flex-col items-start rounded border px-3 py-2 text-left transition ${
                      active
                        ? "border-[#1B4D3E] bg-[#E9F0ED]/70 text-[#1B4D3E]"
                        : "border-[#E2DDD3] bg-[#FCFBF8] text-[#57534E] hover:border-[#CFC8BA] hover:text-[#181816]"
                    }`}
                  >
                    <span className="text-xs font-semibold">{meta.name}</span>
                    <span className="mt-0.5 truncate text-[10px] opacity-75">
                      {meta.tagline}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Activity Archive + Topic Brief */}
          <div className="space-y-3 border-t border-[#E2DDD3] pt-5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold text-[#181816]">
                02 选题与关联档案
              </span>
              <Link
                href="/organization"
                className="text-[11px] font-medium text-[#1B4D3E] hover:underline"
              >
                管理档案
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-[#8C857B]" />
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
                <option value="">不关联（仅读取机构基础档案）</option>
                {activities.map((act) => (
                  <option key={act.id} value={act.id}>
                    {act.title}（{act.date}）
                  </option>
                ))}
              </select>
            </div>

            {selectedActivity && (
              <p className="border-l-2 border-[#1B4D3E] bg-[#E9F0ED]/40 py-1.5 pl-2.5 pr-2 text-[11px] text-[#57534E]">
                已载入：{selectedActivity.participantCount || selectedActivity.location}
              </p>
            )}

            <div className="space-y-2">
              <textarea
                rows={3}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={`写下本次${activePlatformMeta.name}创作主题、现场故事或核心诉求...`}
                className="w-full resize-none rounded border border-[#D5CFC3] bg-[#FCFBF8] p-3 text-sm leading-relaxed text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
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
            </div>
          </div>

          {/* Step 3: Optional Field Photos */}
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
            className={`space-y-2.5 border-t border-[#E2DDD3] pt-5 transition ${
              isDragging ? "bg-[#E9F0ED]/50 px-2 pb-2" : ""
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

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#181816]">
                03 现场配图（可选）
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1B4D3E] hover:underline"
                >
                  <ImagePlus className="h-3 w-3" />
                  <span>上传</span>
                </button>
                <span className="text-[#CFC8BA]">·</span>
                <button
                  type="button"
                  onClick={handleLoadSamples}
                  className="inline-flex items-center gap-1 text-[11px] text-[#78716C] hover:text-[#181816]"
                >
                  <FileImage className="h-3 w-3" />
                  <span>示例图</span>
                </button>
              </div>
            </div>

            {images.length === 0 ? (
              <p className="text-[11px] leading-relaxed text-[#8C857B]">
                支持拖拽图片至此区域，生成时自动执行隐私打码或二维风格化并图文混排。
              </p>
            ) : (
              <div className="space-y-2">
                {images.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2.5 border-b border-[#E2DDD3] pb-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.processedUrl}
                      alt={item.name}
                      className="h-12 w-12 shrink-0 rounded border border-[#E2DDD3] object-cover"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <input
                        type="text"
                        value={item.caption}
                        onChange={(e) =>
                          updateImageItem(item.id, { caption: e.target.value })
                        }
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
                            className="rounded border border-[#E2DDD3] bg-[#F6F4EF] px-1 py-0.5 text-[10px] text-[#57534E] outline-none"
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
                      aria-label="删除"
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
          </div>

          {/* Advanced Parameters Collapsible */}
          <div className="border-t border-[#E2DDD3] pt-4">
            <button
              type="button"
              onClick={() => setOptionsExpanded((v) => !v)}
              className="flex w-full items-center justify-between text-xs font-medium text-[#57534E] hover:text-[#181816]"
            >
              <span className="inline-flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>高级撰稿参数（场景 / 语气 / 字数 / 受众）</span>
              </span>
              <span className="font-mono text-[11px] text-[#8C857B]">
                {optionsExpanded ? "收起" : "展开"}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {optionsExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.14 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-2.5 pt-3.5">
                    <select
                      value={contentType}
                      onChange={(e) =>
                        setContentType(e.target.value as ContentTypeId)
                      }
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
                      onChange={(e) =>
                        setWordCount(e.target.value as WordCountId)
                      }
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
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {errorMsg && (
            <p className="border-l-2 border-[#B42318] bg-[#FDF2F2] px-3 py-2 text-xs text-[#B42318]">
              {errorMsg}
            </p>
          )}

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={() => void handleRunWorkflow()}
            disabled={isRunning}
            className="flex h-10 w-full items-center justify-center gap-2 rounded bg-[#1B4D3E] px-4 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F] disabled:opacity-60"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>
                  {stage === "processing-images"
                    ? "正在处理配图..."
                    : stage === "researching-trends"
                      ? `正在调研${activePlatformMeta.name}风向...`
                      : "正在撰写推流成稿..."}
                </span>
              </>
            ) : (
              <>
                <Play className="h-3 w-3 fill-current" />
                <span>
                  {images.length > 0 ? "一键生成合规图文" : "生成推流文案"}
                </span>
              </>
            )}
          </button>
        </section>

        {/* RIGHT COLUMN: Editorial Proof Sheet & Manuscript Stage */}
        <section className="lg:col-span-7 lg:pl-9">
          <AnimatePresence mode="wait">
            {!assembledDoc ? (
              <motion.div
                key="proof-sheet"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="border-t-2 border-[#181816] bg-[#FCFBF8] px-7 py-8 sm:px-10 sm:py-9"
              >
                <div className="flex items-center justify-between border-b border-[#E2DDD3] pb-4 text-[11px] text-[#8C857B]">
                  <span className="font-medium text-[#181816]">
                    {orgProfile.name} · {activePlatformMeta.name}样稿预览
                  </span>
                  <span className="font-mono">MANUSCRIPT PROOF</span>
                </div>

                <div className="mt-6 space-y-6">
                  <div>
                    <h2 className="font-editorial text-xl font-semibold text-[#181816]">
                      {topic.trim() || "在左侧输入主题或选择活动档案"}
                    </h2>
                    <p className="mt-1.5 text-xs leading-relaxed text-[#78716C]">
                      生成后将在此呈现面向「{activePlatformMeta.name}」的完整出版级成稿，支持直接编辑、隐私脱敏与多格式导出。
                    </p>
                  </div>

                  <div className="divide-y divide-[#E2DDD3] border-y border-[#E2DDD3]">
                    <div className="flex items-baseline gap-4 py-3.5">
                      <span className="font-mono text-[11px] text-[#1B4D3E]">01</span>
                      <div>
                        <div className="text-xs font-medium text-[#181816]">
                          黄金开头与多版备选标题
                        </div>
                        <div className="mt-0.5 text-[11px] text-[#8C857B]">
                          结合{activePlatformMeta.name}传播规律提炼前 3 秒钩子与情绪切口
                        </div>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-4 py-3.5">
                      <span className="font-mono text-[11px] text-[#1B4D3E]">02</span>
                      <div>
                        <div className="text-xs font-medium text-[#181816]">
                          基于真实档案的克制叙事
                        </div>
                        <div className="mt-0.5 text-[11px] text-[#8C857B]">
                          自动读取机构使命、落款与活动数据，杜绝煽情与夸大表述
                        </div>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-4 py-3.5">
                      <span className="font-mono text-[11px] text-[#B85D3B]">03</span>
                      <div>
                        <div className="text-xs font-medium text-[#181816]">
                          发布前隐私脱敏与事实核对
                        </div>
                        <div className="mt-0.5 text-[11px] text-[#8C857B]">
                          自动标出姓名、号码、金额与人数，核对通过后解锁全文导出
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="document"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-5"
              >
                {/* Right Stage Underline Tabs + Export Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DDD3]">
                  <div className="flex items-center gap-5">
                    {(
                      [
                        { id: "manuscript", label: "成稿与编辑" },
                        {
                          id: "compliance",
                          label: reviewReport?.isEligible
                            ? "发布审查 ✓"
                            : "发布审查与脱敏",
                        },
                        { id: "research", label: "调研与建议" },
                      ] as const
                    ).map((t) => {
                      const active = rightTab === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setRightTab(t.id)}
                          className={`relative pb-3 text-xs font-medium transition ${
                            active
                              ? "text-[#1B4D3E]"
                              : "text-[#78716C] hover:text-[#181816]"
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
                        isExportingDocx ||
                        Boolean(reviewReport && !reviewReport.isEligible)
                      }
                      className="inline-flex items-center gap-1 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2 py-1 text-[11px] font-medium text-[#57534E] transition hover:border-[#181816] hover:text-[#181816] disabled:cursor-not-allowed disabled:opacity-45"
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
                  </div>
                </div>

                {/* Tab 1: Manuscript */}
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
                                {new Date(
                                  assembledDoc.createdAt
                                ).toLocaleString("zh-CN")}
                              </span>
                            </div>
                            <h2 className="font-editorial text-2xl font-semibold leading-snug text-[#181816]">
                              {assembledDoc.title}
                            </h2>
                          </header>

                          {assembledDoc.hook && (
                            <div className="border-l-2 border-[#1B4D3E] bg-[#F6F4EF] py-3 pl-4 pr-3.5">
                              <div className="mb-1 flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-[#1B4D3E]">
                                  {assembledDoc.platform === "douyin"
                                    ? "前 3 秒钩子"
                                    : "黄金开头"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleCopyText(
                                      assembledDoc.hook!,
                                      "hook"
                                    )
                                  }
                                  className="text-[11px] text-[#8C857B] hover:text-[#181816]"
                                >
                                  {copiedKey === "hook" ? "已复制" : "复制"}
                                </button>
                              </div>
                              <p className="text-[15px] font-medium leading-relaxed text-[#181816]">
                                {assembledDoc.hook}
                              </p>
                            </div>
                          )}

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
                              )
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
                )}

                {/* Tab 3: Platform Research & Tips */}
                {rightTab === "research" && (
                  <div className="divide-y divide-[#E2DDD3]">
                    {matchedTrendInsights && (
                      <div className="pb-6">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="font-editorial text-base font-semibold text-[#181816]">
                            {docPlatformMeta.name}调研参考
                          </span>
                          <span className="rounded bg-[#E9F0ED] px-2 py-0.5 text-[11px] font-medium text-[#1B4D3E]">
                            {matchedTrendInsights.sourceLabel}
                          </span>
                        </div>
                        <p className="mb-3 text-xs leading-relaxed text-[#57534E]">
                          {matchedTrendInsights.summary}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {matchedTrendInsights.hotKeywords.map((kw) => (
                            <span
                              key={kw}
                              className="rounded border border-[#E2DDD3] bg-[#FCFBF8] px-2 py-0.5 text-[11px] text-[#57534E]"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentResult?.cta && (
                      <div className="py-6">
                        <span className="mb-1.5 block font-editorial text-base font-semibold text-[#181816]">
                          互动引导
                        </span>
                        <p className="text-xs leading-relaxed text-[#57534E]">
                          {currentResult.cta}
                        </p>
                      </div>
                    )}

                    {assembledDoc.algorithmTips.length > 0 && (
                      <div className="py-6">
                        <span className="mb-2 block font-editorial text-base font-semibold text-[#181816]">
                          {docPlatformMeta.name}发布建议
                        </span>
                        <ul className="space-y-2">
                          {assembledDoc.algorithmTips.map((tip, i) => (
                            <li
                              key={i}
                              className="text-xs leading-relaxed text-[#57534E]"
                            >
                              — {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
