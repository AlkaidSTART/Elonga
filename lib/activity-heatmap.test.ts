import { describe, expect, it } from "vitest";
import {
  buildDemoActivityHistory,
  computeActivityHeatmap,
  computeHeatmapLevel,
  formatLocalDateKey,
  getAvailableActivityYears,
  parseLocalDateKey,
} from "@/lib/activity-heatmap";
import type { CopywritingResult, PlatformId } from "@/lib/platforms";

function makeArticle(
  id: string,
  platform: PlatformId,
  publishedAt: string | undefined,
  options?: { isPublished?: boolean; isViral?: boolean; title?: string },
): CopywritingResult {
  return {
    id,
    platform,
    contentType: "story",
    tone: "warm",
    topic: options?.title ?? `主题 ${id}`,
    titles: [options?.title ?? `标题 ${id}`],
    hook: "",
    body: "正文内容",
    tags: [],
    cta: "",
    tips: [],
    mode: "local",
    createdAt: publishedAt ?? "2026-11-01T08:00:00.000Z",
    isPublished: options?.isPublished ?? true,
    publishedAt,
    isViral: options?.isViral ?? false,
  };
}

describe("activity-heatmap", () => {
  it("formats and parses local date keys consistently", () => {
    const date = new Date(2026, 10, 5);
    const key = formatLocalDateKey(date);
    expect(key).toBe("2026-11-05");
    const parsed = parseLocalDateKey(key);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(10);
    expect(parsed.getDate()).toBe(5);
  });

  it("maps daily publish counts to 0-4 heatmap intensity levels", () => {
    expect(computeHeatmapLevel(0, 4)).toBe(0);
    expect(computeHeatmapLevel(1, 3)).toBe(1);
    expect(computeHeatmapLevel(2, 3)).toBe(2);
    expect(computeHeatmapLevel(3, 3)).toBe(3);

    expect(computeHeatmapLevel(1, 10)).toBe(1);
    expect(computeHeatmapLevel(5, 10)).toBe(2);
    expect(computeHeatmapLevel(7, 10)).toBe(3);
    expect(computeHeatmapLevel(10, 10)).toBe(4);
  });

  it("aggregates only published articles, supports platform filter, and computes streaks", () => {
    const today = new Date(2026, 10, 28);
    const history: CopywritingResult[] = [
      makeArticle("a1", "douyin", new Date(2026, 10, 28, 10, 0).toISOString()),
      makeArticle("a2", "wechat", new Date(2026, 10, 28, 15, 30).toISOString(), { isViral: true }),
      makeArticle("a3", "douyin", new Date(2026, 10, 27, 9, 0).toISOString()),
      makeArticle("a4", "xiaohongshu", new Date(2026, 10, 26, 14, 0).toISOString()),
      // Gap on 2026-11-25, then a 4-day historical streak on Nov 10..13
      makeArticle("a5", "toutiao", new Date(2026, 10, 10, 11, 0).toISOString()),
      makeArticle("a6", "douyin", new Date(2026, 10, 11, 11, 0).toISOString()),
      makeArticle("a7", "wechat", new Date(2026, 10, 12, 11, 0).toISOString()),
      makeArticle("a8", "douyin", new Date(2026, 10, 13, 11, 0).toISOString()),
      // Unpublished draft should be excluded
      makeArticle("draft-1", "douyin", new Date(2026, 10, 28, 16, 0).toISOString(), {
        isPublished: false,
      }),
    ];

    const allData = computeActivityHeatmap(history, today, {
      platform: "all",
      range: "last-year",
    });

    expect(allData.totalPublished).toBe(8);
    expect(allData.activeDays).toBe(7);
    expect(allData.maxDailyCount).toBe(2);
    expect(allData.busiestDayKey).toBe("2026-11-28");
    expect(allData.currentStreak).toBe(3);
    expect(allData.longestStreak).toBe(4);
    expect(allData.daysByKey["2026-11-28"]?.count).toBe(2);
    expect(allData.daysByKey["2026-11-28"]?.items.map((item) => item.id)).toEqual(["a2", "a1"]);
    expect(allData.platformCounts).toEqual({
      douyin: 4,
      toutiao: 1,
      xiaohongshu: 1,
      wechat: 2,
    });

    // Filtering by douyin should keep platformCounts across all platforms for filter badges,
    // while restricting heatmap cells & metrics to douyin only.
    const douyinOnly = computeActivityHeatmap(history, today, {
      platform: "douyin",
      range: "last-year",
    });
    expect(douyinOnly.totalPublished).toBe(4);
    expect(douyinOnly.activeDays).toBe(4);
    expect(douyinOnly.currentStreak).toBe(2);
    expect(douyinOnly.platformCounts.wechat).toBe(2);
  });

  it("supports calendar year range and aligns every week column to 7 days (Sun-Sat)", () => {
    const today = new Date(2026, 10, 28);
    const history: CopywritingResult[] = [
      makeArticle("y2025", "wechat", new Date(2025, 5, 15, 10, 0).toISOString()),
      makeArticle("y2026", "douyin", new Date(2026, 2, 10, 10, 0).toISOString()),
    ];

    expect(getAvailableActivityYears(history, today)).toEqual([2026, 2025]);

    const year2025 = computeActivityHeatmap(history, today, {
      platform: "all",
      range: 2025,
    });
    expect(year2025.rangeStartKey).toBe("2025-01-01");
    expect(year2025.rangeEndKey).toBe("2025-12-31");
    expect(year2025.totalPublished).toBe(1);
    expect(year2025.daysByKey["2025-06-15"]?.count).toBe(1);
    expect(year2025.weeks.every((week) => week.days.length === 7)).toBe(true);
    expect(year2025.weeks[0]?.days[0]?.date.getDay()).toBe(0);
    expect(year2025.monthLabels.length).toBeGreaterThanOrEqual(10);
  });

  it("handles empty history cleanly without NaN or crashes", () => {
    const today = new Date(2026, 10, 28);
    const empty = computeActivityHeatmap([], today);
    expect(empty.totalPublished).toBe(0);
    expect(empty.activeDays).toBe(0);
    expect(empty.maxDailyCount).toBe(0);
    expect(empty.busiestDayKey).toBeNull();
    expect(empty.currentStreak).toBe(0);
    expect(empty.longestStreak).toBe(0);
    expect(empty.averagePerActiveDay).toBe(0);
  });

  it("builds deterministic demo activity history across the past year", () => {
    const today = new Date(2026, 10, 28);
    const demoA = buildDemoActivityHistory(today);
    const demoB = buildDemoActivityHistory(today);

    expect(demoA.length).toBeGreaterThan(150);
    expect(demoA.map((item) => item.id)).toEqual(demoB.map((item) => item.id));
    expect(demoA.every((item) => item.isPublished && Boolean(item.publishedAt))).toBe(true);
  });
});
