import type { CopywritingResult } from "@/lib/platforms";
import type { DouyinTrendInsights, SkillDefinition } from "./types";

export interface TrafficOptimizerInput {
  draft: CopywritingResult;
  trendInsights?: DouyinTrendInsights;
}

const EMOJI_REGEX = /[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]/gu;

function cleanText(text: string): string {
  return text.replace(EMOJI_REGEX, "").trim();
}

export const trafficOptimizerSkill: SkillDefinition<TrafficOptimizerInput, CopywritingResult> = {
  id: "traffic-optimizer",
  name: "公益推流与合规校验",
  description: "统一清理表情符号、融合平台热门推流标签并校验评论区互动钩子。",
  version: "1.0.0",
  async execute({ draft, trendInsights }) {
    const cleanedTitles = draft.titles.map(cleanText).filter(Boolean);
    const cleanedHook = cleanText(draft.hook);
    const cleanedBody = cleanText(draft.body);
    const cleanedCta =
      cleanText(draft.cta) ||
      "如果你也愿意支持这次公益行动，欢迎点赞或转发给身边朋友，让更多人看见。";

    const trendTags = (trendInsights?.hotKeywords ?? [])
      .map((t) => cleanText(t).replace(/^#+/, ""))
      .filter(Boolean);

    const baseTags = draft.tags.map((t) => cleanText(t).replace(/^#+/, "")).filter(Boolean);

    const mergedTags = Array.from(new Set([...baseTags, ...trendTags])).slice(0, 5);

    return {
      ...draft,
      titles: cleanedTitles,
      hook: cleanedHook,
      body: cleanedBody,
      cta: cleanedCta,
      tags: mergedTags,
      trendInsights: trendInsights ?? draft.trendInsights,
    };
  },
};
