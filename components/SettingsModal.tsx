"use client";

import { X } from "lucide-react";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

export function SettingsModal() {
  const settingsOpen = useWorkbenchStore((s) => s.settingsOpen);
  const setSettingsOpen = useWorkbenchStore((s) => s.setSettingsOpen);
  const modelConfig = useWorkbenchStore((s) => s.modelConfig);
  const updateModelConfig = useWorkbenchStore((s) => s.updateModelConfig);

  if (!settingsOpen) return null;

  const hasAnyKey = Boolean(modelConfig.textApiKey.trim() || modelConfig.imageApiKey.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/30 p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div>
            <h2 id="settings-modal-title" className="text-base font-semibold text-neutral-900">
              大模型接口配置
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              分别配置文本模型（DeepSeek）与生图模型（Seedream 等）端点
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="关闭配置弹窗"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Text Model Section */}
          <div className="space-y-3 rounded-xl border border-neutral-200/80 bg-[#FAFAFA]/70 p-4">
            <div className="text-xs font-semibold text-neutral-900">
              文本模型（推流文案 · 默认 DeepSeek）
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700">
                文本 API Key
              </label>
              <input
                type="password"
                value={modelConfig.textApiKey}
                onChange={(e) => updateModelConfig({ textApiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700">
                  文本 Base URL
                </label>
                <input
                  type="url"
                  value={modelConfig.textBaseUrl}
                  onChange={(e) => updateModelConfig({ textBaseUrl: e.target.value })}
                  placeholder="https://api.deepseek.com/v1"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700">
                  文本模型名称
                </label>
                <input
                  type="text"
                  value={modelConfig.textModel}
                  onChange={(e) => updateModelConfig({ textModel: e.target.value })}
                  placeholder="deepseek-chat"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                />
              </div>
            </div>
          </div>

          {/* Image Model Section */}
          <div className="space-y-3 rounded-xl border border-neutral-200/80 bg-[#FAFAFA]/70 p-4">
            <div className="text-xs font-semibold text-neutral-900">
              生图模型（图片工坊 · 如 Seedream / 火山方舟）
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700">
                生图 API Key
              </label>
              <input
                type="password"
                value={modelConfig.imageApiKey}
                onChange={(e) => updateModelConfig({ imageApiKey: e.target.value })}
                placeholder="输入生图端点 API Key..."
                className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700">
                  生图 Base URL
                </label>
                <input
                  type="url"
                  value={modelConfig.imageBaseUrl}
                  onChange={(e) => updateModelConfig({ imageBaseUrl: e.target.value })}
                  placeholder="https://ark.cn-beijing.volces.com/api/v3"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700">
                  生图模型名称
                </label>
                <input
                  type="text"
                  value={modelConfig.imageModel}
                  onChange={(e) => updateModelConfig({ imageModel: e.target.value })}
                  placeholder="doubao-seedream-3-0-t2i-250415"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          {hasAnyKey && (
            <button
              type="button"
              onClick={() => updateModelConfig({ textApiKey: "", imageApiKey: "" })}
              className="rounded-xl px-3.5 py-2 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700"
            >
              清空密钥
            </button>
          )}
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="rounded-xl bg-neutral-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800"
          >
            完成并保存
          </button>
        </div>
      </div>
    </div>
  );
}
