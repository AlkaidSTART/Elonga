"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, FileBarChart2 } from "lucide-react";
import type { EChartsOption } from "echarts";
import { EChartBox } from "@/components/charts/EChartBox";
import {
  buildDemoOverviewStats,
  computeOverviewStats,
} from "@/lib/overview-stats";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

const CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
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
        backgroundColor: "#0F141E",
        borderColor: "#1E293B",
        borderWidth: 1,
        textStyle: { color: "#F8FAFC", fontSize: 12 },
      },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 8,
        itemHeight: 8,
        icon: "rect",
        textStyle: { color: "#64748B", fontSize: 11 },
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
        axisLine: { lineStyle: { color: "#E2E8F0" } },
        axisTick: { show: false },
        axisLabel: { color: "#475569", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: "#F1F5F9", type: "solid" } },
        axisLabel: { color: "#94A3B8", fontSize: 11 },
      },
      series: [
        {
          name: "已发布",
          type: "bar",
          barMaxWidth: 14,
          itemStyle: { color: "#1D4ED8", borderRadius: [2, 2, 0, 0] },
          data: stats.platformStats.map((p) => p.publishedCount),
        },
        {
          name: "创作",
          type: "bar",
          barMaxWidth: 14,
          itemStyle: { color: "#0F172A", borderRadius: [2, 2, 0, 0] },
          data: stats.platformStats.map((p) => p.createdCount),
        },
        {
          name: "爆款",
          type: "bar",
          barMaxWidth: 14,
          itemStyle: { color: "#D97706", borderRadius: [2, 2, 0, 0] },
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
        backgroundColor: "#0F141E",
        borderColor: "#1E293B",
        borderWidth: 1,
        textStyle: { color: "#F8FAFC", fontSize: 12 },
      },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 10,
        itemHeight: 4,
        textStyle: { color: "#64748B", fontSize: 11 },
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
        axisLine: { lineStyle: { color: "#E2E8F0" } },
        axisTick: { show: false },
        axisLabel: { color: "#475569", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: "#F1F5F9", type: "solid" } },
        axisLabel: { color: "#94A3B8", fontSize: 11 },
      },
      series: [
        {
          name: "已发布",
          type: "line",
          smooth: 0.2,
          symbolSize: 5,
          lineStyle: { width: 2, color: "#1D4ED8" },
          itemStyle: { color: "#1D4ED8" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(29, 78, 216, 0.12)" },
                { offset: 1, color: "rgba(29, 78, 216, 0.0)" },
              ],
            },
          },
          data: stats.dailyTrend.map((d) => d.publishedCount),
        },
        {
          name: "爆款",
          type: "line",
          smooth: 0.2,
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
          smooth: 0.2,
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
      className="space-y-6"
    >
      {/* Top Page Header */}
      <motion.header
        variants={ITEM_VARIANTS}
        className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E7EC] pb-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight text-[#0F172A]">
            工作台概览
          </h1>
          <span className="font-mono text-[11px] tracking-wider text-slate-400 uppercase">
            OVERVIEW
          </span>

          <div className="flex items-center gap-0.5 rounded-md border border-[#E4E7EC] bg-[#F1F3F6] p-0.5">
            <button
              type="button"
              onClick={() => setDataMode("live")}
              className={`rounded-[5px] px-2.5 py-0.5 text-[11px] font-medium transition ${
                effectiveMode === "live"
                  ? "bg-white text-[#0F172A] shadow-2xs"
                  : "text-slate-500 hover:text-[#0F172A]"
              }`}
            >
              真实数据
            </button>
            <button
              type="button"
              onClick={() => setDataMode("demo")}
              className={`rounded-[5px] px-2.5 py-0.5 text-[11px] font-medium transition ${
                effectiveMode === "demo"
                  ? "bg-white text-[#0F172A] shadow-2xs"
                  : "text-slate-500 hover:text-[#0F172A]"
              }`}
            >
              示例视图
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E4E7EC] bg-white px-3 py-2 text-xs font-medium text-[#0F172A] transition hover:bg-slate-50"
          >
            <FileBarChart2 className="h-3.5 w-3.5 text-[#1D4ED8]" />
            <span>AI 月报</span>
          </Link>
          <Link
            href="/workflow"
            className="group inline-flex items-center gap-1.5 rounded-md bg-[#1D4ED8] px-3.5 py-2 text-xs font-medium text-white shadow-2xs transition hover:bg-[#1E40AF]"
          >
            <span>开始内容创作</span>
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </motion.header>

      {/* Top Asymmetric Architectural Band */}
      <motion.section
        variants={ITEM_VARIANTS}
        className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12"
      >
        {/* Left: Deep Obsidian Focal Surface */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-lg border border-[#1E293B] bg-[#0F141E] p-7 text-slate-50 shadow-[0_1px_3px_rgba(15,23,42,0.12)] sm:p-8 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
              <span>累计已发布内容</span>
            </div>
            <span className="rounded border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] tracking-wider text-slate-400 uppercase">
              {effectiveMode === "live" ? "LIVE ARCHIVE" : "DEMO METRICS"}
            </span>
          </div>

          <div className="my-7 flex flex-wrap items-baseline justify-between gap-4">
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono text-5xl font-semibold tracking-tight tabular-nums text-white sm:text-6xl">
                {stats.totalPublished}
              </span>
              <span className="text-sm text-slate-400">
                条（已归档 {stats.totalArchived}）
              </span>
            </div>
            <div className="text-right">
              <span className="block text-[11px] text-slate-400">
                回填总播放 / 阅读
              </span>
              <span className="font-mono text-xl font-semibold tabular-nums text-sky-300">
                {stats.totalViews.toLocaleString("zh-CN")}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-5 text-xs">
            <div>
              <span className="block text-[11px] text-slate-500">发布转化率</span>
              <span className="mt-1 block font-mono text-base font-semibold tabular-nums text-emerald-400">
                {stats.publishRate}%
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-500">爆款命中率</span>
              <span className="mt-1 block font-mono text-base font-semibold tabular-nums text-amber-400">
                {stats.viralRate}%
              </span>
            </div>
            <div>
              <span className="block text-[11px] text-slate-500">覆盖渠道</span>
              <span className="mt-1 block font-mono text-base font-semibold tabular-nums text-slate-100">
                {stats.activePlatformsCount}/4
              </span>
            </div>
          </div>
        </div>

        {/* Right: Structured KPI Ledger */}
        <div className="flex flex-col justify-between divide-y divide-[#ECEEF2] rounded-lg border border-[#E4E7EC] bg-white px-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] lg:col-span-5">
          <div className="flex items-baseline justify-between py-6">
            <div className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-xs bg-slate-400" />
              <span className="text-xs font-medium text-slate-500">累计创作</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-3xl font-semibold tracking-tight tabular-nums text-[#0F172A]">
                {stats.totalCreated}
              </span>
              <span className="text-xs text-slate-400">篇</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between py-6">
            <div className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-xs bg-amber-500" />
              <span className="text-xs font-medium text-slate-500">爆款产出</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-3xl font-semibold tracking-tight tabular-nums text-[#0F172A]">
                {stats.totalViral}
              </span>
              <span className="text-xs text-slate-400">篇</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between py-6">
            <div className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-xs bg-[#1D4ED8]" />
              <span className="text-xs font-medium text-slate-500">主力渠道</span>
            </div>
            <span className="text-xl font-semibold tracking-tight text-[#0F172A]">
              {stats.topPlatformName}
            </span>
          </div>
        </div>
      </motion.section>

      {/* Bottom Asymmetric Visualization Band */}
      <motion.section
        variants={ITEM_VARIANTS}
        className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12"
      >
        {/* Left: Trend Chart */}
        <div className="rounded-lg border border-[#E4E7EC] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] lg:col-span-7">
          <div className="mb-4 flex items-center justify-between border-b border-[#F1F3F6] pb-3">
            <h2 className="text-sm font-semibold tracking-tight text-[#0F172A]">
              近 7 日走势
            </h2>
            <span className="font-mono text-[11px] text-slate-400">7D TREND</span>
          </div>
          <EChartBox option={trendOption} className="h-72 w-full" />
        </div>

        {/* Right: Platform Breakdown */}
        <div className="rounded-lg border border-[#E4E7EC] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] lg:col-span-5">
          <div className="mb-4 flex items-center justify-between border-b border-[#F1F3F6] pb-3">
            <h2 className="text-sm font-semibold tracking-tight text-[#0F172A]">
              平台分布
            </h2>
            <span className="font-mono text-[11px] text-slate-400">4 CHANNELS</span>
          </div>
          <EChartBox option={platformBarOption} className="h-72 w-full" />
        </div>
      </motion.section>
    </motion.div>
  );
}
