"use client";

import { BrandLogo } from "@/components/BrandLogo";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

export function Header() {
  const activeTab = useWorkbenchStore((s) => s.activeTab);
  const setActiveTab = useWorkbenchStore((s) => s.setActiveTab);
  const setSettingsOpen = useWorkbenchStore((s) => s.setSettingsOpen);
  const hasApiKey = useWorkbenchStore((s) =>
    Boolean(s.modelConfig.textApiKey.trim() || s.modelConfig.imageApiKey.trim()),
  );

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-2.5 leading-tight">
          <BrandLogo size={26} />
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight text-neutral-900">Elonga</h1>
            <p className="hidden text-xs text-neutral-500 sm:block">多平台推流文案与视觉工坊</p>
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
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              activeTab === "copywriting"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            推流文案
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("image-studio")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              activeTab === "image-studio"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            图片工坊
          </button>
        </nav>

        {/* Model Settings Trigger */}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-neutral-200/80 bg-white px-3 py-2 text-xs font-medium text-neutral-700 shadow-xs transition hover:border-neutral-300 hover:bg-neutral-50"
        >
          <span
            className={`h-2 w-2 rounded-full ${hasApiKey ? "bg-emerald-500" : "bg-neutral-300"}`}
          />
          <span>{hasApiKey ? "大模型已连接" : "模型配置"}</span>
        </button>
      </div>
    </header>
  );
}
