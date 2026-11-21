"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { EChartsOption } from "echarts";
import { EChartBox } from "@/components/charts/EChartBox";
import { buildDemoOverviewStats } from "@/lib/overview-stats";

const CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
  },
};

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

  const stats = useMemo(() => buildDemoOverviewStats(today), [today]);

  const platformBarOption = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "#FFFFFF",
        borderColor: "#E8E6E1",
        borderWidth: 1,
        textStyle: { color: "#18181B", fontSize: 12 },
      },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 10,
        itemHeight: 10,
        icon: "roundRect",
        textStyle: { color: "#71717A", fontSize: 11 },
      },
      grid: {
        left: 12,
        right: 12,
        top: 36,
        bottom: 8,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: stats.platformStats.map((p) => p.name),
        axisLine: { lineStyle: { color: "#E8E6E1" } },
        axisTick: { show: false },
        axisLabel: { color: "#52525B", fontSize: 12 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: "#F4F3EF", type: "dashed" } },
        axisLabel: { color: "#A1A1AA", fontSize: 11 },
      },
      series: [
        {
          name: "已发布",
          type: "bar",
          barMaxWidth: 20,
          itemStyle: { color: "#0F6E5D", borderRadius: [5, 5, 0, 0] },
          data: stats.platformStats.map((p) => p.publishedCount),
        },
        {
          name: "累计创作",
          type: "bar",
          barMaxWidth: 20,
          itemStyle: { color: "#94A3B8", borderRadius: [5, 5, 0, 0] },
          data: stats.platformStats.map((p) => p.createdCount),
        },
        {
          name: "爆款文案",
          type: "bar",
          barMaxWidth: 20,
          itemStyle: { color: "#D97706", borderRadius: [5, 5, 0, 0] },
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
        borderColor: "#E8E6E1",
        borderWidth: 1,
        textStyle: { color: "#18181B", fontSize: 12 },
      },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 12,
        itemHeight: 8,
        textStyle: { color: "#71717A", fontSize: 11 },
      },
      grid: {
        left: 12,
        right: 16,
        top: 36,
        bottom: 8,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: stats.dailyTrend.map((d) => d.dateLabel),
        axisLine: { lineStyle: { color: "#E8E6E1" } },
        axisTick: { show: false },
        axisLabel: { color: "#52525B", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: "#F4F3EF", type: "dashed" } },
        axisLabel: { color: "#A1A1AA", fontSize: 11 },
      },
      series: [
        {
          name: "已发布条数",
          type: "line",
          smooth: true,
          symbolSize: 6,
          lineStyle: { width: 2.5, color: "#0F6E5D" },
          itemStyle: { color: "#0F6E5D" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(15, 110, 93, 0.16)" },
                { offset: 1, color: "rgba(15, 110, 93, 0.01)" },
              ],
            },
          },
          data: stats.dailyTrend.map((d) => d.publishedCount),
        },
        {
          name: "爆款文案",
          type: "line",
          smooth: true,
          symbolSize: 6,
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
                { offset: 0, color: "rgba(217, 119, 6, 0.14)" },
                { offset: 1, color: "rgba(217, 119, 6, 0.01)" },
              ],
            },
          },
          data: stats.dailyTrend.map((d) => d.viralCount),
        },
        {
          name: "累计创作",
          type: "line",
          smooth: true,
          symbol: "none",
          lineStyle: { width: 1.5, type: "dashed", color: "#94A3B8" },
          itemStyle: { color: "#94A3B8" },
          data: stats.dailyTrend.map((d) => d.createdCount),
        },
      ],
    }),
    [stats.dailyTrend]
  );

  return (
    <motion.div
      variants={CONTAINER_VARIANTS}
      initial="hidden"
      animate="show"
      className="space-y-7"
    >
      {/* Header */}
      <motion.section
        variants={ITEM_VARIANTS}
        className="flex flex-col gap-4 border-b border-[#E8E6E1] pb-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="max-w-xl">
          <p className="text-[11px] font-semibold tracking-widest text-[#0F6E5D] uppercase">
            Overview &amp; Analytics
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            创作与发布数据概览
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
            统计平台累计发布条数、爆款文案产出与各分发平台的分布趋势。
          </p>
        </div>

        <Link
          href="/workflow"
          className="inline-flex items-center justify-center rounded-xl bg-[#0F6E5D] px-4 py-2.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#0B5649] active:scale-[0.98]"
        >
          开始图文创作
        </Link>
      </motion.section>

      {/* 4 Core KPI Strip */}
      <motion.section
        variants={ITEM_VARIANTS}
        className="grid grid-cols-1 divide-y divide-[#E8E6E1] overflow-hidden rounded-2xl border border-[#E8E6E1] bg-white shadow-[0_1px_3px_rgba(24,24,27,0.04)] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0F6E5D]" />
            <span>累计已发布</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tracking-tight text-zinc-900">
              {stats.totalPublished}
            </span>
            <span className="text-xs text-zinc-400">条</span>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            发布转化率 <span className="font-medium text-[#0F6E5D]">{stats.publishRate}%</span>
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            <span>平台累计创作</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tracking-tight text-zinc-900">
              {stats.totalCreated}
            </span>
            <span className="text-xs text-zinc-400">篇</span>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            持续沉淀于 Elonga 创作台
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span>爆款文案产出</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tracking-tight text-zinc-900">
              {stats.totalViral}
            </span>
            <span className="text-xs text-zinc-400">篇</span>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            爆款率 <span className="font-medium text-amber-600">{stats.viralRate}%</span>
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>覆盖分发平台</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tracking-tight text-zinc-900">
              {stats.activePlatformsCount}
            </span>
            <span className="text-xs text-zinc-400">/ 4 个平台</span>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            主力平台：<span className="font-medium text-zinc-700">{stats.topPlatformName}</span>
          </p>
        </div>
      </motion.section>

      {/* ECharts Row: Platform Comparison + 7-Day Trend */}
      <motion.section
        variants={ITEM_VARIANTS}
        className="grid grid-cols-1 gap-6 lg:grid-cols-12"
      >
        <div className="rounded-2xl border border-[#E8E6E1] bg-white p-5 shadow-[0_1px_3px_rgba(24,24,27,0.04)] sm:p-6 lg:col-span-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-zinc-900">
              各平台发布与爆款统计
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              抖音、今日头条、快手与微信公众号发布量及爆款数
            </p>
          </div>
          <EChartBox option={platformBarOption} className="h-72 w-full" />
        </div>

        <div className="rounded-2xl border border-[#E8E6E1] bg-white p-5 shadow-[0_1px_3px_rgba(24,24,27,0.04)] sm:p-6 lg:col-span-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-zinc-900">
              近 7 日发布与爆款走势
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              追踪持续发布节奏与爆款文案产出趋势
            </p>
          </div>
          <EChartBox option={trendOption} className="h-72 w-full" />
        </div>
      </motion.section>
    </motion.div>
  );
}
