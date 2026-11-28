import { NextResponse } from "next/server";
import { callTextModel } from "@/lib/ai/model-client";
import {
  buildTrafficSnapshot,
  generateLocalTrafficInsight,
  type TrafficRecordSummary,
} from "@/lib/analytics-insight";
import type { PlatformId } from "@/lib/platforms";
import type { ModelConfigPayload } from "@/lib/skills/types";

interface RequestPayload {
  prompt?: string;
  records?: TrafficRecordSummary[];
  modelConfig?: ModelConfigPayload;
}

const VALID_PLATFORMS = new Set<PlatformId>(["douyin", "toutiao", "xiaohongshu", "wechat"]);

function sanitizeRecords(raw: unknown): TrafficRecordSummary[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .slice(0, 60)
    .map((item) => {
      const platform = VALID_PLATFORMS.has(item.platform as PlatformId)
        ? (item.platform as PlatformId)
        : "douyin";
      const toSafeInt = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
      };
      return {
        title: String(item.title ?? "").slice(0, 160),
        platform,
        publishedAt: typeof item.publishedAt === "string" ? item.publishedAt.slice(0, 32) : undefined,
        views: toSafeInt(item.views),
        likes: toSafeInt(item.likes),
        comments: toSafeInt(item.comments),
        shares: toSafeInt(item.shares),
        conversions: typeof item.conversions === "string" ? item.conversions.slice(0, 120) : undefined,
        notes: typeof item.notes === "string" ? item.notes.slice(0, 200) : undefined,
      };
    })
    .filter((item) => item.title.length > 0);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestPayload;
    const prompt = (body.prompt ?? "").trim() || "请对当前已同步的作品流量数据进行整体复盘并给出可执行优化建议。";
    const records = sanitizeRecords(body.records);
    const snapshot = buildTrafficSnapshot(records);
    const modelConfig = body.modelConfig;

    const apiKey =
      modelConfig?.apiKey?.trim() ||
      process.env.DEEPSEEK_API_KEY ||
      process.env.TEXT_API_KEY ||
      process.env.OPENAI_API_KEY ||
      "";

    const baseUrl = (
      modelConfig?.baseUrl?.trim() ||
      process.env.DEEPSEEK_BASE_URL ||
      process.env.TEXT_BASE_URL ||
      "https://api.deepseek.com/v1"
    ).replace(/\/+$/, "");

    const model =
      modelConfig?.textModel?.trim() || process.env.DEEPSEEK_MODEL || "deepseek-chat";

    if (!apiKey) {
      return NextResponse.json({
        content: generateLocalTrafficInsight(snapshot, prompt),
        mode: "local" as const,
        model,
        fallbackReason: "未配置文本大模型 API Key，已自动切换为本地结构化分析。",
      });
    }

    const systemPrompt = `你是一位资深新媒体运营与公益传播数据分析师。
请严格基于用户提供的真实作品流量快照回答问题，并遵守以下要求：
1. 严禁编造数据中不存在的播放量、点赞数、转化数字或作品标题。
2. 输出结构清晰、克制务实，直接给结论、数据归因与可执行动作，不使用 emoji 表情符号。
3. 使用纯文本分点排版（如 一、二、三 与 1. 2. 3.），不要输出多余的客套话。`;

    const userPrompt = `用户分析需求：${prompt}

机构当前已同步的作品流量快照（共 ${snapshot.totalWorks} 篇）：
${JSON.stringify(snapshot, null, 2)}

请结合以上真实数据给出专业、具体、可直接落地的分析与建议。`;

    try {
      const result = await callTextModel({
        apiKey,
        baseUrl,
        port: modelConfig?.port,
        endpointPath: modelConfig?.endpointPath,
        apiFormat: modelConfig?.apiFormat,
        model,
        systemPrompt,
        userPrompt,
        temperature: 0.5,
        timeoutMs: 45000,
      });

      const content = result.text.trim();
      if (!content) {
        return NextResponse.json({
          content: generateLocalTrafficInsight(snapshot, prompt),
          mode: "local" as const,
          model,
          fallbackReason: "云端模型返回空内容，已自动降级为本地分析。",
        });
      }

      return NextResponse.json({
        content,
        mode: "ai" as const,
        model,
        latencyMs: result.latencyMs,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "云端模型调用失败";
      return NextResponse.json({
        content: generateLocalTrafficInsight(snapshot, prompt),
        mode: "local" as const,
        model,
        fallbackReason: `${reason}，已自动降级为本地分析。`,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json({ error: `流量分析请求失败: ${message}` }, { status: 500 });
  }
}
