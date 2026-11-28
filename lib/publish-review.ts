import {
  scanSensitiveEntities,
  type SensitiveMatch,
  type TextRedactionRecord,
} from "./text-redaction";

export type ReviewRiskCategory = "privacy" | "compliance" | "image";
export type ReviewRiskSeverity = "high" | "medium";

export interface ReviewRiskItem {
  id: string;
  category: ReviewRiskCategory;
  severity: ReviewRiskSeverity;
  title: string;
  detail: string;
  matchedText?: string;
  suggestedReplacement?: string;
  canWaive: boolean;
}

export type FactCategory = "amount" | "people" | "quantity" | "date";

export interface ReviewFactItem {
  key: string;
  category: FactCategory;
  categoryLabel: string;
  value: string;
  contextSnippet: string;
}

export interface PublishReviewState {
  checkedAt?: string;
  checkedFingerprint?: string;
  waivedRiskIds: string[];
  confirmedFactKeys: string[];
  approvedAt?: string;
}

export interface PublishReviewReport {
  fingerprint: string;
  privacyMatches: SensitiveMatch[];
  riskItems: ReviewRiskItem[];
  factItems: ReviewFactItem[];
  unresolvedRiskCount: number;
  unconfirmedFactCount: number;
  isStale: boolean;
  isEligible: boolean;
}

