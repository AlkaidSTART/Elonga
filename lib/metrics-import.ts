import type { CopywritingResult, PlatformId, PublishArchiveRecord, PublishMetrics } from "./platforms";
import { sanitizeExternalUrl } from "./url-safety";

export interface ParsedMetricsRow {
  rowIndex: number;
  title: string;
  platform: PlatformId;
  publishedUrl?: string;
  publishedAt?: string;
  metrics: PublishMetrics;
  notes?: string;
}

export type MatchReason = "url" | "title-exact" | "title-similar" | "unmatched";

export interface MatchedMetricsRow extends ParsedMetricsRow {
  matchedHistoryId: string | null;
  matchReason: MatchReason;
  matchScore: number;
}

export interface ParseMetricsCsvResult {
  rows: ParsedMetricsRow[];
  warnings: string[];
  detectedColumns: string[];
}

export interface BatchSyncPublishItem {
  targetHistoryId: string | null;
  platform: PlatformId;
  title: string;
  publishedUrl?: string;
  publishedAt?: string;
  metrics: PublishMetrics;
  notes?: string;
  archived: boolean;
}

type CanonicalField =
  | "title"
  | "platform"
  | "publishedUrl"
  | "publishedAt"
  | "views"
  | "likes"
  | "comments"
  | "shares"
  | "conversions"
  | "notes";

const HEADER_ALIASES: Record<CanonicalField, string[]> = {
  title: [
    "标题",
    "作品标题",
    "视频标题",
    "文章标题",
    "笔记标题",
    "内容标题",
    "作品名称",
    "视频名称",
    "图文标题",
    "内容名称",
    "title",
    "作品",
  ],
  platform: ["平台", "发布平台", "渠道", "来源平台", "platform"],
  publishedUrl: [
    "链接",
    "作品链接",
    "发布链接",
    "原文链接",
    "视频链接",
    "文章链接",
    "笔记链接",
    "url",
    "link",
    "publishedurl",
  ],
  publishedAt: [
    "发布时间",
    "发布日期",
    "发表时间",
    "发表日期",
    "投稿时间",
    "创建时间",
    "日期",
    "时间",
    "publishedat",
    "date",
  ],
  views: [
    "播放量",
    "播放数",
    "视频播放量",
    "阅读量",
    "阅读数",
    "图文阅读量",
    "文章阅读量",
    "阅读人数",
    "浏览量",
    "浏览数",
    "观看数",
    "观看量",
    "曝光量",
    "展现量",
    "views",
    "plays",
    "reads",
  ],
  likes: [
    "点赞数",
    "点赞量",
    "点赞",
    "获赞数",
    "在看数",
    "在看",
    "推荐数",
    "赞",
    "likes",
  ],
  comments: ["评论数", "评论量", "评论", "留言数", "留言", "comments"],
  shares: [
    "转发数",
    "转发量",
    "转发",
    "分享数",
    "分享量",
    "分享",
    "收藏数",
    "收藏量",
    "shares",
  ],
  conversions: ["公益转化", "转化备注", "转化", "转化情况", "conversions"],
  notes: ["复盘备注", "备注", "说明", "notes", "remark"],
};

const PLATFORM_ALIASES: Record<PlatformId, string[]> = {
  douyin: ["抖音", "douyin", "dy", "抖音短视频"],
  toutiao: ["今日头条", "头条", "头条号", "toutiao", "tt"],
  xiaohongshu: ["小红书", "xhs", "xiaohongshu", "red"],
  wechat: ["微信公众号", "公众号", "微信", "wechat", "wx", "微信订阅号", "微信服务号"],
};

/**
 * Decode an uploaded CSV/TSV ArrayBuffer, supporting UTF-8 (with or without BOM)
 * and falling back to GB18030/GBK commonly exported by Chinese creator portals.
 */
export function decodeCsvBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // Strip UTF-8 BOM if present
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder("gb18030").decode(bytes);
    } catch {
      return new TextDecoder("utf-8").decode(bytes);
    }
  }
}

/**
 * RFC 4180 compliant delimiter-separated parser supporting quoted fields,
 * escaped quotes (""), embedded newlines, and auto-detecting comma vs tab.
 */
