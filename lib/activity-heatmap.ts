import type { CopywritingResult, PlatformId } from "@/lib/platforms";

export type ActivityPlatformFilter = "all" | PlatformId;
export type ActivityRangeOption = "last-year" | number;
export type HeatmapIntensityLevel = 0 | 1 | 2 | 3 | 4;

export interface ActivityArticleItem {
  id: string;
  title: string;
  topic: string;
  platform: PlatformId;
  publishedAt: string;
  publishedDateKey: string;
  isViral: boolean;
  isArchived: boolean;
  publishedUrl?: string;
  views?: number;
  likes?: number;
}

export interface HeatmapDayCell {
  dateKey: string;
  date: Date;
  inRange: boolean;
  count: number;
  level: HeatmapIntensityLevel;
  items: ActivityArticleItem[];
}

export interface HeatmapWeekColumn {
  weekIndex: number;
  days: HeatmapDayCell[];
}

export interface HeatmapMonthLabel {
  label: string;
  weekIndex: number;
}

export interface ActivityHeatmapData {
  rangeStartKey: string;
  rangeEndKey: string;
  weeks: HeatmapWeekColumn[];
  monthLabels: HeatmapMonthLabel[];
  daysByKey: Record<string, HeatmapDayCell>;
  totalPublished: number;
  activeDays: number;
  totalRangeDays: number;
  maxDailyCount: number;
  busiestDayKey: string | null;
  currentStreak: number;
  longestStreak: number;
  averagePerActiveDay: number;
  platformCounts: Record<PlatformId, number>;
}

const PLATFORM_IDS: readonly PlatformId[] = ["douyin", "toutiao", "xiaohongshu", "wechat"];
const WEEKDAY_LABELS_CN = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;

export function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function formatChineseDateLabel(dateKey: string): string {
  const date = parseLocalDateKey(dateKey);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAY_LABELS_CN[date.getDay()];
  return `${year}年${month}月${day}日 · ${weekday}`;
}

export function formatLocalTimeLabel(isoString: string): string {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return "--:--";
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function addDays(date: Date, delta: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + delta);
  return next;
}

