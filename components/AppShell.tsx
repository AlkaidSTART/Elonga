"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  PenTool,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { AuthUser } from "@/lib/auth/jwt";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

const NAV_ITEMS = [
  { href: "/", label: "工作台概览", icon: LayoutDashboard },
  { href: "/organization", label: "机构中心", icon: Building2 },
  { href: "/workflow", label: "内容创作", icon: PenTool },
  { href: "/image-studio", label: "图片工坊", icon: ImageIcon },
  { href: "/history", label: "创作记录", icon: History },
  { href: "/settings", label: "模型配置", icon: SlidersHorizontal },
] as const;

function BrandMark() {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] bg-[#0F172A] text-white">
      <svg
        width="13"
        height="13"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M3 3.25H13V5.25H5.25V7H11.5V9H5.25V10.75H13V12.75H3V3.25Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const historyCount = useWorkbenchStore((s) => s.history.length);

  const isAuthPage = pathname === "/login";

  useEffect(() => {
    if (isAuthPage) {
      return;
    }

    let cancelled = false;
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { authenticated?: boolean; user?: AuthUser } | null) => {
        if (!cancelled) {
          setCurrentUser(data?.authenticated && data.user ? data.user : null);
        }
      })
      .catch(() => {
        // Ignore transient network errors; proxy enforces session on navigation
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthPage, pathname]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setCurrentUser(null);
      setMobileOpen(false);
      setLoggingOut(false);
      router.replace("/login");
      router.refresh();
    }
  };

  if (isAuthPage) {
    return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const userInitial = currentUser?.name?.slice(0, 1) || "E";

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen bg-[#F6F7F9] text-[#0F172A]">
        {/* Desktop Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: collapsed ? 64 : 228 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-[#E2E8F0] bg-white lg:flex"
        >
          {/* Brand Header */}
          <div
            className={`flex h-14 items-center border-b border-[#E2E8F0] ${
              collapsed ? "justify-center px-2" : "justify-between px-4"
            }`}
          >
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.12 }}
                  className="overflow-hidden"
                >
                  <Link
                    href="/"
                    className="flex items-center gap-2.5 whitespace-nowrap"
                  >
                    <BrandMark />
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[15px] font-semibold tracking-tight text-[#0F172A]">
                        Elonga
                      </span>
                      <span className="font-mono text-[10px] font-medium tracking-wider text-slate-400 uppercase">
                        PRO
                      </span>
                    </div>
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
                      transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
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
                          <span className="rounded border border-[#E2E8F0] bg-white px-1.5 py-0.5 font-mono text-[10px] leading-none text-slate-600 tabular-nums">
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

          {/* Session Footer */}
          <div className="border-t border-[#E2E8F0] p-2.5">
            {collapsed ? (
              <div className="flex flex-col items-center gap-2">
                {currentUser && (
                  <div
                    title={`${currentUser.name} (${currentUser.role})`}
                    className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0F172A] text-xs font-semibold text-white"
                  >
                    {userInitial}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  title="退出登录"
                  aria-label="退出登录"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-red-600 disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-[#F8FAFC] px-2.5 py-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#0F172A] text-xs font-semibold text-white">
                    {userInitial}
                  </div>
                  <div className="min-w-0 leading-tight">
                    <div className="truncate text-xs font-medium text-[#0F172A]">
                      {currentUser?.name ?? "已认证会话"}
                    </div>
                    <div className="truncate text-[10px] text-slate-500">
                      {currentUser?.role ?? "JWT Session"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  title="退出登录"
                  aria-label="退出登录"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-white hover:text-red-600 hover:shadow-2xs disabled:opacity-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </motion.aside>

        {/* Mobile Header & Drawer */}
        <div className="flex min-w-0 flex-1 flex-col bg-[#F6F7F9]">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E2E8F0] bg-white/95 px-4 backdrop-blur-sm lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <BrandMark />
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
                  className="fixed inset-0 bg-slate-950/35 backdrop-blur-xs"
                />
                <motion.aside
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-[#E2E8F0] bg-white shadow-xl"
                >
                  <div className="flex h-14 items-center justify-between border-b border-[#E2E8F0] px-4">
                    <div className="flex items-center gap-2">
                      <BrandMark />
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

                  {/* Mobile Session Footer */}
                  <div className="border-t border-[#E2E8F0] p-3">
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-[#F8FAFC] px-2.5 py-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#0F172A] text-xs font-semibold text-white">
                          {userInitial}
                        </div>
                        <div className="min-w-0 leading-tight">
                          <div className="truncate text-xs font-medium text-[#0F172A]">
                            {currentUser?.name ?? "已认证会话"}
                          </div>
                          <div className="truncate text-[10px] text-slate-500">
                            {currentUser?.role ?? "JWT Session"}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        aria-label="退出登录"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-white hover:text-red-600 disabled:opacity-50"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
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
