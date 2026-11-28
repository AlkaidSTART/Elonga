import { callTextModel } from "@/lib/ai/model-client";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";
import type {
  DouyinTrendInsights,
  DouyinViralSample,
  ModelConfigPayload,
  SkillDefinition,
} from "./types";

export interface DouyinTrendResearchInput {
  platform?: PlatformId;
  topic: string;
  keywords?: string;
  modelConfig?: ModelConfigPayload;
}

interface DouyinHotWord {
  word?: string;
  hot_value?: number;
}

const PLATFORM_RESEARCH_PROFILE: Record<
  PlatformId,
  {
    focus: string;
    hookStyle: string;
    titleStyle: string;
    defaultTags: string[];
    viralHooks: string[];
    titleFormulas: string[];
  }
> = {
  douyin: {
    focus: "高完播率、前3秒强留存、口语化短句与评论区互动撬动",
    hookStyle: "前3秒反差细节或直接痛点提问，适合口播/短视频字幕",
    titleStyle: "强悬念、具体数字或情绪反转，适合短视频推荐流",
    defaultTags: ["微光公益", "凡人善举", "温暖传递", "一起做好事", "公益日常"],
    viralHooks: [
      "具体时间/数字 + 真实反差（如：坚持第X天，终于看到了这一幕）",
      "消除大众顾虑的透明视角（如：很多人问善款/物资去哪了，今天看真实回访）",
      "低门槛代入感提问（如：如果只需要花几分钟，你愿意帮一把吗）",
    ],
    titleFormulas: [
      "「具体细节 + 情绪反转」：别小看这一步，它真的改变了现场的现状",
      "「透明回访 + 结果可见」：大家一起帮忙的这件事，终于有后续了",
      "「普通人视角 + 轻行动」：原来不花大钱，也能实实在在帮到他们",
    ],
  },
  toutiao: {
    focus: "高信息流点击率（CTR）、事实冲突感、清晰结构化叙事与客观公信力",
    hookStyle: "首段直切事件背景与核心数据/事实冲突，减少铺垫",
    titleStyle: "包含人群定位、具体数字或深度追问，突出信息增量",
    defaultTags: ["公益一线", "真实记录", "社会关爱", "志愿行动", "温暖时刻"],
    viralHooks: [
      "一线事实直击（如：在最近一次走访中，我们记录下了一组容易被忽略的数据）",
      "公众关切回应（如：大家最关心的是善意如何真正落地，这篇把全过程讲清楚）",
      "反常识观察切入（如：很多人以为公益离自己很远，其实改变就发生在身边）",
    ],
    titleFormulas: [
      "「一线观察 + 核心追问」：为什么越来越多人开始关注这件事？现场细节很真实",
      "「数据/时间 + 成果回访」：坚持推进这件公益小事，如今带来了哪些变化？",
      "「人群痛点 + 务实方案」：普通人如何低门槛参与公益？一线志愿者给出3点建议",
    ],
  },
  xiaohongshu: {
    focus: "高点击封面感、真实体验种草、清晰干货清单与高收藏/评论转化",
    hookStyle: "像朋友聊天一样切入真实体验，先抛共鸣场景再给实用清单",
    titleStyle: "带人群标签、数字要点或情绪价值词，易触发点击与收藏",
    defaultTags: ["公益日常", "温暖瞬间", "随手公益", "真实记录", "正能量分享"],
    viralHooks: [
      "真实体验开场（如：去了一次公益现场后，彻底刷新了我对这件事的认知）",
      "清单攻略切入（如：整理了普通人也能轻松参与的3种方式，建议先码住）",
      "情绪共鸣细节（如：被现场这个小瞬间狠狠戳到了，想认真记录下来）",
    ],
    titleFormulas: [
      "「被问爆/整理向」：被问了好多次的公益参与方式，整理了一份真实记录",
      "「低门槛清单」：普通人也能做的3件公益小事｜新手友好不踩坑",
      "「治愈瞬间记录」：在现场记录下的温暖碎片，微小的善意真的会被看见",
    ],
  },
  wechat: {
    focus: "深度阅读完成度、观点金句提炼、公信力背书与朋友圈/看一看转发价值",
    hookStyle: "以克制而有温度的现场故事引入，自然过渡到议题思考与价值共识",
    titleStyle: "兼顾搜索关键词与情绪共鸣，克制耐读、适合社交转发",
    defaultTags: ["公益传播", "社会价值", "志愿故事", "微光行动", "长期主义"],
    viralHooks: [
      "故事切入 + 价值定调（如：公益从来不是少数人做很多，而是大多数人顺手做一点点）",
      "现场微镜头（如：翻开这本记录本时，我们看到了善意最朴素的样子）",
      "议题反思开篇（如：比起宏大的口号，真实且可持续的日常改变更值得被看见）",
    ],
    titleFormulas: [
      "「议题记录 + 价值升华」：在公益一线，我们看到了普通人善意最动人的样子",
      "「写给特定读者」：写给所有关心这件事的人：不需要完美英雄，只需要多一点行动",
      "「透明复盘 + 长期信任」：把每一份微小善意落到实处，这件事我们一直在做",
    ],
  },
};