export function resolvePublishedDate(item: CopywritingResult): Date | null {
  if (!item.isPublished) return null;
  const raw = item.publishedAt ?? item.publishArchive?.publishedAt ?? item.createdAt;
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function computeHeatmapLevel(count: number, maxCount: number): HeatmapIntensityLevel {
  if (count <= 0) return 0;
  if (maxCount <= 4) {
    return Math.min(4, count) as HeatmapIntensityLevel;
  }
  const ratio = count / maxCount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function resolveRangeBounds(
  range: ActivityRangeOption,
  today: Date,
): { rangeStart: Date; rangeEnd: Date } {
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (range === "last-year") {
    return {
      rangeStart: addDays(normalizedToday, -364),
      rangeEnd: normalizedToday,
    };
  }
  return {
    rangeStart: new Date(range, 0, 1),
    rangeEnd: new Date(range, 11, 31),
  };
}

export function getAvailableActivityYears(
  history: CopywritingResult[],
  today: Date,
): number[] {
  const years = new Set<number>([today.getFullYear()]);
  for (const item of history) {
    const publishedDate = resolvePublishedDate(item);
    if (publishedDate) {
      years.add(publishedDate.getFullYear());
    }
  }
  return Array.from(years).sort((a, b) => b - a);
}

export function computeActivityHeatmap(
  history: CopywritingResult[],
  today: Date,
  options?: {
    platform?: ActivityPlatformFilter;
    range?: ActivityRangeOption;
  },
): ActivityHeatmapData {
  const platformFilter = options?.platform ?? "all";
  const range = options?.range ?? "last-year";
  const { rangeStart, rangeEnd } = resolveRangeBounds(range, today);
  const rangeStartKey = formatLocalDateKey(rangeStart);
  const rangeEndKey = formatLocalDateKey(rangeEnd);

  const platformCounts: Record<PlatformId, number> = {
    douyin: 0,
    toutiao: 0,
    xiaohongshu: 0,
    wechat: 0,
  };

  const itemsByDateKey = new Map<string, ActivityArticleItem[]>();

  for (const item of history) {
    const publishedDate = resolvePublishedDate(item);
    if (!publishedDate) continue;

    const dateKey = formatLocalDateKey(publishedDate);
    if (dateKey < rangeStartKey || dateKey > rangeEndKey) continue;

    platformCounts[item.platform] += 1;

    if (platformFilter !== "all" && item.platform !== platformFilter) {
      continue;
    }

    const publishedIso = item.publishedAt ?? item.publishArchive?.publishedAt ?? item.createdAt;
    const article: ActivityArticleItem = {
      id: item.id,
      title: item.titles[0]?.trim() || item.topic.trim() || "未命名稿件",
      topic: item.topic,
      platform: item.platform,
      publishedAt: publishedIso,
      publishedDateKey: dateKey,
      isViral: Boolean(item.isViral),
      isArchived: Boolean(item.publishArchive?.archived),
      publishedUrl: item.publishArchive?.publishedUrl,
      views: item.publishArchive?.metrics.views,
      likes: item.publishArchive?.metrics.likes,
    };

    const existing = itemsByDateKey.get(dateKey);
    if (existing) {
      existing.push(article);
    } else {
      itemsByDateKey.set(dateKey, [article]);
    }
  }

  for (const articles of itemsByDateKey.values()) {
    articles.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }

  // Align grid to Sunday (start) through Saturday (end), matching GitHub contribution graph
  const gridStart = addDays(rangeStart, -rangeStart.getDay());
  const gridEnd = addDays(rangeEnd, 6 - rangeEnd.getDay());

  let totalPublished = 0;
  let activeDays = 0;
  let totalRangeDays = 0;
  let maxDailyCount = 0;
  let busiestDayKey: string | null = null;
  let longestStreak = 0;
  let runningStreak = 0;

  const rawDays: Array<{
    dateKey: string;
    date: Date;
    inRange: boolean;
    items: ActivityArticleItem[];
  }> = [];

  for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    const dateKey = formatLocalDateKey(cursor);
    const inRange = dateKey >= rangeStartKey && dateKey <= rangeEndKey;
    const items = inRange ? (itemsByDateKey.get(dateKey) ?? []) : [];

    if (inRange) {
      totalRangeDays += 1;
      const count = items.length;
      if (count > 0) {
        totalPublished += count;
        activeDays += 1;
        runningStreak += 1;
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
        if (count > maxDailyCount || (count === maxDailyCount && dateKey > (busiestDayKey ?? ""))) {
          maxDailyCount = count;
          busiestDayKey = dateKey;
        }
      } else {
        runningStreak = 0;
      }
    }

    rawDays.push({
      dateKey,
      date: new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()),
      inRange,
      items,
    });
  }

  // Compute current streak up to min(today, rangeEnd)
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const streakAnchor = normalizedToday < rangeEnd ? normalizedToday : rangeEnd;
  let currentStreak = 0;
  if (streakAnchor >= rangeStart) {
    let cursor = streakAnchor;
    const anchorCount = itemsByDateKey.get(formatLocalDateKey(cursor))?.length ?? 0;
    // If today has no publish yet, still preserve active streak from yesterday
    if (anchorCount === 0 && formatLocalDateKey(cursor) === formatLocalDateKey(normalizedToday)) {
      cursor = addDays(cursor, -1);
    }
    while (cursor >= rangeStart) {
      const count = itemsByDateKey.get(formatLocalDateKey(cursor))?.length ?? 0;
      if (count > 0) {
        currentStreak += 1;
        cursor = addDays(cursor, -1);
      } else {
        break;
      }
    }
  }

  const weeks: HeatmapWeekColumn[] = [];
  const daysByKey: Record<string, HeatmapDayCell> = {};
  const monthLabels: HeatmapMonthLabel[] = [];
  let lastLabeledMonthKey = "";
  let lastLabelWeekIndex = -3;

  for (let i = 0; i < rawDays.length; i += 7) {
    const weekIndex = Math.floor(i / 7);
    const slice = rawDays.slice(i, i + 7);
    const days: HeatmapDayCell[] = slice.map((raw) => {
      const count = raw.items.length;
      const cell: HeatmapDayCell = {
        dateKey: raw.dateKey,
        date: raw.date,
        inRange: raw.inRange,
        count,
        level: raw.inRange ? computeHeatmapLevel(count, maxDailyCount) : 0,
        items: raw.items,
      };
      if (raw.inRange) {
        daysByKey[raw.dateKey] = cell;
      }
      return cell;
    });

    weeks.push({ weekIndex, days });

    const firstOfMonth = days.find((d) => d.inRange && d.date.getDate() === 1);
    const labelDay = firstOfMonth ?? (weekIndex === 0 ? days.find((d) => d.inRange) : undefined);
    if (labelDay) {
      const labelMonthKey = `${labelDay.date.getFullYear()}-${labelDay.date.getMonth()}`;
      if (labelMonthKey !== lastLabeledMonthKey && weekIndex - lastLabelWeekIndex >= 2) {
        monthLabels.push({
          label: `${labelDay.date.getMonth() + 1}月`,
          weekIndex,
        });
        lastLabeledMonthKey = labelMonthKey;
        lastLabelWeekIndex = weekIndex;
      }
    }
  }

  return {
    rangeStartKey,
    rangeEndKey,
    weeks,
    monthLabels,
    daysByKey,
    totalPublished,
    activeDays,
    totalRangeDays,
    maxDailyCount,
    busiestDayKey,
    currentStreak,
    longestStreak,
    averagePerActiveDay:
      activeDays > 0 ? Number((totalPublished / activeDays).toFixed(1)) : 0,
    platformCounts,
  };
}

