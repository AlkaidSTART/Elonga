"use client";

import { KeyRound, ShieldCheck, X } from "lucide-react";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

export function SettingsModal() {
  const settingsOpen = useWorkbenchStore((s) => s.settingsOpen);
  const setSettingsOpen = useWorkbenchStore((s) => s.setSettingsOpen);
  const modelConfig = useWorkbenchStore((s) => s.modelConfig);
  const updateModelConfig = useWorkbenchStore((s) => s.updateModelConfig);

  if (!settingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/30 p-4 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-900">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="settings-modal-title"
                className="text-base font-semibold text-neutral-900"
              >
                大模型接口配置
              </h2>
              <p className="text-xs text-neutral-500">
                配置后可调用云端大模型，未配置时自动使用内置引擎
              </p>
            </div>
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

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700">
              API Key（OpenAI 兼容格式）
            </label>
            <input
              type="password"
              value={modelConfig.apiKey}
              onChange={(e) => updateModelConfig({ apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full rounded-xl border border-neutral-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white"
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
              className="w-full rounded-xl border border-neutral-200 bg-[#FAFAFA] px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                文案大模型
              </label>
              <input
                type="text"
                value={modelConfig.textModel}
                onChange={(e) =>
                  updateModelConfig({ textModel: e.target.value })
                }
                placeholder="gpt-4o-mini"
                className="w-full rounded-xl border border-neutral-200 bg-[#FAFAFA] px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-700">
                图像大模型
              </label>
              <input
                type="text"
                value={modelConfig.imageModel}
                onChange={(e) =>
                  updateModelConfig({ imageModel: e.target.value })
                }
                placeholder="gpt-image-1"
                className="w-full rounded-xl border border-neutral-200 bg-[#FAFAFA] px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-[#FAFAFA] p-3 text-xs text-neutral-600">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              密钥仅保存在您的本地浏览器中，请求时直连您指定的接口地址，不会上传至第三方存储。
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          {modelConfig.apiKey && (
            <button
              type="button"
              onClick={() => updateModelConfig({ apiKey: "" })}
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