async function fetchExternalTrendsApi(
  topic: string,
  keywords?: string,
): Promise<DouyinTrendInsights | null> {
  const endpoint = process.env.DOUYIN_TRENDS_API_URL?.trim();
  if (!endpoint) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (process.env.DOUYIN_TRENDS_API_KEY) {
      headers.Authorization = `Bearer ${process.env.DOUYIN_TRENDS_API_KEY}`;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ topic, keywords }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    if (!data || (!Array.isArray(data.viralHooks) && !Array.isArray(data.samples))) {
      return null;
    }

    return {
      platform: "douyin",
      platformName: PLATFORMS.douyin.name,
      queryTopic: topic,
      fetchedAt: new Date().toISOString(),
      source: "live-api",
      sourceLabel: "抖音外部爆款接口实时调研",
      hotKeywords: Array.isArray(data.hotKeywords) ? data.hotKeywords.slice(0, 8) : [],
      viralHooks: Array.isArray(data.viralHooks) ? data.viralHooks.slice(0, 5) : [],
      titleFormulas: Array.isArray(data.titleFormulas) ? data.titleFormulas.slice(0, 4) : [],
      samples: Array.isArray(data.samples) ? data.samples.slice(0, 3) : [],
      summary: String(data.summary ?? "已通过外部接口获取最新抖音爆款文案特征。"),
    };
  } catch {
    return null;
  }
}

async function fetchDouyinHotBoard(): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch("https://www.iesdouyin.com/web/api/v2/hotsearch/billboard/word/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json();
    const list: DouyinHotWord[] = Array.isArray(data?.word_list) ? data.word_list : [];
    return list
      .map((item) => item.word?.trim())
      .filter((w): w is string => Boolean(w))
      .slice(0, 12);
  } catch {
    return [];
  }
}

