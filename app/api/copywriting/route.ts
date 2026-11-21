import { NextResponse } from "next/server";
import type {
  ContentTypeId,
  PlatformId,
  ToneId,
  WordCountId,
} from "@/lib/platforms";
import { runCopywritingSkillsWorkflow } from "@/lib/skills";
import type { DouyinTrendInsights, ModelConfigPayload } from "@/lib/skills/types";

interface RequestPayload {
  platform: PlatformId;
  contentType?: ContentTypeId;
  tone?: ToneId;
  wordCount?: WordCountId;
  topic: string;
  keywords?: string;
  targetAudience?: string;
  trendInsights?: DouyinTrendInsights;
  modelConfig?: ModelConfigPayload;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestPayload;
    const {
      platform = "douyin",
      contentType = "story",
      tone = "warm",
      wordCount = "medium",
      topic,
      keywords,
      targetAudience,
      trendInsights,
      modelConfig,
    } = body;

    if (!topic || !topic.trim()) {
      return NextResponse.json(
        { error: "请输入文案主题或核心内容" },
        { status: 400 }
      );
    }

    const workflowOutput = await runCopywritingSkillsWorkflow({
      platform,
      contentType,
      tone,
      wordCount,
      topic,
      keywords,
      targetAudience,
      trendInsights,
      modelConfig,
    });

    return NextResponse.json({
      result: workflowOutput.result,
      trendInsights: workflowOutput.trendInsights,
      skillTraces: workflowOutput.skillTraces,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    const status = message.includes("大模型接口调用失败") || message.includes("格式异常")
      ? 502
      : 500;
    return NextResponse.json(
      { error: `生成文案时发生错误: ${message}` },
      { status }
    );
  }
}
