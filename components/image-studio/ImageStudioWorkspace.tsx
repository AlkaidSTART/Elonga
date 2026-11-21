"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useImageStudioStore } from "@/store/useImageStudioStore";
import { MosaicEditor } from "./MosaicEditor";
import { Stylize2DPanel } from "./Stylize2DPanel";

function createSampleImageDataUrl(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 640;
  const ctx = canvas.getContext("2d")!;

  const sky = ctx.createLinearGradient(0, 0, 0, 420);
  sky.addColorStop(0, "#e5e5e5");
  sky.addColorStop(0.55, "#f5f5f4");
  sky.addColorStop(1, "#fef3c7");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 960, 640);

  ctx.fillStyle = "#f59e0b";
  ctx.beginPath();
  ctx.arc(730, 145, 58, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3f3f46";
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

  ctx.fillStyle = "#10b981";
  ctx.beginPath();
  ctx.moveTo(0, 450);
  ctx.quadraticCurveTo(260, 370, 520, 440);
  ctx.quadraticCurveTo(760, 500, 960, 410);
  ctx.lineTo(960, 640);
  ctx.lineTo(0, 640);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
  ctx.beginPath();
  ctx.roundRect(70, 430, 340, 145, 16);
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("创作者示例卡片", 98, 474);
  ctx.fillStyle = "#475569";
  ctx.font = "16px sans-serif";
  ctx.fillText("订单编号：EL-2026-88412", 98, 512);
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
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex min-h-[460px] flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center transition-colors ${
          isDragging
            ? "border-neutral-900 bg-neutral-100/70"
            : "border-neutral-300 bg-[#FAFAFA] hover:border-neutral-400"
        }`}
      >
        <h2 className="text-base font-semibold text-neutral-900">
          上传图片开始处理
        </h2>
        <p className="mt-1.5 max-w-md text-xs leading-relaxed text-neutral-500">
          支持拖拽或点击选择本地 JPG、PNG、WebP 图片。上传后可进行交互式隐私打码，或一键转换为二维动漫插画风格。
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

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-neutral-800"
          >
            选择本地图片
          </button>
          <button
            type="button"
            onClick={handleLoadSample}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            使用示例图片
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {/* Unified Top Studio Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3">
        <div className="flex items-center gap-1 rounded-lg border border-neutral-200/80 bg-neutral-100/80 p-0.5">
          <button
            type="button"
            onClick={() => setActiveMode("mosaic")}
            className={`relative rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeMode === "mosaic"
                ? "text-neutral-900"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            {activeMode === "mosaic" && (
              <motion.div
                layoutId="imageStudioModePill"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="absolute inset-0 rounded-md bg-white shadow-2xs"
              />
            )}
            <span className="relative z-10">智能打码</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("stylize")}
            className={`relative rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeMode === "stylize"
                ? "text-neutral-900"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            {activeMode === "stylize" && (
              <motion.div
                layoutId="imageStudioModePill"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="absolute inset-0 rounded-md bg-white shadow-2xs"
              />
            )}
            <span className="relative z-10">二维风格化</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {imageMeta && (
            <span className="hidden font-mono text-[11px] text-neutral-400 sm:inline">
              {imageMeta.name} · {imageMeta.width}×{imageMeta.height}
            </span>
          )}
          <button
            type="button"
            onClick={clearImage}
            className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900"
          >
            更换图片
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeMode}
          initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -6, filter: "blur(3px)" }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {activeMode === "mosaic" ? <MosaicEditor /> : <Stylize2DPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