async function researchWithLlm(
  platform: PlatformId,
  topic: string,
  keywords: string | undefined,
  hotBoardWords: string[],
  modelConfig?: ModelConfigPayload,
): Promise<DouyinTrendInsights | null> {
  const apiKey =
    modelConfig?.apiKey?.trim() ||
    process.env.DEEPSEEK_API_KEY ||
    process.env.TEXT_API_KEY ||
    process.env.OPENAI_API_KEY ||
    "";

  if (!apiKey) return null;

  const baseUrl = (
    modelConfig?.baseUrl?.trim() ||
    process.env.DEEPSEEK_BASE_URL ||
    process.env.TEXT_BASE_URL ||
    "https://api.deepseek.com/v1"
  ).replace(/\/+$/, "");
  const model = modelConfig?.textModel?.trim() || process.env.DEEPSEEK_MODEL || "deepseek-chat";

  const platformMeta = PLATFORMS[platform];
  const profile = PLATFORM_RESEARCH_PROFILE[platform];

  const hotContext =
    platform === "douyin" && hotBoardWords.length > 0
      ? `当前抖音热榜实时热词参考：${hotBoardWords.join("、")}`
      : `请结合近期【${platformMeta.name}】公益与正能量赛道的爆款内容规律进行独立分析（不要照搬其他平台话术）。`;

  const systemPrompt = `你是一位专注【${platformMeta.name}】正能量与公益赛道的爆款内容调研员。
平台核心特征：${platformMeta.tagline}（${platformMeta.description}）
调研重点：${profile.focus}
请根据用户提供的公益主题，独立调研并总结当前【${platformMeta.name}】上同类型高传播、高互动的爆款文案规律。
严格遵守：
1. 不要输出任何 emoji。
2. 所有热词、开头钩子、标题公式与示例必须严格贴合【${platformMeta.name}】的平台语境。
3. 仅返回合法纯 JSON，不要包含 Markdown 代码块标记，字段如下：
{
  "hotKeywords": ["热词1", "热词2", "热词3", "热词4", "热词5"],
  "viralHooks": ["适配该平台的高留存开头模板1", "开头模板2", "开头模板3"],
  "titleFormulas": ["适配该平台的爆款标题公式1", "标题公式2", "标题公式3"],
  "samples": [
    {
      "title": "参考爆款标题示例",
      "hook": "参考开头",
      "angle": "切入角度（如反差细节/真实记录/普通人微光）",
      "engagementHint": "互动撬动点"
    }
  ],
  "summary": "一句话总结本次【${platformMeta.name}】公益爆款调研的核心抓手"
}`;

  const userPrompt = `目标平台：${platformMeta.name}
调研主题：${topic}
补充关键词：${keywords || "无"}
${hotContext}

请输出适合公益机构工作流直接借鉴的【${platformMeta.name}】爆款文案调研结果（samples 返回 2 条即可）。`;

  try {
    const { text: raw } = await callTextModel({
      apiKey,
      baseUrl,
      port: modelConfig?.port,
      endpointPath: modelConfig?.endpointPath,
      apiFormat: modelConfig?.apiFormat,
      model,
      systemPrompt,
      userPrompt,
      temperature: 0.6,
      timeoutMs: 15000,
    });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    const useHotBoard = platform === "douyin" && hotBoardWords.length > 0;
    return {
      platform,
      platformName: platformMeta.name,
      queryTopic: topic,
      fetchedAt: new Date().toISOString(),
      source: useHotBoard ? "hot-board" : "llm-research",
      sourceLabel: useHotBoard
        ? `${platformMeta.name}热榜 + AI 规律调研`
        : `${platformMeta.name} AI 爆款规律调研`,
      hotKeywords: Array.isArray(parsed.hotKeywords)
        ? parsed.hotKeywords.map(String).slice(0, 6)
        : [],
      viralHooks: Array.isArray(parsed.viralHooks) ? parsed.viralHooks.map(String).slice(0, 4) : [],
      titleFormulas: Array.isArray(parsed.titleFormulas)
        ? parsed.titleFormulas.map(String).slice(0, 4)
        : [],
      samples: Array.isArray(parsed.samples)
        ? (parsed.samples as DouyinViralSample[]).slice(0, 2)
        : [],
      summary: String(
        parsed.summary ?? `已提炼当前${platformMeta.name}公益赛道高传播、高互动的表达规律。`,
      ),
    };
  } catch {
    return null;
  }
}

