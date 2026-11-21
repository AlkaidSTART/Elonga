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
  Workflow,
  X,
} from "lucide-react";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

const NAV_ITEMS = [
  { href: "/", label: "概览", icon: LayoutDashboard },
  { href: "/copywriting", label: "推流文案", icon: PenTool },
  { href: "/image-studio", label: "图片工坊", icon: ImageIcon },
  { href: "/workflow", label: "图文工作流", icon: Workflow },
  { href: "/history", label: "创作记录", icon: History },
  { href: "/settings", label: "模型配置", icon: SlidersHorizontal },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const historyCount = useWorkbenchStore((s) => s.history.length);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen bg-[#F7F7F5] text-zinc-900">
        {/* Desktop Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: collapsed ? 72 : 232 }}
          transition={{ type: "spring", stiffness: 340, damping: 34 }}
          className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-[#E7E5DF] bg-[#F3F2EE] lg:flex"
        >
          {/* Brand Header */}
          <div
            className={`flex h-14 items-center border-b border-[#E7E5DF]/80 ${
              collapsed ? "justify-center px-2" : "justify-between px-4"
            }`}
          >
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.16 }}
                  className="overflow-hidden"
                >
                  <Link
                    href="/"
                    className="flex items-center gap-2.5 whitespace-nowrap"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/elonga-logo.png"
                      alt="Elonga Logo"
                      className="h-7 w-7 shrink-0 object-contain"
                    />
                    <span className="text-[17px] font-bold tracking-tight text-neutral-900">
                      Elonga
                    </span>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-200/60 hover:text-neutral-700"
            >
              {collapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav
            aria-label="主导航"
            className="flex-1 space-y-1 overflow-y-auto px-2.5 py-4"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors ${
                    active
                      ? "text-zinc-950"
                      : "text-zinc-500 hover:bg-black/[0.035] hover:text-zinc-900"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebarActivePill"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                      }}
                      className="absolute inset-0 rounded-xl bg-white shadow-[0_1px_3px_rgba(24,24,27,0.06)] ring-1 ring-[#E8E6E1]"
                    />
                  )}
                  <Icon
                    className={`relative z-10 h-4 w-4 shrink-0 transition-colors ${
                      active ? "text-[#0F6E5D]" : "text-zinc-400"
                    }`}
                  />
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.14 }}
                        className="relative z-10 flex flex-1 items-center justify-between truncate"
                      >
                        <span>{item.label}</span>
                        {item.href === "/history" && historyCount > 0 && (
                          <span className="font-mono text-[11px] text-neutral-400">
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
        </motion.aside>

        {/* Mobile Header & Drawer */}
        <div className="flex flex-1 flex-col min-w-0 bg-[#F7F7F5]">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E7E5DF] bg-[#F7F7F5]/90 px-4 backdrop-blur-md lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/elonga-logo.png"
                alt="Elonga Logo"
                className="h-6 w-6 object-contain"
              />
              <span className="text-base font-bold tracking-tight text-neutral-900">
                Elonga
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="打开菜单"
              className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100"
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
                  className="fixed inset-0 bg-neutral-950/20 backdrop-blur-xs"
                />
                <motion.aside
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", stiffness: 360, damping: 34 }}
                  className="fixed inset-y-0 left-0 flex w-60 flex-col bg-[#FAFAFA] border-r border-neutral-200 shadow-xl"
                >
                  <div className="flex h-14 items-center justify-between border-b border-neutral-200/60 px-4">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/elonga-logo.png"
                        alt="Elonga Logo"
                        className="h-6 w-6 object-contain"
                      />
                      <span className="text-base font-bold text-neutral-900">
                        Elonga
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-200/60"
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
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                            active
                              ? "bg-white text-neutral-950 shadow-2xs ring-1 ring-neutral-200/80"
                              : "text-neutral-500 hover:bg-neutral-200/40"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 ${
                              active ? "text-neutral-900" : "text-neutral-400"
                            }`}
                          />
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
          <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-7 sm:px-8 lg:px-10">
            {children}
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}
