export type PlatformId = "douyin" | "toutiao" | "kuaishou" | "wechat";

export type ContentTypeId =
  | "knowledge"
  | "emotion"
  | "hotspot"
  | "review"
  | "story"
  | "opinion";

export type ToneId =
  | "authentic"
  | "sharp"
  | "warm"
  | "humorous"
  | "professional";

export type WordCountId = "short" | "medium" | "long";

export interface PlatformMeta {
  id: PlatformId;
  name: string;
  tagline: string;
  description: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  recommendedLength: string;
  algorithmTips: string[];
}

export const PLATFORMS: Record<PlatformId, PlatformMeta> = {
  douyin: {
    id: "douyin",
    name: "抖音",
    tagline: "强节奏 · 黄金3秒",
    description: "注重前3秒完播率与情绪张力，短句高频输出，结尾留互动钩子。",
    accentColor: "#111827",
    badgeBg: "bg-slate-900",
    badgeText: "text-white",
    recommendedLength: "150 - 350 字（口播 30-60 秒）",
    algorithmTips: [
      "开头前 15 个字必须给出反常识结论、强痛点或直接利益点，提升 3 秒留存率。",
      "多用短句与口语化断句，避免长难句和书面腔，方便直接用于口播或字幕。",
      "结尾设置二选一或开放式提问，引导评论区讨论以撬动下一波流量池。",
    ],
  },
  toutiao: {
    id: "toutiao",
    name: "今日头条",
    tagline: "重标题 · 信息增量",
    description: "侧重图文点击率与阅读完成度，标题需有明确悬念或事实冲突，内容重条理。",
    accentColor: "#DC2626",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-700",
    recommendedLength: "600 - 1200 字（结构化长图文）",
    algorithmTips: [
      "标题包含具体数字、人群定位或反差事实，提升信息流推荐的点击率（CTR）。",
      "首段快速交代背景与核心结论，避免铺垫过长导致用户跳出。",
      "正文使用小标题分段（如一、二、三），每段控制在 3-5 行以内提升手机端阅读体验。",
    ],
  },
  kuaishou: {
    id: "kuaishou",
    name: "快手",
    tagline: "接地气 · 强信任",
    description: "强调真实感、烟火气与老铁式互动，语言直白有温度，注重实用价值。",
    accentColor: "#EA580C",
    badgeBg: "bg-orange-50",
    badgeText: "text-orange-700",
    recommendedLength: "180 - 400 字（真实叙事）",
    algorithmTips: [
      "用“咱”“大家”“老铁们”等拉近距离的称呼，避免高高在上的说教感。",
      "把复杂道理讲成大白话和身边案例，突出真实经验与实操细节。",
      "在正文中间和结尾自然引导点赞关注，强化粉丝粘性与复访率。",
    ],
  },
  wechat: {
    id: "wechat",
    name: "微信公众号",
    tagline: "深阅读 · 易转发",
    description: "注重逻辑深度、金句提炼与社交分享价值，适合沉淀长期读者与私域转化。",
    accentColor: "#059669",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    recommendedLength: "800 - 1800 字（深度排版）",
    algorithmTips: [
      "标题兼顾搜索关键词与情绪共鸣，方便在“看一看”与朋友圈转发传播。",
      "每 300 字左右提炼一句独立成段的金句，提升读者划线收藏与转发意愿。",
      "结尾做价值升华并给出轻量行动建议，增强公众号的长期信任背书。",
    ],
  },
};

export const CONTENT_TYPES: { id: ContentTypeId; label: string; hint: string }[] = [
  { id: "knowledge", label: "干货科普", hint: "拆解方法论与实用技巧" },
  { id: "emotion", label: "情绪共鸣", hint: "切中日常焦虑与温暖瞬间" },
  { id: "hotspot", label: "热点解读", hint: "借势热门话题输出新视角" },
  { id: "review", label: "好物种草", hint: "痛点场景切入+真实体验" },
  { id: "story", label: "故事叙事", hint: "真实经历起承转合抓人" },
  { id: "opinion", label: "观点输出", hint: "鲜明立场引发评论区讨论" },
];

export const TONES: { id: ToneId; label: string }[] = [
  { id: "authentic", label: "真诚自然" },
  { id: "sharp", label: "犀利干练" },
  { id: "warm", label: "温暖治愈" },
  { id: "humorous", label: "幽默风趣" },
  { id: "professional", label: "专业严谨" },
];

export const WORD_COUNTS: { id: WordCountId; label: string; desc: string }[] = [
  { id: "short", label: "精简短篇", desc: "约 200 字" },
  { id: "medium", label: "标准篇幅", desc: "约 500 字" },
  { id: "long", label: "深度长文", desc: "约 1000 字+" },
];

export interface CopywritingResult {
  id: string;
  platform: PlatformId;
  contentType: ContentTypeId;
  tone: ToneId;
  topic: string;
  titles: string[];
  hook: string;
  body: string;
  tags: string[];
  cta: string;
  tips: string[];
  mode: "ai" | "local";
  createdAt: string;
  isPublished?: boolean;
  publishedAt?: string;
  isViral?: boolean;
}
