"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brush,
  Download,
  Eye,
  EyeOff,
  Lasso,
  Loader2,
  Redo2,
  RotateCcw,
  ScanSearch,
  SlidersHorizontal,
  Square,
  Undo2,
  X,
} from "lucide-react";
import {
  detectSensitiveRegionsLocal,
  type AutoRedactCategory,
  type DetectedRegion,
} from "@/lib/auto-redact";
import { renderRedactedCanvas } from "@/lib/mosaic-canvas";
import {
  useImageStudioStore,
  type MosaicType,
  type Point,
  type RedactionAction,
} from "@/store/useImageStudioStore";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

const MOSAIC_TYPES: {
  id: MosaicType;
  label: string;
  desc: string;
}[] = [
  { id: "stackblur", label: "柔焦模糊", desc: "StackBlur 高斯打码" },
  { id: "pixelate", label: "像素马赛克", desc: "经典方块像素格" },
  { id: "solid", label: "纯色遮盖", desc: "深灰隐私色块" },
];

const AUTO_CATEGORIES: {
  id: AutoRedactCategory;
  label: string;
  beta?: boolean;
}[] = [
  { id: "text", label: "文字/号码" },
  { id: "face", label: "人脸/头像", beta: true },
  { id: "qrcode", label: "二维码", beta: true },
];

function getActionBounds(
  action: RedactionAction,
): { x: number; y: number; w: number; h: number } | null {
  if (action.shape === "rect" && action.rect) {
    const x = Math.min(action.rect.x, action.rect.x + action.rect.w);
    const y = Math.min(action.rect.y, action.rect.y + action.rect.h);
    const w = Math.abs(action.rect.w);
    const h = Math.abs(action.rect.h);
    if (w < 1 || h < 1) return null;
    return { x, y, w, h };
  }
  const pts = action.points ?? [];
  if (pts.length === 0) return null;
  let minX = pts[0].x;
  let minY = pts[0].y;
  let maxX = pts[0].x;
  let maxY = pts[0].y;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const pad = action.shape === "brush" ? action.brushSize / 2 : 0;
  return {
    x: minX - pad,
    y: minY - pad,
    w: Math.max(8, maxX - minX + pad * 2),
    h: Math.max(8, maxY - minY + pad * 2),
  };
}

