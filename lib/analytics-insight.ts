import { PLATFORMS, type PlatformId } from "./platforms";

export interface TrafficRecordSummary {
  title: string;
  platform: PlatformId;
  publishedAt?: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  conversions?: string;
  notes?: string;
}

export interface PlatformTrafficStat {
  platform: PlatformId;
  platformName: string;
  count: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  interactionRate: number;
}

export interface TrafficSnapshot {
  totalWorks: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalInteractions: number;
  overallInteractionRate: number;
  platformStats: PlatformTrafficStat[];
  topWorks: TrafficRecordSummary[];
}

export function buildTrafficSnapshot(records: TrafficRecordSummary[]): TrafficSnapshot {
  let totalViews = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;

  const byPlatform = new Map<
    PlatformId,
    { count: number; views: number; likes: number; comments: number; shares: number }
  >();

  for (const item of records) {
    totalViews += item.views;
    totalLikes += item.likes;
    totalComments += item.comments;
    totalShares += item.shares;

    const prev = byPlatform.get(item.platform) ?? {
      count: 0,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
    };
    byPlatform.set(item.platform, {
      count: prev.count + 1,
      views: prev.views + item.views,
      likes: prev.likes + item.likes,
      comments: prev.comments + item.comments,
      shares: prev.shares + item.shares,
    });
  }

  const totalInteractions = totalLikes + totalComments + totalShares;
  const overallInteractionRate =
    totalViews > 0 ? Number(((totalInteractions / totalViews) * 100).toFixed(2)) : 0;

  const platformStats: PlatformTrafficStat[] = Array.from(byPlatform.entries())
    .map(([platform, stat]) => {
      const interactions = stat.likes + stat.comments + stat.shares;
      return {
        platform,
        platformName: PLATFORMS[platform].name,
        count: stat.count,
        views: stat.views,
        likes: stat.likes,
        comments: stat.comments,
        shares: stat.shares,
        interactionRate:
          stat.views > 0 ? Number(((interactions / stat.views) * 100).toFixed(2)) : 0,
      };
    })
    .sort((a, b) => b.views - a.views);

  const topWorks = [...records]
    .sort((a, b) => {
      if (b.views !== a.views) return b.views - a.views;
      return b.likes + b.comments + b.shares - (a.likes + a.comments + a.shares);
    })
    .slice(0, 8);

  return {
    totalWorks: records.length,
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    totalInteractions,
    overallInteractionRate,
    platformStats,
    topWorks,
  };
}

export function generateLocalTrafficInsight(snapshot: TrafficSnapshot, prompt: string): string {
  if (snapshot.totalWorks === 0) {
    return [
      "当前尚无已同步的作品流量数据，暂无法生成量化分析。",
      "建议先在上方导入抖音、今日头条等创作者后台导出的 CSV 报表（或下载标准模板试跑），同步后再调用模型进行分析。",
    ].join("\n\n");
  }

  const leadingPlatform = snapshot.platformStats[0];
  const highestEngagementPlatform = [...snapshot.platformStats].sort(
    (a, b) => b.interactionRate - a.interactionRate,
  )[0];
  const topWork = snapshot.topWorks[0];

  const platformLines = snapshot.platformStats.map(
    (p) =>
      `- ${p.platformName}：${p.count} 篇作品，播放/阅读 ${p.views.toLocaleString("zh-CN")}，互动率 ${p.interactionRate.toFixed(2)}%（赞 ${p.likes.toLocaleString("zh-CN")} / 评 ${p.comments.toLocaleString("zh-CN")} / 转 ${p.shares.toLocaleString("zh-CN")}）`,
  );

  const sections = [
    `【分析主题】${prompt.trim() || "整体流量表现复盘"}`,
    [
      "一、整体表现概览",
      `本次共纳入 ${snapshot.totalWorks} 篇已同步作品，累计播放/阅读 ${snapshot.totalViews.toLocaleString("zh-CN")}，累计互动 ${snapshot.totalInteractions.toLocaleString("zh-CN")}（综合互动率 ${snapshot.overallInteractionRate.toFixed(2)}%）。`,
      leadingPlatform
        ? `当前流量主力渠道为「${leadingPlatform.platformName}」，贡献播放/阅读 ${leadingPlatform.views.toLocaleString("zh-CN")}；互动效率最高的渠道为「${highestEngagementPlatform.platformName}」（互动率 ${highestEngagementPlatform.interactionRate.toFixed(2)}%）。`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    ["二、分平台表现明细", ...platformLines].join("\n"),
    topWork
      ? [
          "三、头部作品观察",
          `表现最突出的作品为「${topWork.title}」（${PLATFORMS[topWork.platform].name}），播放/阅读 ${topWork.views.toLocaleString("zh-CN")}，点赞 ${topWork.likes.toLocaleString("zh-CN")}，评论 ${topWork.comments.toLocaleString("zh-CN")}，转发 ${topWork.shares.toLocaleString("zh-CN")}。`,
          "建议复盘该作品的标题结构、前 3 秒开场画面或核心公益故事切入点，在同类活动宣传中复用。",
        ].join("\n")
      : "",
    [
      "四、下一步可执行建议",
      snapshot.overallInteractionRate < 3
        ? "1. 当前综合互动率偏低，建议在正文末尾增加明确的开放式提问或志愿者/捐赠进展反馈，提升评论与转发意愿。"
        : "1. 当前整体互动表现稳健，可将头部作品的核心叙事拆解为系列短内容，持续放大长尾流量。",
      "2. 定期每周从各平台创作者后台导出一次 CSV 报表并同步至此页，形成连续的周度/月度趋势基线。",
      "3. 如需更深入的语义级标题拆解与选题建议，可在「模型配置」页面填写文本大模型 API Key 后重新调用云端模型。",
    ].join("\n"),
  ].filter(Boolean);

  return sections.join("\n\n");
}
