import {
  LEGACY_CONTENT_TYPE_LABELS,
  PLATFORMS,
  type ContentTypeId,
  type CopywritingResult,
  type PlatformId,
  type ToneId,
  type WordCountId,
} from "./platforms";
import type { DouyinTrendInsights } from "./skills/types";
import type { ActivityContextPayload } from "./organization";

export interface CopywritingRequest {
  platform: PlatformId;
  contentType: ContentTypeId;
  tone?: ToneId;
  wordCount: WordCountId;
  topic: string;
  keywords?: string;
  targetAudience?: string;
  activityContext?: ActivityContextPayload;
  trendInsights?: DouyinTrendInsights;
}

function parseKeywords(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,，、\s]+/)
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export function generateLocalCopywriting(req: CopywritingRequest): CopywritingResult {
  const platformMeta = PLATFORMS[req.platform];
  const scenarioLabel = LEGACY_CONTENT_TYPE_LABELS[req.contentType] ?? "公益故事";
  const tone: ToneId = req.tone ?? "warm";
  const topic = req.topic.trim() || "社区公益微光行动";
  const kwList = parseKeywords(req.keywords);
  const audience = req.targetAudience?.trim() || "关注公益、愿意顺手传递善意的普通人";

  const titles = buildCharityTitles(req.platform, topic, req.contentType, req.trendInsights);
  const hook = buildCharityHook(req.platform, topic, req.trendInsights);
  const baseBody = buildCharityBody(req, topic, audience, kwList, scenarioLabel);
  const activityBrief = buildActivityArchiveBlock(req.activityContext);
  const body = activityBrief ? `${activityBrief}\n\n${baseBody}` : baseBody;
  const cta = req.activityContext?.orgSignOff
    ? `${buildCharityCta(req.platform, topic)}\n${req.activityContext.orgSignOff}`
    : buildCharityCta(req.platform, topic);
  const tags = buildCharityTags(req.platform, topic, kwList, scenarioLabel, req.trendInsights);

  return {
    id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    platform: req.platform,
    contentType: req.contentType,
    tone,
    topic,
    titles,
    hook,
    body,
    tags,
    cta,
    tips: platformMeta.algorithmTips,
    mode: "local",
    createdAt: new Date().toISOString(),
    activityId: req.activityContext?.activityId,
    activityTitle: req.activityContext?.activityTitle,
    trendInsights: req.trendInsights,
  };
}

function buildActivityArchiveBlock(ctx?: ActivityContextPayload): string {
  if (!ctx?.activityTitle) return "";
  const parts: string[] = [];
  if (ctx.activityDate || ctx.activityLocation) {
    parts.push(
      `${ctx.activityDate ? `${ctx.activityDate}，` : ""}${ctx.orgName || "我们"}在${ctx.activityLocation || "项目一线"}开展了「${ctx.activityTitle}」。`,
    );
  }
  if (ctx.participantCount || ctx.fundOrGoods) {
    parts.push(
      `本次行动${ctx.participantCount ? `共有${ctx.participantCount}` : ""}${ctx.participantCount && ctx.fundOrGoods ? "，" : ""}${ctx.fundOrGoods ? `实际落实：${ctx.fundOrGoods}` : ""}。`,
    );
  }
  if (ctx.highlights) {
    parts.push(`现场记录：${ctx.highlights}`);
  }
  return parts.join("\n");
}

function buildCharityTitles(
  platform: PlatformId,
  topic: string,
  contentType: ContentTypeId,
  trendInsights?: DouyinTrendInsights,
): string[] {
  const sampleTitle = trendInsights?.samples?.[0]?.title;

  if (platform === "douyin") {
    return [
      sampleTitle
        ? `参考爆款切入：${sampleTitle}`
        : `关于「${topic}」，现场传回来的这一幕让所有人破防了`,
      `别小看这一次顺手转发，它真的在帮「${topic}」带来改变`,
      `很多人问我们做「${topic}」图什么，看完这几十秒你就懂了`,
    ];
  }
  if (platform === "toutiao") {
    return [
      `走近「${topic}」一线：那些容易被忽略的真实需求与温暖变化`,
      `为什么越来越多人开始关注${topic}？一线志愿者记录下这些细节`,
      `透明回访「${topic}」：每一份微小善意，最终都落到了实处`,
    ];
  }
  if (platform === "xiaohongshu") {
    return [
      `被问了好多次的「${topic}」，整理了一份真实一线记录`,
      `普通人也能轻松参与的「${topic}」｜看完这篇就懂了`,
      `关于「${topic}」的温暖瞬间：微小的善意真的会被看见`,
    ];
  }

  const angle =
    contentType === "activity" ? "行动倡议" : contentType === "science" ? "公益科普" : "温暖记录";

  return [
    `「${topic}」${angle}：微光聚在一起，真的可以照亮很远的地方`,
    `写给所有关心${topic}的人：我们不需要完美英雄，只需要多一点行动`,
    `在「${topic}」的现场，我们看到了普通人善意最动人的样子`,
  ];
}

