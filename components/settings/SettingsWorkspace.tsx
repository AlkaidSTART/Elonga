"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  Loader2,
  PlugZap,
} from "lucide-react";
import {
  DEFAULT_IMAGE_ENDPOINT_PATH,
  getTextApiFormatMeta,
  previewModelEndpointUrl,
  TEXT_API_FORMATS,
  type TextApiFormat,
} from "@/lib/ai/model-client";
import {
  detectLocalStorageBackend,
  IDB_DATABASE_NAME,
  type LocalStorageBackend,
} from "@/lib/storage/indexeddb-storage";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

interface TestResultState {
  status: "idle" | "testing" | "success" | "error";
  message?: string;
  endpointUrl?: string;
  latencyMs?: number;
  replyPreview?: string;
}

const subscribeNoop = () => () => {};
const getServerStorageBackend = (): LocalStorageBackend => "indexeddb";

export function SettingsWorkspace() {
  const { modelConfig, updateModelConfig } = useWorkbenchStore();
  const [savedToast, setSavedToast] = useState(false);
  const [showTextKey, setShowTextKey] = useState(false);
  const [showImageKey, setShowImageKey] = useState(false);
  const [textTest, setTextTest] = useState<TestResultState>({ status: "idle" });
  const [imageTest, setImageTest] = useState<TestResultState>({ status: "idle" });
  const storageBackend = useSyncExternalStore(
    subscribeNoop,
    detectLocalStorageBackend,
    getServerStorageBackend,
  );

  const formatMeta = getTextApiFormatMeta(modelConfig.textApiFormat);

  const textEndpointPreview = useMemo(
    () =>
      previewModelEndpointUrl({
        baseUrl: modelConfig.textBaseUrl,
        port: modelConfig.textPort,
        endpointPath: modelConfig.textEndpointPath,
        defaultPath: formatMeta.defaultPath,
      }),
    [
      modelConfig.textBaseUrl,
      modelConfig.textPort,
      modelConfig.textEndpointPath,
      formatMeta.defaultPath,
    ],
  );

  const imageEndpointPreview = useMemo(
    () =>
      previewModelEndpointUrl({
        baseUrl: modelConfig.imageBaseUrl,
        port: modelConfig.imagePort,
        endpointPath: modelConfig.imageEndpointPath,
        defaultPath: DEFAULT_IMAGE_ENDPOINT_PATH,
      }),
    [modelConfig.imageBaseUrl, modelConfig.imagePort, modelConfig.imageEndpointPath],
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  const handleFormatChange = (nextFormat: TextApiFormat) => {
    updateModelConfig({ textApiFormat: nextFormat });
    setTextTest({ status: "idle" });
  };

  const handleTestConnection = async (target: "text" | "image") => {
    const setTargetState = target === "text" ? setTextTest : setImageTest;
    setTargetState({ status: "testing" });

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
        setTargetState({
          status: "success",
          message: data.message || "连通测试通过",
          endpointUrl: data.endpointUrl,
          latencyMs: typeof data.latencyMs === "number" ? data.latencyMs : undefined,
          replyPreview: data.replyPreview,
        });
      } else {
        setTargetState({
          status: "error",
          message: data.error || "连接失败，请检查地址、端口、协议或 API Key",
          endpointUrl: data.endpointUrl,
          latencyMs: typeof data.latencyMs === "number" ? data.latencyMs : undefined,
        });
      }
    } catch (err) {
      setTargetState({
        status: "error",
        message: err instanceof Error ? err.message : "测试请求发送失败",
      });
    }
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
            配置文本与图像生成服务接口，支持多协议切换、自定义端口与端点路径，数据保存在浏览器
            IndexedDB
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {hasAnyKey && (
            <button
              type="button"
              onClick={() => {
                updateModelConfig({ textApiKey: "", imageApiKey: "" });
                setTextTest({ status: "idle" });
                setImageTest({ status: "idle" });
              }}
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
              <h2 className="font-editorial text-base font-semibold text-[#181816]">文本模型</h2>
              <span
                className={`h-2 w-2 rounded-full ${hasTextKey ? "bg-[#1B4D3E]" : "bg-[#CFC8BA]"}`}
              />
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[#78716C]">
              用于多平台推流文案、趋势调研与月报汇总。支持 OpenAI Chat、OpenAI Responses 与
              Anthropic 协议。
            </p>
          </div>

          <div className="space-y-4 lg:col-span-8">
            {/* Protocol Selector */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#57534E]">
                请求 / 返回格式
              </label>
              <div className="inline-flex flex-wrap items-center gap-0.5 rounded border border-[#E2DDD3] bg-[#EFECE4] p-0.5">
                {TEXT_API_FORMATS.map((item) => {
                  const active = modelConfig.textApiFormat === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleFormatChange(item.id)}
                      className={`rounded-[3px] px-2.5 py-1 text-xs font-medium transition ${
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
              <p className="mt-1.5 text-[11px] text-[#8C857B]">{formatMeta.description}</p>
            </div>

            {/* API Key */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#57534E]">API Key</label>
              <div className="relative">
                <input
                  type={showTextKey ? "text" : "password"}
                  value={modelConfig.textApiKey}
                  onChange={(e) => {
                    updateModelConfig({ textApiKey: e.target.value });
                    setTextTest({ status: "idle" });
                  }}
                  placeholder={modelConfig.textApiFormat === "anthropic" ? "sk-ant-..." : "sk-..."}
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] py-2 pl-3 pr-9 text-sm text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
                <button
                  type="button"
                  onClick={() => setShowTextKey((v) => !v)}
                  aria-label={showTextKey ? "隐藏密钥" : "显示密钥"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#8C857B] transition hover:text-[#181816]"
                >
                  {showTextKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Base URL + Custom Port */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
              <div className="sm:col-span-8">
                <label className="mb-1.5 block text-xs font-medium text-[#57534E]">Base URL</label>
                <input
                  type="url"
                  value={modelConfig.textBaseUrl}
                  onChange={(e) => {
                    updateModelConfig({ textBaseUrl: e.target.value });
                    setTextTest({ status: "idle" });
                  }}
                  placeholder={
                    modelConfig.textApiFormat === "anthropic"
                      ? "https://api.anthropic.com"
                      : "https://api.deepseek.com/v1"
                  }
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 font-mono text-xs text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="mb-1.5 block text-xs font-medium text-[#57534E]">
                  自定义端口 <span className="font-normal text-[#8C857B]">(可选)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={modelConfig.textPort}
                  onChange={(e) => {
                    updateModelConfig({ textPort: e.target.value });
                    setTextTest({ status: "idle" });
                  }}
                  placeholder="如 11434"
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 font-mono text-xs text-[#181816] tabular-nums outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
              </div>
            </div>

            {/* Model Name + Custom Endpoint Path */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <label className="mb-1.5 block text-xs font-medium text-[#57534E]">模型名称</label>
                <input
                  type="text"
                  value={modelConfig.textModel}
                  onChange={(e) => {
                    updateModelConfig({ textModel: e.target.value });
                    setTextTest({ status: "idle" });
                  }}
                  placeholder={
                    modelConfig.textApiFormat === "anthropic"
                      ? "claude-sonnet-4-20250514"
                      : "deepseek-chat"
                  }
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 font-mono text-xs text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
              </div>

              <div className="sm:col-span-7">
                <label className="mb-1.5 block text-xs font-medium text-[#57534E]">
                  自定义接口路径 <span className="font-normal text-[#8C857B]">(可选)</span>
                </label>
                <input
                  type="text"
                  value={modelConfig.textEndpointPath}
                  onChange={(e) => {
                    updateModelConfig({ textEndpointPath: e.target.value });
                    setTextTest({ status: "idle" });
                  }}
                  placeholder={`默认 ${formatMeta.defaultPath}`}
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 font-mono text-xs text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
              </div>
            </div>

            {/* Resolved URL Preview & Test Action */}
            <div className="flex flex-col gap-3 border-t border-[#E2DDD3]/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] tracking-[0.12em] text-[#8C857B]">实际请求端点</div>
                {textEndpointPreview.url ? (
                  <p className="mt-0.5 truncate font-mono text-[11px] text-[#57534E]">
                    {textEndpointPreview.url}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[11px] text-[#B42318]">{textEndpointPreview.error}</p>
                )}
              </div>

              <button
                type="button"
                disabled={textTest.status === "testing" || !textEndpointPreview.url}
                onClick={() => handleTestConnection("text")}
                className="inline-flex shrink-0 items-center gap-1.5 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3.5 py-1.5 text-xs font-medium text-[#181816] transition hover:border-[#181816] disabled:opacity-50"
              >
                {textTest.status === "testing" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1B4D3E]" />
                ) : (
                  <PlugZap className="h-3.5 w-3.5 text-[#1B4D3E]" />
                )}
                <span>{textTest.status === "testing" ? "正在测试..." : "测试连通性"}</span>
              </button>
            </div>

            {textTest.status === "success" && (
              <div className="flex items-start gap-2 border-l-2 border-[#1B4D3E] bg-[#E9F0ED] px-3.5 py-2 text-xs text-[#1B4D3E]">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2 font-medium">
                    <span>{textTest.message}</span>
                    {textTest.latencyMs !== undefined && (
                      <span className="font-mono text-[11px] tabular-nums">
                        {textTest.latencyMs} ms
                      </span>
                    )}
                  </div>
                  {textTest.replyPreview && (
                    <p className="truncate font-mono text-[11px] text-[#1B4D3E]/80">
                      返回预览：{textTest.replyPreview}
                    </p>
                  )}
                </div>
              </div>
            )}

            {textTest.status === "error" && (
              <div className="flex items-start gap-2 border-l-2 border-[#B42318] bg-[#FDF2F2] px-3.5 py-2 text-xs text-[#B42318]">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div className="min-w-0 space-y-0.5">
                  <div className="break-all">{textTest.message}</div>
                  {textTest.latencyMs !== undefined && (
                    <div className="font-mono text-[11px] text-[#B42318]/80 tabular-nums">
                      耗时 {textTest.latencyMs} ms
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Image Model Band */}
        <section className="grid grid-cols-1 gap-6 py-9 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2">
              <h2 className="font-editorial text-base font-semibold text-[#181816]">生图模型</h2>
              <span
                className={`h-2 w-2 rounded-full ${hasImageKey ? "bg-[#1B4D3E]" : "bg-[#CFC8BA]"}`}
              />
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[#78716C]">
              用于图片工坊二维风格化重绘，兼容 Seedream
              与火山方舟接口。未配置时自动降级为本地滤镜预览。
            </p>
          </div>

          <div className="space-y-4 lg:col-span-8">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#57534E]">API Key</label>
              <div className="relative">
                <input
                  type={showImageKey ? "text" : "password"}
                  value={modelConfig.imageApiKey}
                  onChange={(e) => {
                    updateModelConfig({ imageApiKey: e.target.value });
                    setImageTest({ status: "idle" });
                  }}
                  placeholder="输入生图服务密钥..."
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] py-2 pl-3 pr-9 text-sm text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
                <button
                  type="button"
                  onClick={() => setShowImageKey((v) => !v)}
                  aria-label={showImageKey ? "隐藏密钥" : "显示密钥"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#8C857B] transition hover:text-[#181816]"
                >
                  {showImageKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
              <div className="sm:col-span-8">
                <label className="mb-1.5 block text-xs font-medium text-[#57534E]">Base URL</label>
                <input
                  type="url"
                  value={modelConfig.imageBaseUrl}
                  onChange={(e) => {
                    updateModelConfig({ imageBaseUrl: e.target.value });
                    setImageTest({ status: "idle" });
                  }}
                  placeholder="https://ark.cn-beijing.volces.com/api/v3"
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 font-mono text-[11.5px] text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="mb-1.5 block text-xs font-medium text-[#57534E]">
                  自定义端口 <span className="font-normal text-[#8C857B]">(可选)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={modelConfig.imagePort}
                  onChange={(e) => {
                    updateModelConfig({ imagePort: e.target.value });
                    setImageTest({ status: "idle" });
                  }}
                  placeholder="如 7860"
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 font-mono text-xs text-[#181816] tabular-nums outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <label className="mb-1.5 block text-xs font-medium text-[#57534E]">模型名称</label>
                <input
                  type="text"
                  value={modelConfig.imageModel}
                  onChange={(e) => {
                    updateModelConfig({ imageModel: e.target.value });
                    setImageTest({ status: "idle" });
                  }}
                  placeholder="doubao-seedream-3-0-t2i-250415"
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 font-mono text-[11.5px] text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
              </div>

              <div className="sm:col-span-7">
                <label className="mb-1.5 block text-xs font-medium text-[#57534E]">
                  自定义接口路径 <span className="font-normal text-[#8C857B]">(可选)</span>
                </label>
                <input
                  type="text"
                  value={modelConfig.imageEndpointPath}
                  onChange={(e) => {
                    updateModelConfig({ imageEndpointPath: e.target.value });
                    setImageTest({ status: "idle" });
                  }}
                  placeholder={`默认 ${DEFAULT_IMAGE_ENDPOINT_PATH}`}
                  className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 font-mono text-xs text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                />
              </div>
            </div>

            {/* Resolved URL Preview & Test Action */}
            <div className="flex flex-col gap-3 border-t border-[#E2DDD3]/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] tracking-[0.12em] text-[#8C857B]">实际请求端点</div>
                {imageEndpointPreview.url ? (
                  <p className="mt-0.5 truncate font-mono text-[11px] text-[#57534E]">
                    {imageEndpointPreview.url}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[11px] text-[#B42318]">{imageEndpointPreview.error}</p>
                )}
              </div>

              <button
                type="button"
                disabled={imageTest.status === "testing" || !imageEndpointPreview.url}
                onClick={() => handleTestConnection("image")}
                className="inline-flex shrink-0 items-center gap-1.5 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3.5 py-1.5 text-xs font-medium text-[#181816] transition hover:border-[#181816] disabled:opacity-50"
              >
                {imageTest.status === "testing" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1B4D3E]" />
                ) : (
                  <PlugZap className="h-3.5 w-3.5 text-[#1B4D3E]" />
                )}
                <span>{imageTest.status === "testing" ? "正在测试..." : "测试连通性"}</span>
              </button>
            </div>

            {imageTest.status === "success" && (
              <div className="flex items-start gap-2 border-l-2 border-[#1B4D3E] bg-[#E9F0ED] px-3.5 py-2 text-xs text-[#1B4D3E]">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div className="flex flex-wrap items-center gap-2 font-medium">
                  <span>{imageTest.message}</span>
                  {imageTest.latencyMs !== undefined && (
                    <span className="font-mono text-[11px] tabular-nums">
                      {imageTest.latencyMs} ms
                    </span>
                  )}
                </div>
              </div>
            )}

            {imageTest.status === "error" && (
              <div className="flex items-start gap-2 border-l-2 border-[#B42318] bg-[#FDF2F2] px-3.5 py-2 text-xs text-[#B42318]">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div className="min-w-0 space-y-0.5">
                  <div className="break-all">{imageTest.message}</div>
                  {imageTest.latencyMs !== undefined && (
                    <div className="font-mono text-[11px] text-[#B42318]/80 tabular-nums">
                      耗时 {imageTest.latencyMs} ms
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Browser Local Storage Band */}
        <section className="grid grid-cols-1 gap-6 py-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[#1B4D3E]" />
              <h2 className="font-editorial text-base font-semibold text-[#181816]">本地数据存储</h2>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[#78716C]">
              未接入云数据库时，工作台数据默认持久化至当前浏览器的 IndexedDB 数据库。
            </p>
          </div>

          <div className="flex flex-col justify-center gap-2 lg:col-span-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded border border-[#1B4D3E]/25 bg-[#E9F0ED] px-2 py-0.5 text-[11px] font-medium text-[#1B4D3E]">
                {storageBackend === "indexeddb"
                  ? "IndexedDB 已启用"
                  : storageBackend === "localstorage"
                    ? "localStorage 降级模式"
                    : "仅内存模式"}
              </span>
              <span className="rounded bg-[#EFECE4] px-2 py-0.5 font-mono text-[11px] text-[#57534E]">
                {IDB_DATABASE_NAME}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#78716C]">
              已自动托管文案历史、模型配置、月度汇报、机构活动档案与个人资料，并无缝兼容旧版
              localStorage 数据迁移。
            </p>
          </div>
        </section>
      </div>
    </form>
  );
}
