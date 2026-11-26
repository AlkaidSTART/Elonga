"use client";

import { useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

export default function SettingsPage() {
  const { modelConfig, updateModelConfig } = useWorkbenchStore();
  const [savedToast, setSavedToast] = useState(false);
  const [showTextKey, setShowTextKey] = useState(false);
  const [showImageKey, setShowImageKey] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  const hasTextKey = Boolean(modelConfig.textApiKey.trim());
  const hasImageKey = Boolean(modelConfig.imageApiKey.trim());
  const hasAnyKey = hasTextKey || hasImageKey;

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#181816]/15 pb-5">
        <div>
          <h1 className="font-editorial text-2xl font-semibold tracking-tight text-[#181816]">
            模型配置
          </h1>
          <p className="mt-1 text-xs text-[#78716C]">
            配置文本与图像生成服务接口，密钥仅保存在当前浏览器本地存储
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {hasAnyKey && (
            <button
              type="button"
              onClick={() =>
                updateModelConfig({ textApiKey: "", imageApiKey: "" })
              }
              className="rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3.5 py-2 text-xs font-medium text-[#57534E] transition hover:border-[#181816] hover:text-[#181816]"
            >
              清空密钥
            </button>
          )}
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded bg-[#1B4D3E] px-4 py-2 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F]"
          >
            {savedToast && <Check className="h-3.5 w-3.5" />}
            <span>{savedToast ? "已保存配置" : "保存配置"}</span>
          </button>
        </div>
      </header>

      {/* Flush Rule-Divided Settings Bands (Zero Outer Card Box) */}
      <div className="divide-y divide-[#E2DDD3] border-b border-[#E2DDD3]">
        {/* Text Model Band */}
        <section className="grid grid-cols-1 gap-6 pb-9 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2">
              <h2 className="font-editorial text-base font-semibold text-[#181816]">
                文本模型
              </h2>
              <span
                className={`h-2 w-2 rounded-full ${
                  hasTextKey ? "bg-[#1B4D3E]" : "bg-[#CFC8BA]"
                }`}
              />
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[#78716C]">
              用于多平台推流文案、趋势调研与月报汇总，兼容 DeepSeek 与 OpenAI 协议。
            </p>
          </div>

          <div className="space-y-4 lg:col-span-8">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#57534E]">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showTextKey ? "text" : "password"}
                  value={modelConfig.textApiKey}
                  onChange={(e) =>
                    updateModelConfig({ textApiKey: e.target.value })
                  }
                  placeholder="sk-..."
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] py-2 pl-3 pr-9 text-sm text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
                <button
                  type="button"
                  onClick={() => setShowTextKey((v) => !v)}
                  aria-label={showTextKey ? "隐藏密钥" : "显示密钥"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#8C857B] transition hover:text-[#181816]"
                >
                  {showTextKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
              <div className="sm:col-span-7">
                <label className="mb-1.5 block text-xs font-medium text-[#57534E]">
                  Base URL
                </label>
                <input
                  type="url"
                  value={modelConfig.textBaseUrl}
                  onChange={(e) =>
                    updateModelConfig({ textBaseUrl: e.target.value })
                  }
                  placeholder="https://api.deepseek.com/v1"
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 font-mono text-xs text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
              </div>

              <div className="sm:col-span-5">
                <label className="mb-1.5 block text-xs font-medium text-[#57534E]">
                  模型名称
                </label>
                <input
                  type="text"
                  value={modelConfig.textModel}
                  onChange={(e) =>
                    updateModelConfig({ textModel: e.target.value })
                  }
                  placeholder="deepseek-chat"
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 font-mono text-xs text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Image Model Band */}
        <section className="grid grid-cols-1 gap-6 py-9 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2">
              <h2 className="font-editorial text-base font-semibold text-[#181816]">
                生图模型
              </h2>
              <span
                className={`h-2 w-2 rounded-full ${
                  hasImageKey ? "bg-[#1B4D3E]" : "bg-[#CFC8BA]"
                }`}
              />
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[#78716C]">
              用于图片工坊二维风格化重绘，兼容 Seedream 与火山方舟接口。未配置时自动降级为本地滤镜预览。
            </p>
          </div>

          <div className="space-y-4 lg:col-span-8">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#57534E]">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showImageKey ? "text" : "password"}
                  value={modelConfig.imageApiKey}
                  onChange={(e) =>
                    updateModelConfig({ imageApiKey: e.target.value })
                  }
                  placeholder="输入生图服务密钥..."
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] py-2 pl-3 pr-9 text-sm text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
                <button
                  type="button"
                  onClick={() => setShowImageKey((v) => !v)}
                  aria-label={showImageKey ? "隐藏密钥" : "显示密钥"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#8C857B] transition hover:text-[#181816]"
                >
                  {showImageKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
              <div className="sm:col-span-6">
                <label className="mb-1.5 block text-xs font-medium text-[#57534E]">
                  Base URL
                </label>
                <input
                  type="url"
                  value={modelConfig.imageBaseUrl}
                  onChange={(e) =>
                    updateModelConfig({ imageBaseUrl: e.target.value })
                  }
                  placeholder="https://ark.cn-beijing.volces.com/api/v3"
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 font-mono text-[11.5px] text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
              </div>

              <div className="sm:col-span-6">
                <label className="mb-1.5 block text-xs font-medium text-[#57534E]">
                  模型名称
                </label>
                <input
                  type="text"
                  value={modelConfig.imageModel}
                  onChange={(e) =>
                    updateModelConfig({ imageModel: e.target.value })
                  }
                  placeholder="doubao-seedream-3-0-t2i-250415"
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 font-mono text-[11.5px] text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </form>
  );
}
