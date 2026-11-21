"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { EChartsOption } from "echarts";
import {
  ArrowUpRight,
  CheckCircle2,
  Globe2,
  Info,
  Layers,
  PenTool,
  Send,
  TrendingUp,
} from "lucide-react";
import { EChartBox } from "@/components/charts/EChartBox";
import {
  buildDemoOverviewStats,
  computeOverviewStats,
} from "@/lib/overview-stats";
import { PLATFORMS } from "@/lib/platforms";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

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

export default function OverviewPage() {
  const history = useWorkbenchStore((s) => s.history);
  const [modeOverride, setModeOverride] = useState<"live" | "demo" | null>(
    null
  );

  const isDemoMode =
    modeOverride !== null ? modeOverride === "demo" : history.length === 0;

  const stats = useMemo(
    () =>
      isDemoMode ? buildDemoOverviewStats() : computeOverviewStats(history),
    [isDemoMode, history]
  );

  const platformBarOption = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "#FFFFFF",
        borderColor: "#E5E5E5",
        borderWidth: 1,
        textStyle: { color: "#171717", fontSize: 12 },
      },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 10,
        itemHeight: 10,
        icon: "roundRect",
        textStyle: { color: "#737373", fontSize: 11 },
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
        axisLine: { lineStyle: { color: "#E5E5E5" } },
        axisTick: { show: false },
        axisLabel: { color: "#525252", fontSize: 12 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: "#F5F5F5", type: "dashed" } },
        axisLabel: { color: "#A3A3A3", fontSize: 11 },
      },
      series: [
        {
          name: "已发布",
          type: "bar",
          barMaxWidth: 22,
          itemStyle: { color: "#171717", borderRadius: [4, 4, 0, 0] },
          data: stats.platformStats.map((p) => p.publishedCount),
        },
        {
          name: "累计创作",
          type: "bar",
          barMaxWidth: 22,
          itemStyle: { color: "#0F766E", borderRadius: [4, 4, 0, 0] },
          data: stats.platformStats.map((p) => p.createdCount),
        },
        {
          name: "爆款文案",
          type: "bar",
          barMaxWidth: 22,
          itemStyle: { color: "#F59E0B", borderRadius: [4, 4, 0, 0] },
          data: stats.platformStats.map((p) => p.viralCount),
        },
      ],
    }),
    [stats.platformStats]
  );

  const platformPieOption = useMemo<EChartsOption>(() => {
    const usePublished = stats.totalPublished > 0;
    const pieData = stats.platformStats.map((p) => ({
      name: p.name,
      value: usePublished ? p.publishedCount : p.createdCount,
      itemStyle: { color: p.accentColor },
    }));
    const hasValues = pieData.some((d) => d.value > 0);

    return {
      tooltip: {
        trigger: "item",
        backgroundColor: "#FFFFFF",
        borderColor: "#E5E5E5",
        borderWidth: 1,
        textStyle: { color: "#171717", fontSize: 12 },
        formatter: "{b}: {c} 篇 ({d}%)",
      },
      legend: {
        bottom: 0,
        left: "center",
        itemWidth: 10,
        itemHeight: 10,
        icon: "circle",
        textStyle: { color: "#525252", fontSize: 11 },
      },
      series: [
        {
          name: usePublished ? "已发布平台" : "创作平台",
          type: "pie",
          radius: ["52%", "76%"],
          center: ["50%", "44%"],
          padAngle: 3,
          itemStyle: { borderRadius: 6 },
          label: {
            show: hasValues,
            formatter: "{b}\n{d}%",
            fontSize: 11,
            color: "#525252",
          },
          labelLine: {
            length: 10,
            length2: 8,
            lineStyle: { color: "#D4D4D4" },
          },
          data: hasValues
            ? pieData
            : [{ name: "暂无数据", value: 1, itemStyle: { color: "#E5E5E5" } }],
        },
      ],
    };
  }, [stats.platformStats, stats.totalPublished]);

  const trendOption = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: "axis",
        backgroundColor: "#FFFFFF",
        borderColor: "#E5E5E5",
        borderWidth: 1,
        textStyle: { color: "#171717", fontSize: 12 },
      },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 12,
        itemHeight: 8,
        textStyle: { color: "#737373", fontSize: 11 },
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
        axisLine: { lineStyle: { color: "#E5E5E5" } },
        axisTick: { show: false },
        axisLabel: { color: "#525252", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: "#F5F5F5", type: "dashed" } },
        axisLabel: { color: "#A3A3A3", fontSize: 11 },
      },
      series: [
        {
          name: "已发布条数",
          type: "line",
          smooth: true,
          symbolSize: 6,
          lineStyle: { width: 2.5, color: "#0F766E" },
          itemStyle: { color: "#0F766E" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(15, 118, 110, 0.14)" },
                { offset: 1, color: "rgba(15, 118, 110, 0.01)" },
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
          lineStyle: { width: 2, color: "#F59E0B" },
          itemStyle: { color: "#F59E0B" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(245, 158, 11, 0.14)" },
                { offset: 1, color: "rgba(245, 158, 11, 0.01)" },
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
      className="space-y-8"
    >
      {/* Header */}
      <motion.section
        variants={ITEM_VARIANTS}
        className="flex flex-col gap-4 border-b border-neutral-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="max-w-xl">
          <p className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
            Overview &amp; Analytics
          </p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            创作与发布数据概览
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">
            统计你在平台的累计发布条数、爆款文案产出与各分发平台的分布情况。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center rounded-lg border border-neutral-200 bg-[#FAFAFA] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setModeOverride("live")}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                !isDemoMode
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              实时数据
            </button>
            <button
              type="button"
              onClick={() => setModeOverride("demo")}
              className={`rounded-md px-2.5 py-1 font-medium transition ${
                isDemoMode
                  ? "bg-white text-neutral-900 shadow-xs"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              示例数据
            </button>
          </div>

          <Link
            href="/copywriting"
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-neutral-800"
          >
            <PenTool className="h-3.5 w-3.5" />
            <span>撰写推流文案</span>
          </Link>
        </div>
      </motion.section>

      {isDemoMode && (
        <motion.div
          variants={ITEM_VARIANTS}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-[#FAFAFA] px-4 py-2.5 text-xs text-neutral-600"
        >
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
            <span>
              {history.length === 0
                ? "当前本地暂无创作记录，正在展示示例统计视图。生成文案并在「创作记录」中标记已发布或爆款后，将自动汇总真实数据。"
                : "当前处于示例数据预览模式，可点击右上角「实时数据」切回你的真实统计。"}
            </span>
          </div>
          <Link
            href="/history"
            className="font-medium text-neutral-900 underline-offset-2 hover:underline"
          >
            前往创作记录 →
          </Link>
        </motion.div>
      )}

      {/* 4 Core KPI Cards */}
      <motion.section
        variants={ITEM_VARIANTS}
        className="grid grid-cols-1 divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>累计已发布</span>
            <Send className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tracking-tight text-neutral-900">
              {stats.totalPublished}
            </span>
            <span className="text-xs text-neutral-400">条</span>
          </div>
          <p className="mt-2 text-[11px] text-neutral-500">
            发布转化率 {stats.publishRate}%（占总创作）
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>平台累计创作</span>
            <Layers className="h-4 w-4 text-neutral-700" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tracking-tight text-neutral-900">
              {stats.totalCreated}
            </span>
            <span className="text-xs text-neutral-400">篇</span>
          </div>
          <p className="mt-2 text-[11px] text-neutral-500">
            持续沉淀于 Elonga 创作台
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>爆款文案产出</span>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tracking-tight text-neutral-900">
              {stats.totalViral}
            </span>
            <span className="text-xs text-neutral-400">篇</span>
          </div>
          <p className="mt-2 text-[11px] text-neutral-500">
            爆款率 {stats.viralRate}% · 高互动表现
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>已覆盖分发平台</span>
            <Globe2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tracking-tight text-neutral-900">
              {stats.activePlatformsCount}
            </span>
            <span className="text-xs text-neutral-400">/ 4 个平台</span>
          </div>
          <p className="mt-2 text-[11px] text-neutral-500">
            主力发布平台：{stats.topPlatformName}
          </p>
        </div>
      </motion.section>

      {/* ECharts Row: Platform Comparison + Platform Share */}
      <motion.section
        variants={ITEM_VARIANTS}
        className="grid grid-cols-1 gap-6 lg:grid-cols-12"
      >
        <div className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                各平台发布与爆款统计
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                对比抖音、今日头条、快手与微信公众号的发布量、创作量及爆款数
              </p>
            </div>
          </div>
          <EChartBox option={platformBarOption} className="h-72 w-full" />
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6 lg:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                发布平台占比分布
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                {stats.totalPublished > 0
                  ? "按各平台已发布文案数量统计占比"
                  : "按各平台累计创作文案统计占比"}
              </p>
            </div>
          </div>
          <EChartBox option={platformPieOption} className="h-72 w-full" />
        </div>
      </motion.section>

      {/* ECharts Row: 7-Day Continuous Publishing Trend */}
      <motion.section
        variants={ITEM_VARIANTS}
        className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6"
      >
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              近 7 日发布与爆款走势
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              追踪持续发布节奏与爆款文案产出趋势
            </p>
          </div>
          <Link
            href="/history"
            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 transition hover:text-neutral-900"
          >
            <span>管理发布与爆款标记</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <EChartBox option={trendOption} className="h-64 w-full" />
      </motion.section>

      {/* Platform Breakdown Table & Recent Records */}
      <motion.section
        variants={ITEM_VARIANTS}
        className="grid grid-cols-1 gap-6 lg:grid-cols-12"
      >
        {/* Platform Breakdown */}
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white lg:col-span-6">
          <div className="border-b border-neutral-200/80 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-neutral-900">
              平台明细统计
            </h2>
          </div>
          <div className="divide-y divide-neutral-100">
            {stats.platformStats.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-5 py-3.5 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: p.accentColor }}
                  />
                  <span className="font-medium text-neutral-900">{p.name}</span>
                  <span className="text-[11px] text-neutral-400">
                    {PLATFORMS[p.id].tagline}
                  </span>
                </div>
                <div className="flex items-center gap-4 font-mono text-[11px]">
                  <span className="text-neutral-600">
                    发布 <strong className="text-neutral-900">{p.publishedCount}</strong>
                  </span>
                  <span className="text-amber-600">
                    爆款 <strong>{p.viralCount}</strong>
                  </span>
                  <span className="w-10 text-right text-neutral-400">
                    {p.sharePercent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Records */}
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white lg:col-span-6">
          <div className="flex items-center justify-between border-b border-neutral-200/80 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-neutral-900">
              最近创作动态
            </h2>
            <Link
              href="/history"
              className="text-xs text-neutral-500 transition hover:text-neutral-900"
            >
              全部 ({history.length})
            </Link>
          </div>
          <div className="divide-y divide-neutral-100">
            {history.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-neutral-400">
                暂无真实创作记录，前往「推流文案」生成第一篇内容吧。
              </div>
            ) : (
              history.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  href="/history"
                  className="flex items-center justify-between px-5 py-3.5 text-xs transition hover:bg-[#FAFAFA]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="shrink-0 rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
                      {PLATFORMS[item.platform].name}
                    </span>
                    <span className="truncate font-medium text-neutral-900">
                      {item.titles[0] || item.topic}
                    </span>
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    {item.isPublished && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        已发布
                      </span>
                    )}
                    {item.isViral && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        <TrendingUp className="h-3 w-3" />
                        爆款
                      </span>
                    )}
                    <span className="font-mono text-[11px] text-neutral-400">
                      {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
