import { NextResponse } from "next/server";
import { douyinTrendResearchSkill } from "@/lib/skills";
import type { ModelConfigPayload } from "@/lib/skills/types";

interface TrendsRequestPayload {
  topic: string;
  keywords?: string;
  modelConfig?: ModelConfigPayload;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TrendsRequestPayload;
    const topic = body.topic?.trim();

    if (!topic) {
      return NextResponse.json(
        { error: "请先提供需要调研的公益主题" },
        { status: 400 }
      );
    }

    const start = Date.now();
    const insights = await douyinTrendResearchSkill.execute({
      topic,
      keywords: body.keywords,
      modelConfig: body.modelConfig,
    });

    return NextResponse.json({
      insights,
      trace: {
        skillId: douyinTrendResearchSkill.id,
        skillName: douyinTrendResearchSkill.name,
        status: "completed" as const,
        durationMs: Date.now() - start,
        summary: `已调研 ${insights.hotKeywords.length} 个抖音热词与 ${insights.viralHooks.length} 条爆款钩子`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { error: `抖音爆款调研失败: ${message}` },
      { status: 500 }
    );
  }
}