export const FACT_CATEGORY_META: Record<FactCategory, { label: string; badgeClass: string }> = {
  amount: {
    label: "金额",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  people: {
    label: "人数",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  quantity: {
    label: "物资/数量",
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
  },
  date: {
    label: "日期/时间",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

const BUILTIN_COMPLIANCE_RULES: Array<{
  id: string;
  pattern: RegExp;
  title: string;
  detail: string;
  severity: ReviewRiskSeverity;
}> = [
  {
    id: "abs-claim",
    pattern: /(100%|百分百|彻底根治|包治百病|绝对有效|全网最|史上最)/g,
    title: "包含绝对化或夸大表述",
    detail: "公益宣传应客观平实，避免绝对化或夸大效果承诺，建议修改为具体事实描述。",
    severity: "high",
  },
  {
    id: "private-transfer",
    pattern: /(私下转账|加微信转账|个人收款码|直接打给我|私人账户收款)/g,
    title: "包含非公开/私人募捐收款引导",
    detail: "公益募捐须引导至合法公开募捐渠道，禁止引导向个人账户转账。",
    severity: "high",
  },
  {
    id: "dignity-risk",
    pattern: /(可怜虫|最惨|施舍|乞讨式)/g,
    title: "可能存在过度卖惨或影响受助人尊严的措辞",
    detail: "建议采用平等、尊重、有尊严的叙事方式，避免消费苦难。",
    severity: "medium",
  },
];

export function computeContentFingerprint(title: string, hook: string, body: string): string {
  const raw = `${title}\n---\n${hook}\n---\n${body}`;
  let hash = 5381;
  for (let i = 0; i < raw.length; i += 1) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) >>> 0;
  }
  return `${raw.length}_${hash.toString(16)}`;
}

function extractSnippet(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 14);
  const end = Math.min(text.length, index + length + 14);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end).replace(/\s+/g, " ")}${suffix}`;
}

export function extractFactItems(text: string): ReviewFactItem[] {
  if (!text.trim()) return [];
  const found = new Map<string, ReviewFactItem>();

  const register = (category: FactCategory, value: string, index: number) => {
    const clean = value.trim();
    if (!clean) return;
    const key = `${category}:${clean}`;
    if (found.has(key)) return;
    found.set(key, {
      key,
      category,
      categoryLabel: FACT_CATEGORY_META[category].label,
      value: clean,
      contextSnippet: extractSnippet(text, index, clean.length),
    });
  };

  // 1. Amounts (元 / 万元 / 块 / ￥)
  const amountRegex = /(?:￥|¥)?\d[\d,]*(?:\.\d+)?\s*(?:万元|千元|亿元|元|块钱|块)/g;
  for (const m of text.matchAll(amountRegex)) {
    register("amount", m[0], m.index ?? 0);
  }

  // 2. People counts (名/位/个/户/人 + optional role)
  const peopleRegex =
    /\d[\d,]*(?:余|多)?\s*(?:名|位|人|户)(?:[\u4e00-\u9fa5]{0,4}(?:学生|儿童|孩子|志愿者|老人|居民|村民|家庭|患者|医师|老师|群众))?/g;
  for (const m of text.matchAll(peopleRegex)) {
    register("people", m[0], m.index ?? 0);
  }

  // 3. Goods / quantities
  const quantityRegex =
    /\d[\d,]*(?:余|多)?\s*(?:册|本|件|箱|套|组|只|条|份|袋|公斤|千克|吨|间)(?:[\u4e00-\u9fa5]{0,4})?/g;
  for (const m of text.matchAll(quantityRegex)) {
    // Skip common non-factual phrases like "30秒" (not matched) or "1条留言"
    if (/^[1一]条(?:留言|评论|视频)/.test(m[0])) continue;
    register("quantity", m[0], m.index ?? 0);
  }

  // 4. Dates
  const dateRegex = /(?:20\d{2}[年/-]\d{1,2}[月/-]\d{1,2}日?|\d{1,2}月\d{1,2}[日号])/g;
  for (const m of text.matchAll(dateRegex)) {
    register("date", m[0], m.index ?? 0);
  }

  return Array.from(found.values());
}

export function evaluatePublishReview(params: {
  title: string;
  hook: string;
  body: string;
  orgRedlines?: string;
  unredactedImageCount?: number;
  redactionRecords?: TextRedactionRecord[];
  reviewState?: PublishReviewState;
}): PublishReviewReport {
  const { title, hook, body, orgRedlines, unredactedImageCount = 0, reviewState } = params;

  const combined = [title, hook, body].filter(Boolean).join("\n");
  const fingerprint = computeContentFingerprint(title, hook, body);

  // 1. Sync privacy detections from text-redaction engine
  const privacyMatches = scanSensitiveEntities(combined);
  const riskItems: ReviewRiskItem[] = privacyMatches.map((m) => ({
    id: `privacy:${m.id}`,
    category: "privacy",
    severity: "high",
    title: `检测到未脱敏${m.categoryLabel}：「${m.original}」`,
    detail: `在「编辑脱敏」中建议替换为「${m.suggestedReplacement}」，脱敏后此风险项自动消除。`,
    matchedText: m.original,
    suggestedReplacement: m.suggestedReplacement,
    canWaive: false,
  }));

  // 2. Built-in charity compliance checks
  for (const rule of BUILTIN_COMPLIANCE_RULES) {
    const matches = Array.from(combined.matchAll(rule.pattern));
    if (matches.length > 0) {
      const uniqueWords = Array.from(new Set(matches.map((m) => m[0]))).join("、");
      riskItems.push({
        id: `compliance:${rule.id}`,
        category: "compliance",
        severity: rule.severity,
        title: `${rule.title}（${uniqueWords}）`,
        detail: rule.detail,
        matchedText: uniqueWords,
        canWaive: rule.severity !== "high",
      });
    }
  }

  // 3. Organization custom redline words
  if (orgRedlines?.trim()) {
    const words = orgRedlines
      .split(/[,，、;\n]+/)
      .map((w) => w.trim())
      .filter(Boolean);
    for (const word of words) {
      if (combined.includes(word)) {
        riskItems.push({
          id: `org-redline:${word}`,
          category: "compliance",
          severity: "high",
          title: `命中机构红线词：「${word}」`,
          detail: "该词位于「机构中心」设置的红线禁用词列表中，请修改正文后再发布。",
          matchedText: word,
          canWaive: false,
        });
      }
    }
  }

  // 4. Image redaction check (workflow)
  if (unredactedImageCount > 0) {
    riskItems.push({
      id: "image:unredacted",
      category: "image",
      severity: "medium",
      title: `有 ${unredactedImageCount} 张配图未开启自动打码`,
      detail:
        "若配图包含未成年人、受助人正脸或门牌车牌，请先在配图条开启「打码」并重新处理；若确认无隐私信息，可人工确认豁免。",
      canWaive: true,
    });
  }

  // 5. Factual reminders (NO right/wrong judgment)
  const factItems = extractFactItems(combined);

  const waivedSet = new Set(reviewState?.waivedRiskIds ?? []);
  const confirmedSet = new Set(reviewState?.confirmedFactKeys ?? []);

  const unresolvedRiskCount = riskItems.filter((r) => !(r.canWaive && waivedSet.has(r.id))).length;
  const unconfirmedFactCount = factItems.filter((f) => !confirmedSet.has(f.key)).length;

  const hasChecked = Boolean(reviewState?.checkedAt);
  const isStale = hasChecked && reviewState?.checkedFingerprint !== fingerprint;

  const isEligible =
    hasChecked && !isStale && unresolvedRiskCount === 0 && unconfirmedFactCount === 0;

  return {
    fingerprint,
    privacyMatches,
    riskItems,
    factItems,
    unresolvedRiskCount,
    unconfirmedFactCount,
    isStale,
    isEligible,
  };
}
