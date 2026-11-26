"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileImage, ImagePlus, RefreshCw } from "lucide-react";
import { useImageStudioStore } from "@/store/useImageStudioStore";
import { MosaicEditor } from "./MosaicEditor";
import { Stylize2DPanel } from "./Stylize2DPanel";

function createSampleImageDataUrl(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 640;
  const ctx = canvas.getContext("2d")!;

  // Deep slate studio backdrop
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(0, 0, 960, 640);

  // Subtle architectural grid
  ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= 960; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 640);
    ctx.stroke();
  }
  for (let y = 0; y <= 640; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(960, y);
    ctx.stroke();
  }

  // Top cobalt bar
  ctx.fillStyle = "#1D4ED8";
  ctx.fillRect(0, 0, 960, 6);

  // Clean document card for redaction / stylize testing
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(72, 76, 816, 488);
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 2;
  ctx.strokeRect(72, 76, 816, 488);

  // Card header
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(73, 77, 814, 88);
  ctx.fillStyle = "#E2E8F0";
  ctx.fillRect(73, 165, 814, 1);

  ctx.fillStyle = "#1D4ED8";
  ctx.fillRect(108, 108, 4, 26);

  ctx.fillStyle = "#0F172A";
  ctx.font = "600 24px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("公益物资交接单 · 现场核验样本", 126, 129);

  ctx.fillStyle = "#64748B";
  ctx.font = "500 13px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("示例样本 · 960×640", 720, 125);

  const rows = [
    ["工单编号", "EL-2026-88412"],
    ["现场联系人", "138-0000-1234"],
    ["接收单位", "某乡村小学图书角项目组"],
    ["物资清单", "少儿绘本 620 册 / 书架 6 组"],
    ["归档备注", "发布前请对敏感编号与联系电话打码"],
  ];

  rows.forEach(([k, v], i) => {
    const y = 224 + i * 64;
    ctx.fillStyle = "#64748B";
    ctx.font = "500 15px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(k, 108, y);

    ctx.fillStyle = "#0F172A";
    ctx.font = "600 17px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(v, 280, y);

    if (i < rows.length - 1) {
      ctx.fillStyle = "#F1F5F9";
      ctx.fillRect(108, y + 22, 744, 1);
    }
  });

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
    setImage(url, { name: "sample_document.png", width: 960, height: 640 });
  };

  if (!originalImage) {
    return (
      <div className="space-y-5">
        <header className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[#111827]">
              图片工坊
            </h1>
            <p className="mt-0.5 text-xs text-gray-500">
              对现场素材进行隐私打码或二维风格化处理
            </p>
          </div>
        </header>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex min-h-[calc(100vh-14rem)] flex-col items-center justify-center rounded-xl border border-dashed bg-white p-10 text-center transition-colors ${
            isDragging
              ? "border-[#3451E5] bg-[#EEF2FF]/40"
              : "border-[#D1D5DB] hover:border-gray-400"
          }`}
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F3F4F6] text-[#3451E5]">
            <ImagePlus className="h-5 w-5" />
          </div>

          <h2 className="text-base font-semibold text-[#111827]">
            拖放或选择本地图片
          </h2>
          <p className="mt-1.5 text-xs text-gray-500">
            支持 JPG、PNG、WebP 格式，用于隐私信息打码与二维风格化
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
              className="rounded-md bg-[#3451E5] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#2740C7]"
            >
              选择本地图片
            </button>
            <button
              type="button"
              onClick={handleLoadSample}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <FileImage className="h-3.5 w-3.5 text-gray-400" />
              <span>载入示例样本</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#1E293B] bg-[#0B1120] text-slate-100 shadow-[0_4px_20px_rgba(15,23,42,0.12)]">
      {/* Editor Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0F172A] px-5 py-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold tracking-tight text-white">
            图片工坊
          </span>

          <div className="flex items-center gap-0.5 rounded-md border border-slate-800 bg-[#0B1120] p-0.5">
            <button
              type="button"
              onClick={() => setActiveMode("mosaic")}
              className={`rounded-[5px] px-3 py-1 text-xs font-medium transition ${
                activeMode === "mosaic"
                  ? "bg-[#3451E5] text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              智能打码
            </button>
            <button
              type="button"
              onClick={() => setActiveMode("stylize")}
              className={`rounded-[5px] px-3 py-1 text-xs font-medium transition ${
                activeMode === "stylize"
                  ? "bg-[#3451E5] text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              二维风格化
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {imageMeta && (
            <span className="hidden font-mono text-[11px] text-slate-500 tabular-nums sm:inline">
              {imageMeta.width}×{imageMeta.height}
            </span>
          )}
          <button
            type="button"
            onClick={clearImage}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>更换图片</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeMode}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
        >
          {activeMode === "mosaic" ? <MosaicEditor /> : <Stylize2DPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
