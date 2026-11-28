"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ExternalLink, Flame, History } from "lucide-react";
import {
  buildDemoActivityHistory,
  computeActivityHeatmap,
  formatChineseDateLabel,
  formatLocalTimeLabel,
  getAvailableActivityYears,
  type ActivityPlatformFilter,
  type ActivityRangeOption,
  type HeatmapDayCell,
  type HeatmapIntensityLevel,
} from "@/lib/activity-heatmap";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
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

const PLATFORM_FILTER_ORDER: readonly PlatformId[] = [
  "douyin",
  "toutiao",
  "xiaohongshu",
  "wechat",
];

const CELL_SIZE = 13;
const CELL_GAP = 3;
const COLUMN_PITCH = CELL_SIZE + CELL_GAP;

const LEVEL_CELL_CLASSES: Record<HeatmapIntensityLevel, string> = {
  0: "bg-[#EAE6DD] ring-1 ring-inset ring-[#DDD7CA]/80",
  1: "bg-[#C9DDD5]",
  2: "bg-[#8BB6A6]",
  3: "bg-[#46826E]",
  4: "bg-[#1B4D3E]",
};

function getSafeExternalHref(raw?: string): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function ActivityWorkspace() {
  const router = useRouter();
  const history = useWorkbenchStore((s) => s.history);
  const selectFromHistory = useWorkbenchStore((s) => s.selectFromHistory);
  const orgName = useOrganizationStore((s) => s.profile.name);

  const [dataMode, setDataMode] = useState<"auto" | "live" | "demo">("auto");
  const [platformFilter, setPlatformFilter] = useState<ActivityPlatformFilter>("all");
  const [rangeOption, setRangeOption] = useState<ActivityRangeOption>("last-year");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<HeatmapDayCell | null>(null);

  const todayKey = useSyncExternalStore(emptySubscribe, getClientTodayKey, getServerTodayKey);
  const today = useMemo(() => {
    if (!todayKey) return null;
    const [y, m, d] = todayKey.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [todayKey]);

  const livePublishedCount = useMemo(
    () => history.filter((item) => item.isPublished).length,
    [history],
  );

  const effectiveMode: "live" | "demo" =
    dataMode === "auto" ? (livePublishedCount > 0 ? "live" : "demo") : dataMode;

  const demoHistory = useMemo(
    () => (today ? buildDemoActivityHistory(today) : []),
    [today],
  );

  const sourceHistory = effectiveMode === "live" ? history : demoHistory;

  const availableYears = useMemo(
    () => (today ? getAvailableActivityYears(sourceHistory, today) : []),
    [sourceHistory, today],
  );

  const effectiveRange: ActivityRangeOption = useMemo(() => {
    if (rangeOption === "last-year") return "last-year";
    return availableYears.includes(rangeOption) ? rangeOption : "last-year";
  }, [availableYears, rangeOption]);

  const heatmap = useMemo(() => {
    if (!today) return null;
    return computeActivityHeatmap(sourceHistory, today, {
      platform: platformFilter,
      range: effectiveRange,
    });
  }, [effectiveRange, platformFilter, sourceHistory, today]);

  const latestActiveDateKey = useMemo(() => {
    if (!heatmap) return null;
    for (let w = heatmap.weeks.length - 1; w >= 0; w -= 1) {
      const days = heatmap.weeks[w].days;
      for (let d = days.length - 1; d >= 0; d -= 1) {
        const cell = days[d];
        if (cell.inRange && cell.count > 0) {
          return cell.dateKey;
        }
      }
    }
    return heatmap.rangeEndKey;
  }, [heatmap]);

  const activeSelectedDateKey = useMemo(() => {
    if (!heatmap) return null;
    if (selectedDateKey && heatmap.daysByKey[selectedDateKey]) {
      return selectedDateKey;
    }
    return latestActiveDateKey;
  }, [heatmap, latestActiveDateKey, selectedDateKey]);

  const selectedCell = useMemo(() => {
    if (!heatmap || !activeSelectedDateKey) return null;
    return heatmap.daysByKey[activeSelectedDateKey] ?? null;
  }, [activeSelectedDateKey, heatmap]);

  const totalAcrossPlatforms = useMemo(() => {
    if (!heatmap) return 0;
    return PLATFORM_FILTER_ORDER.reduce((sum, id) => sum + heatmap.platformCounts[id], 0);
  }, [heatmap]);

  const activeRatePercent = useMemo(() => {
    if (!heatmap || heatmap.totalRangeDays === 0) return 0;
    return Math.round((heatmap.activeDays / heatmap.totalRangeDays) * 100);
  }, [heatmap]);

  const handleOpenInWorkflow = (id: string) => {
    if (effectiveMode !== "live") return;
    selectFromHistory(id);
    router.push("/workflow");
  };

  return (
    <div className="space-y-9">
      {/* Editorial Masthead */}
      <header className="flex flex-col gap-4 border-b border-[#181816]/15 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-editorial text-2xl font-semibold tracking-tight text-[#181816]">
              发布活跃度
            </h1>

            <div className="inline-flex items-center gap-0.5 rounded border border-[#E2DDD3] bg-[#EFECE4] p-0.5">
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
            {orgName} · 每日已发布稿件热力图与更新节奏台账
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/history"
            className="inline-flex items-center gap-1.5 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3.5 py-2 text-xs font-medium text-[#181816] transition hover:border-[#181816]"
          >
            <History className="h-3.5 w-3.5 text-[#1B4D3E]" />
            <span>创作记录</span>
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

      {/* Summary Metrics Strip */}
      <section className="grid grid-cols-2 gap-6 border-b border-[#E2DDD3] pb-8 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-[#E2DDD3]">
        <div className="lg:pr-7">
          <p className="text-xs text-[#78716C]">区间发布总量</p>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="font-editorial text-4xl font-semibold leading-none tracking-tight text-[#181816] tabular-nums">
              {heatmap?.totalPublished ?? 0}
            </span>
            <span className="text-xs text-[#8C857B]">篇</span>
          </div>
          <p className="mt-2 font-mono text-[11px] text-[#8C857B] tabular-nums">
            活跃日均 {heatmap?.averagePerActiveDay ?? 0} 篇
          </p>
        </div>

        <div className="lg:px-7">
          <p className="text-xs text-[#78716C]">活跃发布天数</p>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="font-editorial text-4xl font-semibold leading-none tracking-tight text-[#181816] tabular-nums">
              {heatmap?.activeDays ?? 0}
            </span>
            <span className="text-xs text-[#8C857B]">天</span>
          </div>
          <p className="mt-2 font-mono text-[11px] text-[#8C857B] tabular-nums">
            覆盖区间 {activeRatePercent}% 的日期
          </p>
        </div>

        <div className="lg:px-7">
          <p className="text-xs text-[#78716C]">最长连续发布</p>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="font-editorial text-4xl font-semibold leading-none tracking-tight text-[#1B4D3E] tabular-nums">
              {heatmap?.longestStreak ?? 0}
            </span>
            <span className="text-xs text-[#8C857B]">天</span>
          </div>
          <p className="mt-2 font-mono text-[11px] text-[#8C857B] tabular-nums">
            当前连续 {heatmap?.currentStreak ?? 0} 天
          </p>
        </div>

        <div className="lg:pl-7">
          <p className="text-xs text-[#78716C]">单日最高产出</p>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="font-editorial text-4xl font-semibold leading-none tracking-tight text-[#B85D3B] tabular-nums">
              {heatmap?.maxDailyCount ?? 0}
            </span>
            <span className="text-xs text-[#8C857B]">篇</span>
          </div>
          <p className="mt-2 font-mono text-[11px] text-[#8C857B] tabular-nums">
            {heatmap?.busiestDayKey ? `峰值 ${heatmap.busiestDayKey}` : "暂无发布峰值"}
          </p>
        </div>
      </section>

      {/* Filter Toolbar + GitHub-Style Heatmap */}
      <section className="space-y-5 border-b border-[#E2DDD3] pb-9">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Platform Segmented Filter */}
          <div className="flex flex-wrap items-center gap-0.5 rounded border border-[#E2DDD3] bg-[#EFECE4] p-0.5">
            <button
              type="button"
              onClick={() => setPlatformFilter("all")}
              className={`inline-flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 text-xs font-medium transition ${
                platformFilter === "all"
                  ? "bg-[#FCFBF8] text-[#181816]"
                  : "text-[#78716C] hover:text-[#181816]"
              }`}
            >
              <span>全部平台</span>
              <span className="font-mono text-[10px] text-[#8C857B] tabular-nums">
                {totalAcrossPlatforms}
              </span>
            </button>
            {PLATFORM_FILTER_ORDER.map((id) => {
              const active = platformFilter === id;
              const count = heatmap?.platformCounts[id] ?? 0;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPlatformFilter(id)}
                  className={`inline-flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-[#FCFBF8] text-[#181816]"
                      : "text-[#78716C] hover:text-[#181816]"
                  }`}
                >
                  <span>{PLATFORMS[id].name}</span>
                  <span className="font-mono text-[10px] text-[#8C857B] tabular-nums">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Time Range Selector */}
          <div className="inline-flex items-center gap-0.5 self-start rounded border border-[#E2DDD3] bg-[#EFECE4] p-0.5 sm:self-auto">
            <button
              type="button"
              onClick={() => setRangeOption("last-year")}
              className={`rounded-[3px] px-2.5 py-1 text-xs font-medium transition ${
                effectiveRange === "last-year"
                  ? "bg-[#FCFBF8] text-[#181816]"
                  : "text-[#78716C] hover:text-[#181816]"
              }`}
            >
              近一年
            </button>
            {availableYears.map((year) => {
              const active = effectiveRange === year;
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => setRangeOption(year)}
                  className={`rounded-[3px] px-2.5 py-1 font-mono text-xs font-medium tabular-nums transition ${
                    active
                      ? "bg-[#FCFBF8] text-[#181816]"
                      : "text-[#78716C] hover:text-[#181816]"
                  }`}
                >
                  {year}
                </button>
              );
            })}
          </div>
        </div>

        {/* Heatmap Canvas Container */}
        <div className="rounded-lg border border-[#E2DDD3] bg-[#FCFBF8] px-5 py-5">
          {/* Top Readout Bar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#E2DDD3]/80 pb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-editorial text-base font-semibold text-[#181816]">
                每日发布稿件热力图
              </h2>
              {effectiveMode === "demo" && (
                <span className="rounded bg-[#EFECE4] px-1.5 py-0.5 text-[10px] font-medium text-[#57534E]">
                  示例预览
                </span>
              )}
            </div>

            <div className="min-h-[18px] text-xs text-[#57534E]">
              {hoveredCell ? (
                <span className="inline-flex items-center gap-2 font-mono text-[11px] tabular-nums">
                  <span className="text-[#181816]">
                    {formatChineseDateLabel(hoveredCell.dateKey)}
                  </span>
                  <span className="text-[#CFC8BA]">·</span>
                  <span
                    className={
                      hoveredCell.count > 0 ? "font-medium text-[#1B4D3E]" : "text-[#8C857B]"
                    }
                  >
                    {hoveredCell.count > 0 ? `发布 ${hoveredCell.count} 篇稿件` : "当日无发布"}
                  </span>
                </span>
              ) : heatmap ? (
                <span className="font-mono text-[11px] text-[#8C857B] tabular-nums">
                  {heatmap.rangeStartKey} 至 {heatmap.rangeEndKey}
                </span>
              ) : (
                <span className="font-mono text-[11px] text-[#8C857B]">正在加载日期网格…</span>
              )}
            </div>
          </div>

          {/* Scrollable GitHub-Style 53x7 Grid */}
          {heatmap ? (
            <div className="overflow-x-auto pb-1">
              <div className="inline-block min-w-max">
                {/* Month Labels Row */}
                <div
                  className="relative mb-1.5 ml-8 h-4"
                  style={{ width: `${heatmap.weeks.length * COLUMN_PITCH}px` }}
                >
                  {heatmap.monthLabels.map((month) => (
                    <span
                      key={`${month.label}-${month.weekIndex}`}
                      className="absolute top-0 font-mono text-[10px] text-[#8C857B] tabular-nums"
                      style={{ left: `${month.weekIndex * COLUMN_PITCH}px` }}
                    >
                      {month.label}
                    </span>
                  ))}
                </div>

                {/* Weekday Labels + Week Columns */}
                <div className="flex items-start">
                  {/* Left Weekday Axis (Mon, Wed, Fri) */}
                  <div
                    className="mr-2 grid shrink-0 text-right font-mono text-[10px] text-[#8C857B]"
                    style={{
                      gridTemplateRows: `repeat(7, ${CELL_SIZE}px)`,
                      rowGap: `${CELL_GAP}px`,
                      width: "24px",
                    }}
                  >
                    <span className="leading-[13px]" />
                    <span className="leading-[13px]">一</span>
                    <span className="leading-[13px]" />
                    <span className="leading-[13px]">三</span>
                    <span className="leading-[13px]" />
                    <span className="leading-[13px]">五</span>
                    <span className="leading-[13px]" />
                  </div>

                  {/* Week Columns */}
                  <div
                    className="flex"
                    style={{ gap: `${CELL_GAP}px` }}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {heatmap.weeks.map((week) => (
                      <div
                        key={week.weekIndex}
                        className="flex flex-col"
                        style={{ gap: `${CELL_GAP}px` }}
                      >
                        {week.days.map((cell) => {
                          if (!cell.inRange) {
                            return (
                              <span
                                key={cell.dateKey}
                                aria-hidden="true"
                                style={{ width: CELL_SIZE, height: CELL_SIZE }}
                              />
                            );
                          }

                          const isSelected = activeSelectedDateKey === cell.dateKey;
                          const label = `${formatChineseDateLabel(cell.dateKey)}：${
                            cell.count > 0 ? `发布 ${cell.count} 篇稿件` : "无发布记录"
                          }`;

                          return (
                            <button
                              key={cell.dateKey}
                              type="button"
                              aria-label={label}
                              aria-pressed={isSelected}
                              title={label}
                              onClick={() => setSelectedDateKey(cell.dateKey)}
                              onMouseEnter={() => setHoveredCell(cell)}
                              onFocus={() => setHoveredCell(cell)}
                              style={{ width: CELL_SIZE, height: CELL_SIZE }}
                              className={`rounded-[2px] transition-transform duration-100 hover:scale-110 focus:outline-none ${
                                LEVEL_CELL_CLASSES[cell.level]
                              } ${
                                isSelected
                                  ? "ring-2 ring-[#B85D3B] ring-offset-1 ring-offset-[#FCFBF8]"
                                  : ""
                              }`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-36 items-center justify-center">
              <span className="font-mono text-[11px] text-[#8C857B]">热力图加载中…</span>
            </div>
          )}

          {/* Legend & Hint Footer */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E2DDD3]/70 pt-3 text-[11px] text-[#8C857B]">
            <span>点击任意日期方格，在下方查看当天发布的稿件明细</span>

            <div className="flex items-center gap-1.5">
              <span>少</span>
              {([0, 1, 2, 3, 4] as const).map((level) => (
                <span
                  key={level}
                  aria-hidden="true"
                  className={`inline-block h-[11px] w-[11px] rounded-[2px] ${LEVEL_CELL_CLASSES[level]}`}
                />
              ))}
              <span>多</span>
            </div>
          </div>
        </div>
      </section>

      {/* Selected Day Hairline Ledger */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-editorial text-base font-semibold text-[#181816]">
                {selectedCell
                  ? `${formatChineseDateLabel(selectedCell.dateKey)} 发布明细`
                  : "当日发布明细"}
              </h2>
              {selectedCell && (
                <span className="rounded bg-[#E9F0ED] px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#1B4D3E] tabular-nums">
                  {selectedCell.count} 篇
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-[#78716C]">
              {effectiveMode === "live"
                ? "展示已标记发布或从创作者后台同步归档的真实稿件"
                : "当前为示例数据预览，切换到「真实数据」或发布首篇稿件后将自动记录真实轨迹"}
            </p>
          </div>

          {heatmap?.busiestDayKey &&
            activeSelectedDateKey !== heatmap.busiestDayKey && (
              <button
                type="button"
                onClick={() => setSelectedDateKey(heatmap.busiestDayKey)}
                className="rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-1.5 text-xs font-medium text-[#57534E] transition hover:border-[#181816] hover:text-[#181816]"
              >
                定位峰值日 ({heatmap.busiestDayKey})
              </button>
            )}
        </div>

        {selectedCell && selectedCell.items.length > 0 ? (
          <div className="divide-y divide-[#E2DDD3] border-y border-[#E2DDD3]">
            {selectedCell.items.map((item, idx) => {
              const safeUrl = getSafeExternalHref(item.publishedUrl);
              return (
                <div
                  key={item.id}
                  className="group flex flex-col justify-between gap-3 py-4 transition-colors hover:bg-[#FCFBF8]/70 lg:flex-row lg:items-center lg:px-2"
                >
                  <div className="flex min-w-0 flex-1 items-baseline gap-4">
                    <span className="hidden w-6 shrink-0 font-mono text-xs text-[#8C857B] tabular-nums sm:inline">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-editorial text-[15px] font-semibold text-[#181816]">
                          {item.title}
                        </h3>
                        <span className="rounded bg-[#E9F0ED] px-1.5 py-0.5 text-[11px] font-medium text-[#1B4D3E]">
                          {PLATFORMS[item.platform].name}
                        </span>
                        {item.isViral && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-[#FBF3EC] px-1.5 py-0.5 text-[11px] font-medium text-[#9A4A22]">
                            <Flame className="h-3 w-3" />
                            <span>爆款</span>
                          </span>
                        )}
                        {item.isArchived && (
                          <span className="rounded bg-[#EFECE4] px-1.5 py-0.5 text-[11px] text-[#57534E]">
                            已归档
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-[#8C857B] tabular-nums">
                        <span>发布于 {formatLocalTimeLabel(item.publishedAt)}</span>
                        {typeof item.views === "number" && (
                          <span>曝光 {item.views.toLocaleString("zh-CN")}</span>
                        )}
                        {typeof item.likes === "number" && (
                          <span>点赞 {item.likes.toLocaleString("zh-CN")}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 pl-0 sm:pl-10 lg:pl-0">
                    {safeUrl && (
                      <a
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2.5 py-1 text-xs font-medium text-[#57534E] transition hover:border-[#181816] hover:text-[#181816]"
                      >
                        <span>原文链接</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {effectiveMode === "live" && (
                      <button
                        type="button"
                        onClick={() => handleOpenInWorkflow(item.id)}
                        className="inline-flex items-center gap-1 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2.5 py-1 text-xs font-medium text-[#181816] transition hover:border-[#1B4D3E] hover:text-[#1B4D3E]"
                      >
                        <span>回看稿件</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[220px] flex-col items-center justify-center border border-dashed border-[#D5CFC3] bg-[#FCFBF8]/60 px-6 py-10 text-center">
            <div className="h-7 w-px bg-[#CFC8BA]" />
            <p className="mt-4 font-editorial text-base font-medium text-[#57534E]">
              {effectiveMode === "live" && livePublishedCount === 0
                ? "暂无已发布稿件记录"
                : "当日没有符合条件的发布记录"}
            </p>
            <p className="mt-1.5 text-xs text-[#8C857B]">
              {effectiveMode === "live" && livePublishedCount === 0
                ? "在「内容创作」或「创作记录」中将稿件标记为已发布，即可点亮每日活跃度热力图"
                : "点击热力图中有颜色的日期方格查看当天稿件，或切换「全部平台」查看完整产出"}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
