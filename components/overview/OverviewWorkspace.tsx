"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowUpRight, FileBarChart2, Image as ImageIcon } from "lucide-react";
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

export function OverviewWorkspace() {
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

  const maxChannelCreated = useMemo(
    () => Math.max(1, ...stats.platformStats.map((p) => p.createdCount)),
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
        left: 6,
        right: 24,
        top: 34,
        bottom: 6,
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
          lineStyle: { width: 2.2, color: "#1B4D3E" },
          itemStyle: { color: "#1B4D3E" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(27, 77, 62, 0.13)" },
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
                { offset: 0, color: "rgba(184, 93, 59, 0.09)" },
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
    <div className="space-y-10">
      {/* Editorial Dispatch Masthead */}
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
            {orgName} · 编辑部传播态势与内容产出日报
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

      {/* Upper Asymmetric Spread: Lead Metric Column (4) + 7-Day Trajectory (8) */}
      <section className="grid grid-cols-1 gap-10 border-b border-[#E2DDD3] pb-10 lg:grid-cols-12 lg:gap-0 lg:divide-x lg:divide-[#E2DDD3]">
        {/* Left: Monumental Lead Metric + Compact Hairline Ledger */}
        <div className="flex flex-col justify-between gap-7 lg:col-span-4 lg:pr-9">
          <div>
            <div className="flex items-center justify-between text-xs text-[#78716C]">
              <span>累计已发布稿件</span>
              <span className="font-mono text-[11px] text-[#8C857B] tabular-nums">
                已归档 {stats.totalArchived}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-editorial text-[52px] font-semibold leading-none tracking-tight text-[#181816] tabular-nums">
                {stats.totalPublished}
              </span>
              <span className="text-sm text-[#8C857B]">篇</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#57534E]">
              发布转化率{" "}
              <strong className="font-semibold text-[#1B4D3E] tabular-nums">
                {stats.publishRate}%
              </strong>
              ，主力传播阵地为{" "}
              <strong className="font-semibold text-[#181816]">
                {stats.topPlatformName}
              </strong>
              ，已覆盖{" "}
              <span className="font-mono tabular-nums">
                {stats.activePlatformsCount}/4
              </span>{" "}
              个渠道。
            </p>
          </div>

          <dl className="divide-y divide-[#E2DDD3] border-t border-[#E2DDD3] text-xs">
            <div className="flex items-baseline justify-between py-3">
              <dt className="text-[#78716C]">回填总播放 / 阅读</dt>
              <dd className="font-editorial text-xl font-semibold text-[#181816] tabular-nums">
                {stats.totalViews.toLocaleString("zh-CN")}
              </dd>
            </div>
            <div className="flex items-baseline justify-between py-3">
              <dt className="text-[#78716C]">累计创作稿件</dt>
              <dd className="font-editorial text-xl font-semibold text-[#181816] tabular-nums">
                {stats.totalCreated}
                <span className="ml-1 font-sans text-[11px] font-normal text-[#8C857B]">
                  篇
                </span>
              </dd>
            </div>
            <div className="flex items-baseline justify-between pt-3">
              <dt className="text-[#78716C]">爆款产出与命中率</dt>
              <dd className="flex items-baseline gap-2">
                <span className="font-editorial text-xl font-semibold text-[#181816] tabular-nums">
                  {stats.totalViral}
                </span>
                <span className="font-mono text-[11px] font-medium text-[#B85D3B] tabular-nums">
                  {stats.viralRate}%
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {/* Right: Primary 7-Day Content Trajectory */}
        <div className="lg:col-span-8 lg:pl-9">
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <h2 className="font-editorial text-base font-semibold text-[#181816]">
                近 7 日内容走势
              </h2>
              <p className="mt-0.5 text-[11px] text-[#8C857B]">
                对比每日创作、已发布与爆款稿件节奏
              </p>
            </div>
            <span className="font-mono text-[11px] text-[#8C857B]">
              7D TREND
            </span>
          </div>
          <EChartBox option={trendOption} className="h-[300px] w-full" />
        </div>
      </section>

      {/* Lower Editorial Spread: Channel Distribution Ledger (6) + Active Field Archives (6) */}
      <section className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-0 lg:divide-x lg:divide-[#E2DDD3]">
        {/* Left: Editorial Channel Proportional Ledger (Zero Chart Box) */}
        <div className="space-y-4 lg:col-span-6 lg:pr-9">
          <div className="flex items-baseline justify-between">
            <h2 className="font-editorial text-base font-semibold text-[#181816]">
              各渠道发布分布
            </h2>
            <div className="flex items-center gap-3 text-[11px] text-[#78716C]">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-xs bg-[#1B4D3E]" />
                已发布
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-xs bg-[#B85D3B]" />
                爆款
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-xs bg-[#DDD7CA]" />
                创作总量
              </span>
            </div>
          </div>

          <div className="divide-y divide-[#E2DDD3] border-y border-[#E2DDD3]">
            {stats.platformStats.map((ch, idx) => {
              const createdWidth = Math.round(
                (ch.createdCount / maxChannelCreated) * 100
              );
              const publishedWidth = Math.round(
                (ch.publishedCount / maxChannelCreated) * 100
              );
              const viralWidth = Math.round(
                (ch.viralCount / maxChannelCreated) * 100
              );

              return (
                <div key={ch.id} className="space-y-2 py-3.5">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <div className="flex items-baseline gap-2.5">
                      <span className="font-mono text-[11px] text-[#8C857B]">
                        0{idx + 1}
                      </span>
                      <span className="font-medium text-[#181816]">
                        {ch.name}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-3 font-mono text-[11px] tabular-nums">
                      <span className="text-[#1B4D3E]">
                        已发 {ch.publishedCount}
                      </span>
                      <span className="text-[#8C857B]">
                        创作 {ch.createdCount}
                      </span>
                      <span className="text-[#B85D3B]">
                        爆款 {ch.viralCount}
                      </span>
                      <span className="w-8 text-right font-semibold text-[#181816]">
                        {ch.sharePercent}%
                      </span>
                    </div>
                  </div>

                  {/* Layered Editorial Hairline Progress Bar */}
                  <div className="relative h-2 w-full overflow-hidden rounded-xs bg-[#EFECE4]">
                    <div
                      className="absolute inset-y-0 left-0 bg-[#D5CFC3]"
                      style={{ width: `${createdWidth}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 bg-[#1B4D3E]"
                      style={{ width: `${publishedWidth}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 bg-[#B85D3B]"
                      style={{ width: `${viralWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Field Archives & Studio Shortcuts */}
        <div className="flex flex-col justify-between gap-6 lg:col-span-6 lg:pl-9">
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-editorial text-base font-semibold text-[#181816]">
                近期活动档案
              </h2>
              <Link
                href="/organization"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#1B4D3E] hover:underline"
              >
                <span>管理全部 {activities.length} 项</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-[#E2DDD3] border-y border-[#E2DDD3]">
              {activities.slice(0, 3).map((act) => (
                <div
                  key={act.id}
                  className="flex items-start justify-between gap-4 py-3.5"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 text-[11px] text-[#8C857B]">
                      <span className="font-mono tabular-nums">
                        {act.date || "待定"}
                      </span>
                      <span>·</span>
                      <span className="truncate">{act.location}</span>
                    </div>
                    <div className="truncate text-sm font-medium text-[#181816]">
                      {act.title}
                    </div>
                  </div>
                  <Link
                    href={`/workflow?activityId=${encodeURIComponent(act.id)}`}
                    className="mt-1 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#1B4D3E] hover:underline"
                  >
                    <span>带入创作</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#E2DDD3] pt-4 text-xs text-[#57534E]">
            <span className="inline-flex items-center gap-2">
              <ImageIcon className="h-3.5 w-3.5 text-[#1B4D3E]" />
              <span>有现场照片需要隐私打码或二维重绘？</span>
            </span>
            <Link
              href="/image-studio"
              className="inline-flex items-center gap-1 font-medium text-[#1B4D3E] hover:underline"
            >
              <span>进入图片工坊</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
