import {
  CONTENT_TYPES,
  PLATFORMS,
  TONES,
  type ContentTypeId,
  type CopywritingResult,
  type PlatformId,
  type ToneId,
  type WordCountId,
} from "./platforms";

export interface CopywritingRequest {
  platform: PlatformId;
  contentType: ContentTypeId;
  tone: ToneId;
  wordCount: WordCountId;
  topic: string;
  keywords?: string;
  targetAudience?: string;
}

function parseKeywords(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,，、\s]+/)
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export function generateLocalCopywriting(
  req: CopywritingRequest
): CopywritingResult {
  const platformMeta = PLATFORMS[req.platform];
  const typeLabel =
    CONTENT_TYPES.find((c) => c.id === req.contentType)?.label ?? "干货分享";
  const toneLabel = TONES.find((t) => t.id === req.tone)?.label ?? "真诚自然";
  const topic = req.topic.trim() || "高效工作与内容创作";
  const kwList = parseKeywords(req.keywords);
  const audience = req.targetAudience?.trim() || "正在寻找突破的创作者与职场人";

  const titles = buildTitles(req.platform, topic, req.contentType);
  const hook = buildHook(req.platform, topic, req.tone, audience);
  const body = buildBody(req, topic, audience, kwList, typeLabel, toneLabel);
  const cta = buildCta(req.platform, topic);
  const tags = buildTags(req.platform, topic, kwList, typeLabel);

  return {
    id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    platform: req.platform,
    contentType: req.contentType,
    tone: req.tone,
    topic,
    titles,
    hook,
    body,
    tags,
    cta,
    tips: platformMeta.algorithmTips,
    mode: "local",
    createdAt: new Date().toISOString(),
  };
}

function buildTitles(
  platform: PlatformId,
  topic: string,
  contentType: ContentTypeId
): string[] {
  if (platform === "douyin") {
    return [
      `别再盲目试错了！关于「${topic}」，这3个底层动作直接拉开差距`,
      `为什么同样做${topic}，别人总能稳稳起量？看懂这一步就够了`,
      `建议收藏：把「${topic}」做透的真实经验，普通人也能直接套用`,
    ];
  }
  if (platform === "toutiao") {
    return [
      `深度拆解「${topic}」：大多数人忽略的3个关键细节，越早看清越受益`,
      `为什么越来越多人开始重视${topic}？内行人总结的实战规律全在这里`,
      `从0到1理清「${topic}」：避开这4个常见误区，效率至少提升一倍`,
    ];
  }
  if (platform === "kuaishou") {
    return [
      `说句实在话，做「${topic}」千万别走弯路，老铁们看这一条就明白了`,
      `实打实分享！我摸索了很久的「${topic}」笨办法，反而最管用`,
      `真心建议：如果你也在琢磨${topic}，这几个土办法一定要试试`,
    ];
  }
  const angle =
    contentType === "emotion"
      ? "治愈与清醒"
      : contentType === "opinion"
        ? "深度思考"
        : "实战复盘";
  return [
    `关于「${topic}」的${angle}：真正拉开差距的，从来不是努力程度`,
    `写给所有关注${topic}的人：慢下来，把核心问题一次想透`,
    `在「${topic}」这件事上，我花了一年才验证出的3条长期原则`,
  ];
}

function buildHook(
  platform: PlatformId,
  topic: string,
  tone: ToneId,
  audience: string
): string {
  const tonePrefix =
    tone === "sharp"
      ? "先说一个反直觉的结论："
      : tone === "warm"
        ? "不知道你有没有过这样的时刻："
        : tone === "humorous"
          ? "说出来你可能不信，之前我也在这件事上交了不少学费："
          : "今天不绕弯子，直接聊透一件事：";

  if (platform === "douyin") {
    return `${tonePrefix}很多${audience}做「${topic}」之所以一直卡住，不是不够拼，而是从第一步的发力方向就错了。停下来听完这 30 秒，你至少能省下两周的无效摸索。`;
  }
  if (platform === "toutiao") {
    return `最近「${topic}」成了不少人讨论的焦点。对于${audience}而言，真正决定结果上限的往往不是信息量，而是你能否识别出其中的关键变量。下面把核心逻辑拆开讲清楚。`;
  }
  if (platform === "kuaishou") {
    return `老铁们，今天咱掏心窝子聊聊「${topic}」。外面讲得天花乱坠的套路咱不整，就说说咱们普通人平时真能用得上的实在经验。`;
  }
  return `在和许多${audience}交流后，我发现一个共性问题：大家在面对「${topic}」时，往往投入了大量时间，却始终觉得缺少一点确定性。今天这篇文章，我们试着把这件事的底层脉络理顺。`;
}

