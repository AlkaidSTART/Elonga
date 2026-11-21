"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Eraser,
  ImagePlus,
  RefreshCw,
  Upload,
  Wand2,
} from "lucide-react";
import { useImageStudioStore } from "@/store/useImageStudioStore";
import { MosaicEditor } from "./MosaicEditor";
import { Stylize2DPanel } from "./Stylize2DPanel";

function createSampleImageDataUrl(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 640;
  const ctx = canvas.getContext("2d")!;

  // Soft sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, 420);
  sky.addColorStop(0, "#60a5fa");
  sky.addColorStop(0.55, "#bae6fd");
  sky.addColorStop(1, "#fef3c7");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 960, 640);

  // Sun
  ctx.fillStyle = "#fde047";
  ctx.beginPath();
  ctx.arc(730, 145, 58, 0, Math.PI * 2);
  ctx.fill();

  // Distant mountains
  ctx.fillStyle = "#6366f1";
  ctx.beginPath();
  ctx.moveTo(0, 410);
  ctx.lineTo(220, 230);
  ctx.lineTo(440, 380);
  ctx.lineTo(680, 200);
  ctx.lineTo(960, 390);
  ctx.lineTo(960, 640);
  ctx.lineTo(0, 640);
  ctx.closePath();
  ctx.fill();

  // Foreground hills
  ctx.fillStyle = "#10b981";
  ctx.beginPath();
  ctx.moveTo(0, 450);
  ctx.quadraticCurveTo(260, 370, 520, 440);
  ctx.quadraticCurveTo(760, 500, 960, 410);
  ctx.lineTo(960, 640);
  ctx.lineTo(0, 640);
  ctx.closePath();
  ctx.fill();

  // Sample privacy card to demonstrate redaction
  ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
  ctx.beginPath();
  ctx.roundRect(70, 430, 340, 145, 18);
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("创作者示例卡片", 98, 474);
  ctx.fillStyle = "#475569";
  ctx.font = "16px sans-serif";
  ctx.fillText("订单编号：JY-2026-88412", 98, 512);
  ctx.fillText("联系方式：138-0000-1234", 98, 544);

  return canvas.toDataURL("image/png");
}

export function ImageStudioWorkspace() {
  const {
    activeMode,
    originalImage,
    imageMeta,
    setActiveMode,
    setImage,
    clearImage,
  } = useImageStudioStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const loadFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        setImage(dataUrl, {
          name: file.name,
          width: img.width,
          height: img.height,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  const handleLoadSample = () => {
    const url = createSampleImageDataUrl();
    setImage(url, { name: "sample_scene.png", width: 960, height: 640 });
  };

  if (!originalImage) {
    return (
      <div className="mx-auto max-w-3xl py-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex min-h-[420px] flex-col items-center justify-center rounded-3xl border-2 border-dashed p-10 text-center transition-all ${
            isDragging
              ? "border-indigo-500 bg-indigo-50/40"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <ImagePlus className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-slate-900">
            上传图片开始处理
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
            支持拖拽或点击选择本地 JPG、PNG、WebP 图片。上传后可随时进行交互式隐私打码，或一键转换为二维动漫插画风格。
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) loadFile(file);
            }}
          />

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700"
            >
              <Upload className="h-4 w-4" />
              <span>选择本地图片</span>
            </button>
            <button
              type="button"
              onClick={handleLoadSample}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              使用示例图片体验
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Studio Sub-Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-3.5 shadow-xs">
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveMode("mosaic")}
            className={`relative flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
              activeMode === "mosaic"
                ? "text-slate-900"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {activeMode === "mosaic" && (
              <motion.div
                layoutId="imageStudioModePill"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="absolute inset-0 rounded-lg bg-white shadow-xs"
              />
            )}
            <Eraser className="relative z-10 h-3.5 w-3.5" />
            <span className="relative z-10">智能打码</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("stylize")}
            className={`relative flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
              activeMode === "stylize"
                ? "text-slate-900"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {activeMode === "stylize" && (
              <motion.div
                layoutId="imageStudioModePill"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="absolute inset-0 rounded-lg bg-white shadow-xs"
              />
            )}
            <Wand2 className="relative z-10 h-3.5 w-3.5" />
            <span className="relative z-10">二维风格化</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {imageMeta && (
            <span className="hidden text-xs text-slate-500 sm:inline">
              {imageMeta.name} ({imageMeta.width} x {imageMeta.height})
            </span>
          )}
          <button
            type="button"
            onClick={clearImage}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>更换图片</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeMode}
          initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          {activeMode === "mosaic" ? <MosaicEditor /> : <Stylize2DPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