const DEMO_TOPICS = [
  "山区阅读角春季图书补给纪实",
  "社区银发助餐点志愿者一日记录",
  "听障儿童康复课堂上的第一次开口",
  "公益义卖市集筹款明细与善款去向公示",
  "乡村卫生室急救包巡检与用药科普",
  "环保净滩行动：带走 320 公斤海岸塑料",
  "流动儿童周末画室作品展招募通知",
  "寒冬暖衣计划：第一批棉服已送达高原小学",
  "导盲犬社会化训练基地开放日回顾",
  "非遗手艺公益工坊助农增收故事",
  "心肺复苏急救知识进校园公益讲座",
  "流浪动物绝育与领养日温暖回访",
] as const;

/**
 * Deterministic seeded demo history spanning the past year for previewing
 * the GitHub-style publish activity heatmap when no local records exist yet.
 */
export function buildDemoActivityHistory(today: Date): CopywritingResult[] {
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const results: CopywritingResult[] = [];
  let seed = 20261128;

  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let offset = 364; offset >= 0; offset -= 1) {
    const day = addDays(normalizedToday, -offset);
    const weekday = day.getDay();
    const isWeekend = weekday === 0 || weekday === 6;

    // Create natural editorial rhythm: active recent streak, quieter weekends, occasional peaks
    const r = nextRand();
    let count = 0;
    if (offset <= 4) {
      count = offset === 0 ? 2 : offset === 2 ? 3 : 1;
    } else if (isWeekend) {
      if (r > 0.78) count = 1;
      if (r > 0.94) count = 2;
    } else {
      if (r > 0.34) count = 1;
      if (r > 0.68) count = 2;
      if (r > 0.87) count = 3;
      if (r > 0.96) count = 4;
    }

    for (let idx = 0; idx < count; idx += 1) {
      const platform = PLATFORM_IDS[(offset + idx * 3 + Math.floor(nextRand() * 4)) % PLATFORM_IDS.length];
      const topic = DEMO_TOPICS[(offset * 2 + idx) % DEMO_TOPICS.length];
      const publishTime = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        9 + idx * 3 + (offset % 2),
        15 + ((offset * 7 + idx * 13) % 40),
        0,
      );
      const publishedIso = publishTime.toISOString();
      const views = 1800 + Math.floor(nextRand() * 26000);
      const likes = Math.floor(views * (0.04 + nextRand() * 0.08));
      const isViral = views > 20000;

      results.push({
        id: `demo-activity-${formatLocalDateKey(day)}-${idx}`,
        platform,
        contentType: idx % 3 === 0 ? "story" : idx % 3 === 1 ? "activity" : "science",
        tone: "warm",
        topic,
        titles: [topic],
        hook: "",
        body: `【示例发布记录】${topic}`,
        tags: ["公益纪实", "志愿行动"],
        cta: "",
        tips: [],
        mode: "local",
        createdAt: publishedIso,
        isPublished: true,
        publishedAt: publishedIso,
        isViral,
        publishArchive: {
          publishedAt: publishedIso,
          archived: offset > 14,
          archivedAt: offset > 14 ? publishedIso : undefined,
          metrics: { views, likes },
        },
      });
    }
  }

  return results;
}