export function parseDelimitedTable(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!text.trim()) return [];

  const firstLine = text.split("\n", 1)[0] ?? "";
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const delimiter = tabCount > commaCount ? "\t" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"' && field.length === 0) {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field.trim());
      field = "";
    } else if (ch === "\n") {
      row.push(field.trim());
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  row.push(field.trim());
  if (row.some((cell) => cell.length > 0)) {
    rows.push(row);
  }

  return rows;
}

/**
 * Parse human-readable metric numbers such as "12,500", "1.2万", "3.5w", "2.4千", "580次".
 */
export function parseMetricCount(raw?: string): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw
    .replace(/[,，\s]/g, "")
    .replace(/(次|人|个|条|赞|播放|阅读)$/u, "")
    .trim();

  if (!cleaned || cleaned === "-" || cleaned === "--" || cleaned === "暂无") {
    return undefined;
  }

  const unitMatch = cleaned.match(/^(\d+(?:\.\d+)?)(万|w|W|千|k|K)?$/);
  if (!unitMatch) {
    const fallback = Number(cleaned);
    return Number.isFinite(fallback) && fallback >= 0 ? Math.round(fallback) : undefined;
  }

  const base = Number(unitMatch[1]);
  if (!Number.isFinite(base) || base < 0) return undefined;

  const unit = unitMatch[2]?.toLowerCase();
  const multiplier = unit === "万" || unit === "w" ? 10000 : unit === "千" || unit === "k" ? 1000 : 1;
  return Math.round(base * multiplier);
}

/**
 * Parse common Chinese/ISO date strings like "2026-11-20", "2026/11/20 14:30", "2026年11月20日".
 */