function buildLocalCharityTrendInsights(
  platform: PlatformId,
  topic: string,
  keywords?: string,
  hotBoardWords: string[] = [],
): DouyinTrendInsights {
  const platformMeta = PLATFORMS[platform];
  const profile = PLATFORM_RESEARCH_PROFILE[platform];
  const combined = `${topic} ${keywords ?? ""}`;

  const isAnimal = /猫|狗|流浪|救助|领养|宠物/.test(combined);
  const isEducation = /助学|孩子|乡村|支教|图书|学校|儿童|留守/.test(combined);
  const isElder = /老人|敬老|养老|独居|爷爷|奶奶|银发/.test(combined);
  const isEco = /环保|净滩|垃圾|低碳|植树|河流|海洋|节能/.test(combined);

  let domainKeywords = [...profile.defaultTags];
  let samples: DouyinViralSample[] = [
    {
      title:
        platform === "xiaohongshu"
          ? "被公益现场这个小瞬间戳到了｜普通人也能参与的微光小事"
          : platform === "toutiao"
            ? "走进公益一线：那些容易被忽略的真实需求与落地进展"
            : platform === "wechat"
              ? "在公益现场，我们看到了普通人善意最动人的样子"
              : "那天雨很大，但我们还是决定再多等十分钟",
      hook:
        platform === "xiaohongshu"
          ? "去了一次一线现场才发现，公益真的不需要高门槛，普通人顺手的小行动就很珍贵。"
          : platform === "toutiao"
            ? "在近期的一线走访中，我们记录下了最真实的帮扶需求与透明进展。"
            : platform === "wechat"
              ? "公益从来不是少数人做很多，而是大多数人顺手做一点点。"
              : "很多人问我做公益图什么，直到昨天我在现场看到了这一幕。",
      angle: "真实时间节点 + 具体小细节切入，不喊口号",
      engagementHint:
        platform === "xiaohongshu"
          ? "引导收藏并评论区分享身边的温暖小事"
          : platform === "wechat"
            ? "引导点亮「在看」或转发给志同道合的朋友"
            : "评论区接力讨论：你身边发生过什么温暖的小事",
    },
    {
      title:
        platform === "xiaohongshu"
          ? "整理了3种低门槛参与公益的方式｜建议先码住"
          : platform === "toutiao"
            ? "透明回访：每一份微小善意，最终是如何落到实处的？"
            : platform === "wechat"
              ? "把善意落到日常：透明公开才是公益最持久的力量"
              : "别小看这几十块钱，它真的能改变一个人的今天",
      hook: "原以为只是随手帮个小忙，没想到最后收到这样一份真实反馈。",
      angle: "低门槛参与感 + 真实反馈闭环",
      engagementHint: "引导点赞扩散，让更多人看到真实进展",
    },
  ];

  if (isAnimal) {
    domainKeywords = ["流浪动物救助", "领养代替购买", "科学绝育", "毛孩子", profile.defaultTags[0]];
    samples = [
      {
        title:
          platform === "xiaohongshu"
            ? "楼道躲了三天的小橘终于吃饭了｜科学救助记录"
            : "在楼道躲了三天的小橘，今天终于肯吃第一口粮了",
        hook: "刚发现它的时候缩在角落直发抖，谁也没想到三天后会变成这样。",
        angle: "前后反差变化 + 救治/领养进展记录",
        engagementHint: "评论区帮取名字或询问领养条件，天然拉高互动",
      },
      {
        title: "为什么社区流浪猫越喂越多？其实少做了最关键这一步",
        hook: "好心投喂却被邻居投诉？做对这一步，人和猫都能安心。",
        angle: "常见误区科普 + 温和倡导科学绝育",
        engagementHint: "提问大家所在小区是怎么处理流浪猫问题的",
      },
    ];
  } else if (isEducation) {
    domainKeywords = ["乡村助学", "阅读角", "一本书的力量", "公益助学", profile.defaultTags[0]];
    samples = [
      {
        title:
          platform === "xiaohongshu"
            ? "把闲置好书寄给村小孩子｜图书角落地回访"
            : "翻完这本破旧的字典，我决定把书架搬进大山",
        hook: "在这所只有二十多个孩子的村小里，最抢手的居然是一本旧漫画。",
        angle: "具象化物品细节触发共情，避免宏大叙事",
        engagementHint: "征集大家小时候最喜欢的一本书，推荐给孩子们",
      },
      {
        title: "一年前寄出的那些旧书，现在变成什么样了？",
        hook: "很多朋友问捐赠的物资到底有没有送到孩子手里，今天带大家看真实回访。",
        angle: "透明回访 + 成果可视化，建立信任感",
        engagementHint: "在评论区留下想对孩子们说的一句鼓励",
      },
    ];
  } else if (isElder) {
    domainKeywords = ["关爱独居老人", "社区助老", "一餐热饭", "银发陪伴", profile.defaultTags[0]];
    samples = [
      {
        title: "敲开独居张奶奶家门时，她把水果留了整整一周",
        hook: "其实很多老人最缺的不是东西，而是推开门时有人叫一声名字。",
        angle: "生活化微细节 + 情感陪伴价值",
        engagementHint: "提醒大家周末给家里长辈打个电话",
      },
      {
        title: "志愿者坚持送饭第100天，老人们的冰箱终于不再空着",
        hook: "一份热饭成本不到十块钱，却让三位独居老人每天都有了盼头。",
        angle: "数字积累 + 真实日常变化",
        engagementHint: "询问大家社区附近有没有类似的助老小队",
      },
    ];
  } else if (isEco) {
    domainKeywords = ["环保行动", "周末净滩", "随手公益", "绿色生活", profile.defaultTags[0]];
    samples = [
      {
        title:
          platform === "xiaohongshu"
            ? "周末两小时河道净滩实录｜超有成就感的公益体验"
            : "周末两小时捡了三大袋垃圾，但最触动我的是这句话",
        hook: "看看这片河滩两小时前后的对比，普通人的行动真的看得见。",
        angle: "前后对比视觉/文字冲击 + 轻量化行动号召",
        engagementHint: "评论区组队下一次周末志愿活动",
      },
      {
        title: "普通人做环保，真的不用等到世界地球日",
        hook: "少用一只塑料袋能改变什么？算完这笔账你就明白了。",
        angle: "算账式对比 + 日常可落地小习惯",
        engagementHint: "分享一个你正在坚持的环保小习惯",
      },
    ];
  }

  let hotKeywords = Array.from(new Set(domainKeywords)).slice(0, 6);
  const useHotBoard = platform === "douyin" && hotBoardWords.length > 0;
  if (useHotBoard) {
    hotKeywords = Array.from(new Set([...hotKeywords, ...hotBoardWords.slice(0, 2)])).slice(0, 6);
  }

  return {
    platform,
    platformName: platformMeta.name,
    queryTopic: topic,
    fetchedAt: new Date().toISOString(),
    source: useHotBoard ? "hot-board" : "local-knowledge",
    sourceLabel: useHotBoard
      ? `${platformMeta.name}实时热榜 + 公益爆款库`
      : `${platformMeta.name}公益爆款模式库`,
    hotKeywords,
    viralHooks: profile.viralHooks,
    titleFormulas: profile.titleFormulas,
    samples,
    summary: `围绕「${topic.slice(0, 18)}」，当前${platformMeta.name}高传播公益内容重点突出“${profile.focus}”，以真实细节与透明反馈撬动自然推荐。`,
  };
}

