"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  Menu,
  PenTool,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

const NAV_ITEMS = [
  { href: "/", label: "工作台概览", icon: LayoutDashboard },
  { href: "/copywriting", label: "推流文案", icon: PenTool },
  { href: "/image-studio", label: "图片工坊", icon: ImageIcon },
  { href: "/history", label: "创作记录", icon: History },
  { href: "/settings", label: "模型配置", icon: SlidersHorizontal },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const hasApiKey = useWorkbenchStore((s) =>
    Boolean(s.modelConfig.apiKey.trim())
  );
  const historyCount = useWorkbenchStore((s) => s.history.length);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen bg-[#F8F9FB]">
        {/* Desktop Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: collapsed ? 80 : 248 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200/80 bg-white/90 backdrop-blur-md lg:flex"
        >
          {/* Brand Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-slate-100">
            <Link
              href="/"
              className="flex items-center gap-2.5 overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/elonga-logo.png"
                alt="Elonga Logo"
                className="h-8 w-8 shrink-0 object-contain"
              />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-col leading-none"
                  >
                    <span className="text-[18px] font-bold tracking-tight text-[#0F172A]">
                      Elonga
                    </span>
                    <span className="mt-1 text-[10px] font-medium text-slate-400">
                      简悦创作工作台
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>

            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav
            aria-label="主导航"
            className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebarActivePill"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 32,
                      }}
                      className="absolute inset-0 rounded-xl bg-indigo-50/90 ring-1 ring-indigo-200/60"
                    />
                  )}
                  <Icon
                    className={`relative z-10 h-4.5 w-4.5 shrink-0 ${
                      active ? "text-indigo-600" : "text-slate-500"
                    }`}
                  />
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="relative z-10 flex flex-1 items-center justify-between truncate"
                      >
                        <span>{item.label}</span>
                        {item.href === "/history" && historyCount > 0 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {historyCount}
                          </span>
                        )}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </nav>

          {/* Bottom Status */}
          <div className="border-t border-slate-100 p-3">
            <Link
              href="/settings"
              className="flex items-center gap-2.5 rounded-xl bg-slate-50/80 px-3 py-2.5 text-xs text-slate-600 transition hover:bg-slate-100"
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  hasApiKey ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
              {!collapsed && (
                <span className="truncate font-medium">
                  {hasApiKey ? "云端大模型已连接" : "内置引擎模式"}
                </span>
              )}
            </Link>
          </div>
        </motion.aside>

        {/* Mobile Header & Drawer */}
        <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-md lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/elonga-logo.png"
                alt="Elonga Logo"
                className="h-7 w-7 object-contain"
              />
              <span className="text-base font-bold tracking-tight text-slate-900">
                Elonga
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="打开菜单"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
            </button>
          </header>

          <AnimatePresence>
            {mobileOpen && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileOpen(false)}
                  className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs"
                />
                <motion.aside
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", stiffness: 360, damping: 34 }}
                  className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl"
                >
                  <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/elonga-logo.png"
                        alt="Elonga Logo"
                        className="h-7 w-7 object-contain"
                      />
                      <span className="text-base font-bold text-slate-900">
                        Elonga
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                      aria-label="关闭菜单"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <nav className="flex-1 space-y-1 p-3">
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                            active
                              ? "bg-indigo-50 text-indigo-700"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </motion.aside>
              </div>
            )}
          </AnimatePresence>

          {/* Main Route Viewport */}
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}