export function parsePublishedDate(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "-" || trimmed === "--") return undefined;

  const normalized = trimmed
    .replace(/年/g, "-")
    .replace(/月/g, "-")
    .replace(/日/g, "")
    .replace(/\//g, "-")
    .replace(/\s+/g, " ")
    .trim();

  const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch;
    const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T12:00:00.000Z`;
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }

  const dateTimeMatch = normalized.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})[\sT](\d{1,2}):(\d{2})(?::(\d{2}))?/,
  );
  if (dateTimeMatch) {
    const [, y, m, d, hh, mm, ss = "00"] = dateTimeMatch;
    const parsed = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      Number(ss),
    );
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }

  const direct = new Date(trimmed);
  return Number.isNaN(direct.getTime()) ? undefined : direct.toISOString();
}

export function normalizePlatformName(raw: string | undefined, fallback: PlatformId): PlatformId {
  if (!raw) return fallback;
  const key = raw.trim().toLowerCase();
  if (!key) return fallback;

  for (const [platformId, aliases] of Object.entries(PLATFORM_ALIASES) as [
    PlatformId,
    string[],
  ][]) {
    if (aliases.some((alias) => key === alias || key.includes(alias))) {
      return platformId;
    }
  }
  return fallback;
}

function normalizeHeaderCell(cell: string): string {
  return cell
    .replace(/^\uFEFF/, "")
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/[\s_\-:：]/g, "")
    .toLowerCase();
}

function mapHeaders(headerRow: string[]): Partial<Record<CanonicalField, number>> {
  const mapping: Partial<Record<CanonicalField, number>> = {};

  headerRow.forEach((rawHeader, index) => {
    const normalized = normalizeHeaderCell(rawHeader);
    if (!normalized) return;

    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [
      CanonicalField,
      string[],
    ][]) {
      if (mapping[field] !== undefined) continue;
      const exactMatch = aliases.some((alias) => normalizeHeaderCell(alias) === normalized);
      if (exactMatch) {
        mapping[field] = index;
        return;
      }
    }
  });

  // Second pass: relaxed substring match for columns with prefixes/suffixes (e.g. "累计播放量")
  headerRow.forEach((rawHeader, index) => {
    const normalized = normalizeHeaderCell(rawHeader);
    if (!normalized) return;

    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [
      CanonicalField,
      string[],
    ][]) {
      if (mapping[field] !== undefined) continue;
      const containsMatch = aliases.some((alias) => {
        const normalizedAlias = normalizeHeaderCell(alias);
        return normalizedAlias.length >= 2 && normalized.includes(normalizedAlias);
      });
      if (containsMatch) {
        mapping[field] = index;
        return;
      }
    }
  });

  return mapping;
}

/**
 * Parse creator portal CSV/TSV text into normalized metrics rows.
 */
export function parseMetricsCsv(
  rawText: string,
  defaultPlatform: PlatformId,
): ParseMetricsCsvResult {
  const table = parseDelimitedTable(rawText);
  if (table.length < 2) {
    return {
      rows: [],
      warnings: ["未检测到有效数据行，请确认文件包含表头与至少一行作品数据。"],
      detectedColumns: table[0] ?? [],
    };
  }

  const headerRow = table[0];
  const columnMap = mapHeaders(headerRow);
  const warnings: string[] = [];

  if (columnMap.title === undefined && columnMap.publishedUrl === undefined) {
    return {
      rows: [],
      warnings: ["未识别到「标题」或「发布链接」列，请检查表头或先下载标准模板对照。"],
      detectedColumns: headerRow,
    };
  }

  const hasAnyMetricColumn =
    columnMap.views !== undefined ||
    columnMap.likes !== undefined ||
    columnMap.comments !== undefined ||
    columnMap.shares !== undefined;

  if (!hasAnyMetricColumn) {
    warnings.push("未识别到播放/阅读、点赞、评论或转发列，仅会同步标题、链接与发布时间。");
  }

  const rows: ParsedMetricsRow[] = [];

  for (let i = 1; i < table.length; i += 1) {
    const cells = table[i];
    const readCell = (field: CanonicalField): string | undefined => {
      const idx = columnMap[field];
      return idx !== undefined ? cells[idx]?.trim() : undefined;
    };

    const rawUrl = readCell("publishedUrl");
    const safeUrl = rawUrl ? (sanitizeExternalUrl(rawUrl) ?? undefined) : undefined;
    if (rawUrl && !safeUrl) {
      warnings.push(`第 ${i + 1} 行的发布链接格式无效，已忽略该链接。`);
    }

    const rawTitle = readCell("title") ?? "";
    const title = rawTitle || safeUrl || "";
    if (!title) continue;

    const views = parseMetricCount(readCell("views"));
    const likes = parseMetricCount(readCell("likes"));
    const comments = parseMetricCount(readCell("comments"));
    const shares = parseMetricCount(readCell("shares"));
    const conversions = readCell("conversions") || undefined;
    const notes = readCell("notes") || undefined;

    rows.push({
      rowIndex: i + 1,
      title,
      platform: normalizePlatformName(readCell("platform"), defaultPlatform),
      publishedUrl: safeUrl,
      publishedAt: parsePublishedDate(readCell("publishedAt")),
      metrics: {
        views,
        likes,
        comments,
        shares,
        conversions,
      },
      notes,
    });
  }

  if (rows.length === 0) {
    warnings.push("表格中没有可导入的作品记录。");
  }

  return {
    rows,
    warnings,
    detectedColumns: headerRow,
  };
}

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "")
    .trim();
}

function normalizeUrlForMatch(url?: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, "");
  }
}

function diceSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) {
    return a.includes(b) || b.includes(a) ? 0.7 : 0;
  }

  const bigramsA = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i += 1) {
    const gram = a.slice(i, i + 2);
    bigramsA.set(gram, (bigramsA.get(gram) ?? 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < b.length - 1; i += 1) {
    const gram = b.slice(i, i + 2);
    const count = bigramsA.get(gram) ?? 0;
    if (count > 0) {
      intersection += 1;
      bigramsA.set(gram, count - 1);
    }
  }

  return (2 * intersection) / (a.length - 1 + (b.length - 1));
}

/**
 * Match parsed creator-portal rows against existing Elonga history items
 * by published URL first, then exact/fuzzy title similarity.
 */
export function matchRowsToHistory(
  rows: ParsedMetricsRow[],
  history: CopywritingResult[],
): MatchedMetricsRow[] {
  return rows.map((row) => {
    const targetUrl = normalizeUrlForMatch(row.publishedUrl);
    if (targetUrl) {
      const urlMatch = history.find(
        (item) => normalizeUrlForMatch(item.publishArchive?.publishedUrl) === targetUrl,
      );
      if (urlMatch) {
        return {
          ...row,
          matchedHistoryId: urlMatch.id,
          matchReason: "url",
          matchScore: 1,
        };
      }
    }

    const normalizedRowTitle = normalizeForMatch(row.title);
    let bestId: string | null = null;
    let bestScore = 0;
    let bestReason: MatchReason = "unmatched";

    for (const item of history) {
      const candidates = [...item.titles, item.topic].filter(Boolean);
      for (const candidate of candidates) {
        const normalizedCandidate = normalizeForMatch(candidate);
        if (!normalizedCandidate || !normalizedRowTitle) continue;

        let score = 0;
        let reason: MatchReason = "unmatched";

        if (normalizedCandidate === normalizedRowTitle) {
          score = 1;
          reason = "title-exact";
        } else if (
          normalizedCandidate.length >= 4 &&
          normalizedRowTitle.length >= 4 &&
          (normalizedCandidate.includes(normalizedRowTitle) ||
            normalizedRowTitle.includes(normalizedCandidate))
        ) {
          const shorter = Math.min(normalizedCandidate.length, normalizedRowTitle.length);
          const longer = Math.max(normalizedCandidate.length, normalizedRowTitle.length);
          score = 0.72 + 0.23 * (shorter / longer);
          reason = "title-similar";
        } else {
          const similarity = diceSimilarity(normalizedCandidate, normalizedRowTitle);
          if (similarity >= 0.58) {
            score = similarity;
            reason = "title-similar";
          }
        }

        // Small boost when platform matches so cross-platform duplicates pick the right record
        if (score > 0 && item.platform === row.platform) {
          score = Math.min(1, score + 0.04);
        }

        if (score > bestScore) {
          bestScore = score;
          bestId = item.id;
          bestReason = reason;
        }
      }
    }

    return {
      ...row,
      matchedHistoryId: bestId,
      matchReason: bestId ? bestReason : "unmatched",
      matchScore: Number(bestScore.toFixed(2)),
    };
  });
}

/**
 * Merge imported publish metrics with any existing PublishArchiveRecord so manual notes
 * or URLs are preserved when the imported CSV omits them.
 */
export function mergePublishArchiveRecord(
  existing: PublishArchiveRecord | undefined,
  incoming: BatchSyncPublishItem,
  nowIso: string,
): PublishArchiveRecord {
  const publishedAt = incoming.publishedAt ?? existing?.publishedAt ?? nowIso;
  const archived = incoming.archived || Boolean(existing?.archived);

  return {
    publishedUrl: incoming.publishedUrl ?? existing?.publishedUrl,
    publishedAt,
    metrics: {
      views: incoming.metrics.views ?? existing?.metrics.views,
      likes: incoming.metrics.likes ?? existing?.metrics.likes,
      comments: incoming.metrics.comments ?? existing?.metrics.comments,
      shares: incoming.metrics.shares ?? existing?.metrics.shares,
      conversions: incoming.metrics.conversions ?? existing?.metrics.conversions,
    },
    archived,
    archivedAt: archived ? (existing?.archivedAt ?? nowIso) : undefined,
    notes: incoming.notes ?? existing?.notes,
  };
}

/**
 * Generate a UTF-8 BOM CSV template that opens cleanly in Excel / WPS / Numbers.
 */
export function buildMetricsImportTemplateCsv(): string {
  const header = "作品标题,平台,发布日期,播放量,点赞数,评论数,转发数,发布链接,公益转化,备注";
  const samples = [
    "暖冬图书角：把1000本绘本送进山区教室,抖音,2026-11-18,18600,1240,96,215,https://www.douyin.com/video/example1,新增志愿者报名 6 人,前3秒实拍镜头留存高",
    "社区助老义诊活动回顾：3天服务260位长者,今日头条,2026-11-20,9420,318,42,87,https://www.toutiao.com/article/example2,筹款 14 笔,长图文阅读完成度较好",
  ];
  return `\uFEFF${header}\n${samples.join("\n")}\n`;
}
