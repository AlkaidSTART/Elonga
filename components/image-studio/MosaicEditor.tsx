"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Brush,
  Download,
  Eye,
  Grid,
  Redo2,
  RotateCcw,
  Shield,
  Square,
  Undo2,
  Droplets,
} from "lucide-react";
import { renderRedactedCanvas } from "@/lib/mosaic-canvas";
import {
  useImageStudioStore,
  type MosaicType,
  type Point,
  type RedactionAction,
} from "@/store/useImageStudioStore";

const MOSAIC_TYPES: { id: MosaicType; label: string; desc: string; icon: typeof Droplets }[] = [
  { id: "stackblur", label: "柔焦模糊", desc: "StackBlur 高斯打码", icon: Droplets },
  { id: "pixelate", label: "像素马赛克", desc: "经典方块像素格", icon: Grid },
  { id: "solid", label: "纯色遮盖", desc: "深灰隐私色块", icon: Shield },
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
    setMosaicType,
    setToolShape,
    setBrushSize,
    setIntensity,
    pushAction,
    undoAction,
    redoAction,
    resetActions,
  } = useImageStudioStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const draftPointsRef = useRef<Point[]>([]);
  const draftRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  // Load image element whenever originalImage changes
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
        renderRedactedCanvas(canvas, img, actions, showOriginal);
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

      if (cursor && toolShape === "brush") {
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
    [brushSize, isDrawing, toolShape]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (showOriginal) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getCanvasPoint(e);
    setIsDrawing(true);

    if (toolShape === "brush") {
      draftPointsRef.current = [pt];
      draftRectRef.current = null;
    } else {
      draftPointsRef.current = [];
      draftRectRef.current = { x: pt.x, y: pt.y, w: 0, h: 0 };
    }
    drawOverlayPreview(pt);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);
    if (!isDrawing) {
      drawOverlayPreview(pt);
      return;
    }

    if (toolShape === "brush") {
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

    if (toolShape === "brush" && draftPointsRef.current.length > 0) {
      const action: RedactionAction = {
        id: `act_${Date.now()}`,
        type: mosaicType,
        shape: "brush",
        intensity,
        brushSize,
        points: [...draftPointsRef.current],
      };
      pushAction(action);
    } else if (
      toolShape === "rect" &&
      draftRectRef.current &&
      Math.abs(draftRectRef.current.w) > 4 &&
      Math.abs(draftRectRef.current.h) > 4
    ) {
      const action: RedactionAction = {
        id: `act_${Date.now()}`,
        type: mosaicType,
        shape: "rect",
        intensity,
        brushSize,
        rect: { ...draftRectRef.current },
      };
      pushAction(action);
    }

    draftPointsRef.current = [];
    draftRectRef.current = null;
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12">
      {/* Left Inspector Rail */}
      <aside className="divide-y divide-neutral-200/70 border-b border-neutral-200 bg-[#FAFAFA] lg:col-span-4 lg:border-b-0 lg:border-r">
        {/* Mosaic Mode */}
        <div className="p-5">
          <h3 className="mb-3 text-xs font-semibold text-neutral-900">
            打码样式
          </h3>
          <div className="space-y-1.5">
            {MOSAIC_TYPES.map((item) => {
              const Icon = item.icon;
              const active = mosaicType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMosaicType(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                    active
                      ? "border-neutral-900 bg-white shadow-2xs"
                      : "border-neutral-200/80 bg-white/60 hover:border-neutral-300 hover:bg-white"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active ? "text-blue-600" : "text-neutral-500"
                    }`}
                  />
                  <div>
                    <div className="text-xs font-semibold text-neutral-900">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-neutral-500">{item.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Shape & Parameters */}
        <div className="space-y-4 p-5">
          <div>
            <h3 className="mb-2.5 text-xs font-semibold text-neutral-900">
              涂抹工具
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setToolShape("brush")}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition ${
                  toolShape === "brush"
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <Brush className="h-3.5 w-3.5" />
                <span>画笔涂抹</span>
              </button>
              <button
                type="button"
                onClick={() => setToolShape("rect")}
                className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition ${
                  toolShape === "rect"
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <Square className="h-3.5 w-3.5" />
                <span>矩形框选</span>
              </button>
            </div>
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

          {mosaicType !== "solid" && (
            <div>
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

          <div className="flex items-center gap-2 pt-1">
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
        </div>

        <div className="p-5">
          <button
            type="button"
            onClick={handleDownload}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 py-2.5 text-xs font-medium text-white transition hover:bg-neutral-800"
          >
            <Download className="h-3.5 w-3.5" />
            <span>导出打码图片</span>
          </button>
        </div>
      </aside>

      {/* Right Interactive Canvas Stage */}
      <div className="flex flex-col bg-[#F4F5F7] p-4 lg:col-span-8">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-neutral-500">
            在图片上拖拽涂抹或框选（已应用 {actions.length} 处）
          </span>
          <button
            type="button"
            onPointerDown={() => setShowOriginal(true)}
            onPointerUp={() => setShowOriginal(false)}
            onPointerLeave={() => setShowOriginal(false)}
            className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 select-none transition hover:bg-neutral-50"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{showOriginal ? "正在查看原图" : "按住对比原图"}</span>
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
              className="absolute inset-0 h-full w-full touch-none cursor-crosshair rounded"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
