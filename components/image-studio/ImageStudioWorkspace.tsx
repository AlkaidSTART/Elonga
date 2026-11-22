"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Sparkles } from "lucide-react";
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
        className={`relative flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center overflow-hidden rounded-3xl bg-[#161715] p-10 text-center text-[#F5F3EE] studio-grid-dark transition-all ${
          isDragging ? "ring-2 ring-[#15A085]" : ""
        }`}
      >
        {/* Minimal Viewfinder Corner Marks */}
        <span className="pointer-events-none absolute left-7 top-7 h-5 w-5 border-l border-t border-white/25" />
        <span className="pointer-events-none absolute right-7 top-7 h-5 w-5 border-r border-t border-white/25" />
        <span className="pointer-events-none absolute bottom-7 left-7 h-5 w-5 border-b border-l border-white/25" />
        <span className="pointer-events-none absolute bottom-7 right-7 h-5 w-5 border-b border-r border-white/25" />

        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] ring-1 ring-white/10">
          <ImagePlus className="h-5 w-5 text-[#34D399]" />
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-white">
          图片工坊
        </h1>
        <p className="mt-2 font-mono text-[11px] tracking-wider text-zinc-500 uppercase">
          DROP IMAGE · JPG / PNG / WEBP
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
            className="rounded-full bg-[#0F6E5D] px-6 py-2.5 text-xs font-medium text-white transition hover:bg-[#13836F]"
          >
            选择图片
          </button>
          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-5 py-2.5 text-xs font-medium text-zinc-200 transition hover:bg-white/[0.14]"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>示例图</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-[#161715] text-zinc-100 shadow-[0_20px_50px_rgba(20,20,19,0.18)]">
      {/* Darkroom Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#1B1C1A] px-5 py-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold tracking-tight text-white">
            图片工坊
          </span>
          <div className="flex items-center gap-1 rounded-full bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setActiveMode("mosaic")}
              className={`relative rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${
                activeMode === "mosaic"
                  ? "text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {activeMode === "mosaic" && (
                <motion.div
                  layoutId="imageStudioModePill"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-full bg-[#0F6E5D]"
                />
              )}
              <span className="relative z-10">智能打码</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("stylize")}
              className={`relative rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${
                activeMode === "stylize"
                  ? "text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {activeMode === "stylize" && (
                <motion.div
                  layoutId="imageStudioModePill"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-full bg-[#0F6E5D]"
                />
              )}
              <span className="relative z-10">二维风格化</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {imageMeta && (
            <span className="hidden font-mono text-[11px] text-zinc-500 sm:inline">
              {imageMeta.width}×{imageMeta.height}
            </span>
          )}
          <button
            type="button"
            onClick={clearImage}
            className="rounded-full bg-white/[0.08] px-3 py-1 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.15] hover:text-white"
          >
            换图
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeMode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {activeMode === "mosaic" ? <MosaicEditor /> : <Stylize2DPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