function buildBody(
  req: CopywritingRequest,
  topic: string,
  audience: string,
  kwList: string[],
  typeLabel: string,
  toneLabel: string
): string {
  const kwNote =
    kwList.length > 0 ? `（重点聚焦：${kwList.join("、")}）` : "";

  if (req.platform === "douyin") {
    const base = [
      `第一，先做减法，再谈放大。`,
      `在「${topic}」里${kwNote}，80% 的人败在贪多求全。与其同时追十个热点，不如先把最核心的一个动作打磨到极致。`,
      ``,
      `第二，用结果倒推过程，别自嗨。`,
      `很多${audience}容易陷入“我觉得不错”的误区。真正有效的做法是先看用户到底为什么停下来、为什么愿意转发，把每一个关键节点做成可复制的标准动作。`,
      ``,
      `第三，建立最小正反馈闭环。`,
      `不要等全部完美再开始。今天先跑通一个最小样本，看数据反馈，保留有效部分，砍掉冗余环节，下一轮就会明显顺畅很多。`,
    ];
    if (req.wordCount === "long") {
      base.push(
        ``,
        `第四，保持稳定输出节奏。`,
        `推流算法偏爱持续且垂直的创作者。把「${topic}」拆成系列选题，用${toneLabel}的表达方式连续输出，系统自然会为你匹配更精准的人群。`
      );
    }
    return base.join("\n");
  }

  if (req.platform === "toutiao") {
    const sections = [
      `一、为什么「${topic}」容易陷入低效循环？`,
      `对于${audience}来说，常见的问题并不是缺少资料，而是缺乏一套稳定的判断框架${kwNote}。当信息碎片化堆叠时，越努力反而越容易焦虑。`,
      ``,
      `二、破局的三个核心步骤（${typeLabel}视角）`,
      `1. 明确核心目标：先界定清楚当前阶段最需要解决的单一问题，避免战线拉得过长。`,
      `2. 抓住关键杠杆：在「${topic}」中，真正产生 80% 价值的是结构化复盘与高频迭代，而不是机械重复。`,
      `3. 建立验证清单：每次实践后记录关键数据与体感变化，用客观反馈替代主观猜测。`,
    ];
    if (req.wordCount !== "short") {
      sections.push(
        ``,
        `三、给当下实践者的具体建议`,
        `采用${toneLabel}的沟通与执行节奏，从今天就能落地的小切口开始。哪怕每天只优化一个环节，一个月后的复利效应也会非常明显。`
      );
    }
    return sections.join("\n");
  }

  if (req.platform === "kuaishou") {
    return [
      `一说「${topic}」${kwNote}，很多老铁第一反应就是觉得门槛高、太复杂。其实真上手干过就知道，核心就三句话：`,
      ``,
      `第一句：别光看不练，先干起来再说。`,
      `咱${audience}最实在的优势就是行动力。不用等什么万事俱备，把手头现成的条件用起来，边做边调比在脑子里空想一百遍都强。`,
      ``,
      `第二句：哪里卡壳补哪里，别硬扛。`,
      `遇到不懂的环节，多看看同行做得好的地方，拆解一下人家的节奏和细节，拿过来结合自己的实际情况改一改，立马就能见效。`,
      ``,
      `第三句：耐住性子，把口碑做出来。`,
      `好东西都是磨出来的。只要咱内容实在、不忽悠人，信任攒起来了，后面的流量和机会自然就水到渠成。`,
    ].join("\n");
  }

  const paragraphs = [
    `01  为什么我们总在「${topic}」上感到用力过猛？`,
    `很多时候，${audience}之所以觉得推进困难，是因为把注意力全放在了“动作数量”上，却忽略了“结构质量”${kwNote}。没有清晰主线的努力，往往只是一种消耗。`,
    ``,
    `真正成熟的创作者，懂得在关键节点上做克制的选择。`,
    ``,
    `02  换个思路：把复杂问题拆解为可感知的日常`,
    `在「${topic}」的实践中，不妨试着用${toneLabel}的视角重新审视手头的工作：`,
    `首先，找到那个能带来长期复利的支点；其次，允许自己有一个不完美但可持续的起步阶段；最后，定期清理无效动作，把精力留给真正重要的事。`,
  ];

  if (req.wordCount !== "short") {
    paragraphs.push(
      ``,
      `03  写在最后`,
      `所有看似突然的突破，背后都是无数次微小校准的叠加。愿你在「${topic}」的探索中，既能保持向前走的锐气，也拥有不被短期波动裹挟的定力。`
    );
  }
  return paragraphs.join("\n");
}

function buildCta(platform: PlatformId, topic: string): string {
  if (platform === "douyin") {
    return `你在「${topic}」上遇到过最大的卡点是什么？打在评论区，点赞最高的问题我下期专门拍一条拆解！`;
  }
  if (platform === "toutiao") {
    return `关于「${topic}」，你更认同哪一种做法？欢迎在评论区分享你的真实经历，大家一起交流参考。`;
  }
  if (platform === "kuaishou") {
    return `觉得今天分享实在的老铁，点个小红心加关注，有啥想了解的「${topic}」问题直接打在公屏上，咱下期接着唠！`;
  }
  return `如果这篇文章对你有启发，欢迎点亮「在看」或转发给身边同样关注「${topic}」的朋友。你在实践中有哪些心得？欢迎在留言区聊聊。`;
}

function buildTags(
  platform: PlatformId,
  topic: string,
  kwList: string[],
  typeLabel: string
): string[] {
  const cleanTopic = topic.replace(/[#\s]/g, "").slice(0, 12);
  const base = [
    cleanTopic,
    typeLabel,
    ...kwList.map((k) => k.replace(/[#\s]/g, "")),
  ].filter(Boolean);

  if (platform === "douyin") {
    base.push("干货分享", "创作灵感");
  } else if (platform === "toutiao") {
    base.push("深度思考", "实用技巧");
  } else if (platform === "kuaishou") {
    base.push("真实分享", "生活经验");
  } else {
    base.push("自我成长", "深度阅读");
  }

  return Array.from(new Set(base)).slice(0, 5);
}
