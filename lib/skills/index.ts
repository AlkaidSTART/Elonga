import { charityCopywritingSkill } from "./charity-copywriting";
import { douyinTrendResearchSkill } from "./douyin-trend-research";
import { trafficOptimizerSkill } from "./traffic-optimizer";
import type {
  CharityCopywritingInput,
  SkillTraceItem,
  WorkflowOutput,
} from "./types";

export const SKILLS_REGISTRY = [
  {
    id: douyinTrendResearchSkill.id,
    name: douyinTrendResearchSkill.name,
    description: douyinTrendResearchSkill.description,
    version: douyinTrendResearchSkill.version,
  },
  {
    id: charityCopywritingSkill.id,
    name: charityCopywritingSkill.name,
    description: charityCopywritingSkill.description,
    version: charityCopywritingSkill.version,
  },
  {
    id: trafficOptimizerSkill.id,
    name: trafficOptimizerSkill.name,
    description: trafficOptimizerSkill.description,
    version: trafficOptimizerSkill.version,
  },
];

export async function runCopywritingSkillsWorkflow(
  input: CharityCopywritingInput
): Promise<WorkflowOutput> {
  const skillTraces: SkillTraceItem[] = [];

  // Skill 1: 对应平台爆款趋势调研（仅当传入调研结果与当前平台一致时才复用，否则独立调用）
  let trendInsights =
    input.trendInsights &&
    (!input.trendInsights.platform ||
      input.trendInsights.platform === input.platform)
      ? input.trendInsights
      : undefined;
  if (trendInsights) {
    skillTraces.push({
      skillId: douyinTrendResearchSkill.id,
      skillName: douyinTrendResearchSkill.name,
      status: "reused",
      durationMs: 0,
      summary: `已复用前置调研结果（${trendInsights.sourceLabel}）`,
    });
  } else {
    const t0 = Date.now();
    trendInsights = await douyinTrendResearchSkill.execute({
      platform: input.platform,
      topic: input.topic,
      keywords: input.keywords,
      modelConfig: input.modelConfig,
    });
    skillTraces.push({
      skillId: douyinTrendResearchSkill.id,
      skillName: douyinTrendResearchSkill.name,
      status: "completed",
      durationMs: Date.now() - t0,
      summary: `调研完成：提炼 ${trendInsights.hotKeywords.length} 个热词与 ${trendInsights.viralHooks.length} 条爆款钩子`,
    });
  }

  // Skill 2: 公益机构推流文案创作
  const t1 = Date.now();
  const draft = await charityCopywritingSkill.execute({
    ...input,
    trendInsights,
  });
  skillTraces.push({
    skillId: charityCopywritingSkill.id,
    skillName: charityCopywritingSkill.name,
    status: "completed",
    durationMs: Date.now() - t1,
    summary: `已生成 ${draft.titles.length} 个备选标题与 ${draft.body.length} 字正文`,
  });

  // Skill 3: 公益推流与合规校验
  const t2 = Date.now();
  const polished = await trafficOptimizerSkill.execute({
    draft,
    trendInsights,
  });
  skillTraces.push({
    skillId: trafficOptimizerSkill.id,
    skillName: trafficOptimizerSkill.name,
    status: "completed",
    durationMs: Date.now() - t2,
    summary: `已完成推流标签融合（${polished.tags.length} 个）与合规校验`,
  });

  return {
    result: {
      ...polished,
      skillTraces,
    },
    trendInsights,
    skillTraces,
  };
}

export {
  douyinTrendResearchSkill,
  charityCopywritingSkill,
  trafficOptimizerSkill,
};
