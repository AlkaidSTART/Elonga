import { NextResponse } from "next/server";
import {
  generateLocalMonthlyReport,
  type MonthlyReportFocus,
  type MonthlyReportSnapshot,
} from "@/lib/monthly-report";
import type { OrganizationProfile } from "@/lib/organization";
import type { ModelConfigPayload } from "@/lib/skills/types";

interface RequestPayload {
  orgProfile: OrganizationProfile;
  snapshot: MonthlyReportSnapshot;
  focus?: MonthlyReportFocus;
  modelConfig?: ModelConfigPayload;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestPayload;
    const { orgProfile, snapshot, focus = "internal", modelConfig } = body;

    if (!snapshot?.month || !orgProfile?.name) {
      return NextResponse.json(
        { error: "缺少机构信息或月度汇总数据" },
        { status: 400 }
      );
    }

    const apiKey =
      modelConfig?.apiKey?.trim() ||
      process.env.DEEPSEEK_API_KEY ||
      process.env.TEXT_API_KEY ||
      process.env.OPENAI_API_KEY ||
      "";

    if (!apiKey) {
      const local = generateLocalMonthlyReport({ orgProfile, snapshot, focus });
      return NextResponse.json({ ...local, mode: "local" as const });
    }

    const baseUrl = (
      modelConfig?.baseUrl?.trim() ||
      process.env.DEEPSEEK_BASE_URL ||
      process.env.TEXT_BASE_URL ||
      "https://api.deepseek.com/v1"
    ).replace(/\/+$/, "");
    const model =
      modelConfig?.textModel?.trim() ||
      process.env.DEEPSEEK_MODEL ||
      "deepseek-chat";

    const focusDesc =
      focus === "donor"
        ? "面向资助方、理事会与公众的对外公益进展与传播月报（语气温和、透明、突出公益成果与社会价值）"
        : "面向机构内部新媒体与运营团队的复盘月报（语气务实、突出渠道数据对比、爆款归因与下月可执行优化建议）";

    const systemPrompt = `你是一位资深公益机构运营与传播顾问，擅长根据机构活动档案与新媒体归档数据撰写结构清晰、数据严谨、可直接用于汇报的月度总结报告。
请严格遵守以下规则：
1. 严格基于用户提供的真实统计数据、活动档案和稿件记录撰写，绝对禁止编造未提供的数字、金额或人数。
2. 全文禁止包含任何 emoji 表情符号。
3. 输出必须为合法 JSON 对象，字段如下：
{
  "title": "月报标题",
  "summary": "100-150字的核心摘要",
  "body": "完整月报正文（使用清晰的一、二、三、四、五章节结构，纯文本分段排版）"
}
4. 不要输出 Markdown 代码块标记，只返回纯 JSON 字符串。`;

    const userPrompt = `请为公益机构「${orgProfile.name}」撰写 ${snapshot.month} 的月报。
- 报告定位：${focusDesc}
- 机构使命：${orgProfile.mission}
- 本月汇总数据：
${JSON.stringify(
  {
    month: snapshot.month,
    createdCount: snapshot.createdCount,
    reviewApprovedCount: snapshot.reviewApprovedCount,
    publishedCount: snapshot.publishedCount,
    archivedCount: snapshot.archivedCount,
    viralCount: snapshot.viralCount,
    totalViews: snapshot.totalViews,
    totalLikes: snapshot.totalLikes,
    totalComments: snapshot.totalComments,
    totalShares: snapshot.totalShares,
    platformBreakdown: snapshot.platformBreakdown,
    activities: snapshot.activities.map((a) => ({
      title: a.title,
      date: a.date,
      location: a.location,
      participantCount: a.participantCount,
      fundOrGoods: a.fundOrGoods,
      highlights: a.highlights,
    })),
    topArticles: snapshot.topArticles,
  },
  null,
  2
)}

请生成结构完整、有洞察、可直接导出的月报。`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const local = generateLocalMonthlyReport({ orgProfile, snapshot, focus });
      return NextResponse.json({ ...local, mode: "local" as const });
    }

    const data = await response.json();
    const rawContent: string = data?.choices?.[0]?.message?.content ?? "";
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const local = generateLocalMonthlyReport({ orgProfile, snapshot, focus });
      return NextResponse.json({ ...local, mode: "local" as const });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      title: String(parsed.title || `${orgProfile.name} ${snapshot.month} 运营月报`),
      summary: String(parsed.summary || ""),
      body: String(parsed.body || ""),
      mode: "ai" as const,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { error: `生成月报失败: ${message}` },
      { status: 500 }
    );
  }
}