function buildCharityHook(
  platform: PlatformId,
  topic: string,
  trendInsights?: DouyinTrendInsights,
): string {
  const sampleHook = trendInsights?.samples?.[0]?.hook;

  if (platform === "douyin") {
    if (sampleHook) {
      return `${sampleHook} 今天想跟大家聊聊「${topic}」，花 30 秒看完，也许你的一个关注或转发就能帮到现场。`;
    }
    return `很多人以为做公益门槛很高，其实关于「${topic}」，真正改变现状的往往只是普通人顺手的一点微光。停下来看这 30 秒，带你看最真实的现场。`;
  }
  if (platform === "toutiao") {
    return `最近「${topic}」牵动了不少热心网友的心。在一线开展工作时，我们发现大家最关心的不仅是故事本身，更是“真实需求在哪里、善意如何落地”。下面把最新情况如实分享给大家。`;
  }
  if (platform === "xiaohongshu") {
    return `一直想把「${topic}」的真实日常整理出来分享给大家。很多人以为参与公益门槛很高，其实走进现场后会发现，普通人顺手做的一件小事就已经很有力量。`;
  }
  return `在推进「${topic}」的过程中，我们越来越确信一件事：公益从来不是少数人做很多，而是大多数人顺手做一点点。今天这篇文章，想把现场最真实的故事与行动方式分享给你。`;
}

