"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { stylizeImage2DLocal } from "@/lib/stylize-2d-canvas";
import {
  useImageStudioStore,
  type Style2DPreset,
} from "@/store/useImageStudioStore";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

const PRESETS: { id: Style2DPreset; label: string; desc: string }[] = [
  { id: "anime", label: "日系动漫", desc: "清晰墨线与高饱和赛璐璐" },
  { id: "ghibli", label: "清新绘本", desc: "柔和日光与手绘故事感" },
  { id: "cel", label: "扁平插画", desc: "利落色块与现代杂志风" },
  { id: "watercolor", label: "水彩手绘", desc: "通透晕染与细腻线稿" },
];

export function Stylize2DPanel() {
  const {
    originalImage,
    imageMeta,
    stylePreset,
    stylePrompt,
    stylizeStrength,
    isStylizing,
    stylizedImage,
    stylizeMode,
    stylizeError,
    setStylePreset,
    setStylePrompt,
    setStylizeStrength,
    setIsStylizing,
    setStylizeResult,
  } = useImageStudioStore();

  const modelConfig = useWorkbenchStore((s) => s.modelConfig);

  const handleStylize = async () => {
    if (!originalImage) return;
    setIsStylizing(true);
    setStylizeResult(stylizedImage, stylizeMode, null);

    try {
      const res = await fetch("/api/stylize-2d", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: originalImage,
          stylePreset,
          stylePrompt,
          strength: stylizeStrength,
          modelConfig: {
            apiKey: modelConfig.imageApiKey,
            baseUrl: modelConfig.imageBaseUrl,
            imageModel: modelConfig.imageModel,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "风格化请求失败");
      }

      if (data.fallback) {
        const localUrl = await stylizeImage2DLocal(
          originalImage,
          stylePreset,
          stylizeStrength
        );
        setStylizeResult(localUrl, "local", null);
      } else if (data.imageUrl) {
        setStylizeResult(data.imageUrl, "ai", null);
      } else {
        throw new Error("未获取到有效的二维风格图片");
      }
    } catch (err) {
      setStylizeResult(
        null,
        null,
        err instanceof Error ? err.message : "处理失败，请重试"
      );
    } finally {
      setIsStylizing(false);
    }
  };

  const handleDownload = () => {
    if (!stylizedImage) return;
    const link = document.createElement("a");
    const baseName = imageMeta?.name?.replace(/\.[^.]+$/, "") || "image";
    link.download = `${baseName}_二维风格.png`;
    link.href = stylizedImage;
    link.click();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12">
      {/* Left Inspector Rail */}
      <aside className="divide-y divide-neutral-200/70 border-b border-neutral-200 bg-[#FAFAFA] lg:col-span-4 lg:border-b-0 lg:border-r">
        <div className="p-5">
          <h3 className="mb-3 text-xs font-semibold text-neutral-900">
            选择二维画风
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((preset) => {
              const active = stylePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setStylePreset(preset.id)}
                  className={`rounded-lg border p-3 text-left transition ${
                    active
                      ? "border-neutral-900 bg-white shadow-2xs"
                      : "border-neutral-200/80 bg-white/60 hover:border-neutral-300 hover:bg-white"
                  }`}
                >
                  <div className="text-xs font-semibold text-neutral-900">
                    {preset.label}
                  </div>
                  <div className="mt-1 text-[11px] leading-snug text-neutral-500">
                    {preset.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-neutral-700">风格化强度</span>
              <span className="font-mono text-neutral-500">
                {Math.round(stylizeStrength * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.3}
              max={0.95}
              step={0.05}
              value={stylizeStrength}
              onChange={(e) => setStylizeStrength(Number(e.target.value))}
              className="w-full accent-neutral-900"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700">
              画面补充描述（选填，大模型模式生效）
            </label>
            <textarea
              rows={2}
              value={stylePrompt}
              onChange={(e) => setStylePrompt(e.target.value)}
              placeholder="例如：保留人物神态，背景加入柔和春日光影..."
              className="w-full resize-none rounded-lg border border-neutral-200 bg-white p-2.5 text-xs text-neutral-900 outline-none transition focus:border-neutral-900"
            />
          </div>

          {!modelConfig.imageApiKey.trim() && (
            <div className="rounded-lg border border-neutral-200 bg-white p-3 text-xs leading-relaxed text-neutral-600">
              当前未配置图像大模型 API Key，将使用本地二维线稿与赛璐璐算法进行即时预览。
              <Link
                href="/settings"
                className="ml-1 font-semibold text-neutral-900 underline underline-offset-2"
              >
                去配置
              </Link>
            </div>
          )}

          {stylizeError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {stylizeError}
            </div>
          )}

          <button
            type="button"
            disabled={isStylizing}
            onClick={handleStylize}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 py-2.5 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
          >
            {isStylizing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>正在绘制二维风格...</span>
              </>
            ) : (
              <span>生成二维风格图片</span>
            )}
          </button>
        </div>
      </aside>

      {/* Right Preview Comparison Stage */}
      <div className="flex flex-col bg-[#F4F5F7] p-5 lg:col-span-8">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-700">
              效果对比
            </span>
            {stylizeMode && (
              <span className="rounded border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                {stylizeMode === "ai" ? "图像大模型重绘" : "本地 2D 算法预览"}
              </span>
            )}
          </div>

          {stylizedImage && (
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-neutral-800"
            >
              下载二维成品图
            </button>
          )}
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col rounded-lg border border-neutral-200/80 bg-white p-3">
            <span className="mb-2 text-[11px] font-medium text-neutral-400">
              原始图片
            </span>
            <div className="flex flex-1 items-center justify-center overflow-hidden rounded bg-[#FAFAFA] p-2">
              {originalImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={originalImage}
                  alt="原始上传图片"
                  className="max-h-[420px] w-auto rounded object-contain"
                />
              )}
            </div>
          </div>

          <div className="flex flex-col rounded-lg border border-neutral-200/80 bg-white p-3">
            <span className="mb-2 text-[11px] font-medium text-neutral-400">
              二维风格成品
            </span>
            <div className="flex min-h-[300px] flex-1 items-center justify-center overflow-hidden rounded bg-[#FAFAFA] p-2">
              {isStylizing ? (
                <div className="flex flex-col items-center gap-2 text-neutral-400">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-700" />
                  <span className="text-xs">正在重绘二维线条与色彩...</span>
                </div>
              ) : stylizedImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={stylizedImage}
                  alt="二维风格化结果"
                  className="max-h-[420px] w-auto rounded object-contain"
                />
              ) : (
                <div className="px-6 text-center text-xs leading-relaxed text-neutral-400">
                  在左侧选择画风并点击生成，即可查看风格化效果
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
