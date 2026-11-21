import type {
  DouyinTrendInsights,
  DouyinViralSample,
  ModelConfigPayload,
  SkillDefinition,
} from "./types";

export interface DouyinTrendResearchInput {
  topic: string;
  keywords?: string;
  modelConfig?: ModelConfigPayload;
}

interface DouyinHotWord {
  word?: string;
  hot_value?: number;
}

async function fetchExternalTrendsApi(
  topic: string,
  keywords?: string
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
      queryTopic: topic,
      fetchedAt: new Date().toISOString(),
      source: "live-api",
      sourceLabel: "外部抖音爆款接口实时调研",
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
    const res = await fetch(
      "https://www.iesdouyin.com/web/api/v2/hotsearch/billboard/word/",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json();
    const list: DouyinHotWord[] = Array.isArray(data?.word_list)
      ? data.word_list
      : [];
    return list
      .map((item) => item.word?.trim())
      .filter((w): w is string => Boolean(w))
      .slice(0, 12);
  } catch {
    return [];
  }
}

async function researchWithLlm(
  topic: string,
  keywords: string | undefined,
  hotBoardWords: string[],
  modelConfig?: ModelConfigPayload
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
  const model =
    modelConfig?.textModel?.trim() ||
    process.env.DEEPSEEK_MODEL ||
    "deepseek-chat";

  const hotContext =
    hotBoardWords.length > 0
      ? `当前抖音热榜实时热词参考：${hotBoardWords.join("、")}`
      : "当前未获取到实时热榜，请结合近期抖音公益与正能量赛道的爆款规律进行分析。";

  const systemPrompt = `你是一位专注抖音正能量与公益赛道的爆款内容调研员。
请根据用户提供的公益主题，调研并总结当前抖音上同类型高赞、高完播、高转发的爆款文案规律。
严格遵守：
1. 不要输出任何 emoji。
2. 仅返回合法纯 JSON，不要包含 Markdown 代码块标记，字段如下：
{
  "hotKeywords": ["热词1", "热词2", "热词3", "热词4", "热词5"],
  "viralHooks": ["前3秒高留存钩子模板1", "前3秒高留存钩子模板2", "前3秒高留存钩子模板3"],
  "titleFormulas": ["爆款标题公式1", "爆款标题公式2", "爆款标题公式3"],
  "samples": [
    {
      "title": "参考爆款标题示例",
      "hook": "参考前3秒开头",
      "angle": "切入角度（如反差细节/真实记录/普通人微光）",
      "engagementHint": "评论区互动撬动点"
    }
  ],
  "summary": "一句话总结本次抖音公益爆款调研的核心抓手"
}`;

  const userPrompt = `调研主题：${topic}
补充关键词：${keywords || "无"}
${hotContext}

请输出适合公益机构工作流直接借鉴的抖音爆款文案调研结果（samples 返回 2 条即可）。`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = await res.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      queryTopic: topic,
      fetchedAt: new Date().toISOString(),
      source: hotBoardWords.length > 0 ? "hot-board" : "llm-research",
      sourceLabel:
        hotBoardWords.length > 0
          ? "抖音热榜 + AI 爆款规律调研"
          : "AI 抖音公益爆款规律调研",
      hotKeywords: Array.isArray(parsed.hotKeywords)
        ? parsed.hotKeywords.map(String).slice(0, 6)
        : [],
      viralHooks: Array.isArray(parsed.viralHooks)
        ? parsed.viralHooks.map(String).slice(0, 4)
        : [],
      titleFormulas: Array.isArray(parsed.titleFormulas)
        ? parsed.titleFormulas.map(String).slice(0, 4)
        : [],
      samples: Array.isArray(parsed.samples)
        ? (parsed.samples as DouyinViralSample[]).slice(0, 2)
        : [],
      summary: String(
        parsed.summary ?? "已提炼当前抖音公益赛道高完播、高互动的爆款表达规律。"
      ),
    };
  } catch {
    return null;
  }
}