function buildCharityBody(
  req: CopywritingRequest,
  topic: string,
  audience: string,
  kwList: string[],
  scenarioLabel: string,
): string {
  const kwNote = kwList.length > 0 ? `（本次重点关注：${kwList.join("、")}）` : "";

  if (req.platform === "douyin") {
    const base = [
      `第一，把真实需求摆在台面上。`,
      `在「${topic}」的日常推进里${kwNote}，我们发现大家最怕看到空喊口号。真正需要被看见的，是一线正在发生的具体困难，以及哪怕很小的一步能带来什么改变。`,
      ``,
      `第二，降低每一个普通人的参与门槛。`,
      `面对${audience}，不需要一上来就做惊天动地的大事。一次科普转发、一条友善留言、或者一次力所能及的志愿参与，都是在帮这件事被更多人看见。`,
      ``,
      `第三，把每一次进展都透明地反馈出来。`,
      `善意需要回响。后续我们也会持续更新「${topic}」的实际落地情况，让每一份关注都有迹可循、有处可依。`,
    ];
    if (req.wordCount === "long") {
      base.push(
        ``,
        `第四，让善意成为可延续的日常。`,
        `推流不是为了博眼球，而是为了让真正需要帮助的人和资源尽快相遇。如果你也认同「${topic}」的意义，欢迎一起把这份温暖接力下去。`,
      );
    }
    return base.join("\n");
  }

  if (req.platform === "toutiao") {
    const sections = [
      `一、一线观察：为什么「${topic}」值得被更多人看见？`,
      `对于${audience}而言，很多公益议题平时离日常生活似乎很远，但走进现场就会发现，其实只需要一点点关注与资源倾斜${kwNote}，就能实实在在改善很多人的处境。`,
      ``,
      `二、我们正在做的三件实事（${scenarioLabel}）`,
      `1. 精准摸排真实需求：深入一线核实情况，确保每一份帮助都用在最紧迫的地方。`,
      `2. 凝聚社会微小力量：通过通俗易懂的传播，让更多普通人了解并参与进来。`,
      `3. 坚持透明公开反馈：定期同步项目进展与落地成果，不辜负每一份信任。`,
    ];
    if (req.wordCount !== "short") {
      sections.push(
        ``,
        `三、普通人可以如何轻松参与？`,
        `即使暂时无法亲临现场，动动手指点赞、转发让信息进入更大的推荐流量池，本身就是非常重要的一次公益助力。`,
      );
    }
    return sections.join("\n");
  }

  if (req.platform === "xiaohongshu") {
    return [
      `最近一直在跟进「${topic}」${kwNote}，整理了几个最真实的一线观察，分享给同样关心这件事的你：`,
      ``,
      `1. 真实需求往往藏在细节里`,
      `面向${audience}做公益记录，我们尽量不喊口号，而是把现场最具体的情况和变化拍下来、写清楚，让每一份善意都能落到实处。`,
      ``,
      `2. 普通人的参与方式其实很轻量`,
      `不一定非要亲临现场，一次科普转发、一条友善留言，或者收藏这篇笔记分享给身边的朋友，都是在帮「${topic}」被更多人看见。`,
      ``,
      `3. 持续更新透明进展`,
      `后续有新的落地反馈，我也会第一时间在这里整理成合集同步给大家，不辜负每一份信任。`,
    ].join("\n");
  }

  const paragraphs = [
    `01  为什么我们想把「${topic}」讲给更多人听`,
    `很多时候，公益传播的难点不在于缺少感人的故事，而在于如何让${audience}真正理解这件事与我们的关联${kwNote}。`,
    ``,
    `真正的公益，从来不是居高临下的苦情渲染，而是人与人之间平等、有尊严的互相照亮。`,
    ``,
    `02  在「${topic}」中，每一份微光都在算数`,
    `无论是志愿者的奔走、专业力量的支持，还是屏幕前你的一次阅读与转发，都在共同推动改变的发生。把复杂的问题拆解成普通人能看懂、能参与的日常小事，正是我们坚持记录与发声的原因。`,
  ];

  if (req.wordCount !== "short") {
    paragraphs.push(
      ``,
      `03  期待与你同行`,
      `一个人的力量有限，但当越来越多关注「${topic}」的人聚在一起，微光就能汇聚成实实在在的温暖。感谢你看到这里，也欢迎把这份关注传递给身边更多朋友。`,
    );
  }
  return paragraphs.join("\n");
}

function buildCharityCta(platform: PlatformId, topic: string): string {
  if (platform === "douyin") {
    return `如果你也支持「${topic}」，请在评论区打出一句鼓励，或者转给身边同样热心的朋友，让这条视频被更多人刷到！`;
  }
  if (platform === "toutiao") {
    return `关于「${topic}」，你有什么建议或想了解的现场细节？欢迎在评论区留言，我们会持续跟进解答。`;
  }
  if (platform === "xiaohongshu") {
    return `如果你也关心「${topic}」，欢迎点赞收藏这篇笔记，或者在评论区聊聊你的想法和建议，一起让更多温暖被看见。`;
  }
  return `如果这篇文章让你对「${topic}」多了一点了解，欢迎点亮「在看」或转发给身边的朋友。每一份关注，都是推动改变的开始。`;
}

function buildCharityTags(
  platform: PlatformId,
  topic: string,
  kwList: string[],
  scenarioLabel: string,
  trendInsights?: DouyinTrendInsights,
): string[] {
  const cleanTopic = topic.replace(/[#\s]/g, "").slice(0, 12);
  const trendTags = (trendInsights?.hotKeywords ?? [])
    .map((k) => k.replace(/[#\s]/g, ""))
    .filter(Boolean)
    .slice(0, 2);

  const base = [
    cleanTopic,
    scenarioLabel,
    ...kwList.map((k) => k.replace(/[#\s]/g, "")),
    ...trendTags,
  ].filter(Boolean);

  if (platform === "douyin") {
    base.push("微光公益", "传递正能量");
  } else if (platform === "toutiao") {
    base.push("公益行动", "温暖记录");
  } else if (platform === "xiaohongshu") {
    base.push("公益日常", "温暖瞬间");
  } else {
    base.push("公益传播", "社会关爱");
  }

  return Array.from(new Set(base)).slice(0, 5);
}
