"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, PlugZap, X } from "lucide-react";
import {
  DEFAULT_IMAGE_ENDPOINT_PATH,
  getTextApiFormatMeta,
  TEXT_API_FORMATS,
  type TextApiFormat,
} from "@/lib/ai/model-client";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

interface ModalTestState {
  status: "idle" | "testing" | "success" | "error";
  message?: string;
  latencyMs?: number;
}

export function SettingsModal() {
  const settingsOpen = useWorkbenchStore((s) => s.settingsOpen);
  const setSettingsOpen = useWorkbenchStore((s) => s.setSettingsOpen);
  const modelConfig = useWorkbenchStore((s) => s.modelConfig);
  const updateModelConfig = useWorkbenchStore((s) => s.updateModelConfig);
  const [textTest, setTextTest] = useState<ModalTestState>({ status: "idle" });
  const [imageTest, setImageTest] = useState<ModalTestState>({ status: "idle" });

  if (!settingsOpen) return null;

  const hasAnyKey = Boolean(modelConfig.textApiKey.trim() || modelConfig.imageApiKey.trim());
  const formatMeta = getTextApiFormatMeta(modelConfig.textApiFormat);

  const handleTest = async (target: "text" | "image") => {
    const setState = target === "text" ? setTextTest : setImageTest;
    setState({ status: "testing" });

    try {
      const payload =
        target === "text"
          ? {
              target: "text" as const,
              apiKey: modelConfig.textApiKey,
              baseUrl: modelConfig.textBaseUrl,
              port: modelConfig.textPort,
              endpointPath: modelConfig.textEndpointPath,
              apiFormat: modelConfig.textApiFormat,
              model: modelConfig.textModel,
            }
          : {
              target: "image" as const,
              apiKey: modelConfig.imageApiKey,
              baseUrl: modelConfig.imageBaseUrl,
              port: modelConfig.imagePort,
              endpointPath: modelConfig.imageEndpointPath,
              model: modelConfig.imageModel,
            };

      const res = await fetch("/api/model-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        setState({
          status: "success",
          message: data.message || "连通成功",
          latencyMs: typeof data.latencyMs === "number" ? data.latencyMs : undefined,
        });
      } else {
        setState({
          status: "error",
          message: data.error || "连接失败",
          latencyMs: typeof data.latencyMs === "number" ? data.latencyMs : undefined,
        });
      }
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "测试失败",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#181816]/35 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-[#E2DDD3] bg-[#FCFBF8] p-6 shadow-[0_16px_40px_-16px_rgba(24,24,22,0.22)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E2DDD3] pb-4">
          <div>
            <h2
              id="settings-modal-title"
              className="font-editorial text-lg font-semibold text-[#181816]"
            >
              大模型接口配置
            </h2>
            <p className="mt-0.5 text-xs text-[#78716C]">
              配置文本与生图模型协议、端口及接口路径，本地保存于浏览器 IndexedDB
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="rounded p-1 text-[#8C857B] transition hover:bg-[#EFECE4] hover:text-[#181816]"
            aria-label="关闭配置弹窗"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="divide-y divide-[#E2DDD3]">
          {/* Text Model Section */}
          <div className="space-y-3 py-5">
            <div className="flex items-center justify-between gap-2">
              <div className="font-editorial text-sm font-semibold text-[#181816]">
                文本模型（文案 / 调研 / 月报）
              </div>
              <button
                type="button"
                disabled={textTest.status === "testing"}
                onClick={() => handleTest("text")}
                className="inline-flex items-center gap-1 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2.5 py-1 text-[11px] font-medium text-[#181816] transition hover:border-[#181816] disabled:opacity-50"
              >
                {textTest.status === "testing" ? (
                  <Loader2 className="h-3 w-3 animate-spin text-[#1B4D3E]" />
                ) : (
                  <PlugZap className="h-3 w-3 text-[#1B4D3E]" />
                )}
                <span>测试连通</span>
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#57534E]">
                请求 / 返回格式
              </label>
              <div className="inline-flex flex-wrap items-center gap-0.5 rounded border border-[#E2DDD3] bg-[#EFECE4] p-0.5">
                {TEXT_API_FORMATS.map((item) => {
                  const active = modelConfig.textApiFormat === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        updateModelConfig({ textApiFormat: item.id as TextApiFormat });
                        setTextTest({ status: "idle" });
                      }}
                      className={`rounded-[3px] px-2 py-1 text-[11px] font-medium transition ${
                        active
                          ? "bg-[#FCFBF8] text-[#181816]"
                          : "text-[#78716C] hover:text-[#181816]"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#57534E]">文本 API Key</label>
              <input
                type="password"
                value={modelConfig.textApiKey}
                onChange={(e) => updateModelConfig({ textApiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 text-xs text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-8">
                <label className="mb-1 block text-xs font-medium text-[#57534E]">
                  文本 Base URL
                </label>
                <input
                  type="url"
                  value={modelConfig.textBaseUrl}
                  onChange={(e) => updateModelConfig({ textBaseUrl: e.target.value })}
                  placeholder="https://api.deepseek.com/v1"
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 font-mono text-xs text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="mb-1 block text-xs font-medium text-[#57534E]">
                  端口 (可选)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={modelConfig.textPort}
                  onChange={(e) => updateModelConfig({ textPort: e.target.value })}
                  placeholder="11434"
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 font-mono text-xs text-[#181816] tabular-nums outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#57534E]">
                  文本模型名称
                </label>
                <input
                  type="text"
                  value={modelConfig.textModel}
                  onChange={(e) => updateModelConfig({ textModel: e.target.value })}
                  placeholder="deepseek-chat"
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 font-mono text-xs text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#57534E]">
                  接口路径 (可选)
                </label>
                <input
                  type="text"
                  value={modelConfig.textEndpointPath}
                  onChange={(e) => updateModelConfig({ textEndpointPath: e.target.value })}
                  placeholder={`默认 ${formatMeta.defaultPath}`}
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 font-mono text-xs text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
              </div>
            </div>

            {textTest.status === "success" && (
              <p className="flex items-center gap-1.5 border-l-2 border-[#1B4D3E] bg-[#E9F0ED] px-3 py-1.5 text-xs text-[#1B4D3E]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>{textTest.message}</span>
                {textTest.latencyMs !== undefined && (
                  <span className="font-mono text-[11px] tabular-nums">
                    {textTest.latencyMs} ms
                  </span>
                )}
              </p>
            )}
            {textTest.status === "error" && (
              <p className="flex items-start gap-1.5 border-l-2 border-[#B42318] bg-[#FDF2F2] px-3 py-1.5 text-xs text-[#B42318]">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="break-all">{textTest.message}</span>
              </p>
            )}
          </div>

          {/* Image Model Section */}
          <div className="space-y-3 py-5">
            <div className="flex items-center justify-between gap-2">
              <div className="font-editorial text-sm font-semibold text-[#181816]">
                生图模型（图片工坊）
              </div>
              <button
                type="button"
                disabled={imageTest.status === "testing"}
                onClick={() => handleTest("image")}
                className="inline-flex items-center gap-1 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2.5 py-1 text-[11px] font-medium text-[#181816] transition hover:border-[#181816] disabled:opacity-50"
              >
                {imageTest.status === "testing" ? (
                  <Loader2 className="h-3 w-3 animate-spin text-[#1B4D3E]" />
                ) : (
                  <PlugZap className="h-3 w-3 text-[#1B4D3E]" />
                )}
                <span>测试连通</span>
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#57534E]">生图 API Key</label>
              <input
                type="password"
                value={modelConfig.imageApiKey}
                onChange={(e) => updateModelConfig({ imageApiKey: e.target.value })}
                placeholder="输入生图端点 API Key..."
                className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 text-xs text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="sm:col-span-8">
                <label className="mb-1 block text-xs font-medium text-[#57534E]">
                  生图 Base URL
                </label>
                <input
                  type="url"
                  value={modelConfig.imageBaseUrl}
                  onChange={(e) => updateModelConfig({ imageBaseUrl: e.target.value })}
                  placeholder="https://ark.cn-beijing.volces.com/api/v3"
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 font-mono text-xs text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
              </div>
              <div className="sm:col-span-4">
                <label className="mb-1 block text-xs font-medium text-[#57534E]">
                  端口 (可选)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={modelConfig.imagePort}
                  onChange={(e) => updateModelConfig({ imagePort: e.target.value })}
                  placeholder="7860"
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 font-mono text-xs text-[#181816] tabular-nums outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#57534E]">
                  生图模型名称
                </label>
                <input
                  type="text"
                  value={modelConfig.imageModel}
                  onChange={(e) => updateModelConfig({ imageModel: e.target.value })}
                  placeholder="doubao-seedream-3-0-t2i-250415"
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 font-mono text-xs text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#57534E]">
                  接口路径 (可选)
                </label>
                <input
                  type="text"
                  value={modelConfig.imageEndpointPath}
                  onChange={(e) => updateModelConfig({ imageEndpointPath: e.target.value })}
                  placeholder={`默认 ${DEFAULT_IMAGE_ENDPOINT_PATH}`}
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 font-mono text-xs text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
              </div>
            </div>

            {imageTest.status === "success" && (
              <p className="flex items-center gap-1.5 border-l-2 border-[#1B4D3E] bg-[#E9F0ED] px-3 py-1.5 text-xs text-[#1B4D3E]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>{imageTest.message}</span>
                {imageTest.latencyMs !== undefined && (
                  <span className="font-mono text-[11px] tabular-nums">
                    {imageTest.latencyMs} ms
                  </span>
                )}
              </p>
            )}
            {imageTest.status === "error" && (
              <p className="flex items-start gap-1.5 border-l-2 border-[#B42318] bg-[#FDF2F2] px-3 py-1.5 text-xs text-[#B42318]">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="break-all">{imageTest.message}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-[#E2DDD3] pt-4">
          {hasAnyKey && (
            <button
              type="button"
              onClick={() => updateModelConfig({ textApiKey: "", imageApiKey: "" })}
              className="rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3.5 py-1.5 text-xs font-medium text-[#57534E] transition hover:border-[#181816] hover:text-[#181816]"
            >
              清空密钥
            </button>
          )}
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="rounded bg-[#1B4D3E] px-4 py-1.5 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F]"
          >
            完成并保存
          </button>
        </div>
      </div>
    </div>
  );
}
