"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import {
  WORKSPACE_NAV_GROUPS,
  isWorkspaceRouteActive,
  resolveWorkspaceRoute,
} from "@/components/layout/workspace-routes";
import type { AuthUser } from "@/lib/auth/jwt";
import { sanitizeImageSrc } from "@/lib/url-safety";
import {
  PROFILE_UPDATED_EVENT,
  getAvatarAccentMeta,
  useProfileStore,
} from "@/store/useProfileStore";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

export function AppShell({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const historyCount = useWorkbenchStore((s) => s.history.length);
  const profilesByUserId = useProfileStore((s) => s.profilesByUserId);

  useEffect(() => {
    let cancelled = false;
    const loadMe = () => {
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
    };

    loadMe();
    window.addEventListener(PROFILE_UPDATED_EVENT, loadMe);

    return () => {
      cancelled = true;
      window.removeEventListener(PROFILE_UPDATED_EVENT, loadMe);
    };
  }, [pathname]);

  const activeRoute = resolveWorkspaceRoute(pathname);
  const ActiveView = activeRoute?.component;
  const profileActive = isWorkspaceRouteActive(pathname, { href: "/profile" });

  const userInitial = currentUser?.name?.slice(0, 1) || "E";
  const userExtras = currentUser?.id ? profilesByUserId[currentUser.id] : undefined;
  const avatarAccent = getAvatarAccentMeta(userExtras?.avatarAccent);
  const avatarDataUrl = sanitizeImageSrc(userExtras?.avatarDataUrl);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen bg-[#F6F4EF] text-[#181816]">
        {/* Desktop Editorial Rail */}
        <motion.aside
          initial={false}
          animate={{ width: collapsed ? 64 : 228 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-[#E2DDD3] bg-[#EFECE4]/75 lg:flex"
        >
          {/* Brand Header */}
          <div
            className={`flex h-14 items-center border-b border-[#E2DDD3] ${
              collapsed ? "justify-center px-2" : "justify-between px-4"
            }`}
          >
            {collapsed ? (
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                aria-label="展开侧边栏"
                title="展开侧边栏"
                className="flex h-8 w-8 items-center justify-center rounded transition hover:bg-[#E5E0D5]"
              >
                <BrandLogo size={22} />
              </button>
            ) : (
              <>
                <Link
                  href="/"
                  className="flex items-center gap-2.5 whitespace-nowrap"
                >
                  <BrandLogo size={22} />
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-editorial text-[16px] font-semibold tracking-tight text-[#181816]">
                      Elonga
                    </span>
                    <span className="text-[10px] tracking-wider text-[#8C857B]">
                      简悦工坊
                    </span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => setCollapsed(true)}
                  aria-label="收起侧边栏"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[#8C857B] transition hover:bg-[#E5E0D5] hover:text-[#181816]"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Grouped Navigation */}
          <nav
            aria-label="主导航"
            className="flex-1 space-y-5 overflow-y-auto px-3 py-4"
          >
            {WORKSPACE_NAV_GROUPS.map((group) => (
              <div key={group.label}>
                {!collapsed && (
                  <div className="mb-1.5 px-2.5 text-[10px] font-medium tracking-[0.14em] text-[#8C857B]">
                    {group.label}
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isWorkspaceRouteActive(pathname, item);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={`group relative flex items-center gap-2.5 rounded px-2.5 py-2 text-[13px] transition-colors ${
                          active
                            ? "bg-[#FCFBF8] font-medium text-[#1B4D3E]"
                            : "text-[#57534E] hover:bg-[#E7E2D8]/60 hover:text-[#181816]"
                        }`}
                      >
                        {active && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-y-1.5 left-0 w-[2.5px] rounded-r bg-[#1B4D3E]"
                          />
                        )}
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            active
                              ? "text-[#1B4D3E]"
                              : "text-[#8C857B] group-hover:text-[#57534E]"
                          }`}
                        />
                        {!collapsed && (
                          <span className="flex flex-1 items-center justify-between truncate">
                            <span>{item.label}</span>
                            {item.href === "/history" && historyCount > 0 && (
                              <span className="font-mono text-[11px] text-[#8C857B] tabular-nums">
                                {historyCount}
                              </span>
                            )}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Session Footer */}
          <div className="border-t border-[#E2DDD3] px-3 py-3">
            {collapsed ? (
              <div className="flex flex-col items-center gap-1.5">
                <Link
                  href="/profile"
                  title="个人中心"
                  aria-label="个人中心"
                  className={`relative flex h-8 w-8 items-center justify-center rounded transition ${
                    profileActive
                      ? "bg-[#FCFBF8] ring-1 ring-[#1B4D3E]/30"
                      : "hover:bg-[#E5E0D5]"
                  }`}
                >
                  {avatarDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarDataUrl}
                      alt={currentUser?.name ?? "头像"}
                      className="h-6 w-6 rounded object-cover"
                    />
                  ) : (
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded text-[11px] font-semibold ${avatarAccent.avatarBgClass} ${avatarAccent.avatarTextClass}`}
                    >
                      {userInitial}
                    </span>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  title="展开侧边栏"
                  aria-label="展开侧边栏"
                  className="flex h-8 w-8 items-center justify-center rounded text-[#8C857B] transition hover:bg-[#E5E0D5] hover:text-[#181816]"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Link
                href="/profile"
                title="进入个人中心"
                className={`group relative flex items-center justify-between gap-2 rounded px-2.5 py-2 transition-colors ${
                  profileActive
                    ? "bg-[#FCFBF8] text-[#1B4D3E]"
                    : "hover:bg-[#E7E2D8]/60"
                }`}
              >
                {profileActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-1.5 left-0 w-[2.5px] rounded-r bg-[#1B4D3E]"
                  />
                )}
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  {avatarDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarDataUrl}
                      alt={currentUser?.name ?? "头像"}
                      className="h-7 w-7 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-xs font-semibold ${avatarAccent.avatarBgClass} ${avatarAccent.avatarTextClass}`}
                    >
                      {userInitial}
                    </div>
                  )}
                  <div className="min-w-0 leading-tight">
                    <div
                      className={`truncate text-xs font-medium ${
                        profileActive ? "text-[#1B4D3E]" : "text-[#181816]"
                      }`}
                    >
                      {currentUser?.name ?? "工作区成员"}
                    </div>
                    <div className="truncate text-[11px] text-[#8C857B]">
                      个人中心 · {currentUser?.role ?? "已登录"}
                    </div>
                  </div>
                </div>
                <ChevronRight
                  className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                    profileActive
                      ? "text-[#1B4D3E]"
                      : "text-[#8C857B] group-hover:text-[#57534E]"
                  }`}
                />
              </Link>
            )}
          </div>
        </motion.aside>

        {/* Mobile Header & Drawer */}
        <div className="flex min-w-0 flex-1 flex-col bg-[#F6F4EF]">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#E2DDD3] bg-[#F6F4EF]/95 px-4 backdrop-blur-xs lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandLogo size={22} />
              <span className="font-editorial text-[16px] font-semibold tracking-tight text-[#181816]">
                Elonga
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="打开菜单"
              className="rounded p-2 text-[#57534E] hover:bg-[#E5E0D5]"
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
                  className="fixed inset-0 bg-[#181816]/30"
                />
                <motion.aside
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-[#E2DDD3] bg-[#EFECE4]"
                >
                  <div className="flex h-14 items-center justify-between border-b border-[#E2DDD3] px-4">
                    <div className="flex items-center gap-2.5">
                      <BrandLogo size={22} />
                      <span className="font-editorial text-[16px] font-semibold text-[#181816]">
                        Elonga
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMobileOpen(false)}
                      className="rounded p-1.5 text-[#8C857B] hover:bg-[#E5E0D5] hover:text-[#181816]"
                      aria-label="关闭菜单"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
                    {WORKSPACE_NAV_GROUPS.map((group) => (
                      <div key={group.label}>
                        <div className="mb-1.5 px-2.5 text-[10px] font-medium tracking-[0.14em] text-[#8C857B]">
                          {group.label}
                        </div>
                        <div className="space-y-0.5">
                          {group.items.map((item) => {
                            const Icon = item.icon;
                            const active = isWorkspaceRouteActive(pathname, item);
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={`relative flex items-center gap-2.5 rounded px-2.5 py-2 text-sm transition ${
                                  active
                                    ? "bg-[#FCFBF8] font-medium text-[#1B4D3E]"
                                    : "text-[#57534E] hover:bg-[#E7E2D8]/60 hover:text-[#181816]"
                                }`}
                              >
                                {active && (
                                  <span
                                    aria-hidden="true"
                                    className="absolute inset-y-1.5 left-0 w-[2.5px] rounded-r bg-[#1B4D3E]"
                                  />
                                )}
                                <Icon
                                  className={`h-4 w-4 ${
                                    active ? "text-[#1B4D3E]" : "text-[#8C857B]"
                                  }`}
                                />
                                <span>{item.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </nav>

                  {/* Mobile Session Footer */}
                  <div className="border-t border-[#E2DDD3] p-3">
                    <Link
                      href="/profile"
                      onClick={() => setMobileOpen(false)}
                      className={`relative flex items-center justify-between gap-2 rounded px-2.5 py-2 transition ${
                        profileActive
                          ? "bg-[#FCFBF8] text-[#1B4D3E]"
                          : "hover:bg-[#E7E2D8]/60"
                      }`}
                    >
                      {profileActive && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-1.5 left-0 w-[2.5px] rounded-r bg-[#1B4D3E]"
                        />
                      )}
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        {avatarDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatarDataUrl}
                            alt={currentUser?.name ?? "头像"}
                            className="h-7 w-7 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-xs font-semibold ${avatarAccent.avatarBgClass} ${avatarAccent.avatarTextClass}`}
                          >
                            {userInitial}
                          </div>
                        )}
                        <div className="min-w-0 leading-tight">
                          <div
                            className={`truncate text-xs font-medium ${
                              profileActive ? "text-[#1B4D3E]" : "text-[#181816]"
                            }`}
                          >
                            {currentUser?.name ?? "工作区成员"}
                          </div>
                          <div className="truncate text-[11px] text-[#8C857B]">
                            个人中心 · {currentUser?.role ?? "已登录"}
                          </div>
                        </div>
                      </div>
                      <ChevronRight
                        className={`h-3.5 w-3.5 shrink-0 ${
                          profileActive ? "text-[#1B4D3E]" : "text-[#8C857B]"
                        }`}
                      />
                    </Link>
                  </div>
                </motion.aside>
              </div>
            )}
          </AnimatePresence>

          {/* Main Route Viewport: unified business view dispatch by route */}
          <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 py-7 sm:px-9 lg:px-12 lg:py-9">
            {ActiveView ? <ActiveView /> : children}
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}
