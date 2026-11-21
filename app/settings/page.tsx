"use client";

import { useState } from "react";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

export default function SettingsPage() {
  const { modelConfig, updateModelConfig } = useWorkbenchStore();
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  const hasAnyKey = Boolean(
    modelConfig.textApiKey.trim() || modelConfig.imageApiKey.trim()
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="border-b border-neutral-200/80 pb-5">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
          模型接口配置
        </h1>
        <p className="mt-1 text-xs text-neutral-500">
          分别配置文本模型（默认 DeepSeek）与生图模型（如 Seedream / 火山方舟等兼容接口）的端点与密钥
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="divide-y divide-neutral-200/70 rounded-xl border border-neutral-200 bg-white"
      >
        {/* Text Model Section */}
        <div className="space-y-4 p-6">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              文本模型（推流文案）
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              默认使用 DeepSeek 端点，支持任何 OpenAI Chat Completions 兼容接口
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700">
              文本模型 API Key
            </label>
            <input
              type="password"
              value={modelConfig.textApiKey}
              onChange={(e) =>
                updateModelConfig({ textApiKey: e.target.value })
              }
              placeholder="sk-..."
              className="w-full rounded-lg border border-neutral-200 bg-[#FAFAFA] px-3.5 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                文本模型 Base URL
              </label>
              <input
                type="url"
                value={modelConfig.textBaseUrl}
                onChange={(e) =>
                  updateModelConfig({ textBaseUrl: e.target.value })
                }
                placeholder="https://api.deepseek.com/v1"
                className="w-full rounded-lg border border-neutral-200 bg-[#FAFAFA] px-3.5 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                文本模型名称
              </label>
              <input
                type="text"
                value={modelConfig.textModel}
                onChange={(e) =>
                  updateModelConfig({ textModel: e.target.value })
                }
                placeholder="deepseek-chat"
                className="w-full rounded-lg border border-neutral-200 bg-[#FAFAFA] px-3.5 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Image Model Section */}
        <div className="space-y-4 p-6">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              生图模型（图片工坊）
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              独立配置生图服务端点，支持 Seedream / 火山方舟及其他兼容图像编辑接口
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700">
              生图模型 API Key
            </label>
            <input
              type="password"
              value={modelConfig.imageApiKey}
              onChange={(e) =>
                updateModelConfig({ imageApiKey: e.target.value })
              }
              placeholder="输入生图端点 API Key..."
              className="w-full rounded-lg border border-neutral-200 bg-[#FAFAFA] px-3.5 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                生图模型 Base URL
              </label>
              <input
                type="url"
                value={modelConfig.imageBaseUrl}
                onChange={(e) =>
                  updateModelConfig({ imageBaseUrl: e.target.value })
                }
                placeholder="https://ark.cn-beijing.volces.com/api/v3"
                className="w-full rounded-lg border border-neutral-200 bg-[#FAFAFA] px-3.5 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                生图模型名称
              </label>
              <input
                type="text"
                value={modelConfig.imageModel}
                onChange={(e) =>
                  updateModelConfig({ imageModel: e.target.value })
                }
                placeholder="doubao-seedream-3-0-t2i-250415"
                className="w-full rounded-lg border border-neutral-200 bg-[#FAFAFA] px-3.5 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 bg-[#FAFAFA] px-6 py-4">
          {hasAnyKey && (
            <button
              type="button"
              onClick={() =>
                updateModelConfig({ textApiKey: "", imageApiKey: "" })
              }
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-200/60 hover:text-neutral-900"
            >
              清空密钥
            </button>
          )}
            <button
              type="submit"
              className="rounded-xl bg-[#0F6E5D] px-4 py-2 text-xs font-medium text-white shadow-xs transition hover:bg-[#0B5649] active:scale-[0.98]"
            >
              {savedToast ? "已保存" : "保存配置"}
            </button>
        </div>
      </form>
    </div>
  );
}
