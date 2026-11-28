import { PLATFORMS, type CopywritingResult, type PlatformId } from "./platforms";
import type { ActivityArchive, OrganizationProfile } from "./organization";

export type MonthlyReportFocus = "internal" | "donor";

export interface MonthlyPlatformSummary {
  platform: PlatformId;
  platformName: string;
  createdCount: number;
  publishedCount: number;
  archivedCount: number;
  viralCount: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface MonthlyArticleDigest {
  id: string;
  title: string;
  platformName: string;
  activityTitle?: string;
  isPublished: boolean;
  isArchived: boolean;
  isViral: boolean;
  publishedUrl?: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  conversions?: string;
  notes?: string;
}

export interface MonthlyReportSnapshot {
  month: string; // YYYY-MM
  createdCount: number;
  reviewApprovedCount: number;
  publishedCount: number;
  archivedCount: number;
  viralCount: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  activitiesCount: number;
  platformBreakdown: MonthlyPlatformSummary[];
  topArticles: MonthlyArticleDigest[];
  activities: ActivityArchive[];
}

export interface SavedMonthlyReport {
  id: string;
  month: string;
  focus: MonthlyReportFocus;
  title: string;
  summary: string;
  body: string;
  mode: "ai" | "local";
  createdAt: string;
  updatedAt: string;
  snapshot: MonthlyReportSnapshot;
}

const PLATFORM_ORDER: PlatformId[] = ["douyin", "toutiao", "xiaohongshu", "wechat"];

function getItemMonth(item: CopywritingResult): string {
  const refDate = item.publishArchive?.publishedAt ?? item.publishedAt ?? item.createdAt;
  return refDate.slice(0, 7);
}

export function buildMonthlySnapshot(
  month: string,
  history: CopywritingResult[],
  activities: ActivityArchive[],
): MonthlyReportSnapshot {
  const monthItems = history.filter((item) => getItemMonth(item) === month);
  const monthActivities = activities.filter(
    (act) => act.date.slice(0, 7) === month || act.createdAt.slice(0, 7) === month,
  );

  const platformBreakdown: MonthlyPlatformSummary[] = PLATFORM_ORDER.map((pid) => {
    const items = monthItems.filter((item) => item.platform === pid);
    return {
      platform: pid,
      platformName: PLATFORMS[pid].name,
      createdCount: items.length,
      publishedCount: items.filter((i) => i.isPublished).length,
      archivedCount: items.filter((i) => i.publishArchive?.archived).length,
      viralCount: items.filter((i) => i.isViral).length,
      views: items.reduce((sum, i) => sum + (i.publishArchive?.metrics.views ?? 0), 0),
      likes: items.reduce((sum, i) => sum + (i.publishArchive?.metrics.likes ?? 0), 0),
      comments: items.reduce((sum, i) => sum + (i.publishArchive?.metrics.comments ?? 0), 0),
      shares: items.reduce((sum, i) => sum + (i.publishArchive?.metrics.shares ?? 0), 0),
    };
  });

  const digests: MonthlyArticleDigest[] = monthItems
    .map((item) => ({
      id: item.id,
      title: item.titles[0] || item.topic,
      platformName: PLATFORMS[item.platform].name,
      activityTitle: item.activityTitle,
      isPublished: Boolean(item.isPublished),
      isArchived: Boolean(item.publishArchive?.archived),
      isViral: Boolean(item.isViral),
      publishedUrl: item.publishArchive?.publishedUrl,
      views: item.publishArchive?.metrics.views ?? 0,
      likes: item.publishArchive?.metrics.likes ?? 0,
      comments: item.publishArchive?.metrics.comments ?? 0,
      shares: item.publishArchive?.metrics.shares ?? 0,
      conversions: item.publishArchive?.metrics.conversions,
      notes: item.publishArchive?.notes,
    }))
    .sort((a, b) => {
      const scoreA = (a.isViral ? 100000 : 0) + a.views + a.likes * 10;
      const scoreB = (b.isViral ? 100000 : 0) + b.views + b.likes * 10;
      return scoreB - scoreA;
    });

  return {
    month,
    createdCount: monthItems.length,
    reviewApprovedCount: monthItems.filter((i) => i.reviewState?.approvedAt).length,
    publishedCount: monthItems.filter((i) => i.isPublished).length,
    archivedCount: monthItems.filter((i) => i.publishArchive?.archived).length,
    viralCount: monthItems.filter((i) => i.isViral).length,
    totalViews: platformBreakdown.reduce((s, p) => s + p.views, 0),
    totalLikes: platformBreakdown.reduce((s, p) => s + p.likes, 0),
    totalComments: platformBreakdown.reduce((s, p) => s + p.comments, 0),
    totalShares: platformBreakdown.reduce((s, p) => s + p.shares, 0),
    activitiesCount: monthActivities.length,
    platformBreakdown,
    topArticles: digests.slice(0, 6),
    activities: monthActivities,
  };
}

export function generateLocalMonthlyReport(params: {
  orgProfile: OrganizationProfile;
  snapshot: MonthlyReportSnapshot;
  focus: MonthlyReportFocus;
}): { title: string; summary: string; body: string } {
  const { orgProfile, snapshot, focus } = params;
  const [year, mon] = snapshot.month.split("-");
  const monthLabel = `${year}年${Number(mon)}月`;
  const focusLabel = focus === "donor" ? "对外传播与公益进展月报" : "新媒体运营复盘月报";
  const title = `${orgProfile.name} ${monthLabel}${focusLabel}`;

  const topPlatform = [...snapshot.platformBreakdown].sort(
    (a, b) => b.views + b.publishedCount * 500 - (a.views + a.publishedCount * 500),
  )[0];

  const summary =
    snapshot.createdCount > 0 || snapshot.activitiesCount > 0
      ? `本月围绕 ${snapshot.activitiesCount} 项公益活动档案，累计创作内容 ${snapshot.createdCount} 篇，其中 ${snapshot.reviewApprovedCount} 篇通过发布前合规审查，已发布 ${snapshot.publishedCount} 篇、完成数据归档 ${snapshot.archivedCount} 篇；累计回填播放/阅读 ${snapshot.totalViews.toLocaleString("zh-CN")} 次、互动点赞 ${snapshot.totalLikes.toLocaleString("zh-CN")} 次。`
      : `${monthLabel}暂未归档完整稿件数据，以下报告框架已结合机构档案自动生成，可在回填发布数据后重新一键刷新。`;

  const sections: string[] = [
    `一、本月核心数据概览`,
    `- 机构主体：${orgProfile.name}`,
    `- 建档公益活动：${snapshot.activitiesCount} 项`,
    `- 内容产出与合规：累计创作 ${snapshot.createdCount} 篇，通过发布前审查 ${snapshot.reviewApprovedCount} 篇，已发布 ${snapshot.publishedCount} 篇，归档 ${snapshot.archivedCount} 篇，爆款标记 ${snapshot.viralCount} 篇`,
    `- 传播与互动汇总：累计播放/阅读 ${snapshot.totalViews.toLocaleString("zh-CN")} 次，点赞 ${snapshot.totalLikes.toLocaleString("zh-CN")} 次，评论 ${snapshot.totalComments.toLocaleString("zh-CN")} 条，转发/收藏 ${snapshot.totalShares.toLocaleString("zh-CN")} 次`,
    ``,
    `二、各渠道表现对比`,
    ...snapshot.platformBreakdown.map(
      (p) =>
        `- ${p.platformName}：创作 ${p.createdCount} 篇 / 发布 ${p.publishedCount} 篇 / 归档 ${p.archivedCount} 篇，回填播放/阅读 ${p.views.toLocaleString("zh-CN")}，点赞 ${p.likes.toLocaleString("zh-CN")}，转发 ${p.shares.toLocaleString("zh-CN")}`,
    ),
    topPlatform && (topPlatform.createdCount > 0 || topPlatform.views > 0)
      ? `综合来看，本月主力传播渠道为「${topPlatform.platformName}」，建议下月继续保持该渠道的高频真实故事更新，并同步将优质素材二次改编至其余平台。`
      : `当前各平台尚处于内容沉淀阶段，建议下月优先聚焦 1-2 个核心渠道建立稳定周更节奏。`,
    ``,
    `三、重点公益活动传播覆盖`,
    ...(snapshot.activities.length > 0
      ? snapshot.activities.map(
          (act, idx) =>
            `${idx + 1}. 【${act.title}】（${act.date || "日期待补"} · ${act.location || "项目现场"}）\n   参与/受益情况：${act.participantCount || "待补充"}；善款/物资：${act.fundOrGoods || "待补充"}。\n   亮点摘要：${act.highlights || "已建档留存。"}`,
        )
      : [
          `本月暂未在「机构中心」新增对应月份的活动档案，建议将每次线下行动及时建档，便于下月自动生成完整活动传播总结。`,
        ]),
    ``,
    `四、代表稿件与复盘亮点`,
    ...(snapshot.topArticles.length > 0
      ? snapshot.topArticles.map(
          (art, idx) =>
            `${idx + 1}. [${art.platformName}] ${art.title}${art.isViral ? "（爆款）" : ""}\n   数据表现：播放/阅读 ${art.views.toLocaleString("zh-CN")}｜点赞 ${art.likes.toLocaleString("zh-CN")}｜评论 ${art.comments.toLocaleString("zh-CN")}｜转发 ${art.shares.toLocaleString("zh-CN")}${art.conversions ? `｜转化：${art.conversions}` : ""}${art.notes ? `\n   复盘备注：${art.notes}` : ""}`,
        )
      : [`本月暂无已回填数据的重点稿件，建议发布后及时在「创作记录」中回填链接与核心指标。`]),
    ``,
    focus === "donor"
      ? `五、下月公益行动与公开透明计划\n1. 持续坚持“先脱敏、再审查、后发布”的公益传播规范，保护受助人隐私与尊严。\n2. 针对本月重点项目开展回访记录，将善款与物资落地进展以图文形式透明呈现给每一位支持者。\n3. 拓宽志愿者与普通公众的轻量参与通道，让更多微光汇聚成可持续的社区支持网络。`
      : `五、下月选题与运营优化建议\n1. 活动前移建档：在每次活动筹备阶段即在「机构中心」建档，现场素材回收后 24 小时内完成图文成稿与脱敏审查。\n2. 放大高互动模板：复用本月表现突出的前 3 秒钩子与真实人物叙事结构，强化评论区开放式提问以撬动自然推流。\n3. 完善数据闭环：养成发布 48 小时后回填链接与播放/转化数据的习惯，持续沉淀机构内容资产。`,
  ];

  return {
    title,
    summary,
    body: sections.join("\n"),
  };
}
