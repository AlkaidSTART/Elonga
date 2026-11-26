export type SensitiveCategory =
  | "name"
  | "address"
  | "phone"
  | "idCard"
  | "school";

export interface SensitiveMatch {
  id: string;
  category: SensitiveCategory;
  categoryLabel: string;
  original: string;
  suggestedReplacement: string;
  contextSnippet: string;
  occurrences: number;
}

export interface TextRedactionRecord {
  id: string;
  category: SensitiveCategory | "custom";
  categoryLabel: string;
  original: string;
  replacement: string;
  appliedAt: string;
}

export const SENSITIVE_CATEGORY_META: Record<
  SensitiveCategory | "custom",
  { label: string; badgeClass: string }
> = {
  name: {
    label: "姓名",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
  address: {
    label: "住址",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  phone: {
    label: "联系方式",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
  idCard: {
    label: "证件/编号",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  },
  school: {
    label: "学校/医院",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
  },
  custom: {
    label: "自定义脱敏",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

const COMMON_SURNAMES =
  "王李张刘陈杨赵黄周吴徐孙胡朱高林何郭马罗梁宋郑谢韩唐冯于董萧程曹袁邓许傅沈曾彭吕苏卢蒋蔡贾丁魏薛叶阎余潘杜戴夏钟汪田任姜范方石姚谭廖邹熊金陆郝孔白崔康毛邱秦江史顾侯邵孟龙万段雷钱汤尹黎易常武乔贺赖龚文";

const NAME_FALSE_POSITIVES = new Set([
  "工作人员",
  "爱心人士",
  "志愿服务",
  "高效率",
  "高水平",
  "白血病",
  "小朋友",
  "小学生",
  "中学生",
  "大学生",
  "老奶奶",
  "老爷爷",
  "负责人",
  "管理员",
  "委员会",
  "林区",
  "高年级",
  "高标准",
  "金秋",
  "文具",
  "文学",
  "文明",
  "文化",
]);

function extractSnippet(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 14);
  const end = Math.min(text.length, index + length + 14);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end).replace(/\s+/g, " ")}${suffix}`;
}

function countOccurrences(text: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(needle, pos)) !== -1) {
    count += 1;
    pos += needle.length;
  }
  return count;
}

function suggestNamePseudonym(name: string, roleHint: string): string {
  const surname = name.slice(0, 1);
  if (/学生|孩子|女孩|男孩|儿童|同学/.test(roleHint)) {
    return `小${surname}（化名）`;
  }
  if (/奶奶|阿姨|妈妈|女士/.test(roleHint)) {
    return `${surname}阿姨（化名）`;
  }
  if (/爷爷|大叔|爸爸|老人/.test(roleHint)) {
    return `${surname}大叔（化名）`;
  }
  if (/志愿者|社工|老师|医生/.test(roleHint)) {
    return `${surname}某（化名）`;
  }
  return `小${surname}（化名）`;
}

export function scanSensitiveEntities(text: string): SensitiveMatch[] {
  if (!text.trim()) return [];

  const found = new Map<string, SensitiveMatch>();

  const register = (
    category: SensitiveCategory,
    original: string,
    suggestedReplacement: string,
    index: number
  ) => {
    const clean = original.trim();
    if (!clean) return;
    if (clean.includes("化名") || clean.includes("已模糊") || clean.includes("已隐去")) {
      return;
    }
    const key = `${category}:${clean}`;
    if (found.has(key)) return;
    const occurrences = countOccurrences(text, clean);
    if (occurrences === 0) return;

    found.set(key, {
      id: key,
      category,
      categoryLabel: SENSITIVE_CATEGORY_META[category].label,
      original: clean,
      suggestedReplacement,
      contextSnippet: extractSnippet(text, index, clean.length),
      occurrences,
    });
  };

  // 1. Names with charity/context role prefix
  const nameRegex = new RegExp(
    `(受助人|受助学生|受助儿童|学生|孩子|小女孩|小男孩|患者|老人|村民|居民|志愿者|社工|家长|同学|小朋友|老师|医生|女士|先生)[\\s：:]*([${COMMON_SURNAMES}][\\u4e00-\\u9fa5]{1,2})(?![\\u4e00-\\u9fa5]*（化名）)`,
    "g"
  );
  for (const match of text.matchAll(nameRegex)) {
    const roleHint = match[1] ?? "";
    const candidate = match[2] ?? "";
    if (!candidate || candidate.endsWith("某") || NAME_FALSE_POSITIVES.has(candidate)) {
      continue;
    }
    // Check if immediately followed by （化名） or (化名)
    const afterIdx = (match.index ?? 0) + match[0].length;
    const trailing = text.slice(afterIdx, afterIdx + 5);
    if (trailing.startsWith("（化名") || trailing.startsWith("(化名")) {
      continue;
    }
    register(
      "name",
      candidate,
      suggestNamePseudonym(candidate, roleHint),
      (match.index ?? 0) + match[0].indexOf(candidate)
    );
  }

  // 2. Detailed addresses (street/community + building/room or full hierarchy)
  const addressRegexes = [
    /[\u4e00-\u9fa5]{2,10}(?:路|街|巷|弄|村|社区|小区|家园|花园|大厦|广场)\d{1,4}(?:号|栋|幢|座|单元|楼|室)[\u4e00-\u9fa5\d号栋幢座单元楼室-]*/g,
    /[\u4e00-\u9fa5]{2,5}(?:省|自治区)[\u4e00-\u9fa5]{2,6}(?:市|州)[\u4e00-\u9fa5]{2,6}(?:区|县|市)[\u4e00-\u9fa5]{2,10}(?:镇|乡|街道|村|社区)[\u4e00-\u9fa5\d号栋室-]{0,10}/g,
  ];
  for (const regex of addressRegexes) {
    for (const match of text.matchAll(regex)) {
      const raw = match[0];
      if (raw.includes("某社区") || raw.includes("某乡村") || raw.includes("某小区")) {
        continue;
      }
      const replacement = raw.includes("村")
        ? "当地某村（地址已模糊）"
        : "当地某社区（地址已模糊）";
      register("address", raw, replacement, match.index ?? 0);
    }
  }

  // 3. Phone numbers (mobile & landline)
  const mobileRegex = /(?<!\d)(1[3-9]\d)(\d{4})(\d{4})(?!\d)/g;
  for (const match of text.matchAll(mobileRegex)) {
    register("phone", match[0], `${match[1]}****${match[3]}`, match.index ?? 0);
  }
  const landlineRegex = /(?<!\d)0\d{2,3}-\d{7,8}(?!\d)/g;
  for (const match of text.matchAll(landlineRegex)) {
    register("phone", match[0], "[联系方式已隐去]", match.index ?? 0);
  }

  // 4. ID cards & medical/account numbers
  const idCardRegex =
    /(?<!\d)[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx](?!\d)/g;
  for (const match of text.matchAll(idCardRegex)) {
    register("idCard", match[0], "[证件号已隐去]", match.index ?? 0);
  }
  const recordNoRegex = /(?:病历号|医保号|住院号|学号|银行卡号)[\s：:]*[A-Za-z0-9-]{5,20}/g;
  for (const match of text.matchAll(recordNoRegex)) {
    register("idCard", match[0], "[敏感编号已隐去]", match.index ?? 0);
  }

  // 5. Specific schools / classes / hospitals
  const schoolRegex =
    /[\u4e00-\u9fa5]{2,10}(?:小学|中学|初中|高中|幼儿园)(?:[\u4e00-\u9fa5\d一二三四五六七八九]{1,4}(?:年级|班))?/g;
  for (const match of text.matchAll(schoolRegex)) {
    const raw = match[0];
    if (
      raw.startsWith("某") ||
      raw.includes("某乡村") ||
      raw.includes("乡村小学") ||
      raw.includes("希望小学")
    ) {
      continue;
    }
    register("school", raw, "当地某学校（已模糊）", match.index ?? 0);
  }
  const hospitalRegex = /[\u4e00-\u9fa5]{2,10}医院[\u4e00-\u9fa5]{1,6}科(?:\d+床)?/g;
  for (const match of text.matchAll(hospitalRegex)) {
    const raw = match[0];
    if (raw.includes("当地某医院") || raw.includes("某医院")) continue;
    register("school", raw, "当地某医院（已模糊）", match.index ?? 0);
  }

  return Array.from(found.values());
}

export function replaceAllLiteral(
  text: string,
  target: string,
  replacement: string
): string {
  if (!target || target === replacement) return text;
  return text.split(target).join(replacement);
}
