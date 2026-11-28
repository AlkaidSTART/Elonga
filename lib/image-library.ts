import type { Style2DPreset } from "@/store/useImageStudioStore";

export type ImageLibrarySource = "mosaic" | "stylize";

export interface ImageLibraryItem {
  id: string;
  name: string;
  caption: string;
  dataUrl: string;
  width: number;
  height: number;
  source: ImageLibrarySource;
  stylePreset?: Style2DPreset;
  processMode?: "ai" | "local" | null;
  redactionCount?: number;
  fingerprint: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveLibraryImageInput {
  name?: string;
  caption?: string;
  dataUrl: string;
  width: number;
  height: number;
  source: ImageLibrarySource;
  stylePreset?: Style2DPreset;
  processMode?: "ai" | "local" | null;
  redactionCount?: number;
}

export const IMAGE_LIBRARY_SOURCE_META: Record<
  ImageLibrarySource,
  { label: string; shortLabel: string; description: string }
> = {
  mosaic: {
    label: "智能打码",
    shortLabel: "已打码",
    description: "经图片工坊隐私脱敏打码处理的合规素材",
  },
  stylize: {
    label: "二维风格化",
    shortLabel: "二维风格",
    description: "经图片工坊二维重绘/绘本风格化生成的插画素材",
  },
};

export const STYLE_PRESET_LABELS: Record<Style2DPreset, string> = {
  anime: "日系动漫",
  ghibli: "清新绘本",
  cel: "扁平插画",
  watercolor: "水彩手绘",
};

function stripFileExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").trim();
}

export function buildLibraryImageName(
  originalName: string | undefined,
  source: ImageLibrarySource,
  stylePreset?: Style2DPreset,
): string {
  const base = originalName ? stripFileExtension(originalName) : "";
  const cleanBase = base || "工坊图片";
  if (source === "mosaic") {
    return `${cleanBase}_打码`;
  }
  const presetLabel = stylePreset ? STYLE_PRESET_LABELS[stylePreset] : "二维风格";
  return `${cleanBase}_${presetLabel}`;
}

export function buildLibraryImageCaption(
  originalName: string | undefined,
  source: ImageLibrarySource,
): string {
  const base = originalName ? stripFileExtension(originalName) : "";
  if (base) return base;
  return source === "mosaic" ? "隐私脱敏现场配图" : "二维风格化配图";
}

/**
 * Compute a fast, deterministic fingerprint for deduplicating repeated saves
 * of the exact same studio output without hashing megabytes on every call.
 */
export function computeImageFingerprint(
  dataUrl: string,
  source: ImageLibrarySource,
): string {
  const len = dataUrl.length;
  const sampleSize = 512;
  let sample: string;

  if (len <= sampleSize * 3) {
    sample = dataUrl;
  } else {
    const midStart = Math.max(0, Math.floor(len / 2) - Math.floor(sampleSize / 2));
    sample =
      dataUrl.slice(0, sampleSize) +
      dataUrl.slice(midStart, midStart + sampleSize) +
      dataUrl.slice(len - sampleSize);
  }

  let hash = 0x811c9dc5;
  for (let i = 0; i < sample.length; i++) {
    hash ^= sample.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return `${source}_${len}_${(hash >>> 0).toString(16)}`;
}

export function filterImageLibraryItems(
  items: readonly ImageLibraryItem[],
  options: { query?: string; source?: "all" | ImageLibrarySource },
): ImageLibraryItem[] {
  const sourceFilter = options.source ?? "all";
  const q = (options.query ?? "").trim().toLowerCase();

  return items.filter((item) => {
    if (sourceFilter !== "all" && item.source !== sourceFilter) {
      return false;
    }
    if (!q) return true;
    const presetLabel = item.stylePreset ? STYLE_PRESET_LABELS[item.stylePreset] : "";
    const sourceLabel = IMAGE_LIBRARY_SOURCE_META[item.source].label;
    return (
      item.name.toLowerCase().includes(q) ||
      item.caption.toLowerCase().includes(q) ||
      sourceLabel.toLowerCase().includes(q) ||
      presetLabel.toLowerCase().includes(q)
    );
  });
}

export function formatImageDimensions(width: number, height: number): string {
  if (!width || !height) return "未知尺寸";
  return `${Math.round(width)}×${Math.round(height)}`;
}

export function getLibraryItemProcessBadge(item: ImageLibraryItem): string {
  if (item.source === "mosaic") {
    return item.redactionCount && item.redactionCount > 0
      ? `智能打码 · ${item.redactionCount} 处`
      : "智能打码";
  }
  const presetLabel = item.stylePreset ? STYLE_PRESET_LABELS[item.stylePreset] : "二维风格";
  return `二维风格 · ${presetLabel}`;
}
