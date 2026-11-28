import { describe, expect, it } from "vitest";
import {
  buildMonthlySnapshot,
  formatReportPlainText,
  generateLocalMonthlyReport,
  resolveActiveMonthlyReport,
  type SavedMonthlyReport,
} from "@/lib/monthly-report";
import type { ActivityArchive, OrganizationProfile } from "@/lib/organization";
import type { CopywritingResult } from "@/lib/platforms";

const mockOrg: OrganizationProfile = {
  name: "微光公益中心",
  mission: "助力乡村儿童阅读与陪伴",
  defaultTone: "warm",
  defaultSignOff: "微光公益传播组",
  complianceRedlines: "严禁暴露未成年人隐私",
  updatedAt: "2026-11-01T00:00:00.000Z",
};

const mockActivities: ActivityArchive[] = [
  {
    id: "act_1",
    title: "暖冬图书角回访行动",
    date: "2026-11-12",
    location: "贵州黔东南",
    category: "activity",
    participantCount: "120 名学生",
    fundOrGoods: "绘本 400 册",
    highlights: "新增 3 个班级共读角",
    notes: "已完成脱敏确认",
    status: "completed",
    createdAt: "2026-11-12T08:00:00.000Z",
    updatedAt: "2026-11-12T08:00:00.000Z",
  },
  {
    id: "act_2",
    title: "十月社区义诊",
    date: "2026-10-15",
    location: "社区广场",
    category: "activity",
    participantCount: "80 人",
    fundOrGoods: "基础体检包",
    highlights: "完成血压血糖筛查",
    notes: "已归档",
    status: "completed",
    createdAt: "2026-10-15T08:00:00.000Z",
    updatedAt: "2026-10-15T08:00:00.000Z",
  },
];

const mockHistory: CopywritingResult[] = [
  {
    id: "cw_1",
    platform: "douyin",
    contentType: "story",
    tone: "warm",
    topic: "暖冬图书角",
    titles: ["400 册绘本送达山村小学"],
    hook: "当孩子们翻开新绘本的那一刻",
    body: "活动正文",
    tags: ["公益"],
    cta: "欢迎留言支持",
    tips: [],
    mode: "local",
    createdAt: "2026-11-13T10:00:00.000Z",
    isPublished: true,
    isViral: true,
    reviewState: {
      waivedRiskIds: [],
      confirmedFactKeys: [],
      approvedAt: "2026-11-13T09:30:00.000Z",
    },
    publishArchive: {
      archived: true,
      publishedAt: "2026-11-13T12:00:00.000Z",
      metrics: {
        views: 12000,
        likes: 650,
        comments: 42,
        shares: 88,
      },
    },
  },
  {
    id: "cw_2",
    platform: "wechat",
    contentType: "activity",
    tone: "warm",
    topic: "十月义诊总结",
    titles: ["十月社区义诊温暖回顾"],
    hook: "秋风里的义诊桌",
    body: "十月活动正文",
    tags: ["公益"],
    cta: "欢迎转发",
    tips: [],
    mode: "local",
    createdAt: "2026-10-18T10:00:00.000Z",
    isPublished: true,
    publishArchive: {
      archived: true,
      publishedAt: "2026-10-18T12:00:00.000Z",
      metrics: {
        views: 3000,
        likes: 120,
        comments: 10,
        shares: 25,
      },
    },
  },
];

function createSavedReport(
  overrides: Partial<SavedMonthlyReport> & Pick<SavedMonthlyReport, "id" | "month">,
): SavedMonthlyReport {
  const snapshot = buildMonthlySnapshot(overrides.month, mockHistory, mockActivities);
  return {
    focus: "internal",
    title: `${overrides.month} 月报`,
    summary: "核心摘要内容",
    body: "正文内容",
    mode: "local",
    createdAt: "2026-11-20T10:00:00.000Z",
    updatedAt: "2026-11-20T10:00:00.000Z",
    snapshot,
    ...overrides,
  };
}

describe("monthly-report helpers", () => {
  it("builds monthly snapshot filtered strictly by target month", () => {
    const snapshot = buildMonthlySnapshot("2026-11", mockHistory, mockActivities);
    expect(snapshot.activitiesCount).toBe(1);
    expect(snapshot.createdCount).toBe(1);
    expect(snapshot.publishedCount).toBe(1);
    expect(snapshot.archivedCount).toBe(1);
    expect(snapshot.reviewApprovedCount).toBe(1);
    expect(snapshot.viralCount).toBe(1);
    expect(snapshot.totalViews).toBe(12000);
    expect(snapshot.totalLikes).toBe(650);
    expect(snapshot.totalComments).toBe(42);
    expect(snapshot.totalShares).toBe(88);
    expect(snapshot.topArticles[0]?.title).toBe("400 册绘本送达山村小学");
  });

  it("generates local monthly report for internal and donor focuses", () => {
    const snapshot = buildMonthlySnapshot("2026-11", mockHistory, mockActivities);
    const internalReport = generateLocalMonthlyReport({
      orgProfile: mockOrg,
      snapshot,
      focus: "internal",
    });
    const donorReport = generateLocalMonthlyReport({
      orgProfile: mockOrg,
      snapshot,
      focus: "donor",
    });

    expect(internalReport.title).toContain("新媒体运营复盘月报");
    expect(internalReport.body).toContain("下月选题与运营优化建议");
    expect(donorReport.title).toContain("对外传播与公益进展月报");
    expect(donorReport.body).toContain("下月公益行动与公开透明计划");
  });

  it("resolves active report by explicit id, then selected month, then newest fallback", () => {
    const novReport = createSavedReport({ id: "rep_nov", month: "2026-11" });
    const octReport = createSavedReport({ id: "rep_oct", month: "2026-10" });
    const reports = [novReport, octReport];

    expect(resolveActiveMonthlyReport(reports, "rep_oct", "2026-11")?.id).toBe("rep_oct");
    expect(resolveActiveMonthlyReport(reports, null, "2026-10")?.id).toBe("rep_oct");
    expect(resolveActiveMonthlyReport(reports, "nonexistent", "2026-09")?.id).toBe("rep_nov");
    expect(resolveActiveMonthlyReport([], null, "2026-11")).toBeNull();
  });

  it("formats report plain text for clipboard copy", () => {
    const formatted = formatReportPlainText({
      title: "微光公益 2026年11月报",
      summary: "本月共完成 1 项活动。",
      body: "一、数据概览",
    });

    expect(formatted).toBe("微光公益 2026年11月报\n\n【核心摘要】\n本月共完成 1 项活动。\n\n一、数据概览");
  });
});
