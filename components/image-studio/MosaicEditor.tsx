"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Brush,
  ChevronDown,
  Eye,
  EyeOff,
  Lasso,
  Loader2,
  Redo2,
  RotateCcw,
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
  action: RedactionAction
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
  const draftPointsRef = useRef<Point[]>([]);
  const draftRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

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
    [modelConfig.textApiKey, modelConfig.textBaseUrl, modelConfig.textModel, originalImage, replaceAutoActions, setAutoDetectStatus]
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
        renderRedactedCanvas(
          canvas,
          img,
          useImageStudioStore.getState().actions,
          showOriginal
        );
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

      const drawOne = (
        action: RedactionAction,
        tagText: string,
        isAuto: boolean
      ) => {
        const bounds = getActionBounds(action);
        if (!bounds) return;

        const isHighlighted = highlightedId === action.id;
        const isDimmed = Boolean(highlightedId) && !isHighlighted;

        ctx.save();
        ctx.globalAlpha = isDimmed ? 0.35 : 1;

        // Region outline
        ctx.lineWidth = (isHighlighted ? 3 : 1.75) * scaleUnit;
        ctx.strokeStyle = isHighlighted
          ? "#F59E0B"
          : isAuto
            ? "rgba(59, 130, 246, 0.9)"
            : "rgba(148, 163, 184, 0.75)";
        if (isHighlighted) {
          ctx.fillStyle = "rgba(245, 158, 11, 0.16)";
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

        ctx.fillStyle = isHighlighted
          ? "#F59E0B"
          : isAuto
            ? "#1D4ED8"
            : "#334155";
        ctx.beginPath();
        ctx.roundRect(bx, by, badgeW, badgeH, 3 * scaleUnit);
        ctx.fill();

        ctx.fillStyle = isHighlighted ? "#0F172A" : "#FFFFFF";
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
    [actions, hoveredActionId, selectedActionId, showMarkers, showOriginal]
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
        ctx.fillStyle = "rgba(59, 91, 219, 0.16)";
        ctx.strokeStyle = "rgba(59, 91, 219, 0.9)";
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
        ctx.fillStyle = "rgba(59, 91, 219, 0.95)";
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, Math.max(3, overlay.width / 260), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (isDrawing && toolShape === "brush" && draftPointsRef.current.length > 0) {
        ctx.save();
        ctx.strokeStyle = "rgba(59, 91, 219, 0.55)";
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
        ctx.fillStyle = "rgba(59, 91, 219, 0.16)";
        ctx.strokeStyle = "rgba(59, 91, 219, 0.85)";
        ctx.lineWidth = Math.max(2, overlay.width / 400);
        ctx.setLineDash([6, 4]);
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.restore();
      }

      if (manualEnabled && cursor && toolShape === "brush") {
        ctx.save();
        ctx.strokeStyle = "rgba(15, 23, 42, 0.75)";
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = Math.max(1.5, overlay.width / 500);
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    },
    [brushSize, drawRegionMarkers, isDrawing, manualEnabled, toolShape]
  );

  // Redraw numbered markers on overlay whenever actions, hover/selection, or visibility changes
  useEffect(() => {
    if (!isDrawing) {
      clearOverlay();
    }
  }, [clearOverlay, isDrawing]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!manualEnabled || showOriginal) return;
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12">
      {/* Left/Primary Darkroom Canvas Stage */}
      <div className="flex flex-col bg-[#0F100F] p-5 studio-grid-dark lg:col-span-8">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[11px] text-zinc-400">
            {isAutoDetecting
              ? "自动识别中..."
              : manualEnabled
              ? `${
                  toolShape === "lasso"
                    ? "自由圈选"
                    : toolShape === "rect"
                    ? "矩形框选"
                    : "画笔涂抹"
                } · ${actions.length} 处`
              : `已处理 ${actions.length} 处`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMarkers((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium select-none transition ${
                showMarkers
                  ? "bg-[#0F6E5D]/25 text-[#34D399] ring-1 ring-[#34D399]/30"
                  : "bg-white/[0.06] text-zinc-400 hover:bg-white/[0.12] hover:text-zinc-200"
              }`}
              title="切换画布上的打码编号标注（导出图片不会包含标注）"
            >
              {showMarkers ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3" />
              )}
              <span>编号标注</span>
            </button>
            <button
              type="button"
              onPointerDown={() => setShowOriginal(true)}
              onPointerUp={() => setShowOriginal(false)}
              onPointerLeave={() => setShowOriginal(false)}
              className="rounded-full bg-white/[0.08] px-3 py-1 text-xs font-medium text-zinc-200 select-none transition hover:bg-white/[0.15]"
            >
              {showOriginal ? "原图" : "按住对比"}
            </button>
          </div>
        </div>

        <div className="relative flex min-h-[460px] flex-1 items-center justify-center overflow-hidden rounded-2xl bg-black/40 p-3 ring-1 ring-white/[0.07]">
          <div className="relative inline-block max-h-[560px] max-w-full">
            <canvas
              ref={canvasRef}
              className="block max-h-[540px] max-w-full rounded object-contain shadow-lg"
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
              className={`absolute inset-0 h-full w-full touch-none rounded ${
                manualEnabled ? "cursor-crosshair" : "pointer-events-none"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Right Docked Dark Inspector */}
      <aside className="divide-y divide-white/10 border-t border-white/10 bg-[#1B1C1A] lg:col-span-4 lg:border-l lg:border-t-0">
        {/* Auto Redact */}
        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-zinc-300">自动识别</h3>
            {autoDetectMode && !isAutoDetecting && (
              <span className="font-mono text-[10px] text-zinc-500">
                {autoDetectMode === "ai" ? "AI" : "LOCAL"}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {AUTO_CATEGORIES.map((item) => {
              const active = autoCategories.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleToggleCategory(item.id)}
                  className={`relative flex flex-col items-center justify-center rounded-xl px-2 py-2 text-[11px] font-medium transition ${
                    active
                      ? "bg-[#0F6E5D] text-white"
                      : "bg-white/[0.05] text-zinc-400 hover:bg-white/[0.1] hover:text-zinc-200"
                  }`}
                >
                  <span>{item.label}</span>
                  {item.beta && (
                    <span
                      className={`mt-0.5 rounded px-1 py-px font-mono text-[9px] leading-none ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      Beta
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-[10px] leading-relaxed text-zinc-500">
            默认开启高置信度「文字/号码」识别；人脸与二维码为 Beta 能力，如出现误判可悬停下方编号定位后单独移除。
          </p>

          <button
            type="button"
            disabled={isAutoDetecting}
            onClick={() => {
              if (imgRef.current) void runAutoRedact(imgRef.current);
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/[0.06] py-2 text-xs font-medium text-zinc-200 transition hover:bg-white/[0.12] disabled:opacity-50"
          >
            {isAutoDetecting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>识别中...</span>
              </>
            ) : (
              <span>重新识别</span>
            )}
          </button>

          {autoActions.length > 0 && (
            <div className="max-h-32 space-y-1 overflow-y-auto pr-1 pt-1">
              {autoActions.map((act, idx) => {
                const isActive =
                  hoveredActionId === act.id || selectedActionId === act.id;
                return (
                  <div
                    key={act.id}
                    onMouseEnter={() => setHoveredActionId(act.id)}
                    onMouseLeave={() =>
                      setHoveredActionId((prev) =>
                        prev === act.id ? null : prev
                      )
                    }
                    onClick={() =>
                      setSelectedActionId((prev) =>
                        prev === act.id ? null : act.id
                      )
                    }
                    className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] transition ${
                      isActive
                        ? "bg-amber-500/15 ring-1 ring-amber-400/70"
                        : "bg-black/30 hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                          isActive
                            ? "bg-amber-400 text-[#141413]"
                            : "bg-[#0F6E5D] text-white"
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <span className="truncate text-zinc-200">
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
                      className="ml-2 rounded p-0.5 text-zinc-400 transition hover:bg-rose-500/20 hover:text-rose-300"
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

        {/* Mosaic Mode */}
        <div className="p-5">
          <h3 className="mb-3 text-xs font-medium text-zinc-300">样式</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {MOSAIC_TYPES.map((item) => {
              const active = mosaicType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMosaicType(item.id)}
                  className={`rounded-xl py-2 text-center text-[11px] font-medium transition ${
                    active
                      ? "bg-white text-[#141413]"
                      : "bg-white/[0.05] text-zinc-400 hover:bg-white/[0.1] hover:text-zinc-200"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {mosaicType !== "solid" && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-zinc-400">
                  {mosaicType === "stackblur" ? "模糊半径" : "颗粒度"}
                </span>
                <span className="font-mono text-zinc-300">{intensity}</span>
              </div>
              <input
                type="range"
                min={6}
                max={45}
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full accent-[#15A085]"
              />
            </div>
          )}
        </div>

        {/* Manual Redaction */}
        <div className="p-5">
          <button
            type="button"
            onClick={() => setManualEnabled(!manualEnabled)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-300">手动微调</span>
              {manualActions.length > 0 && (
                <span className="font-mono text-[10px] text-[#34D399]">
                  {manualActions.length}
                </span>
              )}
            </div>
            <ChevronDown
              className={`h-4 w-4 text-zinc-500 transition-transform ${
                manualEnabled ? "rotate-180 text-white" : ""
              }`}
            />
          </button>

          {manualEnabled && (
            <div className="mt-4 space-y-3.5">
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setToolShape("lasso")}
                  className={`flex items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-medium transition ${
                    toolShape === "lasso"
                      ? "bg-[#0F6E5D] text-white"
                      : "bg-white/[0.05] text-zinc-400 hover:bg-white/[0.1]"
                  }`}
                >
                  <Lasso className="h-3.5 w-3.5 shrink-0" />
                  <span>圈选</span>
                </button>
                <button
                  type="button"
                  onClick={() => setToolShape("rect")}
                  className={`flex items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-medium transition ${
                    toolShape === "rect"
                      ? "bg-[#0F6E5D] text-white"
                      : "bg-white/[0.05] text-zinc-400 hover:bg-white/[0.1]"
                  }`}
                >
                  <Square className="h-3.5 w-3.5 shrink-0" />
                  <span>框选</span>
                </button>
                <button
                  type="button"
                  onClick={() => setToolShape("brush")}
                  className={`flex items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-medium transition ${
                    toolShape === "brush"
                      ? "bg-[#0F6E5D] text-white"
                      : "bg-white/[0.05] text-zinc-400 hover:bg-white/[0.1]"
                  }`}
                >
                  <Brush className="h-3.5 w-3.5 shrink-0" />
                  <span>涂抹</span>
                </button>
              </div>

              {toolShape === "brush" && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">画笔</span>
                    <span className="font-mono text-zinc-300">{brushSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={96}
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full accent-[#15A085]"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={undoAction}
                  disabled={actions.length === 0}
                  className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-white/[0.06] py-2 text-xs text-zinc-300 transition hover:bg-white/[0.12] disabled:opacity-30"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  <span>撤销</span>
                </button>
                <button
                  type="button"
                  onClick={redoAction}
                  disabled={redoStack.length === 0}
                  className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-white/[0.06] py-2 text-xs text-zinc-300 transition hover:bg-white/[0.12] disabled:opacity-30"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                  <span>重做</span>
                </button>
                <button
                  type="button"
                  onClick={resetActions}
                  disabled={actions.length === 0}
                  className="flex items-center justify-center rounded-xl bg-white/[0.06] px-3 py-2 text-xs text-zinc-400 transition hover:bg-rose-500/20 hover:text-rose-300 disabled:opacity-30"
                  title="清空"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>

              {manualActions.length > 0 && (
                <div className="max-h-28 space-y-1 overflow-y-auto pr-1">
                  {manualActions.map((act, idx) => {
                    const isActive =
                      hoveredActionId === act.id || selectedActionId === act.id;
                    return (
                      <div
                        key={act.id}
                        onMouseEnter={() => setHoveredActionId(act.id)}
                        onMouseLeave={() =>
                          setHoveredActionId((prev) =>
                            prev === act.id ? null : prev
                          )
                        }
                        onClick={() =>
                          setSelectedActionId((prev) =>
                            prev === act.id ? null : act.id
                          )
                        }
                        className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] transition ${
                          isActive
                            ? "bg-amber-500/15 ring-1 ring-amber-400/70"
                            : "bg-black/30 hover:bg-white/[0.08]"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                              isActive
                                ? "bg-amber-400 text-[#141413]"
                                : "bg-slate-600 text-white"
                            }`}
                          >
                            M{idx + 1}
                          </span>
                          <span className="truncate text-zinc-200">
                            {act.label || "手动"}
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
                          className="ml-2 rounded p-0.5 text-zinc-400 transition hover:bg-rose-500/20 hover:text-rose-300"
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
        </div>

        <div className="p-5">
          <button
            type="button"
            onClick={handleDownload}
            className="w-full rounded-full bg-[#0F6E5D] py-2.5 text-xs font-medium text-white transition hover:bg-[#13836F]"
          >
            导出图片
          </button>
        </div>
      </aside>
    </div>
  );
}
