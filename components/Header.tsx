"use client";

import {
  Image as ImageIcon,
  Layers,
  PenTool,
  SlidersHorizontal,
} from "lucide-react";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

export function Header() {
  const activeTab = useWorkbenchStore((s) => s.activeTab);
  const setActiveTab = useWorkbenchStore((s) => s.setActiveTab);
  const setSettingsOpen = useWorkbenchStore((s) => s.setSettingsOpen);
  const hasApiKey = useWorkbenchStore((s) =>
    Boolean(s.modelConfig.textApiKey.trim() || s.modelConfig.imageApiKey.trim())
  );

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white">
            <Layers className="h-4.5 w-4.5" strokeWidth={2} />
          </div>
          <div className="leading-tight">
            <h1 className="text-[15px] font-semibold tracking-tight text-neutral-900">
              简悦创作台
            </h1>
            <p className="hidden text-xs text-neutral-500 sm:block">
              多平台推流文案与视觉工坊
            </p>
          </div>
        </div>

        {/* Center Segmented Navigation */}
        <nav
          aria-label="工作台模块切换"
          className="flex items-center rounded-full border border-neutral-200/80 bg-neutral-100/80 p-1"
        >
          <button
            type="button"
            onClick={() => setActiveTab("copywriting")}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              activeTab === "copywriting"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <PenTool className="h-4 w-4" />
            <span>推流文案</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("image-studio")}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              activeTab === "image-studio"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            <span>图片工坊</span>
          </button>
        </nav>

        {/* Model Settings Trigger */}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-white px-3 py-2 text-xs font-medium text-neutral-700 shadow-xs transition hover:border-neutral-300 hover:bg-neutral-50"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              hasApiKey ? "bg-emerald-500" : "bg-neutral-300"
            }`}
          />
          <SlidersHorizontal className="h-3.5 w-3.5 text-neutral-500" />
          <span className="hidden sm:inline">
            {hasApiKey ? "大模型已连接" : "模型配置"}
          </span>
        </button>
      </div>
    </header>
  );
}
