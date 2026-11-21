"use client";

import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

export default function SettingsPage() {
  const { modelConfig, updateModelConfig } = useWorkbenchStore();
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="border-b border-neutral-200/80 pb-5">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
          模型接口配置
        </h1>
        <p className="mt-1 text-xs text-neutral-500">
          配置 OpenAI 兼容接口后，推流文案与图片二维风格化将自动切换为云端大模型能力
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="divide-y divide-neutral-200/70 rounded-xl border border-neutral-200 bg-white"
      >
        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700">
              API Key（OpenAI 兼容格式）
            </label>
            <input
              type="password"
              value={modelConfig.apiKey}
              onChange={(e) => updateModelConfig({ apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full rounded-lg border border-neutral-200 bg-[#FAFAFA] px-3.5 py-2 text-sm text-neutral-900 outline-none transition focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700">
              Base URL
            </label>
            <input
              type="url"
              value={modelConfig.baseUrl}
              onChange={(e) => updateModelConfig({ baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className="w-full rounded-lg border border-neutral-200 bg-[#FAFAFA] px-3.5 py-2 text-sm text-neutral-900 outline-none transition focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                文案大模型名称
              </label>
              <input
                type="text"
                value={modelConfig.textModel}
                onChange={(e) =>
                  updateModelConfig({ textModel: e.target.value })
                }
                placeholder="gpt-4o-mini"
                className="w-full rounded-lg border border-neutral-200 bg-[#FAFAFA] px-3.5 py-2 text-sm text-neutral-900 outline-none transition focus:border-blue-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                图像大模型名称
              </label>
              <input
                type="text"
                value={modelConfig.imageModel}
                onChange={(e) =>
                  updateModelConfig({ imageModel: e.target.value })
                }
                placeholder="gpt-image-1"
                className="w-full rounded-lg border border-neutral-200 bg-[#FAFAFA] px-3.5 py-2 text-sm text-neutral-900 outline-none transition focus:border-blue-600 focus:bg-white"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 bg-[#FAFAFA] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>密钥仅保存在本地浏览器，未填写时自动使用内置引擎</span>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {modelConfig.apiKey && (
              <button
                type="button"
                onClick={() => updateModelConfig({ apiKey: "" })}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-200/60 hover:text-neutral-900"
              >
                清空密钥
              </button>
            )}
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-neutral-800"
            >
              {savedToast ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>已保存</span>
                </>
              ) : (
                <span>保存配置</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