export const douyinTrendResearchSkill: SkillDefinition<
  DouyinTrendResearchInput,
  DouyinTrendInsights
> = {
  id: "douyin-trend-research",
  name: "多平台爆款趋势调研",
  description: "在撰写公益文案前，按所选平台独立调研对应平台的爆款开头、标题公式与热门话题标签。",
  version: "2.0.0",
  async execute(input) {
    const platform: PlatformId = input.platform ?? "douyin";
    const topic = input.topic.trim();

    // 1. 仅当目标平台为抖音时，尝试外部实时抖音爆款接口与抖音热榜
    let hotBoardWords: string[] = [];
    if (platform === "douyin") {
      const external = await fetchExternalTrendsApi(topic, input.keywords);
      if (external) return external;
      hotBoardWords = await fetchDouyinHotBoard();
    }

    // 2. 若配置了文本大模型，按选中平台独立调研爆款规律
    const llmInsights = await researchWithLlm(
      platform,
      topic,
      input.keywords,
      hotBoardWords,
      input.modelConfig,
    );
    if (llmInsights) return llmInsights;

    // 3. 本地对应平台的公益爆款模式库兜底，保证工作流随时可用且平台一致
    return buildLocalCharityTrendInsights(platform, topic, input.keywords, hotBoardWords);
  },
};
