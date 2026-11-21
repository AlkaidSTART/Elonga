"use client";

import { useState } from "react";
import { Check, KeyRound, ShieldCheck } from "lucide-react";
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
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          模型接口配置
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          配置 OpenAI 兼容接口后，推流文案与图片二维风格化将自动切换为云端大模型能力
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-5"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">
              API 密钥与端点
            </div>
            <div className="text-xs text-slate-500">
              支持 OpenAI、DeepSeek、SiliconFlow 等兼容格式的接口
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              API Key
            </label>
            <input
              type="password"
              value={modelConfig.apiKey}
              onChange={(e) => updateModelConfig({ apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-3 focus:ring-indigo-500/10"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">
              Base URL
            </label>
            <input
              type="url"
              value={modelConfig.baseUrl}
              onChange={(e) => updateModelConfig({ baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-3 focus:ring-indigo-500/10"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                文案大模型名称
              </label>
              <input
                type="text"
                value={modelConfig.textModel}
                onChange={(e) =>
                  updateModelConfig({ textModel: e.target.value })
                }
                placeholder="gpt-4o-mini"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-3 focus:ring-indigo-500/10"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700">
                图像大模型名称
              </label>
              <input
                type="text"
                value={modelConfig.imageModel}
                onChange={(e) =>
                  updateModelConfig({ imageModel: e.target.value })
                }
                placeholder="gpt-image-1"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-3 focus:ring-indigo-500/10"
              />
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-600">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>
            您的配置通过 Zustand 持久化保存在本地浏览器中，未填写密钥时系统会自动启用内置引擎，不影响正常体验。
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          {modelConfig.apiKey && (
            <button
              type="button"
              onClick={() => updateModelConfig({ apiKey: "" })}
              className="rounded-xl px-4 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              清空密钥
            </button>
          )}
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
          >
            {savedToast ? (
              <>
                <Check className="h-4 w-4" />
                <span>配置已保存</span>
              </>
            ) : (
              <span>保存配置</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
