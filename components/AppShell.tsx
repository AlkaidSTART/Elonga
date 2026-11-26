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
import { BrandLogo } from "@/components/BrandLogo";
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
      <div className="flex min-h-screen bg-[#F7F8FA] text-[#111827]">
        {/* Desktop Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: collapsed ? 64 : 224 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-[#E5E7EB] bg-white lg:flex"
        >
          {/* Brand Header */}
          <div
            className={`flex h-14 items-center border-b border-[#E5E7EB] ${
              collapsed ? "justify-center px-2" : "justify-between px-4"
            }`}
          >
            {collapsed ? (
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                aria-label="展开侧边栏"
                title="展开侧边栏"
                className="flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-gray-100"
              >
                <BrandLogo size={22} />
              </button>
            ) : (
              <>
                <Link
                  href="/"
                  className="flex items-center gap-2.5 whitespace-nowrap"
                >
                  <BrandLogo size={24} />
                  <span className="text-[15px] font-semibold tracking-tight text-[#111827]">
                    Elonga
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  aria-label="收起侧边栏"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Navigation */}
          <nav
            aria-label="主导航"
            className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3"
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
                      ? "bg-[#EEF2FF] text-[#3451E5]"
                      : "text-gray-600 hover:bg-gray-100/80 hover:text-[#111827]"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      active ? "text-[#3451E5]" : "text-gray-400"
                    }`}
                  />
                  {!collapsed && (
                    <span className="flex flex-1 items-center justify-between truncate">
                      <span>{item.label}</span>
                      {item.href === "/history" && historyCount > 0 && (
                        <span className="rounded bg-white px-1.5 py-0.5 text-[11px] leading-none text-gray-500 ring-1 ring-gray-200 tabular-nums">
                          {historyCount}
                        </span>
                      )}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Session Footer */}
          <div className="border-t border-[#E5E7EB] p-2.5">
            {collapsed ? (
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  title="展开侧边栏"
                  aria-label="展开侧边栏"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  title="退出登录"
                  aria-label="退出登录"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-red-600 disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-[#F9FAFB] px-2.5 py-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#3451E5]/10 text-xs font-semibold text-[#3451E5]">
                    {userInitial}
                  </div>
                  <div className="min-w-0 leading-tight">
                    <div className="truncate text-xs font-medium text-[#111827]">
                      {currentUser?.name ?? "工作区成员"}
                    </div>
                    <div className="truncate text-[11px] text-gray-500">
                      {currentUser?.role ?? "已登录"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  title="退出登录"
                  aria-label="退出登录"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-white hover:text-red-600 hover:shadow-2xs disabled:opacity-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </motion.aside>

        {/* Mobile Header & Drawer */}
        <div className="flex min-w-0 flex-1 flex-col bg-[#F7F8FA]">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E5E7EB] bg-white px-4 lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandLogo size={24} />
              <span className="text-[15px] font-semibold tracking-tight text-[#111827]">
                Elonga
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="打开菜单"
              className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
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
                  className="fixed inset-0 bg-black/25"
                />
                <motion.aside
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-[#E5E7EB] bg-white shadow-xl"
                >
                  <div className="flex h-14 items-center justify-between border-b border-[#E5E7EB] px-4">
                    <div className="flex items-center gap-2.5">
                      <BrandLogo size={24} />
                      <span className="text-[15px] font-semibold text-[#111827]">
                        Elonga
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
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
                              ? "bg-[#EEF2FF] text-[#3451E5]"
                              : "text-gray-600 hover:bg-gray-100/80 hover:text-[#111827]"
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 ${
                              active ? "text-[#3451E5]" : "text-gray-400"
                            }`}
                          />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </nav>

                  {/* Mobile Session Footer */}
                  <div className="border-t border-[#E5E7EB] p-3">
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-[#F9FAFB] px-2.5 py-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#3451E5]/10 text-xs font-semibold text-[#3451E5]">
                          {userInitial}
                        </div>
                        <div className="min-w-0 leading-tight">
                          <div className="truncate text-xs font-medium text-[#111827]">
                            {currentUser?.name ?? "工作区成员"}
                          </div>
                          <div className="truncate text-[11px] text-gray-500">
                            {currentUser?.role ?? "已登录"}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        aria-label="退出登录"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-white hover:text-red-600 disabled:opacity-50"
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
          <main className="mx-auto w-full max-w-[1320px] flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}
