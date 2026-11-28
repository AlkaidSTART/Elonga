import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/analytics-import/route";

describe("POST /api/analytics-import", () => {
  it("parses JSON pasted CSV/TSV payload with default platform fallback", async () => {
    const req = new Request("http://localhost:3000/api/analytics-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "作品标题\t播放量\t点赞数\n暖冬图书角公益记录\t1.5万\t820",
        defaultPlatform: "toutiao",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.rows).toHaveLength(1);
    expect(data.rows[0]).toMatchObject({
      title: "暖冬图书角公益记录",
      platform: "toutiao",
      metrics: { views: 15000, likes: 820 },
    });
  });

  it("parses multipart/form-data CSV file upload", async () => {
    const formData = new FormData();
    const csvContent = "作品标题,平台,播放量,点赞数\n社区助老义诊回顾,抖音,9800,410";
    formData.append("file", new File([csvContent], "report.csv", { type: "text/csv" }));
    formData.append("defaultPlatform", "douyin");

    const req = new Request("http://localhost:3000/api/analytics-import", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.rows).toHaveLength(1);
    expect(data.rows[0]).toMatchObject({
      title: "社区助老义诊回顾",
      platform: "douyin",
      metrics: { views: 9800, likes: 410 },
    });
  });

  it("returns 400 when text payload is empty", async () => {
    const req = new Request("http://localhost:3000/api/analytics-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "   " }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
