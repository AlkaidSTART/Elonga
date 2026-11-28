import { charityCopywritingSkill } from "./charity-copywriting";
import { douyinTrendResearchSkill } from "./douyin-trend-research";
import {
  getPlatformWritingSkill,
  PLATFORM_WRITING_SKILL_LIST,
  PLATFORM_WRITING_SKILLS,
} from "./platform-writing-skills";
import { trafficOptimizerSkill } from "./traffic-optimizer";
import type { CharityCopywritingInput, SkillTraceItem, WorkflowOutput } from "./types";

export const SKILLS_REGISTRY = [
  ...PLATFORM_WRITING_SKILL_LIST.map((skill) => ({
    id: skill.id,
    name: skill.name,
    description: skill.description,
    version: skill.version,
    platform: skill.platform,
  })),
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
  input: CharityCopywritingInput,
): Promise<WorkflowOutput> {
  const skillTraces: SkillTraceItem[] = [];

  // Skill 0: 根据所选传播平台动态加载对应的图文写作技巧 Skill
  const platformWritingSkill = getPlatformWritingSkill(input.platform);
  const tPlatform = Date.now();
  const platformWritingGuidance =
    input.platformWritingGuidance?.platform === input.platform
      ? input.platformWritingGuidance
      : await platformWritingSkill.execute({
          topic: input.topic,
          contentType: input.contentType,
          wordCount: input.wordCount,
        });
  skillTraces.push({
    skillId: platformWritingSkill.id,
    skillName: platformWritingSkill.name,
    status: input.platformWritingGuidance?.platform === input.platform ? "reused" : "completed",
    durationMs: Date.now() - tPlatform,
    summary: `已加载${platformWritingSkill.shortName}（${platformWritingGuidance.titleRules.length} 条标题规范、${platformWritingGuidance.bodyStructureRules.length} 条正文结构技巧）`,
  });

  // Skill 1: 对应平台爆款趋势调研（仅当传入调研结果与当前平台一致时才复用，否则独立调用）
  let trendInsights =
    input.trendInsights &&
    (!input.trendInsights.platform || input.trendInsights.platform === input.platform)
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

  // Skill 2: 公益机构推流文案创作（注入对应平台的图文写作 Skill 与爆款趋势）
  const t1 = Date.now();
  const draft = await charityCopywritingSkill.execute({
    ...input,
    trendInsights,
    platformWritingGuidance,
  });
  skillTraces.push({
    skillId: charityCopywritingSkill.id,
    skillName: charityCopywritingSkill.name,
    status: "completed",
    durationMs: Date.now() - t1,
    summary: `已按${platformWritingSkill.shortName}生成 ${draft.titles.length} 个备选标题与 ${draft.body.length} 字正文`,
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
  PLATFORM_WRITING_SKILLS,
  PLATFORM_WRITING_SKILL_LIST,
  getPlatformWritingSkill,
};
