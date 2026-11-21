import { PLATFORMS, type CopywritingResult, type PlatformId } from "@/lib/platforms";

export interface PlatformStat {
  id: PlatformId;
  name: string;
  accentColor: string;
  createdCount: number;
  publishedCount: number;
  viralCount: number;
  sharePercent: number;
}

export interface DailyTrendPoint {
  dateLabel: string;
  createdCount: number;
  publishedCount: number;
  viralCount: number;
}

export interface OverviewStats {
  totalCreated: number;
  totalPublished: number;
  totalViral: number;
  publishRate: number;
  viralRate: number;
  activePlatformsCount: number;
  topPlatformName: string;
  platformStats: PlatformStat[];
  dailyTrend: DailyTrendPoint[];
}

const PLATFORM_ORDER: PlatformId[] = ["douyin", "toutiao", "kuaishou", "wechat"];

function formatShortDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}`;
}

export function buildDemoOverviewStats(today: Date | null): OverviewStats {
  const platformStats: PlatformStat[] = [
    {
      id: "douyin",
      name: PLATFORMS.douyin.name,
      accentColor: "#171717",
      createdCount: 56,
      publishedCount: 48,
      viralCount: 16,
      sharePercent: 38,
    },
    {
      id: "toutiao",
      name: PLATFORMS.toutiao.name,
      accentColor: "#DC2626",
      createdCount: 42,
      publishedCount: 35,
      viralCount: 11,
      sharePercent: 28,
    },
    {
      id: "kuaishou",
      name: PLATFORMS.kuaishou.name,
      accentColor: "#EA580C",
      createdCount: 31,
      publishedCount: 25,
      viralCount: 7,
      sharePercent: 20,
    },
    {
      id: "wechat",
      name: PLATFORMS.wechat.name,
      accentColor: "#059669",
      createdCount: 23,
      publishedCount: 18,
      viralCount: 6,
      sharePercent: 14,
    },
  ];

  const totalCreated = platformStats.reduce((sum, p) => sum + p.createdCount, 0);
  const totalPublished = platformStats.reduce((sum, p) => sum + p.publishedCount, 0);
  const totalViral = platformStats.reduce((sum, p) => sum + p.viralCount, 0);

  const sampleSeries = [
    { created: 16, published: 13, viral: 4 },
    { created: 20, published: 17, viral: 5 },
    { created: 18, published: 15, viral: 4 },
    { created: 25, published: 21, viral: 7 },
    { created: 22, published: 18, viral: 6 },
    { created: 27, published: 23, viral: 8 },
    { created: 24, published: 19, viral: 6 },
  ];

  const dailyTrend: DailyTrendPoint[] = today
    ? sampleSeries.map((pt, idx) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - idx));
        return {
          dateLabel: formatShortDate(d),
          createdCount: pt.created,
          publishedCount: pt.published,
          viralCount: pt.viral,
        };
      })
    : [];

  return {
    totalCreated,
    totalPublished,
    totalViral,
    publishRate: Math.round((totalPublished / totalCreated) * 100),
    viralRate: Math.round((totalViral / totalCreated) * 100),
    activePlatformsCount: 4,
    topPlatformName: "抖音",
    platformStats,
    dailyTrend,
  };
}

export function computeOverviewStats(
  history: CopywritingResult[],
  today: Date | null
): OverviewStats {
  const totalCreated = history.length;
  const totalPublished = history.filter((item) => item.isPublished).length;
  const totalViral = history.filter((item) => item.isViral).length;

  const publishRate =
    totalCreated > 0 ? Math.round((totalPublished / totalCreated) * 100) : 0;
  const viralRate =
    totalCreated > 0 ? Math.round((totalViral / totalCreated) * 100) : 0;

  // Use published count as primary share denominator when any item is published;
  // otherwise fall back to created count so platform distribution stays informative.
  const shareDenominator = totalPublished > 0 ? totalPublished : totalCreated;

  const platformStats: PlatformStat[] = PLATFORM_ORDER.map((id) => {
    const items = history.filter((item) => item.platform === id);
    const createdCount = items.length;
    const publishedCount = items.filter((item) => item.isPublished).length;
    const viralCount = items.filter((item) => item.isViral).length;
    const numerator = totalPublished > 0 ? publishedCount : createdCount;
    const sharePercent =
      shareDenominator > 0 ? Math.round((numerator / shareDenominator) * 100) : 0;

    return {
      id,
      name: PLATFORMS[id].name,
      accentColor: PLATFORMS[id].accentColor,
      createdCount,
      publishedCount,
      viralCount,
      sharePercent,
    };
  });

  const activePlatformsCount = platformStats.filter((p) =>
    totalPublished > 0 ? p.publishedCount > 0 : p.createdCount > 0
  ).length;

  const sortedByMain = [...platformStats].sort((a, b) =>
    totalPublished > 0
      ? b.publishedCount - a.publishedCount
      : b.createdCount - a.createdCount
  );
  const topPlatformName =
    sortedByMain[0] &&
    (totalPublished > 0
      ? sortedByMain[0].publishedCount > 0
      : sortedByMain[0].createdCount > 0)
      ? sortedByMain[0].name
      : "暂无";

  const dailyTrend: DailyTrendPoint[] = today
    ? Array.from({ length: 7 }, (_, idx) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - idx));
        const dateKey = d.toISOString().slice(0, 10);

        const createdCount = history.filter(
          (item) => item.createdAt.slice(0, 10) === dateKey
        ).length;
        const publishedCount = history.filter(
          (item) =>
            item.isPublished &&
            (item.publishedAt ?? item.createdAt).slice(0, 10) === dateKey
        ).length;
        const viralCount = history.filter(
          (item) => item.isViral && item.createdAt.slice(0, 10) === dateKey
        ).length;

        return {
          dateLabel: formatShortDate(d),
          createdCount,
          publishedCount,
          viralCount,
        };
      })
    : [];

  return {
    totalCreated,
    totalPublished,
    totalViral,
    publishRate,
    viralRate,
    activePlatformsCount,
    topPlatformName,
    platformStats,
    dailyTrend,
  };
}
