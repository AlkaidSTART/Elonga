"use client";

import Link from "next/link";
import { Download, Loader2 } from "lucide-react";
import { stylizeImage2DLocal } from "@/lib/stylize-2d-canvas";
import {
  useImageStudioStore,
  type Style2DPreset,
} from "@/store/useImageStudioStore";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

const PRESETS: { id: Style2DPreset; label: string; desc: string }[] = [
  { id: "anime", label: "日系动漫", desc: "清晰墨线与高饱和色阶" },
  { id: "ghibli", label: "清新绘本", desc: "柔和日光与手绘质感" },
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
      <div className="flex flex-col bg-[#090D16] p-5 studio-grid-dark lg:col-span-8">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] tracking-wider text-slate-400 uppercase">
              SIDE-BY-SIDE COMPARE
            </span>
            {stylizeMode && (
              <span className="rounded border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                {stylizeMode === "ai" ? "AI 重绘" : "本地预览"}
              </span>
            )}
          </div>

          {stylizedImage && (
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#1D4ED8] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#1E40AF]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>下载成品</span>
            </button>
          )}
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col rounded-md border border-slate-800 bg-[#0F172A] p-3">
            <span className="mb-2 font-mono text-[10px] tracking-wider text-slate-500 uppercase">
              ORIGINAL
            </span>
            <div className="flex flex-1 items-center justify-center overflow-hidden rounded border border-slate-800/80 bg-black/50 p-2">
              {originalImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={originalImage}
                  alt="原始上传图片"
                  className="max-h-[420px] w-auto rounded-xs object-contain"
                />
              )}
            </div>
          </div>

          <div className="flex flex-col rounded-md border border-slate-800 bg-[#0F172A] p-3">
            <span className="mb-2 font-mono text-[10px] tracking-wider text-slate-500 uppercase">
              STYLIZED OUTPUT
            </span>
            <div className="flex min-h-[300px] flex-1 items-center justify-center overflow-hidden rounded border border-slate-800/80 bg-black/50 p-2">
              {isStylizing ? (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin text-[#3B82F6]" />
                  <span className="text-xs">渲染处理中...</span>
                </div>
              ) : stylizedImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={stylizedImage}
                  alt="二维风格化结果"
                  className="max-h-[420px] w-auto rounded-xs object-contain"
                />
              ) : (
                <span className="text-xs text-slate-500">等待生成</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Docked Dark Inspector */}
      <aside className="divide-y divide-slate-800 border-t border-slate-800 bg-[#0F172A] lg:col-span-4 lg:border-l lg:border-t-0">
        <div className="p-5">
          <h3 className="mb-3 text-xs font-medium text-slate-300">风格预设</h3>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((preset) => {
              const active = stylePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setStylePreset(preset.id)}
                  className={`rounded-md border px-3 py-2.5 text-left transition ${
                    active
                      ? "border-[#2563EB] bg-[#1D4ED8]/20 text-white"
                      : "border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80"
                  }`}
                >
                  <div className="text-xs font-semibold">{preset.label}</div>
                  <div className="mt-0.5 text-[10px] text-slate-400">
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
              <span className="text-slate-400">风格化强度</span>
              <span className="font-mono text-slate-300 tabular-nums">
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
              className="w-full accent-[#2563EB]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-slate-400">
              补充画面描述（选填）
            </label>
            <textarea
              rows={2}
              value={stylePrompt}
              onChange={(e) => setStylePrompt(e.target.value)}
              placeholder="例如：保持主体构图、柔和自然光线..."
              className="w-full resize-none rounded-md border border-slate-700/80 bg-[#0B1120] p-2.5 text-xs text-slate-100 outline-none placeholder:text-slate-500 focus:border-[#3B82F6]"
            />
          </div>

          {!modelConfig.imageApiKey.trim() && (
            <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/80 px-3 py-2 text-[11px] text-slate-400">
              <span>当前为本地预览模式</span>
              <Link
                href="/settings"
                className="font-medium text-[#60A5FA] hover:underline"
              >
                配置密钥
              </Link>
            </div>
          )}

          {stylizeError && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {stylizeError}
            </div>
          )}

          <button
            type="button"
            disabled={isStylizing}
            onClick={handleStylize}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#1D4ED8] py-2.5 text-xs font-medium text-white transition hover:bg-[#1E40AF] disabled:opacity-60"
          >
            {isStylizing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>生成中...</span>
              </>
            ) : (
              <span>生成二维成品</span>
            )}
          </button>
        </div>
      </aside>
    </div>
  );
}
