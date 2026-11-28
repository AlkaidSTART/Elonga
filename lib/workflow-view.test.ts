import { describe, expect, it } from "vitest";
import {
  buildPublishableBody,
  buildPublishableFullText,
  getPlatformOptionList,
  getPlatformTriggerMeta,
  getWorkflowOptionsSummary,
  resolvePreviewOpenAfterGeneration,
  resolveWorkflowLayoutState,
} from "./workflow-view";

describe("workflow-view helpers", () => {
  it("keeps solo composer layout when no document has been generated", () => {
    expect(resolveWorkflowLayoutState({ hasDocument: false, isPreviewOpen: false })).toEqual({
      layoutMode: "solo",
      showPreviewPanel: false,
      showPreviewTrigger: false,
    });

    // Even if isPreviewOpen is somehow true, never show preview panel without a document
    expect(resolveWorkflowLayoutState({ hasDocument: false, isPreviewOpen: true })).toEqual({
      layoutMode: "solo",
      showPreviewPanel: false,
      showPreviewTrigger: false,
    });
  });

  it("shows preview trigger while keeping solo layout after generation until user expands preview", () => {
    expect(resolveWorkflowLayoutState({ hasDocument: true, isPreviewOpen: false })).toEqual({
      layoutMode: "solo",
      showPreviewPanel: false,
      showPreviewTrigger: true,
    });
  });

  it("switches to split layout when document exists and preview is opened", () => {
    expect(resolveWorkflowLayoutState({ hasDocument: true, isPreviewOpen: true })).toEqual({
      layoutMode: "split",
      showPreviewPanel: true,
      showPreviewTrigger: true,
    });
  });

  it("preserves collapsed preview state on first generation and open state on regeneration", () => {
    expect(resolvePreviewOpenAfterGeneration(false)).toBe(false);
    expect(resolvePreviewOpenAfterGeneration(true)).toBe(true);
  });

  it("returns all four supported publishing platforms and falls back safely", () => {
    const options = getPlatformOptionList();
    expect(options.map((p) => p.id)).toEqual(["douyin", "toutiao", "xiaohongshu", "wechat"]);
    expect(getPlatformTriggerMeta("xiaohongshu").name).toBe("小红书");
  });

  it("summarizes linked activity and custom advanced options", () => {
    const basic = getWorkflowOptionsSummary({
      selectedActivityTitle: null,
      contentType: "story",
      tone: "warm",
      wordCount: "medium",
      targetAudience: "",
      keywords: "",
    });
    expect(basic.activeCount).toBe(0);
    expect(basic.summaryText).toBe("公益故事 · 温暖真诚 · 标准篇幅");

    const customized = getWorkflowOptionsSummary({
      selectedActivityTitle: "周末净滩行动",
      contentType: "activity",
      tone: "authentic",
      wordCount: "short",
      targetAudience: "社区居民",
      keywords: "净滩, 环保",
    });
    expect(customized.activeCount).toBe(3);
    expect(customized.summaryText).toContain("档案：周末净滩行动");
  });

  it("assembles hook, body, and cta into one complete publishable body without duplication", () => {
    expect(
      buildPublishableBody({
        hook: "你知道一本书能改变多少孩子吗？",
        body: "这周末我们在乡村小学建起了一座图书角。",
        cta: "欢迎在评论区留言一起参与。",
      }),
    ).toBe(
      "你知道一本书能改变多少孩子吗？\n\n这周末我们在乡村小学建起了一座图书角。\n\n欢迎在评论区留言一起参与。",
    );

    // Avoid duplicating hook/cta if already merged into body
    expect(
      buildPublishableBody({
        hook: "开头第一句",
        body: "开头第一句\n\n正文内容\n\n结尾互动",
        cta: "结尾互动",
      }),
    ).toBe("开头第一句\n\n正文内容\n\n结尾互动");
  });

  it("formats full publishable post text with title, body, and normalized hashtags", () => {
    expect(
      buildPublishableFullText({
        title: "一本书点亮乡村图书角",
        hook: "开场钩子",
        body: "正文内容",
        cta: "欢迎点赞转发",
        tags: ["#乡村阅读", "公益助学"],
      }),
    ).toBe("一本书点亮乡村图书角\n\n开场钩子\n\n正文内容\n\n欢迎点赞转发\n\n#乡村阅读 #公益助学");
  });
});
