"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Brush,
  ChevronDown,
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
}[] = [
  { id: "text", label: "文字/号码" },
  { id: "face", label: "人脸/头像" },
  { id: "qrcode", label: "二维码" },
];

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

  const clearOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d");
    ctx?.clearRect(0, 0, overlay.width, overlay.height);
  }, []);

  const drawOverlayPreview = useCallback(
    (cursor?: Point) => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const ctx = overlay.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, overlay.width, overlay.height);

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
    [brushSize, isDrawing, manualEnabled, toolShape]
  );

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
      {/* Left Inspector Rail */}
      <aside className="divide-y divide-neutral-200/70 border-b border-neutral-200 bg-[#FAFAFA] lg:col-span-4 lg:border-b-0 lg:border-r">
        {/* Primary: Auto Redact */}
        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-semibold text-neutral-900">
                智能自动打码
              </h3>
              <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
                默认
              </span>
            </div>
            {autoDetectMode && !isAutoDetecting && (
              <span className="text-[11px] text-neutral-500">
                {autoDetectMode === "ai" ? "AI 视觉" : "本地引擎"}
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
                  className={`rounded-lg border px-2 py-2 text-[11px] font-medium transition ${
                    active
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={isAutoDetecting}
            onClick={() => {
              if (imgRef.current) void runAutoRedact(imgRef.current);
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white py-2 text-xs font-medium text-neutral-800 transition hover:bg-neutral-50 disabled:opacity-60"
          >
            {isAutoDetecting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>正在自动识别敏感区域...</span>
              </>
            ) : (
              <span>重新自动识别</span>
            )}
          </button>

          {autoActions.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                <span>已自动打码 {autoActions.length} 处</span>
                <span>可单独移除误判区域</span>
              </div>
              <div className="max-h-28 space-y-1 overflow-y-auto pr-1">
                {autoActions.map((act, idx) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between rounded-md border border-neutral-200/80 bg-white px-2.5 py-1.5 text-[11px]"
                  >
                    <span className="truncate font-medium text-neutral-700">
                      #{idx + 1} {act.label || "敏感区域"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeActionById(act.id)}
                      className="ml-2 rounded p-0.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                      title="取消此处的自动打码"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mosaic Mode */}
        <div className="p-5">
          <h3 className="mb-3 text-xs font-semibold text-neutral-900">
            打码样式
          </h3>
          <div className="space-y-1.5">
            {MOSAIC_TYPES.map((item) => {
              const active = mosaicType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMosaicType(item.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                    active
                      ? "border-neutral-900 bg-white shadow-2xs"
                      : "border-neutral-200/80 bg-white/60 hover:border-neutral-300 hover:bg-white"
                  }`}
                >
                  <span className="text-xs font-semibold text-neutral-900">
                    {item.label}
                  </span>
                  <span className="text-[11px] text-neutral-500">{item.desc}</span>
                </button>
              );
            })}
          </div>

          {mosaicType !== "solid" && (
            <div className="mt-3.5">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-700">
                  {mosaicType === "stackblur" ? "模糊半径" : "像素颗粒度"}
                </span>
                <span className="font-mono text-neutral-500">{intensity}</span>
              </div>
              <input
                type="range"
                min={6}
                max={45}
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full accent-neutral-900"
              />
            </div>
          )}
        </div>

        {/* Manual Circle / Redaction */}
        <div className="p-5">
          <button
            type="button"
            onClick={() => setManualEnabled(!manualEnabled)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900">
                <span>手动圈选打码</span>
                <span className="rounded bg-neutral-900 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  直接圈选
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                {manualEnabled
                  ? `在右侧图片上圈出区域，松手即刻处理 · 已手动 ${manualActions.length} 处`
                  : "点击开启以手动圈选、框选或涂抹"}
              </p>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-neutral-500 transition-transform ${
                manualEnabled ? "rotate-180" : ""
              }`}
            />
          </button>

          {manualEnabled && (
            <div className="mt-4 space-y-3.5 border-t border-neutral-200/70 pt-3.5">
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setToolShape("lasso")}
                  className={`flex items-center justify-center gap-1 rounded-lg border py-2 text-[11px] font-medium transition ${
                    toolShape === "lasso"
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  <Lasso className="h-3.5 w-3.5 shrink-0" />
                  <span>自由圈选</span>
                </button>
                <button
                  type="button"
                  onClick={() => setToolShape("rect")}
                  className={`flex items-center justify-center gap-1 rounded-lg border py-2 text-[11px] font-medium transition ${
                    toolShape === "rect"
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  <Square className="h-3.5 w-3.5 shrink-0" />
                  <span>矩形框选</span>
                </button>
                <button
                  type="button"
                  onClick={() => setToolShape("brush")}
                  className={`flex items-center justify-center gap-1 rounded-lg border py-2 text-[11px] font-medium transition ${
                    toolShape === "brush"
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  <Brush className="h-3.5 w-3.5 shrink-0" />
                  <span>画笔涂抹</span>
                </button>
              </div>

              {toolShape === "brush" && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-700">画笔大小</span>
                    <span className="font-mono text-neutral-500">{brushSize} px</span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={96}
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full accent-neutral-900"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={undoAction}
                  disabled={actions.length === 0}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-40"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  <span>撤销</span>
                </button>
                <button
                  type="button"
                  onClick={redoAction}
                  disabled={redoStack.length === 0}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-40"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                  <span>重做</span>
                </button>
                <button
                  type="button"
                  onClick={resetActions}
                  disabled={actions.length === 0}
                  className="flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-600 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                  title="清空所有打码"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>

              {manualActions.length > 0 && (
                <div className="max-h-24 space-y-1 overflow-y-auto pr-1 pt-0.5">
                  {manualActions.map((act, idx) => (
                    <div
                      key={act.id}
                      className="flex items-center justify-between rounded-md border border-neutral-200/80 bg-white px-2.5 py-1.5 text-[11px]"
                    >
                      <span className="truncate font-medium text-neutral-700">
                        #{idx + 1} {act.label || "手动打码"}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeActionById(act.id)}
                        className="ml-2 rounded p-0.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                        title="移除此区域打码"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-5">
          <button
            type="button"
            onClick={handleDownload}
            className="w-full rounded-lg bg-neutral-900 py-2.5 text-xs font-medium text-white transition hover:bg-neutral-800"
          >
            导出打码图片
          </button>
        </div>
      </aside>

      {/* Right Interactive Canvas Stage */}
      <div className="flex flex-col bg-[#F4F5F7] p-4 lg:col-span-8">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-neutral-500">
            {isAutoDetecting
              ? "正在自动识别隐私区域..."
              : manualEnabled
              ? toolShape === "lasso"
                ? `圈选模式：直接在图片上圈出要打码的区域，松手即刻处理（共 ${actions.length} 处）`
                : toolShape === "rect"
                ? `框选模式：在图片上拖拽框选要打码的区域，松手即刻处理（共 ${actions.length} 处）`
                : `涂抹模式：在图片上涂抹要打码的区域（共 ${actions.length} 处）`
              : `已自动打码 ${autoActions.length} 处${
                  manualActions.length > 0 ? `，手动补充 ${manualActions.length} 处` : ""
                }`}
          </span>
          <button
            type="button"
            onPointerDown={() => setShowOriginal(true)}
            onPointerUp={() => setShowOriginal(false)}
            onPointerLeave={() => setShowOriginal(false)}
            className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 select-none transition hover:bg-neutral-50"
          >
            {showOriginal ? "正在查看原图" : "按住对比原图"}
          </button>
        </div>

        <div className="relative flex min-h-[440px] flex-1 items-center justify-center overflow-hidden rounded-lg border border-neutral-200/80 bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] [background-size:16px_16px] p-3">
          <div className="relative inline-block max-h-[560px] max-w-full">
            <canvas
              ref={canvasRef}
              className="block max-h-[540px] max-w-full rounded object-contain shadow-sm"
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
    </div>
  );
}
