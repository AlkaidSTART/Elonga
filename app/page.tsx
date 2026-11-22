"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { EChartsOption } from "echarts";
import { EChartBox } from "@/components/charts/EChartBox";
import { buildDemoOverviewStats } from "@/lib/overview-stats";

const CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
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
        backgroundColor: "#161715",
        borderColor: "#2A2B28",
        borderWidth: 1,
        textStyle: { color: "#F5F3EE", fontSize: 12 },
      },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 8,
        itemHeight: 8,
        icon: "circle",
        textStyle: { color: "#71716A", fontSize: 11 },
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
        axisLine: { lineStyle: { color: "#D6D2C8" } },
        axisTick: { show: false },
        axisLabel: { color: "#44433E", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: "#DFDCD2", type: "dashed" } },
        axisLabel: { color: "#8C897F", fontSize: 11 },
      },
      series: [
        {
          name: "已发布",
          type: "bar",
          barMaxWidth: 16,
          itemStyle: { color: "#0F6E5D", borderRadius: [4, 4, 0, 0] },
          data: stats.platformStats.map((p) => p.publishedCount),
        },
        {
          name: "创作",
          type: "bar",
          barMaxWidth: 16,
          itemStyle: { color: "#161715", borderRadius: [4, 4, 0, 0] },
          data: stats.platformStats.map((p) => p.createdCount),
        },
        {
          name: "爆款",
          type: "bar",
          barMaxWidth: 16,
          itemStyle: { color: "#D97706", borderRadius: [4, 4, 0, 0] },
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
        backgroundColor: "#161715",
        borderColor: "#2A2B28",
        borderWidth: 1,
        textStyle: { color: "#F5F3EE", fontSize: 12 },
      },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 10,
        itemHeight: 6,
        textStyle: { color: "#71716A", fontSize: 11 },
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
        axisLine: { lineStyle: { color: "#E2DFD7" } },
        axisTick: { show: false },
        axisLabel: { color: "#57554E", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: "#E9E6DE", type: "dashed" } },
        axisLabel: { color: "#9C9990", fontSize: 11 },
      },
      series: [
        {
          name: "已发布",
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
                { offset: 1, color: "rgba(15, 110, 93, 0.0)" },
              ],
            },
          },
          data: stats.dailyTrend.map((d) => d.publishedCount),
        },
        {
          name: "爆款",
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
                { offset: 0, color: "rgba(217, 119, 6, 0.12)" },
                { offset: 1, color: "rgba(217, 119, 6, 0.0)" },
              ],
            },
          },
          data: stats.dailyTrend.map((d) => d.viralCount),
        },
        {
          name: "创作",
          type: "line",
          smooth: true,
          symbol: "none",
          lineStyle: { width: 1.5, type: "dashed", color: "#8C897F" },
          itemStyle: { color: "#8C897F" },
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
      className="space-y-10"
    >
      {/* Top Asymmetric Architectural Band */}
      <motion.section
        variants={ITEM_VARIANTS}
        className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12"
      >
        {/* Left: Deep Ink Sculptural Focal Surface */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-[#161715] p-7 text-[#F5F3EE] sm:p-9 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-[#15A085]" />
              <span>累计已发布</span>
            </div>
            <Link
              href="/workflow"
              className="group inline-flex items-center gap-1.5 rounded-full bg-[#0F6E5D] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#13836F]"
            >
              <span>开始创作</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="my-8 flex items-baseline gap-3">
            <span className="font-mono text-6xl font-semibold tracking-tighter tabular-nums sm:text-7xl">
              {stats.totalPublished}
            </span>
            <span className="text-sm text-zinc-400">条</span>
          </div>

          <div className="flex flex-wrap items-center gap-8 border-t border-white/10 pt-5 text-xs">
            <div>
              <span className="text-zinc-500">转化率</span>
              <span className="ml-2.5 font-mono text-sm font-medium text-[#34D399]">
                {stats.publishRate}%
              </span>
            </div>
            <div>
              <span className="text-zinc-500">爆款率</span>
              <span className="ml-2.5 font-mono text-sm font-medium text-amber-400">
                {stats.viralRate}%
              </span>
            </div>
            <div>
              <span className="text-zinc-500">覆盖平台</span>
              <span className="ml-2.5 font-mono text-sm font-medium text-zinc-200">
                {stats.activePlatformsCount}/4
              </span>
            </div>
          </div>
        </div>

        {/* Right: Open Hairline Typographic Ledger (No Cards) */}
        <div className="flex flex-col justify-between divide-y divide-[#DFDCD2] border-y border-[#DFDCD2] lg:col-span-5">
          <div className="flex items-baseline justify-between py-6">
            <div className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
              <span className="text-xs font-medium text-zinc-500">累计创作</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums text-[#141413]">
                {stats.totalCreated}
              </span>
              <span className="text-xs text-zinc-400">篇</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between py-6">
            <div className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="text-xs font-medium text-zinc-500">爆款产出</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums text-[#141413]">
                {stats.totalViral}
              </span>
              <span className="text-xs text-zinc-400">篇</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between py-6">
            <div className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0F6E5D]" />
              <span className="text-xs font-medium text-zinc-500">主力渠道</span>
            </div>
            <span className="text-2xl font-semibold tracking-tight text-[#141413]">
              {stats.topPlatformName}
            </span>
          </div>
        </div>
      </motion.section>

      {/* Bottom Asymmetric Visualization Band */}
      <motion.section
        variants={ITEM_VARIANTS}
        className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12"
      >
        {/* Left: Open Canvas Trend Chart (No Card Wrapper) */}
        <div className="border-t border-[#DFDCD2] pt-6 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-[#141413]">
              近 7 日走势
            </h2>
            <span className="font-mono text-[11px] text-zinc-400">7D</span>
          </div>
          <EChartBox option={trendOption} className="h-72 w-full" />
        </div>

        {/* Right: Warm Tinted Recessed Surface for Platform Breakdown */}
        <div className="rounded-3xl bg-[#ECE9E1]/80 p-6 lg:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-[#141413]">
              平台分布
            </h2>
            <span className="font-mono text-[11px] text-zinc-500">4 CHANNELS</span>
          </div>
          <EChartBox option={platformBarOption} className="h-72 w-full" />
        </div>
      </motion.section>
    </motion.div>
  );
}
