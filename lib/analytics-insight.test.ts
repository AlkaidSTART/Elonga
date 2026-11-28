import { describe, expect, it } from "vitest";
import {
  buildTrafficSnapshot,
  generateLocalTrafficInsight,
  type TrafficRecordSummary,
} from "@/lib/analytics-insight";

describe("buildTrafficSnapshot", () => {
  it("computes totals, platform breakdown, and top works accurately", () => {
    const records: TrafficRecordSummary[] = [
      {
        title: "暖冬图书角公益记录",
        platform: "douyin",
        views: 20000,
        likes: 1000,
        comments: 100,
        shares: 200,
      },
      {
        title: "社区助老义诊活动回顾",
        platform: "toutiao",
        views: 10000,
        likes: 300,
        comments: 50,
        shares: 50,
      },
      {
        title: "志愿者招募图文",
        platform: "douyin",
        views: 5000,
        likes: 200,
        comments: 20,
        shares: 30,
      },
    ];

    const snapshot = buildTrafficSnapshot(records);
    expect(snapshot.totalWorks).toBe(3);
    expect(snapshot.totalViews).toBe(35000);
    expect(snapshot.totalInteractions).toBe(1950);
    expect(snapshot.overallInteractionRate).toBe(5.57);
    expect(snapshot.platformStats[0]).toMatchObject({
      platform: "douyin",
      count: 2,
      views: 25000,
    });
    expect(snapshot.topWorks[0].title).toBe("暖冬图书角公益记录");
  });

  it("handles empty records gracefully", () => {
    const snapshot = buildTrafficSnapshot([]);
    expect(snapshot.totalWorks).toBe(0);
    expect(snapshot.overallInteractionRate).toBe(0);
    expect(generateLocalTrafficInsight(snapshot, "复盘")).toContain("暂无");
  });
});

describe("generateLocalTrafficInsight", () => {
  it("includes platform metrics and top work in local fallback analysis", () => {
    const snapshot = buildTrafficSnapshot([
      {
        title: "暖冬图书角公益记录",
        platform: "douyin",
        views: 18600,
        likes: 1240,
        comments: 96,
        shares: 215,
      },
    ]);

    const output = generateLocalTrafficInsight(snapshot, "头部作品归因");
    expect(output).toContain("头部作品归因");
    expect(output).toContain("抖音");
    expect(output).toContain("暖冬图书角公益记录");
    expect(output).toContain("18,600");
  });
});
