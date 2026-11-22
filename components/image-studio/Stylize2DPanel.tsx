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
      {/* Left/Main Preview Comparison Stage */}
      <div className="flex flex-col bg-[#0F100F] p-5 studio-grid-dark lg:col-span-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] tracking-wider text-zinc-400 uppercase">
              COMPARE
            </span>
            {stylizeMode && (
              <span className="rounded-full bg-white/[0.08] px-2.5 py-0.5 text-[10px] font-medium text-zinc-300">
                {stylizeMode === "ai" ? "AI 重绘" : "本地预览"}
              </span>
            )}
          </div>

          {stylizedImage && (
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-full bg-[#0F6E5D] px-3.5 py-1 text-xs font-medium text-white transition hover:bg-[#13836F]"
            >
              下载成品
            </button>
          )}
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col rounded-2xl bg-[#181917] p-3 ring-1 ring-white/[0.07]">
            <span className="mb-2 font-mono text-[10px] text-zinc-500">
              原图
            </span>
            <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-black/40 p-2">
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

          <div className="flex flex-col rounded-2xl bg-[#181917] p-3 ring-1 ring-white/[0.07]">
            <span className="mb-2 font-mono text-[10px] text-zinc-500">
              二维成品
            </span>
            <div className="flex min-h-[300px] flex-1 items-center justify-center overflow-hidden rounded-xl bg-black/40 p-2">
              {isStylizing ? (
                <div className="flex flex-col items-center gap-2 text-zinc-400">
                  <Loader2 className="h-5 w-5 animate-spin text-[#34D399]" />
                  <span className="text-xs">绘制中...</span>
                </div>
              ) : stylizedImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={stylizedImage}
                  alt="二维风格化结果"
                  className="max-h-[420px] w-auto rounded object-contain"
                />
              ) : (
                <span className="text-xs text-zinc-500">等待生成</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Docked Dark Inspector */}
      <aside className="divide-y divide-white/10 border-t border-white/10 bg-[#1B1C1A] lg:col-span-4 lg:border-l lg:border-t-0">
        <div className="p-5">
          <h3 className="mb-3 text-xs font-medium text-zinc-400">画风</h3>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((preset) => {
              const active = stylePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setStylePreset(preset.id)}
                  className={`rounded-xl px-3 py-2.5 text-left transition ${
                    active
                      ? "bg-[#0F6E5D] text-white"
                      : "bg-white/[0.05] text-zinc-300 hover:bg-white/[0.1]"
                  }`}
                >
                  <div className="text-xs font-semibold">{preset.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-zinc-400">强度</span>
              <span className="font-mono text-zinc-300">
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
              className="w-full accent-[#15A085]"
            />
          </div>

          <div>
            <textarea
              rows={2}
              value={stylePrompt}
              onChange={(e) => setStylePrompt(e.target.value)}
              placeholder="补充画面描述（选填）..."
              className="w-full resize-none rounded-xl bg-black/35 p-2.5 text-xs text-zinc-100 outline-none ring-1 ring-white/10 placeholder:text-zinc-500 focus:ring-[#15A085]"
            />
          </div>

          {!modelConfig.imageApiKey.trim() && (
            <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2 text-[11px] text-zinc-400">
              <span>当前为本地预览模式</span>
              <Link
                href="/settings"
                className="font-medium text-[#34D399] hover:underline"
              >
                配置密钥
              </Link>
            </div>
          )}

          {stylizeError && (
            <div className="rounded-xl bg-rose-500/15 px-3 py-2 text-xs text-rose-300">
              {stylizeError}
            </div>
          )}

          <button
            type="button"
            disabled={isStylizing}
            onClick={handleStylize}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0F6E5D] py-2.5 text-xs font-medium text-white transition hover:bg-[#13836F] disabled:opacity-60"
          >
            {isStylizing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>生成中...</span>
              </>
            ) : (
              <span>生成二维图</span>
            )}
          </button>
        </div>
      </aside>
    </div>
  );
}
