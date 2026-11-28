"use client";

import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import {
  Building2,
  FileBarChart2,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  PenTool,
  SlidersHorizontal,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { WorkspaceViewFallback } from "@/components/layout/WorkspaceViewFallback";
import { OverviewWorkspace } from "@/components/overview/OverviewWorkspace";

const AnalyticsWorkspace = dynamic(
  () => import("@/components/analytics/AnalyticsWorkspace").then((mod) => mod.AnalyticsWorkspace),
  { loading: WorkspaceViewFallback },
);

const ReportsWorkspace = dynamic(
  () => import("@/components/reports/ReportsWorkspace").then((mod) => mod.ReportsWorkspace),
  { loading: WorkspaceViewFallback },
);

const ContentWorkflowWorkspace = dynamic(
  () =>
    import("@/components/workflow/ContentWorkflowWorkspace").then(
      (mod) => mod.ContentWorkflowWorkspace,
    ),
  { loading: WorkspaceViewFallback },
);

const ImageStudioWorkspace = dynamic(
  () =>
    import("@/components/image-studio/ImageStudioWorkspace").then(
      (mod) => mod.ImageStudioWorkspace,
    ),
  { loading: WorkspaceViewFallback },
);

const OrganizationWorkspace = dynamic(
  () =>
    import("@/components/organization/OrganizationWorkspace").then(
      (mod) => mod.OrganizationWorkspace,
    ),
  { loading: WorkspaceViewFallback },
);

const HistoryWorkspace = dynamic(
  () => import("@/components/history/HistoryWorkspace").then((mod) => mod.HistoryWorkspace),
  { loading: WorkspaceViewFallback },
);

const SettingsWorkspace = dynamic(
  () => import("@/components/settings/SettingsWorkspace").then((mod) => mod.SettingsWorkspace),
  { loading: WorkspaceViewFallback },
);

const ProfileWorkspace = dynamic(
  () => import("@/components/profile/ProfileWorkspace").then((mod) => mod.ProfileWorkspace),
  { loading: WorkspaceViewFallback },
);

export type WorkspaceNavGroupLabel = "总览" | "创作" | "资产" | "系统";

export interface WorkspaceRouteConfig {
  href: string;
  label: string;
  icon: LucideIcon;
  component: ComponentType;
  /** Sidebar navigation group. Routes without a group (e.g. /profile) are rendered in the layout but not listed in the main nav groups. */
  group?: WorkspaceNavGroupLabel;
  /** Whether the route must match pathname exactly (default: false, prefix match). */
  matchExact?: boolean;
}

export const WORKSPACE_ROUTES: readonly WorkspaceRouteConfig[] = [
  {
    href: "/",
    label: "工作台概览",
    group: "总览",
    icon: LayoutDashboard,
    component: OverviewWorkspace,
    matchExact: true,
  },
  {
    href: "/analytics",
    label: "流量分析",
    group: "总览",
    icon: TrendingUp,
    component: AnalyticsWorkspace,
  },
  {
    href: "/reports",
    label: "运营月报",
    group: "总览",
    icon: FileBarChart2,
    component: ReportsWorkspace,
  },
  {
    href: "/workflow",
    label: "内容创作",
    group: "创作",
    icon: PenTool,
    component: ContentWorkflowWorkspace,
  },
  {
    href: "/image-studio",
    label: "图片工坊",
    group: "创作",
    icon: ImageIcon,
    component: ImageStudioWorkspace,
  },
  {
    href: "/organization",
    label: "机构中心",
    group: "资产",
    icon: Building2,
    component: OrganizationWorkspace,
  },
  {
    href: "/history",
    label: "创作记录",
    group: "资产",
    icon: History,
    component: HistoryWorkspace,
  },
  {
    href: "/settings",
    label: "模型配置",
    group: "系统",
    icon: SlidersHorizontal,
    component: SettingsWorkspace,
  },
  {
    href: "/profile",
    label: "个人中心",
    icon: UserRound,
    component: ProfileWorkspace,
  },
] as const;

const NAV_GROUP_ORDER: readonly WorkspaceNavGroupLabel[] = ["总览", "创作", "资产", "系统"];

export const WORKSPACE_NAV_GROUPS = NAV_GROUP_ORDER.map((label) => ({
  label,
  items: WORKSPACE_ROUTES.filter((route) => route.group === label),
}));

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function isWorkspaceRouteActive(
  pathname: string,
  route: Pick<WorkspaceRouteConfig, "href" | "matchExact">,
): boolean {
  const normalized = normalizePathname(pathname);
  if (route.matchExact || route.href === "/") {
    return normalized === route.href;
  }
  return normalized === route.href || normalized.startsWith(`${route.href}/`);
}

export function resolveWorkspaceRoute(pathname: string): WorkspaceRouteConfig | undefined {
  return WORKSPACE_ROUTES.find((route) => isWorkspaceRouteActive(pathname, route));
}
