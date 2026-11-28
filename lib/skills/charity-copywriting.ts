import { callTextModel } from "@/lib/ai/model-client";
import { generateLocalCopywriting } from "@/lib/copywriting-engine";
import { formatActivityContextForPrompt } from "@/lib/organization";
import {
  LEGACY_CONTENT_TYPE_LABELS,
  PLATFORMS,
  WORD_COUNTS,
  type CopywritingResult,
  type ToneId,
} from "@/lib/platforms";
import type { CharityCopywritingInput, SkillDefinition } from "./types";

function formatTrendPromptSection(input: CharityCopywritingInput): string {
  const platformName = PLATFORMS[input.platform].name;
  const insights = input.trendInsights;
  if (!insights) {
    return `暂无前置${platformName}爆款调研数据，请结合${platformName}常规公益高传播结构进行创作。`;
  }

  const lines = [
    `【前置${platformName}爆款文案调研结论（来源：${insights.sourceLabel}）】`,
    `- 调研摘要：${insights.summary}`,
    `- 热门流量关键词：${insights.hotKeywords.join("、") || "无"}`,
    `- 近期高留存开头钩子公式：\n  ${insights.viralHooks.map((h) => `* ${h}`).join("\n  ")}`,
    `- 近期高点击标题公式：\n  ${insights.titleFormulas.map((f) => `* ${f}`).join("\n  ")}`,
  ];

  if (insights.samples.length > 0) {
    lines.push(
      `- ${platformName}爆款参考拆解：\n  ${insights.samples
        .map(
          (s, idx) =>
            `${idx + 1}. 标题示例：「${s.title}」｜参考开头：「${s.hook}」｜切入角度：${s.angle}`,
        )
        .join("\n  ")}`,
    );
  }

  return lines.join("\n");
}

export const charityCopywritingSkill: SkillDefinition<CharityCopywritingInput, CopywritingResult> =
  {
    id: "charity-copywriting",
    name: "公益机构推流文案创作",
    description:
      "结合对应平台爆款调研规律与公益机构工作流需求，生成接地气、有温度且易推流的传播文案。",
    version: "1.0.0",
    async execute(input) {
      const tone: ToneId = input.tone ?? "warm";
      const apiKey =
        input.modelConfig?.apiKey?.trim() ||
        process.env.DEEPSEEK_API_KEY ||
        process.env.TEXT_API_KEY ||
        process.env.OPENAI_API_KEY ||
        "";

      if (!apiKey) {
        return generateLocalCopywriting({
          platform: input.platform,
          contentType: input.contentType,
          tone,
          wordCount: input.wordCount,
          topic: input.topic,
          keywords: input.keywords,
          targetAudience: input.targetAudience,
          activityContext: input.activityContext,
          trendInsights: input.trendInsights,
        });
      }

      const baseUrl = (
        input.modelConfig?.baseUrl?.trim() ||
        process.env.DEEPSEEK_BASE_URL ||
        process.env.TEXT_BASE_URL ||
        "https://api.deepseek.com/v1"
      ).replace(/\/+$/, "");
      const model =
        input.modelConfig?.textModel?.trim() || process.env.DEEPSEEK_MODEL || "deepseek-chat";

      const platformMeta = PLATFORMS[input.platform];
      const scenarioLabel = LEGACY_CONTENT_TYPE_LABELS[input.contentType] ?? "公益故事";
      const lengthMeta = WORD_COUNTS.find((w) => w.id === input.wordCount);

      const systemPrompt = `你是一位长期服务公益机构的新媒体内容主理人，擅长将真实的公益一线故事与活动转化为“普通人看得懂、愿意停下来看完、愿意顺手点赞转发”的高推流文案。
请严格遵守以下规则：
1. 这是给公益机构工作人员日常使用的平台，语言要真诚、平实、有温度，不要使用生硬的商业营销黑话或过度专业的术语，不要居高临下说教，也不要过度卖惨。
2. 充分吸收前置【${platformMeta.name}爆款文案调研】中的开头钩子结构、标题公式和热词，自然融入【${platformMeta.name}】的表达节奏中。
3. 全文绝对不能包含任何 emoji 表情符号（如各种笑脸、火焰、手指、对勾符号等）。
4. 输出必须为合法 JSON 对象，字段如下：
{
  "titles": ["标题1", "标题2", "标题3"],
  "hook": "黄金开头/前3秒钩子",
  "body": "正文内容（合理分段，口语化或易读排版）",
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"],
  "cta": "结尾互动引导语（自然引导点赞、评论或转发助力推流）"
}
5. 不要输出 Markdown 代码块标记，只返回纯 JSON 字符串。`;

      const activityContextSection = formatActivityContextForPrompt(input.activityContext);

      const userPrompt = `请为【${platformMeta.name}】平台创作一篇公益机构推流文案：
- 平台特征：${platformMeta.tagline}（${platformMeta.description}）
- 公益场景：${scenarioLabel}
- 推荐篇幅：${lengthMeta?.label}（${lengthMeta?.desc}），参考平台建议：${platformMeta.recommendedLength}
- 公益主题：${input.topic}
- 补充关键词：${input.keywords || "无特定限制"}
- 面向人群：${input.targetAudience || "热心公益的普通大众"}
${activityContextSection ? `\n${activityContextSection}\n` : ""}
${formatTrendPromptSection(input)}

请直接产出可直接用于公益机构发布与推流的完整文案。`;

      const { text: rawContent } = await callTextModel({
        apiKey,
        baseUrl,
        port: input.modelConfig?.port,
        endpointPath: input.modelConfig?.endpointPath,
        apiFormat: input.modelConfig?.apiFormat,
        model,
        systemPrompt,
        userPrompt,
        temperature: 0.75,
        timeoutMs: 60000,
      });

      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("模型返回格式异常，未能解析出结构化文案");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        platform: input.platform,
        contentType: input.contentType,
        tone,
        topic: input.topic.trim(),
        titles: Array.isArray(parsed.titles) ? parsed.titles.slice(0, 3) : [],
        hook: String(parsed.hook ?? ""),
        body: String(parsed.body ?? ""),
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6) : [],
        cta: String(parsed.cta ?? ""),
        tips: platformMeta.algorithmTips,
        mode: "ai",
        createdAt: new Date().toISOString(),
        activityId: input.activityContext?.activityId,
        activityTitle: input.activityContext?.activityTitle,
        trendInsights: input.trendInsights,
      };
    },
  };
