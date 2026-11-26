import type { DouyinTrendInsights, SkillTraceItem } from "./skills/types";
import type { TextRedactionRecord } from "./text-redaction";
import type { PublishReviewState } from "./publish-review";

export type PlatformId = "douyin" | "toutiao" | "xiaohongshu" | "wechat";

export type CharityScenarioId = "story" | "activity" | "science";

export type ContentTypeId =
  | CharityScenarioId
  | "knowledge"
  | "emotion"
  | "hotspot"
  | "review"
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
  xiaohongshu: {
    id: "xiaohongshu",
    name: "小红书",
    tagline: "强种草 · 封面吸睛",
    description: "注重首图质感、情绪共鸣与实用干货清单，分段轻快易读，擅长以真实体验撬动收藏与评论。",
    accentColor: "#E11D48",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-700",
    recommendedLength: "250 - 600 字（图文笔记 / 干货清单）",
    algorithmTips: [
      "标题结合人群场景、痛点或数字清单，搭配高质感首图提升点击率（CTR）。",
      "正文多用短段落与清晰要点排版，突出真实体验细节与可参考的行动建议。",
      "文末自然引导收藏、点赞或评论区交流，配合精准垂直话题标签提升长尾搜索流量。",
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

export const CONTENT_TYPES: { id: CharityScenarioId; label: string; hint: string }[] = [
  { id: "story", label: "公益故事", hint: "真实人物与救助日常，用真实细节打动人心" },
  { id: "activity", label: "活动倡议", hint: "志愿招募、物资募捐或公益行动号召" },
  { id: "science", label: "公益科普", hint: "环保、助学、健康等通俗易懂的公益常识" },
];

export const LEGACY_CONTENT_TYPE_LABELS: Record<ContentTypeId, string> = {
  story: "公益故事",
  activity: "活动倡议",
  science: "公益科普",
  knowledge: "公益科普",
  emotion: "公益故事",
  hotspot: "活动倡议",
  review: "活动倡议",
  opinion: "公益科普",
};

export const TONES: { id: ToneId; label: string }[] = [
  { id: "warm", label: "温暖真诚" },
  { id: "authentic", label: "平实自然" },
  { id: "sharp", label: "直击痛点" },
  { id: "humorous", label: "轻松亲切" },
  { id: "professional", label: "客观清晰" },
];

export const WORD_COUNTS: { id: WordCountId; label: string; desc: string }[] = [
  { id: "short", label: "精简短篇", desc: "约 200 字" },
  { id: "medium", label: "标准篇幅", desc: "约 500 字" },
  { id: "long", label: "深度长文", desc: "约 1000 字+" },
];

export interface PublishMetrics {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  conversions?: string;
}

export interface PublishArchiveRecord {
  publishedUrl?: string;
  publishedAt?: string;
  metrics: PublishMetrics;
  archived: boolean;
  archivedAt?: string;
  notes?: string;
}

export const PLATFORM_CREATOR_URLS: Record<PlatformId, { label: string; url: string }> = {
  douyin: { label: "抖音创作者服务平台", url: "https://creator.douyin.com/" },
  toutiao: { label: "头条号创作平台", url: "https://mp.toutiao.com/" },
  kuaishou: { label: "快手创作者服务平台", url: "https://cp.kuaishou.com/" },
  wechat: { label: "微信公众平台", url: "https://mp.weixin.qq.com/" },
};

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
  activityId?: string;
  activityTitle?: string;
  redactionRecords?: TextRedactionRecord[];
  reviewState?: PublishReviewState;
  publishArchive?: PublishArchiveRecord;
  trendInsights?: DouyinTrendInsights;
  skillTraces?: SkillTraceItem[];
}
