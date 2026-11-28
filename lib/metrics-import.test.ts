import { describe, expect, it } from "vitest";
import {
  buildMetricsImportTemplateCsv,
  matchRowsToHistory,
  mergePublishArchiveRecord,
  parseDelimitedTable,
  parseMetricCount,
  parseMetricsCsv,
  parsePublishedDate,
} from "@/lib/metrics-import";
import type { CopywritingResult } from "@/lib/platforms";

function makeHistoryItem(overrides: Partial<CopywritingResult> = {}): CopywritingResult {
  return {
    id: "hist-1",
    platform: "douyin",
    contentType: "story",
    tone: "warm",
    topic: "暖冬图书角：把1000本绘本送进山区教室",
    titles: ["暖冬图书角：把1000本绘本送进山区教室"],
    hook: "开场钩子",
    body: "正文内容",
    tags: ["公益"],
    cta: "欢迎关注",
    tips: [],
    mode: "local",
    createdAt: "2026-11-18T08:00:00.000Z",
    ...overrides,
  };
}

describe("parseDelimitedTable", () => {
  it("parses RFC 4180 CSV with quoted commas, escaped quotes, and UTF-8 BOM", () => {
    const csv = '\uFEFF作品标题,播放量,备注\n"暖冬,图书角""特辑""",12500,"第一行备注"\n';
    expect(parseDelimitedTable(csv)).toEqual([
      ["作品标题", "播放量", "备注"],
      ['暖冬,图书角"特辑"', "12500", "第一行备注"],
    ]);
  });

  it("auto-detects tab-separated pasted spreadsheet rows", () => {
    const tsv = "作品标题\t播放量\t点赞数\n社区助老义诊回顾\t9420\t318";
    expect(parseDelimitedTable(tsv)).toEqual([
      ["作品标题", "播放量", "点赞数"],
      ["社区助老义诊回顾", "9420", "318"],
    ]);
  });
});

describe("parseMetricCount & parsePublishedDate", () => {
  it("parses formatted Chinese and English metric counts", () => {
    expect(parseMetricCount("12,500")).toBe(12500);
    expect(parseMetricCount("1.2万")).toBe(12000);
    expect(parseMetricCount("3.5w")).toBe(35000);
    expect(parseMetricCount("2.4千")).toBe(2400);
    expect(parseMetricCount("580次")).toBe(580);
    expect(parseMetricCount("--")).toBeUndefined();
    expect(parseMetricCount("")).toBeUndefined();
  });

  it("parses common date formats into ISO strings", () => {
    expect(parsePublishedDate("2026-11-20")?.startsWith("2026-11-20")).toBe(true);
    expect(parsePublishedDate("2026年11月20日")?.startsWith("2026-11-20")).toBe(true);
    expect(parsePublishedDate("2026/11/20 14:30")).toBeDefined();
    expect(parsePublishedDate("invalid-date")).toBeUndefined();
  });
});

describe("parseMetricsCsv", () => {
  it("parses multi-platform columns, sanitizes unsafe URLs, and falls back to default platform", () => {
    const csv = [
      "视频标题,发布平台,发布日期,播放量,点赞数,评论数,分享数,作品链接",
      "暖冬图书角,抖音,2026-11-18,1.8万,1240,96,215,https://www.douyin.com/video/123",
      "社区助老义诊,,2026-11-20,9420,318,42,87,javascript:alert(1)",
    ].join("\n");

    const result = parseMetricsCsv(csv, "toutiao");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      title: "暖冬图书角",
      platform: "douyin",
      publishedUrl: "https://www.douyin.com/video/123",
      metrics: { views: 18000, likes: 1240, comments: 96, shares: 215 },
    });
    expect(result.rows[1]).toMatchObject({
      title: "社区助老义诊",
      platform: "toutiao",
      publishedUrl: undefined,
      metrics: { views: 9420, likes: 318, comments: 42, shares: 87 },
    });
    expect(result.warnings.some((w) => w.includes("发布链接格式无效"))).toBe(true);
  });

  it("round-trips the downloadable standard template cleanly", () => {
    const template = buildMetricsImportTemplateCsv();
    const parsed = parseMetricsCsv(template, "douyin");
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.warnings).toEqual([]);
    expect(parsed.rows[0].platform).toBe("douyin");
    expect(parsed.rows[1].platform).toBe("toutiao");
  });
});

describe("matchRowsToHistory & mergePublishArchiveRecord", () => {
  it("matches by URL first, then exact/similar title, and marks unmatched rows", () => {
    const history: CopywritingResult[] = [
      makeHistoryItem({
        id: "dy-1",
        platform: "douyin",
        titles: ["暖冬图书角：把1000本绘本送进山区教室"],
        publishArchive: {
          publishedUrl: "https://www.douyin.com/video/999",
          metrics: {},
          archived: false,
        },
      }),
      makeHistoryItem({
        id: "tt-1",
        platform: "toutiao",
        topic: "社区助老义诊活动回顾：3天服务260位长者",
        titles: ["社区助老义诊活动回顾：3天服务260位长者"],
      }),
    ];

    const parsed = parseMetricsCsv(
      [
        "作品标题,平台,播放量,发布链接",
        "改过的新标题,抖音,21000,https://douyin.com/video/999/",
        "社区助老义诊活动回顾 3天服务260位长者,今日头条,8800,",
        "完全独立的新外部作品,小红书,3200,",
      ].join("\n"),
      "douyin",
    );

    const matched = matchRowsToHistory(parsed.rows, history);
    expect(matched[0].matchedHistoryId).toBe("dy-1");
    expect(matched[0].matchReason).toBe("url");
    expect(matched[1].matchedHistoryId).toBe("tt-1");
    expect(matched[1].matchReason).toBe("title-exact");
    expect(matched[2].matchedHistoryId).toBeNull();
    expect(matched[2].matchReason).toBe("unmatched");
  });

  it("preserves existing manual notes and URL when incoming row omits them", () => {
    const merged = mergePublishArchiveRecord(
      {
        publishedUrl: "https://www.douyin.com/video/123",
        publishedAt: "2026-11-18T12:00:00.000Z",
        metrics: { views: 1000, conversions: "新增志愿者 3 人" },
        archived: false,
        notes: "原复盘备注",
      },
      {
        targetHistoryId: "dy-1",
        platform: "douyin",
        title: "暖冬图书角",
        metrics: { views: 18600, likes: 1240 },
        archived: true,
      },
      "2026-11-28T09:00:00.000Z",
    );

    expect(merged.publishedUrl).toBe("https://www.douyin.com/video/123");
    expect(merged.notes).toBe("原复盘备注");
    expect(merged.metrics).toEqual({
      views: 18600,
      likes: 1240,
      comments: undefined,
      shares: undefined,
      conversions: "新增志愿者 3 人",
    });
    expect(merged.archived).toBe(true);
    expect(merged.archivedAt).toBe("2026-11-28T09:00:00.000Z");
  });
});
