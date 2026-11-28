import type { PlatformId } from "@/lib/platforms";
import type {
  PlatformWritingGuidance,
  PlatformWritingSkillDefinition,
  PlatformWritingSkillInput,
} from "./types";

interface PlatformWritingSkillSpec {
  id: string;
  platform: PlatformId;
  name: string;
  shortName: string;
  description: string;
  version: string;
  positioning: string;
  titleRules: string[];
  coverAndVisualRules: string[];
  hookRules: string[];
  bodyStructureRules: string[];
  ctaRules: string[];
  hashtagRules: string[];
  complianceAndPitfalls: string[];
  quickHighlights: string[];
}

const PLATFORM_WRITING_SKILL_SPECS: Record<PlatformId, PlatformWritingSkillSpec> = {
  douyin: {
    id: "douyin-graphic-writing",
    platform: "douyin",
    name: "抖音图文创作技能",
    shortName: "抖音图文 Skill",
    description:
      "聚焦抖音图文强节奏表达，覆盖 10-15 字悬念标题、黄金 3 秒钩子、三段式短句结构与金字塔标签策略。",
    version: "1.0.0",
    positioning:
      "快节奏、强视觉、高信息密度；以点击率（CTR）、前 3 秒停留与评论区互动为核心推流杠杆。",
    titleRules: [
      "标题控制在 10-15 字以内，确保手机端单行或双行一眼扫完，核心痛点或悬念前置。",
      "优先使用四类高点击公式：数字悬念式（具体数字+痛点+结果）、痛点提问式（你是不是也+困境）、反常识冲突式（颠覆结论+原因）、利益前置式（低门槛+可见改变）。",
      "善用叹号、问号或竖线制造节奏感，避免冗长书面句式与空泛口号。",
    ],
    coverAndVisualRules: [
      "首图主打强视觉冲击或真实前后对比，配合 3-6 字痛点大字标，打断用户快速滑屏惯性。",
      "配图坚持真实高清、主体突出，多图按「悬念首图 -> 现场细节 -> 结果反馈」递进排布。",
    ],
    hookRules: [
      "开头前 15 字内必须给出反常识结论、强痛点提问或直接利益点，守住黄金 3 秒留存。",
      "直接切入具体现场瞬间或数字反差，不做寒暄和漫长背景铺垫。",
    ],
    bodyStructureRules: [
      "采用「钩子 -> 干货/情绪释放 -> 互动号召」三段式结构，总字数精炼紧凑（约 150-350 字）。",
      "全程口语化、对话感，多用「你、我、咱们」拉近距离；干货或步骤用 1、2、3 分点罗列。",
      "严格删去废话与长难句，每段 1-2 句短句断行，确保每一行都提供情绪价值或实用信息。",
    ],
    ctaRules: [
      "结尾设置低门槛互动钩子：二选一提问、经验分享征集或「先赞后看/转发给身边人」引导。",
      "评论区话术自然不生硬，优先激发普通人的表达欲与共鸣接力。",
    ],
    hashtagRules: [
      "采用「金字塔标签组合法」，精选 3-5 个标签：1-2 个核心垂直赛道词 + 1-2 个目标人群/场景词 + 1 个大盘流量词。",
      "严禁堆砌无关热词，避免打乱系统人群标签导致推荐失准。",
    ],
    complianceAndPitfalls: [
      "拒绝纯 AI 机械腔与假大空套话，必须落到具体时间、细节或真实人物变化。",
      "严禁夸大宣传、卖惨博同情及违规引流表述，保持公益传播的真诚与克制。",
    ],
    quickHighlights: [
      "标题控在 10-15 字：数字悬念 / 痛点提问 / 反常识冲突前置。",
      "前 15 字定生死：直接抛现场反差或核心结论，零铺垫进入正题。",
      "正文三段式短句：口语化对话感 + 1/2/3 清单，废话全删。",
      "金字塔 3-5 个标签 + 结尾二选一/开放式提问撬动评论区流量。",
    ],
  },

  toutiao: {
    id: "toutiao-graphic-writing",
    platform: "toutiao",
    name: "今日头条图文创作技能",
    shortName: "今日头条图文 Skill",
    description:
      "适配今日头条信息流与微头条推荐机制，强化事实冲突标题、凤头猪肚豹尾叙事、信息增量与评论区站队互动。",
    version: "1.0.0",
    positioning:
      "基于兴趣的注意力分配赛马机制；冷启动重点考核点击率（CTR）、读完率/停留时长与评论区讨论热度。",
    titleRules: [
      "围绕人性好奇与公共关切拟题，突出信息差、人群定位、具体数字或事实冲突。",
      "常用四类爆款结构：悬念好奇式、观点对立/争议式、颠覆常识式、强共鸣代入式（善用「你/我/我们」）。",
      "避免低质标题党与文不对题，确保标题承诺的事实或答案在正文中得到充分兑现。",
    ],
    coverAndVisualRules: [
      "微头条建议搭配 3 张或 6 张高清契合的现场图，图文长文每 3-5 段插入 1 张纪实配图或数据图，提升停留时长。",
      "封面图优先选择有故事张力、主体清晰、无杂乱水印的真实场景照片。",
    ],
    hookRules: [
      "信息流仅露出前两行，首段必须直切核心冲突、关键数据或吸睛结论，杜绝冗长导语。",
      "先回应公众最关心的「真实需求在哪里、善意如何落地」，快速建立公信力。",
    ],
    bodyStructureRules: [
      "遵循「凤头（抛事件/冲突）- 猪肚（述事实+亮鲜明观点）- 豹尾（抛问题引讨论）」结构。",
      "中长图文控制在 800-1500 字左右，使用「一、二、三」小标题分层，每段 3-5 行短段落便于手机阅读。",
      "必须提供明确「信息增量」：真实一线细节、具体数据、本地化案例或深度点评，切忌泛泛而谈与中庸和稀泥。",
    ],
    ctaRules: [
      "结尾不把话说死，主动抛出开放式或二选一讨论题（如「如果是你，你会怎么选」「你怎么看这件事」），撬动评论区热度。",
      "可同步设计一条适合作者自评「抢沙发」的延伸话题，带动前排读者讨论。",
    ],
    hashtagRules: [
      "提炼 3-5 个高垂直度领域关键词作为标签（如民生观察、公益一线、透明回访等），强化账号垂直标签识别。",
      "在标题与首尾段自然融入核心检索词，延长内容的长尾推荐周期。",
    ],
    complianceAndPitfalls: [
      "坚决去 AI 味、反洗稿、反搬运，突出原创一线视角与可核验的事实进展。",
      "立场客观克制，不制造极端对立或虚假焦虑，维护机构公信力。",
    ],
    quickHighlights: [
      "标题重事实冲突、具体数字与人群代入，杜绝文不对题。",
      "前两行直切核心事件与数据，正文用「一、二、三」小标题提升读完率。",
      "提供真实一线信息增量与鲜明观点，避开空洞 AI 腔。",
      "结尾埋下开放式讨论钩子，用评论区热度撬动更大流量池。",
    ],
  },

  xiaohongshu: {
    id: "xiaohongshu-graphic-writing",
    platform: "xiaohongshu",
    name: "小红书图文笔记创作技能",
    shortName: "小红书笔记 Skill",
    description:
      "针对小红书双列信息流与搜索长尾生态，打磨 20 字内吸睛标题、3:4 首图思维、轻量留白排版与收藏评论双转化。",
    version: "1.0.0",
    positioning:
      "重视觉点击与搜索 SEO 的种草/干货社区；核心漏斗为「精准选题+搜索词 -> 0.5 秒首图与标题点击 -> 干货/共鸣促收藏评论」。",
    titleRules: [
      "严格控制在 20 字以内，做到「制造情绪 + 给出利益 + 激发好奇」。",
      "高频爆款公式：数字量化型（3 步搞定/5 个细节）、人群圈定型（普通人必看/新手友好）、利益清单型（整理好了/建议码住）、反认知吐槽型（听劝/别再踩坑）。",
      "标题自然嵌入 1 个核心搜索关键词，并可用竖线「|」做清晰视觉分隔。",
    ],
    coverAndVisualRules: [
      "首图首选竖屏 3:4 比例，遵循「三少原则」（风格统一少变、少杂乱贴纸、少遮挡主体）。",
      "按内容形态选版式：干货清单用干净大字报，纪实故事用真实场景图+一行二级金句，行动成果用前后对比图。",
    ],
    hookRules: [
      "前 1-2 行像朋友聊天一样切入真实体验或痛点共鸣，告别高高在上的「知识诅咒」。",
      "先回答读者潜台词：「这跟我有什么关系？看完能帮我解决什么或带来什么启发？」",
    ],
    bodyStructureRules: [
      "采用「共鸣引子 -> 分点干货/真实记录 -> 轻互动收尾」三段式，篇幅轻快（250-600 字）。",
      "拒绝密集文字块：每行尽量简洁，每段不超过 3-4 行，善用空行留白与 1、2、3 数字清单或小标题提升扫读体验。",
      "在正文前中后自然埋入行业核心词与长尾搜索词，助力系统收录进搜索流量池。",
    ],
    ctaRules: [
      "结尾自然引导「点赞收藏防走丢」与评论区轻互动（如征集想法、邀请分享身边小事或答疑）。",
      "抛出具体且好回答的问题，提升评论、转发、关注比。",
    ],
    hashtagRules: [
      "精选 3-5 个精准话题标签：1 个大盘热度词 + 2 个精准垂直场景词 + 1-2 个品牌/主题词。",
      "标签与正文搜索词保持一致，兼顾推荐流曝光与搜索长尾流量。",
    ],
    complianceAndPitfalls: [
      "严格去 AI 味：加入真实个人观察、现场微细节与真实情绪，拒绝空洞套话。",
      "严禁极限词、医疗/效果夸大宣传及生硬私域引流话术，遵循平台内容合规要求。",
    ],
    quickHighlights: [
      "标题严控 20 字内：人群圈定 + 数字清单 + 核心搜索词。",
      "首图按 3:4 竖屏思路设计，正文短段多留白（每段 3-4 行内）。",
      "像朋友聊天一样写「真实体验 + 可执行清单」，自然埋入 SEO 长尾词。",
      "结尾引导收藏与评论区交流，搭配「1 大盘 + 2 垂直 + 1 主题」标签。",
    ],
  },

  wechat: {
    id: "wechat-graphic-writing",
    platform: "wechat",
    name: "微信公众号图文创作技能",
    shortName: "公众号图文 Skill",
    description:
      "面向公众号推荐流与朋友圈转发场景，强调节制耐读标题、前 3 行留存开头、300 字一钩子节奏与金句社交裂变。",
    version: "1.0.0",
    positioning:
      "私域信任沉淀与公域推荐并重；标题封面定打开率，开头与节奏定完读率，金句共鸣与价值感定「在看」与朋友圈转发率。",
    titleRules: [
      "字数控制在 25-30 字以内，核心关键词靠前，兼顾搜一搜检索与朋友圈转发体面感。",
      "抛弃老旧震惊体，优先采用：数字量化型、悬念反常识型、痛点利益直击型或「写给特定读者」共鸣型。",
    ],
    coverAndVisualRules: [
      "封面图与标题互为补充，克制有质感；正文每 3-5 段配 1 张高度契合文意的纪实图或信息图，避免泛滥表情包破坏沉浸感。",
      "排版讲究呼吸感与色彩克制，重点观点用加粗或独立引用块突出。",
    ],
    hookRules: [
      "守住开头前 3 行生死线，推荐三种高完读切入法：热点/故事承载干货、痛点场景直击、颠覆认知金句开篇。",
      "在开篇给出清晰的「阅读承诺」，让读者知道读完能获得什么启发或事实解答。",
    ],
    bodyStructureRules: [
      "篇幅适合深度展开（800-1800 字），使用「01 / 02 / 03」小节推进，层层递进。",
      "遵循「300 字一个钩子」原则：每隔 300-500 字设置一个小反转、真实案例、结构化清单或独立成段的金句，打破阅读疲劳。",
      "降低手机端认知负荷：多用短句与单句成段，核心方法论或关键结论清晰提炼，方便浅阅读用户一眼带走价值。",
    ],
    ctaRules: [
      "结尾做克制的价值升华，给出轻量化行动建议，增强机构长期信任背书。",
      "自然引导点亮「在看」、转发给志同道合的朋友或在留言区分享真实感受。",
    ],
    hashtagRules: [
      "精选 3-5 个兼具搜索价值与主题聚焦的标签，便于文章进入微信搜一搜与看一看推荐流。",
      "关键词与正文核心议题一致，沉淀垂直领域专业度。",
    ],
    complianceAndPitfalls: [
      "坚持平等、有尊严的公益叙事，不居高临下说教，不靠苦情卖惨博取转发。",
      "避免生搬硬套 AI 模板，确保有真实案例、透明进展与可复用的观点价值。",
    ],
    quickHighlights: [
      "标题 25-30 字内：克制耐读，兼顾搜一搜关键词与朋友圈转发体面感。",
      "开头前 3 行用故事/痛点/金句立住阅读承诺，稳住完读率。",
      "每 300-500 字埋一个小钩子或独立金句，01/02/03 分节+短句排版。",
      "结尾价值升华并自然引导「在看」与转发，沉淀长期公信力。",
    ],
  },
};

