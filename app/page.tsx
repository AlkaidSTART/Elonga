"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowUpRight, FileBarChart2 } from "lucide-react";
import type { EChartsOption } from "echarts";
import { EChartBox } from "@/components/charts/EChartBox";
import {
  buildDemoOverviewStats,
  computeOverviewStats,
} from "@/lib/overview-stats";
import { useOrganizationStore } from "@/store/useOrganizationStore";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

const emptySubscribe = () => () => {};
const getClientTodayKey = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const getServerTodayKey = () => null;

export default function OverviewPage() {
  const history = useWorkbenchStore((s) => s.history);
  const activities = useOrganizationStore((s) => s.activities);
  const orgName = useOrganizationStore((s) => s.profile.name);
  const [dataMode, setDataMode] = useState<"auto" | "live" | "demo">("auto");

  const todayKey = useSyncExternalStore(
    emptySubscribe,
    getClientTodayKey,
    getServerTodayKey
  );
  const today = useMemo(() => {
    if (!todayKey) return null;
    const [y, m, d] = todayKey.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [todayKey]);

  const effectiveMode: "live" | "demo" =
    dataMode === "auto" ? (history.length > 0 ? "live" : "demo") : dataMode;

  const stats = useMemo(
    () =>
      effectiveMode === "live"
        ? computeOverviewStats(history, today)
        : buildDemoOverviewStats(today),
    [effectiveMode, history, today]
  );

  const platformBarOption = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "#FCFBF8",
        borderColor: "#E2DDD3",
        borderWidth: 1,
        textStyle: { color: "#181816", fontSize: 12 },
      },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 8,
        itemHeight: 8,
        icon: "roundRect",
        textStyle: { color: "#57534E", fontSize: 11 },
      },
      grid: {
        left: 6,
        right: 12,
        top: 34,
        bottom: 4,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: stats.platformStats.map((p) => p.name),
        axisLine: { lineStyle: { color: "#DDD7CA" } },
        axisTick: { show: false },
        axisLabel: { color: "#57534E", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: "#EAE5DC", type: "dashed" } },
        axisLabel: { color: "#8C857B", fontSize: 11 },
      },
      series: [
        {
          name: "已发布",
          type: "bar",
          barMaxWidth: 13,
          itemStyle: { color: "#1B4D3E", borderRadius: [2, 2, 0, 0] },
          data: stats.platformStats.map((p) => p.publishedCount),
        },
        {
          name: "创作",
          type: "bar",
          barMaxWidth: 13,
          itemStyle: { color: "#C4BEB2", borderRadius: [2, 2, 0, 0] },
          data: stats.platformStats.map((p) => p.createdCount),
        },
        {
          name: "爆款",
          type: "bar",
          barMaxWidth: 13,
          itemStyle: { color: "#B85D3B", borderRadius: [2, 2, 0, 0] },
          data: stats.platformStats.map((p) => p.viralCount),
        },
      ],
    }),
    [stats.platformStats]
  );

  const trendOption = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: "axis",
        backgroundColor: "#FCFBF8",
        borderColor: "#E2DDD3",
        borderWidth: 1,
        textStyle: { color: "#181816", fontSize: 12 },
      },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 10,
        itemHeight: 3,
        textStyle: { color: "#57534E", fontSize: 11 },
      },
      grid: {
        left: 8,
        right: 24,
        top: 34,
        bottom: 4,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: stats.dailyTrend.map((d) => d.dateLabel),
        axisLine: { lineStyle: { color: "#DDD7CA" } },
        axisTick: { show: false },
        axisLabel: { color: "#57534E", fontSize: 11, margin: 10 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: "#EAE5DC", type: "dashed" } },
        axisLabel: { color: "#8C857B", fontSize: 11 },
      },
      series: [
        {
          name: "已发布",
          type: "line",
          smooth: 0.25,
          symbolSize: 5,
          lineStyle: { width: 2, color: "#1B4D3E" },
          itemStyle: { color: "#1B4D3E" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(27, 77, 62, 0.12)" },
                { offset: 1, color: "rgba(27, 77, 62, 0.0)" },
              ],
            },
          },
          data: stats.dailyTrend.map((d) => d.publishedCount),
        },
        {
          name: "爆款",
          type: "line",
          smooth: 0.25,
          symbolSize: 5,
          lineStyle: { width: 2, color: "#B85D3B" },
          itemStyle: { color: "#B85D3B" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(184, 93, 59, 0.10)" },
                { offset: 1, color: "rgba(184, 93, 59, 0.0)" },
              ],
            },
          },
          data: stats.dailyTrend.map((d) => d.viralCount),
        },
        {
          name: "创作",
          type: "line",
          smooth: 0.25,
          symbol: "none",
          lineStyle: { width: 1.5, type: "dashed", color: "#A8A29E" },
          itemStyle: { color: "#A8A29E" },
          data: stats.dailyTrend.map((d) => d.createdCount),
        },
      ],
    }),
    [stats.dailyTrend]
  );

  return (
    <div className="space-y-9">
      {/* Masthead Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#181816]/15 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-editorial text-2xl font-semibold tracking-tight text-[#181816]">
              工作台概览
            </h1>

            <div className="flex items-center gap-0.5 rounded border border-[#E2DDD3] bg-[#EFECE4] p-0.5">
              <button
                type="button"
                onClick={() => setDataMode("live")}
                className={`rounded-[3px] px-2.5 py-0.5 text-xs font-medium transition ${
                  effectiveMode === "live"
                    ? "bg-[#FCFBF8] text-[#181816]"
                    : "text-[#78716C] hover:text-[#181816]"
                }`}
              >
                真实数据
              </button>
              <button
                type="button"
                onClick={() => setDataMode("demo")}
                className={`rounded-[3px] px-2.5 py-0.5 text-xs font-medium transition ${
                  effectiveMode === "demo"
                    ? "bg-[#FCFBF8] text-[#181816]"
                    : "text-[#78716C] hover:text-[#181816]"
                }`}
              >
                示例数据
              </button>
            </div>
          </div>
          <p className="mt-1 text-xs text-[#78716C]">
            {orgName} · 多渠道内容传播与合规发布态势
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3.5 py-2 text-xs font-medium text-[#181816] transition hover:border-[#181816]"
          >
            <FileBarChart2 className="h-3.5 w-3.5 text-[#1B4D3E]" />
            <span>运营月报</span>
          </Link>
          <Link
            href="/workflow"
            className="inline-flex items-center gap-1.5 rounded bg-[#1B4D3E] px-4 py-2 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F]"
          >
            <span>开始内容创作</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Unified Horizontal Editorial Metric Strip (Zero Floating Cards) */}
      <section className="grid grid-cols-1 divide-y divide-[#E2DDD3] border-b border-[#E2DDD3] pb-2 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        <div className="py-4 pr-6 sm:pb-6 lg:py-2 lg:pr-7">
          <div className="flex items-center justify-between text-xs text-[#78716C]">
            <span>累计已发布</span>
            <span className="font-mono text-[11px] text-[#8C857B] tabular-nums">
              已归档 {stats.totalArchived}
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="font-editorial text-4xl font-semibold tracking-tight text-[#181816] tabular-nums">
              {stats.totalPublished}
            </span>
            <span className="text-xs text-[#8C857B]">篇</span>
          </div>
          <div className="mt-2 text-xs text-[#57534E]">
            发布转化率{" "}
            <span className="font-medium text-[#1B4D3E] tabular-nums">
              {stats.publishRate}%
            </span>
          </div>
        </div>

        <div className="py-4 sm:px-6 sm:pb-6 lg:py-2 lg:px-7">
          <div className="text-xs text-[#78716C]">回填总播放 / 阅读</div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="font-editorial text-4xl font-semibold tracking-tight text-[#181816] tabular-nums">
              {stats.totalViews.toLocaleString("zh-CN")}
            </span>
          </div>
          <div className="mt-2 text-xs text-[#57534E]">
            已覆盖渠道{" "}
            <span className="font-medium text-[#181816] tabular-nums">
              {stats.activePlatformsCount}/4
            </span>
          </div>
        </div>

        <div className="py-4 pr-6 sm:pt-4 lg:py-2 lg:px-7">
          <div className="text-xs text-[#78716C]">累计创作</div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="font-editorial text-4xl font-semibold tracking-tight text-[#181816] tabular-nums">
              {stats.totalCreated}
            </span>
            <span className="text-xs text-[#8C857B]">篇</span>
          </div>
          <div className="mt-2 text-xs text-[#57534E]">
            主力渠道{" "}
            <span className="font-medium text-[#181816]">
              {stats.topPlatformName}
            </span>
          </div>
        </div>

        <div className="py-4 sm:px-6 sm:pt-4 lg:py-2 lg:pl-7 lg:pr-0">
          <div className="text-xs text-[#78716C]">爆款产出</div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="font-editorial text-4xl font-semibold tracking-tight text-[#181816] tabular-nums">
              {stats.totalViral}
            </span>
            <span className="text-xs text-[#8C857B]">篇</span>
          </div>
          <div className="mt-2 text-xs text-[#57534E]">
            爆款命中率{" "}
            <span className="font-medium text-[#B85D3B] tabular-nums">
              {stats.viralRate}%
            </span>
          </div>
        </div>
      </section>

      {/* Editorial 2-Column Data Spread (Hairline Divided, No Card Boxes) */}
      <section className="grid grid-cols-1 gap-10 border-b border-[#E2DDD3] pb-10 lg:grid-cols-12 lg:gap-0 lg:divide-x lg:divide-[#E2DDD3]">
        <div className="lg:col-span-7 lg:pr-9">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-editorial text-base font-semibold text-[#181816]">
              近 7 日内容走势
            </h2>
            <span className="text-xs text-[#8C857B]">按日期统计</span>
          </div>
          <EChartBox option={trendOption} className="h-72 w-full" />
        </div>

        <div className="lg:col-span-5 lg:pl-9">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-editorial text-base font-semibold text-[#181816]">
              各平台发布分布
            </h2>
            <span className="text-xs text-[#8C857B]">4 个传播渠道</span>
          </div>
          <EChartBox option={platformBarOption} className="h-72 w-full" />
        </div>
      </section>

      {/* Active Archives & Quick Entry Index (Flush Editorial List) */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-editorial text-base font-semibold text-[#181816]">
            近期活动档案
          </h2>
          <Link
            href="/organization"
            className="inline-flex items-center gap-1 text-xs font-medium text-[#1B4D3E] hover:underline"
          >
            <span>查看全部 {activities.length} 项档案</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-[#E2DDD3] border-t border-[#E2DDD3]">
          {activities.slice(0, 3).map((act) => (
            <div
              key={act.id}
              className="flex flex-col justify-between gap-2 py-3.5 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="font-mono text-xs text-[#8C857B] tabular-nums">
                  {act.date || "待定"}
                </span>
                <span className="truncate text-sm font-medium text-[#181816]">
                  {act.title}
                </span>
                <span className="truncate text-xs text-[#78716C]">
                  {act.location}
                </span>
              </div>
              <Link
                href={`/workflow?activityId=${encodeURIComponent(act.id)}`}
                className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#1B4D3E] transition hover:underline"
              >
                <span>带入创作</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