export function MosaicEditor() {
  const {
    originalImage,
    imageMeta,
    mosaicType,
    toolShape,
    brushSize,
    intensity,
    actions,
    redoStack,
    autoCategories,
    isAutoDetecting,
    autoDetectMode,
    manualEnabled,
    setMosaicType,
    setToolShape,
    setBrushSize,
    setIntensity,
    pushAction,
    replaceAutoActions,
    removeActionById,
    undoAction,
    redoAction,
    resetActions,
    toggleAutoCategory,
    setAutoDetectStatus,
    setManualEnabled,
  } = useImageStudioStore();

  const { modelConfig } = useWorkbenchStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const lastAutoScannedImageRef = useRef<string | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [hoveredActionId, setHoveredActionId] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [activePopover, setActivePopover] = useState<"auto" | "style" | "brush" | null>(null);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const draftPointsRef = useRef<Point[]>([]);
  const draftRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  // Close floating tool popover on outside click or Escape
  useEffect(() => {
    if (!activePopover) return;
    const handlePointerDownOutside = (e: PointerEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setActivePopover(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActivePopover(null);
    };
    window.addEventListener("pointerdown", handlePointerDownOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDownOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePopover]);

  const runAutoRedact = useCallback(
    async (img: HTMLImageElement, categoriesOverride?: AutoRedactCategory[]) => {
      const cats = categoriesOverride ?? useImageStudioStore.getState().autoCategories;
      if (cats.length === 0) {
        replaceAutoActions([]);
        setAutoDetectStatus(false, "local");
        return;
      }

      setAutoDetectStatus(true);
      try {
        let regions: DetectedRegion[] | null = null;
        let mode: "ai" | "local" = "local";

        if (originalImage) {
          try {
            const res = await fetch("/api/auto-redact", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageBase64: originalImage,
                width: img.width,
                height: img.height,
                categories: cats,
                modelConfig: {
                  apiKey: modelConfig.textApiKey,
                  baseUrl: modelConfig.textBaseUrl,
                  model: modelConfig.textModel,
                },
              }),
            });
            if (res.ok) {
              const data = await res.json();
              if (!data.fallback && Array.isArray(data.regions)) {
                regions = data.regions;
                mode = "ai";
              }
            }
          } catch {
            // Fall back to local detector seamlessly
          }
        }

        if (!regions) {
          regions = await detectSensitiveRegionsLocal(img, cats);
          mode = "local";
        }

        const state = useImageStudioStore.getState();
        const autoActions: RedactionAction[] = regions.map((r) => ({
          id: r.id,
          type: state.mosaicType,
          shape: "rect",
          intensity: state.intensity,
          brushSize: state.brushSize,
          rect: r.rect,
          source: "auto",
          label: r.label,
          category: r.category,
        }));

        replaceAutoActions(autoActions);
        setAutoDetectStatus(false, mode);
      } catch {
        setAutoDetectStatus(false, "local");
      }
    },
    [
      modelConfig.textApiKey,
      modelConfig.textBaseUrl,
      modelConfig.textModel,
      originalImage,
      replaceAutoActions,
      setAutoDetectStatus,
    ],
  );

  // Load image element whenever originalImage changes and trigger automatic redaction by default
  useEffect(() => {
    if (!originalImage) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      if (canvas && overlay) {
        canvas.width = img.width;
        canvas.height = img.height;
        overlay.width = img.width;
        overlay.height = img.height;
        renderRedactedCanvas(canvas, img, useImageStudioStore.getState().actions, showOriginal);
      }
      if (lastAutoScannedImageRef.current !== originalImage) {
        lastAutoScannedImageRef.current = originalImage;
        void runAutoRedact(img);
      }
    };
    img.src = originalImage;
  }, [originalImage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-render whenever actions or showOriginal change
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    renderRedactedCanvas(canvas, img, actions, showOriginal);
  }, [actions, showOriginal]);

  const getCanvasPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = overlayRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const drawRegionMarkers = useCallback(
    (ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number) => {
      if (showOriginal || !showMarkers) return;

      const autoList = actions.filter((a) => a.source === "auto");
      const manualList = actions.filter((a) => a.source === "manual");
      const highlightedId = hoveredActionId ?? selectedActionId;

      const scaleUnit = Math.max(1, Math.min(canvasW, canvasH) / 640);
      const fontSize = Math.round(13 * scaleUnit);
      const padX = Math.round(6 * scaleUnit);
      const badgeH = Math.round(20 * scaleUnit);

      const drawOne = (action: RedactionAction, tagText: string, isAuto: boolean) => {
        const bounds = getActionBounds(action);
        if (!bounds) return;

        const isHighlighted = highlightedId === action.id;
        const isDimmed = Boolean(highlightedId) && !isHighlighted;

        ctx.save();
        ctx.globalAlpha = isDimmed ? 0.35 : 1;

        // Region outline
        ctx.lineWidth = (isHighlighted ? 3 : 1.75) * scaleUnit;
        ctx.strokeStyle = isHighlighted
          ? "#B85D3B"
          : isAuto
            ? "rgba(27, 77, 62, 0.9)"
            : "rgba(87, 83, 78, 0.82)";
        if (isHighlighted) {
          ctx.fillStyle = "rgba(184, 93, 59, 0.16)";
          ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
          ctx.setLineDash([]);
        } else {
          ctx.setLineDash([5 * scaleUnit, 4 * scaleUnit]);
        }
        ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
        ctx.setLineDash([]);

        // Number badge positioned at top-left corner (clamped inside canvas)
        ctx.font = `600 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        const textW = ctx.measureText(tagText).width;
        const badgeW = textW + padX * 2;
        const bx = Math.max(2, Math.min(canvasW - badgeW - 2, bounds.x));
        const by =
          bounds.y - badgeH - 2 >= 2
            ? bounds.y - badgeH - 2
            : Math.min(canvasH - badgeH - 2, bounds.y + 2);

        ctx.fillStyle = isHighlighted ? "#B85D3B" : isAuto ? "#1B4D3E" : "#57534E";
        ctx.beginPath();
        ctx.roundRect(bx, by, badgeW, badgeH, 3 * scaleUnit);
        ctx.fill();

        ctx.fillStyle = "#FCFBF8";
        ctx.textBaseline = "middle";
        ctx.fillText(tagText, bx + padX, by + badgeH / 2 + 0.5);
        ctx.restore();
      };

      // Draw non-highlighted first, then highlighted on top so it's never occluded
      const entries: Array<{ action: RedactionAction; tag: string; isAuto: boolean }> = [
        ...autoList.map((action, idx) => ({
          action,
          tag: `#${idx + 1}`,
          isAuto: true,
        })),
        ...manualList.map((action, idx) => ({
          action,
          tag: `M${idx + 1}`,
          isAuto: false,
        })),
      ];

      for (const entry of entries) {
        if (entry.action.id !== highlightedId) {
          drawOne(entry.action, entry.tag, entry.isAuto);
        }
      }
      for (const entry of entries) {
        if (entry.action.id === highlightedId) {
          drawOne(entry.action, entry.tag, entry.isAuto);
        }
      }
    },
    [actions, hoveredActionId, selectedActionId, showMarkers, showOriginal],
  );

  const clearOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    drawRegionMarkers(ctx, overlay.width, overlay.height);
  }, [drawRegionMarkers]);

  const drawOverlayPreview = useCallback(
    (cursor?: Point) => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, overlay.width, overlay.height);
      drawRegionMarkers(ctx, overlay.width, overlay.height);

      if (isDrawing && toolShape === "lasso" && draftPointsRef.current.length > 0) {
        const pts = draftPointsRef.current;
        ctx.save();
        ctx.fillStyle = "rgba(27, 77, 62, 0.16)";
        ctx.strokeStyle = "rgba(27, 77, 62, 0.9)";
        ctx.lineWidth = Math.max(2, overlay.width / 400);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        if (pts.length >= 3) {
          ctx.closePath();
          ctx.fill();
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(27, 77, 62, 0.95)";
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, Math.max(3, overlay.width / 260), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (isDrawing && toolShape === "brush" && draftPointsRef.current.length > 0) {
        ctx.save();
        ctx.strokeStyle = "rgba(27, 77, 62, 0.45)";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = brushSize;
        ctx.beginPath();
        ctx.moveTo(draftPointsRef.current[0].x, draftPointsRef.current[0].y);
        for (let i = 1; i < draftPointsRef.current.length; i++) {
          ctx.lineTo(draftPointsRef.current[i].x, draftPointsRef.current[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }

      if (isDrawing && toolShape === "rect" && draftRectRef.current) {
        const r = draftRectRef.current;
        ctx.save();
        ctx.fillStyle = "rgba(27, 77, 62, 0.16)";
        ctx.strokeStyle = "rgba(27, 77, 62, 0.88)";
        ctx.lineWidth = Math.max(2, overlay.width / 400);
        ctx.setLineDash([6, 4]);
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.restore();
      }

      if (manualEnabled && cursor && toolShape === "brush") {
        ctx.save();
        ctx.strokeStyle = "rgba(24, 24, 22, 0.72)";
        ctx.fillStyle = "rgba(252, 251, 248, 0.25)";
        ctx.lineWidth = Math.max(1.5, overlay.width / 500);
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    },
    [brushSize, drawRegionMarkers, isDrawing, manualEnabled, toolShape],
  );

  // Redraw numbered markers on overlay whenever actions, hover/selection, or visibility changes
  useEffect(() => {
    if (!isDrawing) {
      clearOverlay();
    }
  }, [clearOverlay, isDrawing]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!manualEnabled || showOriginal) return;
    setActivePopover(null);
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getCanvasPoint(e);
    setIsDrawing(true);

    if (toolShape === "brush" || toolShape === "lasso") {
      draftPointsRef.current = [pt];
      draftRectRef.current = null;
    } else {
      draftPointsRef.current = [];
      draftRectRef.current = { x: pt.x, y: pt.y, w: 0, h: 0 };
    }
    drawOverlayPreview(pt);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!manualEnabled) return;
    const pt = getCanvasPoint(e);
    if (!isDrawing) {
      drawOverlayPreview(pt);
      return;
    }

    if (toolShape === "lasso") {
      const pts = draftPointsRef.current;
      const last = pts[pts.length - 1];
      if (!last || (pt.x - last.x) ** 2 + (pt.y - last.y) ** 2 >= 4) {
        pts.push(pt);
      }
    } else if (toolShape === "brush") {
      draftPointsRef.current.push(pt);
    } else if (draftRectRef.current) {
      draftRectRef.current.w = pt.x - draftRectRef.current.x;
      draftRectRef.current.h = pt.y - draftRectRef.current.y;
    }
    drawOverlayPreview(pt);
  };

  const finishStroke = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    clearOverlay();

    if (toolShape === "lasso" && draftPointsRef.current.length >= 3) {
      const pts = draftPointsRef.current;
      let minX = pts[0].x;
      let minY = pts[0].y;
      let maxX = pts[0].x;
      let maxY = pts[0].y;
      for (const p of pts) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      if (maxX - minX > 4 || maxY - minY > 4) {
        const action: RedactionAction = {
          id: `manual_${Date.now()}`,
          type: mosaicType,
          shape: "lasso",
          intensity,
          brushSize,
          points: [...pts],
          source: "manual",
          label: "圈选区域",
        };
        pushAction(action);
      }
    } else if (toolShape === "brush" && draftPointsRef.current.length > 0) {
      const action: RedactionAction = {
        id: `manual_${Date.now()}`,
        type: mosaicType,
        shape: "brush",
        intensity,
        brushSize,
        points: [...draftPointsRef.current],
        source: "manual",
        label: "手动涂抹",
      };
      pushAction(action);
    } else if (
      toolShape === "rect" &&
      draftRectRef.current &&
      Math.abs(draftRectRef.current.w) > 4 &&
      Math.abs(draftRectRef.current.h) > 4
    ) {
      const action: RedactionAction = {
        id: `manual_${Date.now()}`,
        type: mosaicType,
        shape: "rect",
        intensity,
        brushSize,
        rect: { ...draftRectRef.current },
        source: "manual",
        label: "手动框选",
      };
      pushAction(action);
    }

    draftPointsRef.current = [];
    draftRectRef.current = null;
  };

  const handleToggleCategory = (cat: AutoRedactCategory) => {
    toggleAutoCategory(cat);
    const next = autoCategories.includes(cat)
      ? autoCategories.filter((c) => c !== cat)
      : [...autoCategories, cat];
    if (imgRef.current) {
      void runAutoRedact(imgRef.current, next);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    const baseName = imageMeta?.name?.replace(/\.[^.]+$/, "") || "image";
    link.download = `${baseName}_打码.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const autoActions = actions.filter((a) => a.source === "auto");
  const manualActions = actions.filter((a) => a.source === "manual");

  const handleSelectTool = (shape: "lasso" | "rect" | "brush") => {
    if (manualEnabled && toolShape === shape) {
      if (shape === "brush") {
        setActivePopover((prev) => (prev === "brush" ? null : "brush"));
      } else {
        setManualEnabled(false);
        setActivePopover(null);
      }
      return;
    }
    setToolShape(shape);
    setManualEnabled(true);
    setActivePopover(shape === "brush" ? "brush" : null);
  };

  return (
    <div className="flex flex-col bg-[#F2EFE8] studio-grid-light">
      {/* Top Minimal Utility Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DDD3] bg-[#FCFBF8]/90 px-5 py-3 backdrop-blur-xs">
        <div className="flex items-center gap-2.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isAutoDetecting ? "animate-pulse bg-[#B85D3B]" : "bg-[#1B4D3E]"
            }`}
          />
          <span className="font-mono text-[11px] text-[#57534E] tabular-nums">
            {isAutoDetecting
              ? "自动识别中..."
              : manualEnabled
                ? `${
                    toolShape === "lasso"
                      ? "自由圈选"
                      : toolShape === "rect"
                        ? "矩形框选"
                        : `画笔涂抹 (${brushSize}px)`
                  } · ${actions.length} 处`
                : `已处理 ${actions.length} 处`}
          </span>
          {autoDetectMode && !isAutoDetecting && (
            <span className="rounded bg-[#EFECE4] px-1.5 py-0.5 font-mono text-[10px] text-[#78716C]">
              {autoDetectMode === "ai" ? "AI" : "LOCAL"}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMarkers((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-medium select-none transition ${
              showMarkers
                ? "border-[#1B4D3E]/35 bg-[#E9F0ED] text-[#1B4D3E]"
                : "border-[#D5CFC3] bg-[#FCFBF8] text-[#57534E] hover:border-[#8C857B] hover:text-[#181816]"
            }`}
            title="切换画布上的打码编号标注（导出图片不会包含标注）"
          >
            {showMarkers ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span>编号标注</span>
          </button>

          <button
            type="button"
            onPointerDown={() => setShowOriginal(true)}
            onPointerUp={() => setShowOriginal(false)}
            onPointerLeave={() => setShowOriginal(false)}
            className={`rounded border px-2.5 py-1.5 text-xs font-medium select-none transition ${
              showOriginal
                ? "border-[#1B4D3E] bg-[#1B4D3E] text-[#FCFBF8]"
                : "border-[#D5CFC3] bg-[#FCFBF8] text-[#181816] hover:border-[#181816]"
            }`}
          >
            {showOriginal ? "原图预览" : "按住对比"}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded bg-[#1B4D3E] px-3.5 py-1.5 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>导出打码图片</span>
          </button>
        </div>
      </div>

      {/* Spacious Centered Canvas Stage + Compact Vertically-Centered Side Toolbar */}
      <div className="relative flex min-h-[540px] flex-1 flex-col items-center justify-center gap-5 px-5 py-7 lg:flex-row lg:px-8 lg:py-8">
        {/* Image Canvas */}
        <div className="flex min-w-0 flex-1 items-center justify-center">
          <div className="relative inline-block max-h-[560px] max-w-full">
            <canvas
              ref={canvasRef}
              className="block max-h-[540px] max-w-full rounded-[4px] object-contain shadow-[0_10px_32px_rgba(24,24,22,0.11)] ring-1 ring-[#181816]/8"
            />
            <canvas
              ref={overlayRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishStroke}
              onPointerCancel={finishStroke}
              onPointerLeave={() => {
                if (!isDrawing) clearOverlay();
              }}
              className={`absolute inset-0 h-full w-full touch-none rounded-[4px] ${
                manualEnabled ? "cursor-crosshair" : "pointer-events-none"
              }`}
            />
          </div>
        </div>

        {/* Compact Floating Vertical Tool Dock Centered Beside the Image */}
        <div ref={dockRef} className="relative z-20 flex shrink-0 items-center justify-center">
          {/* On-Demand Floating Popover Panel (opens to the left of the dock on desktop, above on mobile) */}
          <AnimatePresence>
            {activePopover && (
              <motion.div
                key={activePopover}
                initial={{ opacity: 0, x: 8, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 6, scale: 0.98 }}
                transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                className="absolute bottom-full right-0 z-30 mb-3 w-[296px] rounded-xl border border-[#E2DDD3] bg-[#FCFBF8] p-4 shadow-[0_14px_36px_rgba(24,24,22,0.12)] lg:bottom-auto lg:right-full lg:top-1/2 lg:mb-0 lg:mr-3 lg:-translate-y-1/2"
              >
                {activePopover === "auto" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-editorial text-sm font-semibold text-[#181816]">
                          自动识别与区域
                        </h3>
                        {autoDetectMode && !isAutoDetecting && (
                          <span className="rounded bg-[#EFECE4] px-1.5 py-0.5 font-mono text-[10px] text-[#57534E]">
                            {autoDetectMode === "ai" ? "AI" : "LOCAL"}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setActivePopover(null)}
                        className="rounded p-1 text-[#8C857B] transition hover:bg-[#EFECE4] hover:text-[#181816]"
                        aria-label="关闭面板"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {AUTO_CATEGORIES.map((item) => {
                        const active = autoCategories.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleToggleCategory(item.id)}
                            className={`flex flex-col items-center justify-center rounded border px-1.5 py-2 text-[11px] font-medium transition ${
                              active
                                ? "border-[#1B4D3E] bg-[#E9F0ED] text-[#1B4D3E]"
                                : "border-[#E2DDD3] bg-[#F6F4EF]/70 text-[#57534E] hover:border-[#CFC8BA] hover:text-[#181816]"
                            }`}
                          >
                            <span>{item.label}</span>
                            {item.beta && (
                              <span
                                className={`mt-0.5 rounded px-1 py-px font-mono text-[9px] leading-none ${
                                  active
                                    ? "bg-[#1B4D3E]/12 text-[#1B4D3E]"
                                    : "bg-[#B85D3B]/12 text-[#B85D3B]"
                                }`}
                              >
                                Beta
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-[11px] leading-relaxed text-[#78716C]">
                      默认开启高置信度「文字/号码」识别；悬停下方编号可定位并单独移除。
                    </p>

                    <button
                      type="button"
                      disabled={isAutoDetecting}
                      onClick={() => {
                        if (imgRef.current) void runAutoRedact(imgRef.current);
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded border border-[#D5CFC3] bg-[#FCFBF8] py-1.5 text-xs font-medium text-[#181816] transition hover:border-[#181816] hover:bg-[#F6F4EF] disabled:opacity-50"
                    >
                      {isAutoDetecting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1B4D3E]" />
                          <span>识别中...</span>
                        </>
                      ) : (
                        <span>重新识别</span>
                      )}
                    </button>

                    {(autoActions.length > 0 || manualActions.length > 0) && (
                      <div className="max-h-44 space-y-1.5 overflow-y-auto border-t border-[#E2DDD3] pt-3 pr-1">
                        {autoActions.map((act, idx) => {
                          const isActive =
                            hoveredActionId === act.id || selectedActionId === act.id;
                          return (
                            <div
                              key={act.id}
                              onMouseEnter={() => setHoveredActionId(act.id)}
                              onMouseLeave={() =>
                                setHoveredActionId((prev) => (prev === act.id ? null : prev))
                              }
                              onClick={() =>
                                setSelectedActionId((prev) => (prev === act.id ? null : act.id))
                              }
                              className={`flex cursor-pointer items-center justify-between rounded border px-2.5 py-1.5 text-[11px] transition ${
                                isActive
                                  ? "border-[#B85D3B]/50 bg-[#B85D3B]/8"
                                  : "border-[#E2DDD3] bg-[#F6F4EF]/60 hover:border-[#CFC8BA]"
                              }`}
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <span
                                  className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                                    isActive
                                      ? "bg-[#B85D3B] text-[#FCFBF8]"
                                      : "bg-[#1B4D3E] text-[#FCFBF8]"
                                  }`}
                                >
                                  #{idx + 1}
                                </span>
                                <span className="truncate text-[#181816]">
                                  {act.label || "敏感区域"}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (hoveredActionId === act.id) setHoveredActionId(null);
                                  if (selectedActionId === act.id) setSelectedActionId(null);
                                  removeActionById(act.id);
                                }}
                                className="ml-2 rounded p-0.5 text-[#8C857B] transition hover:bg-[#FDF2F2] hover:text-[#B42318]"
                                title="移除此区域"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}

                        {manualActions.map((act, idx) => {
                          const isActive =
                            hoveredActionId === act.id || selectedActionId === act.id;
                          return (
                            <div
                              key={act.id}
                              onMouseEnter={() => setHoveredActionId(act.id)}
                              onMouseLeave={() =>
                                setHoveredActionId((prev) => (prev === act.id ? null : prev))
                              }
                              onClick={() =>
                                setSelectedActionId((prev) => (prev === act.id ? null : act.id))
                              }
                              className={`flex cursor-pointer items-center justify-between rounded border px-2.5 py-1.5 text-[11px] transition ${
                                isActive
                                  ? "border-[#B85D3B]/50 bg-[#B85D3B]/8"
                                  : "border-[#E2DDD3] bg-[#F6F4EF]/60 hover:border-[#CFC8BA]"
                              }`}
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <span
                                  className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                                    isActive
                                      ? "bg-[#B85D3B] text-[#FCFBF8]"
                                      : "bg-[#57534E] text-[#FCFBF8]"
                                  }`}
                                >
                                  M{idx + 1}
                                </span>
                                <span className="truncate text-[#181816]">
                                  {act.label || "手动区域"}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (hoveredActionId === act.id) setHoveredActionId(null);
                                  if (selectedActionId === act.id) setSelectedActionId(null);
                                  removeActionById(act.id);
                                }}
                                className="ml-2 rounded p-0.5 text-[#8C857B] transition hover:bg-[#FDF2F2] hover:text-[#B42318]"
                                title="移除此区域"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {activePopover === "style" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-editorial text-sm font-semibold text-[#181816]">
                        遮盖样式
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActivePopover(null)}
                        className="rounded p-1 text-[#8C857B] transition hover:bg-[#EFECE4] hover:text-[#181816]"
                        aria-label="关闭面板"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-0.5 rounded-md border border-[#E2DDD3] bg-[#EFECE4] p-0.5">
                      {MOSAIC_TYPES.map((item) => {
                        const active = mosaicType === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setMosaicType(item.id)}
                            className={`rounded-[4px] py-1.5 text-center text-[11px] font-medium transition ${
                              active
                                ? "bg-[#FCFBF8] text-[#1B4D3E] shadow-[0_1px_2px_rgba(24,24,22,0.06)]"
                                : "text-[#57534E] hover:text-[#181816]"
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>

                    {mosaicType !== "solid" && (
                      <div>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                          <span className="text-[#57534E]">
                            {mosaicType === "stackblur" ? "模糊半径" : "颗粒度"}
                          </span>
                          <span className="font-mono font-medium text-[#181816] tabular-nums">
                            {intensity}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={6}
                          max={45}
                          value={intensity}
                          onChange={(e) => setIntensity(Number(e.target.value))}
                          className="w-full accent-[#1B4D3E]"
                        />
                      </div>
                    )}
                  </div>
                )}

                {activePopover === "brush" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-editorial text-sm font-semibold text-[#181816]">
                        画笔设置
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActivePopover(null)}
                        className="rounded p-1 text-[#8C857B] transition hover:bg-[#EFECE4] hover:text-[#181816]"
                        aria-label="关闭面板"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="text-[#57534E]">画笔直径</span>
                        <span className="font-mono font-medium text-[#181816] tabular-nums">
                          {brushSize}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={12}
                        max={96}
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="w-full accent-[#1B4D3E]"
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Compact Vertical (Desktop) / Horizontal (Mobile) Tool Capsule */}
          <div className="flex flex-row items-center gap-1 rounded-xl border border-[#E2DDD3] bg-[#FCFBF8]/95 p-1.5 shadow-[0_8px_24px_rgba(24,24,22,0.08)] backdrop-blur-xs lg:flex-col">
            {/* Auto Detect Popover Trigger */}
            <button
              type="button"
              onClick={() => setActivePopover((prev) => (prev === "auto" ? null : "auto"))}
              title="自动识别与区域管理"
              className={`relative flex h-11 w-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition ${
                activePopover === "auto"
                  ? "bg-[#E9F0ED] text-[#1B4D3E]"
                  : "text-[#57534E] hover:bg-[#EFECE4]/80 hover:text-[#181816]"
              }`}
            >
              {isAutoDetecting ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#1B4D3E]" />
              ) : (
                <ScanSearch className="h-4 w-4" />
              )}
              <span>识别</span>
              {actions.length > 0 && (
                <span className="absolute right-1 top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-[#1B4D3E] px-1 font-mono text-[9px] font-semibold leading-none text-[#FCFBF8] tabular-nums">
                  {actions.length}
                </span>
              )}
            </button>

            {/* Mosaic Style Popover Trigger */}
            <button
              type="button"
              onClick={() => setActivePopover((prev) => (prev === "style" ? null : "style"))}
              title="遮盖样式与强度"
              className={`flex h-11 w-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition ${
                activePopover === "style"
                  ? "bg-[#E9F0ED] text-[#1B4D3E]"
                  : "text-[#57534E] hover:bg-[#EFECE4]/80 hover:text-[#181816]"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>样式</span>
            </button>

            <div className="mx-0.5 h-6 w-px bg-[#E2DDD3] lg:mx-0 lg:my-0.5 lg:h-px lg:w-7" />

            {/* Manual Drawing Tools */}
            <button
              type="button"
              onClick={() => handleSelectTool("lasso")}
              title="自由圈选打码"
              className={`flex h-11 w-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition ${
                manualEnabled && toolShape === "lasso"
                  ? "bg-[#1B4D3E] text-[#FCFBF8] shadow-[0_1px_2px_rgba(24,24,22,0.12)]"
                  : "text-[#57534E] hover:bg-[#EFECE4]/80 hover:text-[#181816]"
              }`}
            >
              <Lasso className="h-4 w-4" />
              <span>圈选</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectTool("rect")}
              title="矩形框选打码"
              className={`flex h-11 w-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition ${
                manualEnabled && toolShape === "rect"
                  ? "bg-[#1B4D3E] text-[#FCFBF8] shadow-[0_1px_2px_rgba(24,24,22,0.12)]"
                  : "text-[#57534E] hover:bg-[#EFECE4]/80 hover:text-[#181816]"
              }`}
            >
              <Square className="h-4 w-4" />
              <span>框选</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectTool("brush")}
              title="画笔涂抹打码（再次点击调节画笔直径）"
              className={`flex h-11 w-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium transition ${
                manualEnabled && toolShape === "brush"
                  ? "bg-[#1B4D3E] text-[#FCFBF8] shadow-[0_1px_2px_rgba(24,24,22,0.12)]"
                  : "text-[#57534E] hover:bg-[#EFECE4]/80 hover:text-[#181816]"
              }`}
            >
              <Brush className="h-4 w-4" />
              <span>涂抹</span>
            </button>

            <div className="mx-0.5 h-6 w-px bg-[#E2DDD3] lg:mx-0 lg:my-0.5 lg:h-px lg:w-7" />

            {/* History Controls */}
            <button
              type="button"
              onClick={undoAction}
              disabled={actions.length === 0}
              title="撤销"
              className="flex h-9 w-12 items-center justify-center rounded-lg text-[#57534E] transition hover:bg-[#EFECE4]/80 hover:text-[#181816] disabled:opacity-30"
            >
              <Undo2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={redoAction}
              disabled={redoStack.length === 0}
              title="重做"
              className="flex h-9 w-12 items-center justify-center rounded-lg text-[#57534E] transition hover:bg-[#EFECE4]/80 hover:text-[#181816] disabled:opacity-30"
            >
              <Redo2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={resetActions}
              disabled={actions.length === 0}
              title="清空全部打码"
              className="flex h-9 w-12 items-center justify-center rounded-lg text-[#78716C] transition hover:bg-[#FDF2F2] hover:text-[#B42318] disabled:opacity-30"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
