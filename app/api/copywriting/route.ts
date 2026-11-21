import { NextResponse } from "next/server";
import {
  CONTENT_TYPES,
  PLATFORMS,
  TONES,
  WORD_COUNTS,
  type ContentTypeId,
  type PlatformId,
  type ToneId,
  type WordCountId,
} from "@/lib/platforms";
import { generateLocalCopywriting } from "@/lib/copywriting-engine";

interface RequestPayload {
  platform: PlatformId;
  contentType: ContentTypeId;
  tone: ToneId;
  wordCount: WordCountId;
  topic: string;
  keywords?: string;
  targetAudience?: string;
  modelConfig?: {
    apiKey?: string;
    baseUrl?: string;
    textModel?: string;
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestPayload;
    const {
      platform,
      contentType,
      tone,
      wordCount,
      topic,
      keywords,
      targetAudience,
      modelConfig,
    } = body;

    if (!topic || !topic.trim()) {
      return NextResponse.json(
        { error: "请输入文案主题或核心内容" },
        { status: 400 }
      );
    }

    const apiKey =
      modelConfig?.apiKey?.trim() || process.env.OPENAI_API_KEY || "";

    if (!apiKey) {
      const localResult = generateLocalCopywriting({
        platform,
        contentType,
        tone,
        wordCount,
        topic,
        keywords,
        targetAudience,
      });
      return NextResponse.json({ result: localResult });
    }

    const baseUrl = (
      modelConfig?.baseUrl?.trim() ||
      process.env.OPENAI_BASE_URL ||
      "https://api.openai.com/v1"
    ).replace(/\/+$/, "");
    const model = modelConfig?.textModel?.trim() || "gpt-4o-mini";

    const platformMeta = PLATFORMS[platform];
    const typeMeta = CONTENT_TYPES.find((c) => c.id === contentType);
    const toneMeta = TONES.find((t) => t.id === tone);
    const lengthMeta = WORD_COUNTS.find((w) => w.id === wordCount);

    const systemPrompt = `你是一位精通中国主流新媒体平台（抖音、今日头条、快手、微信公众号）推流算法与爆款内容创作的资深内容总监。
请严格遵守以下规则：
1. 全文绝对不能包含任何 emoji 表情符号（如各种笑脸、火焰、手指、对勾符号等）。
2. 输出必须为合法 JSON 对象，字段如下：
{
  "titles": ["标题1", "标题2", "标题3"],
  "hook": "黄金开头/前3秒钩子",
  "body": "正文内容（合理分段，符合平台阅读习惯）",
  "tags": ["标签1", "标签2", "标签3", "标签4"],
  "cta": "结尾互动引导语"
}
3. 不要输出 Markdown 代码块标记，只返回纯 JSON 字符串。`;

    const userPrompt = `请为【${platformMeta.name}】平台创作一篇可推流的爆款文案：
- 平台特征：${platformMeta.tagline}（${platformMeta.description}）
- 推荐篇幅：${lengthMeta?.label}（${lengthMeta?.desc}），参考平台建议：${platformMeta.recommendedLength}
- 内容类型：${typeMeta?.label}（${typeMeta?.hint}）
- 语气风格：${toneMeta?.label}
- 核心主题：${topic}
- 关键词：${keywords || "无特定限制"}
- 目标受众：${targetAudience || "泛大众/核心兴趣人群"}

请确保标题具备高点击率潜力，开头能留住用户，正文有实质信息或情绪价值，结尾能自然撬动评论区互动。`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.8,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        {
          error: `大模型接口调用失败 (${response.status}): ${errText.slice(0, 200)}`,
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const rawContent: string = data?.choices?.[0]?.message?.content ?? "";
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "模型返回格式异常，未能解析出结构化文案" },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const result = {
      id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      platform,
      contentType,
      tone,
      topic: topic.trim(),
      titles: Array.isArray(parsed.titles) ? parsed.titles.slice(0, 3) : [],
      hook: String(parsed.hook ?? ""),
      body: String(parsed.body ?? ""),
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6) : [],
      cta: String(parsed.cta ?? ""),
      tips: platformMeta.algorithmTips,
      mode: "ai" as const,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "未知错误";
    return NextResponse.json(
      { error: `生成文案时发生错误: ${message}` },
      { status: 500 }
    );
  }
}
