import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlatformId } from "@/lib/platforms";

const callTextModelMock = vi.fn();

vi.mock("@/lib/ai/model-client", () => ({
  callTextModel: (...args: unknown[]) => callTextModelMock(...args),
}));

import {
  getPlatformWritingSkill,
  PLATFORM_WRITING_SKILL_LIST,
  PLATFORM_WRITING_SKILLS,
} from "./platform-writing-skills";
import { runCopywritingSkillsWorkflow, SKILLS_REGISTRY } from "./index";

describe("platform writing skills", () => {
  afterEach(() => {
    callTextModelMock.mockReset();
  });

  const expectedByPlatform: Record<
    PlatformId,
    { id: string; name: string; signatureKeyword: string }
  > = {
    douyin: {
      id: "douyin-graphic-writing",
      name: "抖音图文创作技能",
      signatureKeyword: "10-15 字",
    },
    toutiao: {
      id: "toutiao-graphic-writing",
      name: "今日头条图文创作技能",
      signatureKeyword: "凤头",
    },
    xiaohongshu: {
      id: "xiaohongshu-graphic-writing",
      name: "小红书图文笔记创作技能",
      signatureKeyword: "3:4",
    },
    wechat: {
      id: "wechat-graphic-writing",
      name: "微信公众号图文创作技能",
      signatureKeyword: "300 字一个钩子",
    },
  };

  it("provides dedicated hardcoded writing skills for all four platforms", async () => {
    expect(PLATFORM_WRITING_SKILL_LIST).toHaveLength(4);

    for (const platform of Object.keys(expectedByPlatform) as PlatformId[]) {
      const skill = getPlatformWritingSkill(platform);
      const expected = expectedByPlatform[platform];

      expect(skill.id).toBe(expected.id);
      expect(skill.name).toBe(expected.name);
      expect(skill.platform).toBe(platform);
      expect(PLATFORM_WRITING_SKILLS[platform].id).toBe(expected.id);

      const guidance = await skill.execute();
      expect(guidance.skillId).toBe(expected.id);
      expect(guidance.titleRules.length).toBeGreaterThanOrEqual(2);
      expect(guidance.hookRules.length).toBeGreaterThanOrEqual(2);
      expect(guidance.bodyStructureRules.length).toBeGreaterThanOrEqual(3);
      expect(guidance.ctaRules.length).toBeGreaterThanOrEqual(2);
      expect(guidance.hashtagRules.length).toBeGreaterThanOrEqual(2);
      expect(guidance.quickHighlights.length).toBeGreaterThanOrEqual(3);
      expect(guidance.promptInstructions).toContain(expected.name);
      expect(guidance.promptInstructions).toContain(expected.signatureKeyword);
    }
  });

  it("registers all four platform writing skills in SKILLS_REGISTRY", () => {
    const ids = SKILLS_REGISTRY.map((s) => s.id);
    expect(ids).toContain("douyin-graphic-writing");
    expect(ids).toContain("toutiao-graphic-writing");
    expect(ids).toContain("xiaohongshu-graphic-writing");
    expect(ids).toContain("wechat-graphic-writing");
  });

  it("dynamically loads the matching platform skill in runCopywritingSkillsWorkflow (local mode)", async () => {
    for (const platform of Object.keys(expectedByPlatform) as PlatformId[]) {
      const expected = expectedByPlatform[platform];
      const output = await runCopywritingSkillsWorkflow({
        platform,
        contentType: "story",
        wordCount: "medium",
        topic: "社区流浪猫冬季保暖屋搭建",
      });

      expect(output.skillTraces[0]?.skillId).toBe(expected.id);
      expect(output.skillTraces[0]?.skillName).toBe(expected.name);
      expect(output.result.platform).toBe(platform);
      expect(output.result.tips).toEqual(PLATFORM_WRITING_SKILLS[platform].quickHighlights);
    }
  });

  it("injects the selected platform writing skill instructions into the AI prompt", async () => {
    callTextModelMock.mockImplementation(async (params: { userPrompt: string }) => {
      if (params.userPrompt.includes("爆款文案调研结果")) {
        return {
          text: JSON.stringify({
            hotKeywords: ["微光公益", "冬季保暖"],
            viralHooks: ["坚持第 3 天，小橘终于进窝了"],
            titleFormulas: ["数字+真实反差"],
            samples: [],
            summary: "抖音公益图文强调前 3 秒视觉与真实细节。",
          }),
        };
      }
      return {
        text: JSON.stringify({
          titles: ["3个纸箱，给流浪猫搭过冬窝"],
          hook: "零下三度的夜里，这三个旧纸箱救了一窝小猫。",
          body: "第一，找干净的快递箱做好防水。\n第二，铺上旧毛衣别用棉絮。\n第三，放在避风角落别挡道。",
          tags: ["流浪猫救助", "微光公益", "暖冬行动"],
          cta: "你小区附近有流浪猫吗？评论区聊聊。",
        }),
      };
    });

    const output = await runCopywritingSkillsWorkflow({
      platform: "douyin",
      contentType: "story",
      wordCount: "short",
      topic: "社区流浪猫冬季保暖屋搭建",
      modelConfig: {
        apiKey: "test-key",
        baseUrl: "https://example.com/v1",
        textModel: "test-model",
      },
    });

    expect(output.skillTraces[0]?.skillId).toBe("douyin-graphic-writing");
    expect(output.result.mode).toBe("ai");

    const copywritingCall = callTextModelMock.mock.calls.find(([arg]) =>
      String((arg as { userPrompt?: string }).userPrompt ?? "").includes("抖音图文创作技能"),
    );
    expect(copywritingCall).toBeDefined();

    const copywritingArgs = copywritingCall?.[0] as { systemPrompt: string; userPrompt: string };
    expect(copywritingArgs.systemPrompt).toContain("抖音图文创作技能");
    expect(copywritingArgs.userPrompt).toContain("10-15 字");
    expect(copywritingArgs.userPrompt).toContain("金字塔标签组合法");
    expect(copywritingArgs.userPrompt).not.toContain("微信公众号图文创作技能");
  });
});
