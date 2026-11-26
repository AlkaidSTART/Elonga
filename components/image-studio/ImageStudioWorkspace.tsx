"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileImage, ImagePlus, RefreshCw } from "lucide-react";
import { isAllowedRasterImageType } from "@/lib/url-safety";
import { useImageStudioStore } from "@/store/useImageStudioStore";
import { MosaicEditor } from "./MosaicEditor";
import { Stylize2DPanel } from "./Stylize2DPanel";

function createSampleImageDataUrl(): string {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 640;
  const ctx = canvas.getContext("2d")!;

  // Warm editorial paper studio backdrop
  ctx.fillStyle = "#EFECE4";
  ctx.fillRect(0, 0, 960, 640);

  // Subtle architectural grid
  ctx.strokeStyle = "rgba(24, 24, 22, 0.05)";
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

  // Top pine green bar
  ctx.fillStyle = "#1B4D3E";
  ctx.fillRect(0, 0, 960, 6);

  // Clean document card for redaction / stylize testing
  ctx.fillStyle = "#FCFBF8";
  ctx.fillRect(72, 76, 816, 488);
  ctx.strokeStyle = "#D5CFC3";
  ctx.lineWidth = 2;
  ctx.strokeRect(72, 76, 816, 488);

  // Card header
  ctx.fillStyle = "#F6F4EF";
  ctx.fillRect(73, 77, 814, 88);
  ctx.fillStyle = "#E2DDD3";
  ctx.fillRect(73, 165, 814, 1);

  ctx.fillStyle = "#1B4D3E";
  ctx.fillRect(108, 108, 4, 26);

  ctx.fillStyle = "#181816";
  ctx.font = "600 24px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("公益物资交接单 · 现场核验样本", 126, 129);

  ctx.fillStyle = "#8C857B";
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
    ctx.fillStyle = "#78716C";
    ctx.font = "500 15px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(k, 108, y);

    ctx.fillStyle = "#181816";
    ctx.font = "600 17px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(v, 280, y);

    if (i < rows.length - 1) {
      ctx.fillStyle = "#E2DDD3";
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
    if (!isAllowedRasterImageType(file.type)) return;
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
      <div className="space-y-8">
        <header className="border-b border-[#181816]/15 pb-5">
          <h1 className="font-editorial text-2xl font-semibold tracking-tight text-[#181816]">
            图片工坊
          </h1>
          <p className="mt-1 text-xs text-[#78716C]">
            公益现场素材的隐私保护打码与二维插画风格化工作台
          </p>
        </header>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
          {/* Left Editorial Capability Index (No Cards) */}
          <div className="flex flex-col justify-between divide-y divide-[#E2DDD3] border-y border-[#E2DDD3] lg:col-span-5">
            <div className="py-6">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-[#1B4D3E]">01</span>
                <h2 className="font-editorial text-base font-semibold text-[#181816]">
                  智能隐私打码
                </h2>
              </div>
              <p className="mt-2 pl-7 text-xs leading-relaxed text-[#57534E]">
                自动识别现场照片中的手机号、单据编号、人脸与二维码；支持柔焦模糊、像素马赛克与纯色遮盖，并可手动圈选、框选或画笔微调。
              </p>
            </div>

            <div className="py-6">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-[#B85D3B]">02</span>
                <h2 className="font-editorial text-base font-semibold text-[#181816]">
                  二维风格化重绘
                </h2>
              </div>
              <p className="mt-2 pl-7 text-xs leading-relaxed text-[#57534E]">
                将实拍画面转为清新绘本、水彩手绘、扁平插画或日系动漫风格，在保护受助人肖像的同时保留现场温度与叙事张力。
              </p>
            </div>

            <div className="py-4 text-[11px] text-[#8C857B]">
              支持 JPG · PNG · WebP 本地处理，未配置生图密钥时亦可离线预览
            </div>
          </div>

          {/* Right Tactile Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex min-h-[380px] flex-col items-center justify-center border border-dashed p-10 text-center transition-colors lg:col-span-7 ${
              isDragging
                ? "border-[#1B4D3E] bg-[#E9F0ED]/60"
                : "border-[#CFC8BA] bg-[#EFECE4]/50 hover:border-[#8C857B]"
            }`}
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded border border-[#D5CFC3] bg-[#FCFBF8] text-[#1B4D3E]">
              <ImagePlus className="h-5 w-5" />
            </div>

            <h2 className="font-editorial text-lg font-semibold text-[#181816]">
              拖放或选择本地图片进入工作台
            </h2>
            <p className="mt-1.5 text-xs text-[#78716C]">
              载入后将自动扫描敏感信息区域，随时可切换至二维风格化
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
                className="rounded bg-[#1B4D3E] px-5 py-2 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F]"
              >
                选择本地图片
              </button>
              <button
                type="button"
                onClick={handleLoadSample}
                className="inline-flex items-center gap-1.5 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-4 py-2 text-xs font-medium text-[#181816] transition hover:border-[#181816]"
              >
                <FileImage className="h-3.5 w-3.5 text-[#8C857B]" />
                <span>载入示例样本</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Editorial Masthead Header */}
      <header className="flex flex-col gap-4 border-b border-[#181816]/15 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="font-editorial text-2xl font-semibold tracking-tight text-[#181816]">
              图片工坊
            </h1>
            {imageMeta && (
              <div className="flex items-center gap-2 font-mono text-[11px] text-[#8C857B] tabular-nums">
                <span className="max-w-[200px] truncate text-[#57534E]">
                  {imageMeta.name}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {imageMeta.width}×{imageMeta.height}
                </span>
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-[#78716C]">
            {activeMode === "mosaic"
              ? "智能识别并遮盖敏感文字、号码与人像，导出纯净合规素材"
              : "将现场实拍转为柔和插画或绘本风格，兼顾隐私保护与叙事温度"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented Mode Switcher matching Elonga Editorial style */}
          <div className="relative flex items-center gap-0.5 rounded-md border border-[#E2DDD3] bg-[#EFECE4] p-0.5">
            {(
              [
                { id: "mosaic", label: "智能打码" },
                { id: "stylize", label: "二维风格化" },
              ] as const
            ).map((tab) => {
              const isSelected = activeMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveMode(tab.id)}
                  className={`relative rounded-[4px] px-3 py-1 text-xs font-medium transition-colors ${
                    isSelected
                      ? "text-[#1B4D3E]"
                      : "text-[#78716C] hover:text-[#181816]"
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="imageStudioModePill"
                      transition={{
                        type: "spring",
                        stiffness: 480,
                        damping: 36,
                      }}
                      className="absolute inset-0 rounded-[4px] bg-[#FCFBF8] shadow-[0_1px_2px_rgba(24,24,22,0.06)]"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={clearImage}
            className="inline-flex items-center gap-1.5 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-1.5 text-xs font-medium text-[#181816] transition hover:border-[#181816] hover:bg-[#EFECE4]/50"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#78716C]" />
            <span>更换图片</span>
          </button>
        </div>
      </header>

      {/* Editorial Studio Desk Surface */}
      <div className="overflow-hidden rounded-lg border border-[#E2DDD3] bg-[#FCFBF8] shadow-[0_1px_3px_rgba(24,24,22,0.04)]">
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
    </div>
  );
}
