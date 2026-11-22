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
      <div className="flex min-h-screen bg-[#F7F8FA] text-[#0F172A]">
        {/* Desktop Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: collapsed ? 64 : 224 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-[#E4E7EC] bg-white lg:flex"
        >
          {/* Brand Header */}
          <div
            className={`flex h-14 items-center border-b border-[#E4E7EC] ${
              collapsed ? "justify-center px-2" : "justify-between px-4"
            }`}
          >
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.14 }}
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
                      className="h-6 w-6 shrink-0 object-contain"
                    />
                    <span className="text-[16px] font-semibold tracking-tight text-[#0F172A]">
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
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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
            className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3.5"
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-[#F1F5F9] text-[#0F172A]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-[#0F172A]"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebarActiveBar"
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-r-xs bg-[#1D4ED8]"
                    />
                  )}
                  <Icon
                    className={`relative z-10 h-4 w-4 shrink-0 transition-colors ${
                      active ? "text-[#1D4ED8]" : "text-slate-400"
                    }`}
                  />
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        className="relative z-10 flex flex-1 items-center justify-between truncate"
                      >
                        <span>{item.label}</span>
                        {item.href === "/history" && historyCount > 0 && (
                          <span className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[10px] leading-none text-slate-600 tabular-nums">
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
        <div className="flex flex-1 flex-col min-w-0 bg-[#F7F8FA]">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E4E7EC] bg-white/95 px-4 backdrop-blur-sm lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/elonga-logo.png"
                alt="Elonga Logo"
                className="h-6 w-6 object-contain"
              />
              <span className="text-[15px] font-semibold tracking-tight text-[#0F172A]">
                Elonga
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="打开菜单"
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
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
                  className="fixed inset-0 bg-slate-950/30 backdrop-blur-xs"
                />
                <motion.aside
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-[#E4E7EC] bg-white shadow-xl"
                >
                  <div className="flex h-14 items-center justify-between border-b border-[#E4E7EC] px-4">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/elonga-logo.png"
                        alt="Elonga Logo"
                        className="h-6 w-6 object-contain"
                      />
                      <span className="text-[15px] font-semibold text-[#0F172A]">
                        Elonga
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="关闭菜单"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <nav className="flex-1 space-y-0.5 p-2.5">
                    {NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition ${
                            active
                              ? "bg-[#F1F5F9] text-[#0F172A]"
                              : "text-slate-500 hover:bg-slate-50 hover:text-[#0F172A]"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 ${
                              active ? "text-[#1D4ED8]" : "text-slate-400"
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
          <main className="mx-auto w-full max-w-[1360px] flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}