function buildLocalCharityTrendInsights(
  topic: string,
  keywords?: string,
  hotBoardWords: string[] = []
): DouyinTrendInsights {
  const combined = `${topic} ${keywords ?? ""}`;

  const isAnimal = /猫|狗|流浪|救助|领养|宠物/.test(combined);
  const isEducation = /助学|孩子|乡村|支教|图书|学校|儿童|留守/.test(combined);
  const isElder = /老人|敬老|养老|独居|爷爷|奶奶|银发/.test(combined);
  const isEco = /环保|净滩|垃圾|低碳|植树|河流|海洋|节能/.test(combined);

  let hotKeywords = ["微光公益", "凡人善举", "温暖传递", "一起做好事", "公益日常"];
  let samples: DouyinViralSample[] = [
    {
      title: "那天雨很大，但我们还是决定再多等十分钟",
      hook: "很多人问我做公益图什么，直到昨天我在现场看到了这一幕。",
      angle: "真实时间节点 + 具体小细节切入，不喊口号",
      engagementHint: "评论区接力打卡：你身边发生过什么温暖的小事",
    },
    {
      title: "别小看这几十块钱，它真的能改变一个人的今天",
      hook: "原以为只是随手帮个小忙，没想到最后收到这样一条消息。",
      angle: "低门槛参与感 + 真实反馈闭环",
      engagementHint: "引导点赞扩散，让更多人看到真实进展",
    },
  ];

  if (isAnimal) {
    hotKeywords = ["流浪动物救助", "领养代替购买", "科学绝育", "毛孩子", "微光计划"];
    samples = [
      {
        title: "在楼道躲了三天的小橘，今天终于肯吃第一口粮了",
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
    hotKeywords = ["乡村助学", "大山里的孩子", "阅读角", "微光支教", "一本书的力量"];
    samples = [
      {
        title: "翻完这本破旧的字典，我决定把书架搬进大山",
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
    hotKeywords = ["关爱独居老人", "社区助老", "一餐热饭", "银发陪伴", "身边的温暖"];
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
    hotKeywords = ["环保行动", "周末净滩", "随手公益", "绿色生活", "守护家园"];
    samples = [
      {
        title: "周末两小时捡了三大袋垃圾，但最触动我的是这句话",
        hook: "别划走，看看这片海滩两小时前后的对比，你一定会有感触。",
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

  if (hotBoardWords.length > 0) {
    hotKeywords = Array.from(
      new Set([...hotKeywords, ...hotBoardWords.slice(0, 2)])
    ).slice(0, 6);
  }

  return {
    queryTopic: topic,
    fetchedAt: new Date().toISOString(),
    source: hotBoardWords.length > 0 ? "hot-board" : "local-knowledge",
    sourceLabel:
      hotBoardWords.length > 0
        ? "抖音实时热榜 + 公益爆款库"
        : "抖音公益爆款模式库调研",
    hotKeywords,
    viralHooks: [
      "具体时间/数字 + 真实反差（如：坚持第X天，终于看到了这一幕）",
      "消除大众顾虑的透明视角（如：很多人问善款/物资去哪了，今天看真实回访）",
      "低门槛代入感提问（如：如果只需要花几分钟/几块钱，你愿意帮一把吗）",
    ],
    titleFormulas: [
      "「具体细节 + 情绪反转」：别小看这一步，它真的改变了现场的现状",
      "「透明回访 + 结果可见」：大家一起帮忙的这件事，终于有后续了",
      "「普通人视角 + 轻行动」：原来不花大钱，也能实实在在帮到他们",
    ],
    samples,
    summary: `围绕「${topic.slice(0, 18)}」，当前抖音高推流公益文案普遍避开空洞口号，重点用“前3秒真实细节 + 透明进展 + 低门槛互动”撬动自然流量。`,
  };
}

export const douyinTrendResearchSkill: SkillDefinition<
  DouyinTrendResearchInput,
  DouyinTrendInsights
> = {
  id: "douyin-trend-research",
  name: "抖音爆款文案调研",
  description:
    "在撰写公益文案前，自动调研当前抖音爆款开头、标题公式与热门话题标签。",
  version: "1.0.0",
  async execute(input) {
    const topic = input.topic.trim();

    // 1. 优先尝试外部实时抖音爆款接口
    const external = await fetchExternalTrendsApi(topic, input.keywords);
    if (external) return external;

    // 2. 尝试抓取抖音公开热搜榜作为实时上下文
    const hotBoardWords = await fetchDouyinHotBoard();

    // 3. 若配置了文本大模型，结合热榜与公益赛道规律做深度调研
    const llmInsights = await researchWithLlm(
      topic,
      input.keywords,
      hotBoardWords,
      input.modelConfig
    );
    if (llmInsights) return llmInsights;

    // 4. 本地公益爆款模式库兜底，保证工作流随时可用
    return buildLocalCharityTrendInsights(topic, input.keywords, hotBoardWords);
  },
};