export function formatPlatformWritingSkillPrompt(spec: PlatformWritingSkillSpec): string {
  const formatBullets = (items: string[]) => items.map((item) => `  * ${item}`).join("\n");

  return [
    `【已加载平台专属创作 Skill：${spec.name}（${spec.id} v${spec.version}）】`,
    `- 平台算法与传播定位：${spec.positioning}`,
    `- 标题写作规范：\n${formatBullets(spec.titleRules)}`,
    `- 首图与配图配合建议：\n${formatBullets(spec.coverAndVisualRules)}`,
    `- 开头/钩子写法：\n${formatBullets(spec.hookRules)}`,
    `- 正文结构与排版技巧：\n${formatBullets(spec.bodyStructureRules)}`,
    `- 结尾行动号召与互动设计：\n${formatBullets(spec.ctaRules)}`,
    `- 话题标签与搜索词策略：\n${formatBullets(spec.hashtagRules)}`,
    `- 避坑与合规底线：\n${formatBullets(spec.complianceAndPitfalls)}`,
  ].join("\n");
}

function createPlatformWritingSkill(
  spec: PlatformWritingSkillSpec,
): PlatformWritingSkillDefinition {
  return {
    id: spec.id,
    platform: spec.platform,
    name: spec.name,
    shortName: spec.shortName,
    description: spec.description,
    version: spec.version,
    positioning: spec.positioning,
    quickHighlights: spec.quickHighlights,
    async execute(_input?: PlatformWritingSkillInput): Promise<PlatformWritingGuidance> {
      return {
        skillId: spec.id,
        skillName: spec.name,
        shortName: spec.shortName,
        platform: spec.platform,
        version: spec.version,
        positioning: spec.positioning,
        titleRules: spec.titleRules,
        coverAndVisualRules: spec.coverAndVisualRules,
        hookRules: spec.hookRules,
        bodyStructureRules: spec.bodyStructureRules,
        ctaRules: spec.ctaRules,
        hashtagRules: spec.hashtagRules,
        complianceAndPitfalls: spec.complianceAndPitfalls,
        quickHighlights: spec.quickHighlights,
        promptInstructions: formatPlatformWritingSkillPrompt(spec),
      };
    },
  };
}

export const PLATFORM_WRITING_SKILLS: Record<PlatformId, PlatformWritingSkillDefinition> = {
  douyin: createPlatformWritingSkill(PLATFORM_WRITING_SKILL_SPECS.douyin),
  toutiao: createPlatformWritingSkill(PLATFORM_WRITING_SKILL_SPECS.toutiao),
  xiaohongshu: createPlatformWritingSkill(PLATFORM_WRITING_SKILL_SPECS.xiaohongshu),
  wechat: createPlatformWritingSkill(PLATFORM_WRITING_SKILL_SPECS.wechat),
};

export const PLATFORM_WRITING_SKILL_LIST: PlatformWritingSkillDefinition[] = [
  PLATFORM_WRITING_SKILLS.douyin,
  PLATFORM_WRITING_SKILLS.toutiao,
  PLATFORM_WRITING_SKILLS.xiaohongshu,
  PLATFORM_WRITING_SKILLS.wechat,
];

export function getPlatformWritingSkill(platform: PlatformId): PlatformWritingSkillDefinition {
  return PLATFORM_WRITING_SKILLS[platform] ?? PLATFORM_WRITING_SKILLS.douyin;
}
