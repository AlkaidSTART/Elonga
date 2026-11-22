"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

export default function SettingsPage() {
  const { modelConfig, updateModelConfig } = useWorkbenchStore();
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  const hasTextKey = Boolean(modelConfig.textApiKey.trim());
  const hasImageKey = Boolean(modelConfig.imageApiKey.trim());
  const hasAnyKey = hasTextKey || hasImageKey;

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#E4E7EC] pb-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold tracking-tight text-[#0F172A]">
            模型配置
          </h1>
          <span className="font-mono text-[11px] tracking-wider text-slate-400 uppercase">
            MODEL SETTINGS
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {hasAnyKey && (
            <button
              type="button"
              onClick={() =>
                updateModelConfig({ textApiKey: "", imageApiKey: "" })
              }
              className="rounded-md border border-[#E4E7EC] bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-[#0F172A]"
            >
              清空密钥
            </button>
          )}
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-md bg-[#1D4ED8] px-4 py-1.5 text-xs font-medium text-white shadow-2xs transition hover:bg-[#1E40AF]"
          >
            {savedToast && <Check className="h-3.5 w-3.5" />}
            <span>{savedToast ? "已保存" : "保存配置"}</span>
          </button>
        </div>
      </header>

      {/* Structured Settings Container */}
      <div className="divide-y divide-[#ECEEF2] rounded-lg border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        {/* Text Model Band */}
        <section className="grid grid-cols-1 gap-6 p-6 sm:p-7 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#0F172A]">文本模型</h2>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  hasTextKey ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
            </div>
            <span className="mt-1 block font-mono text-[11px] text-slate-400">
              DEEPSEEK / OPENAI
            </span>
          </div>

          <div className="space-y-4 lg:col-span-8">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                API Key
              </label>
              <input
                type="password"
                value={modelConfig.textApiKey}
                onChange={(e) =>
                  updateModelConfig({ textApiKey: e.target.value })
                }
                placeholder="sk-..."
                className="w-full rounded-md border border-[#D5DAE2] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Base URL
                </label>
                <input
                  type="url"
                  value={modelConfig.textBaseUrl}
                  onChange={(e) =>
                    updateModelConfig({ textBaseUrl: e.target.value })
                  }
                  placeholder="https://api.deepseek.com/v1"
                  className="w-full rounded-md border border-[#D5DAE2] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  模型名称
                </label>
                <input
                  type="text"
                  value={modelConfig.textModel}
                  onChange={(e) =>
                    updateModelConfig({ textModel: e.target.value })
                  }
                  placeholder="deepseek-chat"
                  className="w-full rounded-md border border-[#D5DAE2] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Image Model Band */}
        <section className="grid grid-cols-1 gap-6 p-6 sm:p-7 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-[#0F172A]">生图模型</h2>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  hasImageKey ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
            </div>
            <span className="mt-1 block font-mono text-[11px] text-slate-400">
              SEEDREAM / ARK
            </span>
          </div>

          <div className="space-y-4 lg:col-span-8">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">
                API Key
              </label>
              <input
                type="password"
                value={modelConfig.imageApiKey}
                onChange={(e) =>
                  updateModelConfig({ imageApiKey: e.target.value })
                }
                placeholder="输入密钥..."
                className="w-full rounded-md border border-[#D5DAE2] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  Base URL
                </label>
                <input
                  type="url"
                  value={modelConfig.imageBaseUrl}
                  onChange={(e) =>
                    updateModelConfig({ imageBaseUrl: e.target.value })
                  }
                  placeholder="https://ark.cn-beijing.volces.com/api/v3"
                  className="w-full rounded-md border border-[#D5DAE2] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  模型名称
                </label>
                <input
                  type="text"
                  value={modelConfig.imageModel}
                  onChange={(e) =>
                    updateModelConfig({ imageModel: e.target.value })
                  }
                  placeholder="doubao-seedream-3-0-t2i-250415"
                  className="w-full rounded-md border border-[#D5DAE2] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </form>
  );
}
