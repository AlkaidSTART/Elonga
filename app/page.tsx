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
        backgroundColor: "#FFFFFF",
        borderColor: "#E5E7EB",
        borderWidth: 1,
        textStyle: { color: "#111827", fontSize: 12 },
      },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 8,
        itemHeight: 8,
        icon: "roundRect",
        textStyle: { color: "#6B7280", fontSize: 11 },
      },
      grid: {
        left: 6,
        right: 8,
        top: 34,
        bottom: 4,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: stats.platformStats.map((p) => p.name),
        axisLine: { lineStyle: { color: "#E5E7EB" } },
        axisTick: { show: false },
        axisLabel: { color: "#4B5563", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: "#F3F4F6", type: "solid" } },
        axisLabel: { color: "#9CA3AF", fontSize: 11 },
      },
      series: [
        {
          name: "已发布",
          type: "bar",
          barMaxWidth: 14,
          itemStyle: { color: "#3451E5", borderRadius: [3, 3, 0, 0] },
          data: stats.platformStats.map((p) => p.publishedCount),
        },
        {
          name: "创作",
          type: "bar",
          barMaxWidth: 14,
          itemStyle: { color: "#94A3B8", borderRadius: [3, 3, 0, 0] },
          data: stats.platformStats.map((p) => p.createdCount),
        },
        {
          name: "爆款",
          type: "bar",
          barMaxWidth: 14,
          itemStyle: { color: "#D97706", borderRadius: [3, 3, 0, 0] },
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
        backgroundColor: "#FFFFFF",
        borderColor: "#E5E7EB",
        borderWidth: 1,
        textStyle: { color: "#111827", fontSize: 12 },
      },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 10,
        itemHeight: 4,
        textStyle: { color: "#6B7280", fontSize: 11 },
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
        boundaryGap: false,
        data: stats.dailyTrend.map((d) => d.dateLabel),
        axisLine: { lineStyle: { color: "#E5E7EB" } },
        axisTick: { show: false },
        axisLabel: { color: "#4B5563", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: "#F3F4F6", type: "solid" } },
        axisLabel: { color: "#9CA3AF", fontSize: 11 },
      },
      series: [
        {
          name: "已发布",
          type: "line",
          smooth: 0.25,
          symbolSize: 5,
          lineStyle: { width: 2, color: "#3451E5" },
          itemStyle: { color: "#3451E5" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(52, 81, 229, 0.1)" },
                { offset: 1, color: "rgba(52, 81, 229, 0.0)" },
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
          lineStyle: { width: 2, color: "#D97706" },
          itemStyle: { color: "#D97706" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(217, 119, 6, 0.08)" },
                { offset: 1, color: "rgba(217, 119, 6, 0.0)" },
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
          lineStyle: { width: 1.5, type: "dashed", color: "#9CA3AF" },
          itemStyle: { color: "#9CA3AF" },
          data: stats.dailyTrend.map((d) => d.createdCount),
        },
      ],
    }),
    [stats.dailyTrend]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight text-[#111827]">
            工作台概览
          </h1>

          <div className="flex items-center gap-0.5 rounded-md border border-[#E5E7EB] bg-[#F3F4F6] p-0.5">
            <button
              type="button"
              onClick={() => setDataMode("live")}
              className={`rounded-[5px] px-2.5 py-0.5 text-xs font-medium transition ${
                effectiveMode === "live"
                  ? "bg-white text-[#111827] shadow-2xs"
                  : "text-gray-500 hover:text-[#111827]"
              }`}
            >
              真实数据
            </button>
            <button
              type="button"
              onClick={() => setDataMode("demo")}
              className={`rounded-[5px] px-2.5 py-0.5 text-xs font-medium transition ${
                effectiveMode === "demo"
                  ? "bg-white text-[#111827] shadow-2xs"
                  : "text-gray-500 hover:text-[#111827]"
              }`}
            >
              示例数据
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-[#111827] transition hover:bg-gray-50"
          >
            <FileBarChart2 className="h-3.5 w-3.5 text-[#3451E5]" />
            <span>运营月报</span>
          </Link>
          <Link
            href="/workflow"
            className="inline-flex items-center gap-1.5 rounded-md bg-[#3451E5] px-3.5 py-2 text-xs font-medium text-white transition hover:bg-[#2740C7]"
          >
            <span>开始内容创作</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Primary KPI Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>累计已发布</span>
            <span className="text-[11px] text-gray-400">
              已归档 {stats.totalArchived}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold tracking-tight text-[#111827] tabular-nums">
              {stats.totalPublished}
            </span>
            <span className="text-xs text-gray-400">篇</span>
          </div>
          <div className="mt-3 border-t border-[#F3F4F6] pt-2.5 text-xs text-gray-500">
            发布转化率{" "}
            <span className="font-medium text-emerald-600 tabular-nums">
              {stats.publishRate}%
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>回填总播放 / 阅读</span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold tracking-tight text-[#111827] tabular-nums">
              {stats.totalViews.toLocaleString("zh-CN")}
            </span>
          </div>
          <div className="mt-3 border-t border-[#F3F4F6] pt-2.5 text-xs text-gray-500">
            已覆盖渠道{" "}
            <span className="font-medium text-[#111827] tabular-nums">
              {stats.activePlatformsCount}/4
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>累计创作</span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold tracking-tight text-[#111827] tabular-nums">
              {stats.totalCreated}
            </span>
            <span className="text-xs text-gray-400">篇</span>
          </div>
          <div className="mt-3 border-t border-[#F3F4F6] pt-2.5 text-xs text-gray-500">
            主力渠道{" "}
            <span className="font-medium text-[#111827]">
              {stats.topPlatformName}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>爆款产出</span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold tracking-tight text-[#111827] tabular-nums">
              {stats.totalViral}
            </span>
            <span className="text-xs text-gray-400">篇</span>
          </div>
          <div className="mt-3 border-t border-[#F3F4F6] pt-2.5 text-xs text-gray-500">
            爆款命中率{" "}
            <span className="font-medium text-amber-600 tabular-nums">
              {stats.viralRate}%
            </span>
          </div>
        </div>
      </section>

      {/* Visualization Section */}
      <section className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-6 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between border-b border-[#F3F4F6] pb-3">
            <h2 className="text-sm font-semibold text-[#111827]">
              近 7 日内容走势
            </h2>
            <span className="text-xs text-gray-400">按日期统计</span>
          </div>
          <EChartBox option={trendOption} className="h-72 w-full" />
        </div>

        <div className="rounded-lg border border-[#E5E7EB] bg-white p-6 lg:col-span-5">
          <div className="mb-4 flex items-center justify-between border-b border-[#F3F4F6] pb-3">
            <h2 className="text-sm font-semibold text-[#111827]">
              各平台发布分布
            </h2>
            <span className="text-xs text-gray-400">4 个渠道</span>
          </div>
          <EChartBox option={platformBarOption} className="h-72 w-full" />
        </div>
      </section>
    </div>
  );
}
