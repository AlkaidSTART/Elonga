const ALLOWED_RASTER_IMAGE_MIME_SET = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const SAFE_RASTER_DATA_URL_REGEX =
  /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i;

/**
 * Only allow raster image MIME types for uploads (explicitly excluding SVG).
 */
export function isAllowedRasterImageType(mimeType: string): boolean {
  return ALLOWED_RASTER_IMAGE_MIME_SET.has(mimeType.trim().toLowerCase());
}

/**
 * Validate and normalize an external URL, allowing only http: and https: protocols.
 * Blocks javascript:, data:, vbscript:, and malformed URLs.
 */
export function sanitizeExternalUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Validate an image source URL for safe rendering in <img> tags or print HTML.
 * Allows raster base64 data URLs (no SVG), blob URLs, and http/https URLs.
 */
export function sanitizeImageSrc(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (SAFE_RASTER_DATA_URL_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (
      parsed.protocol === "https:" ||
      parsed.protocol === "http:" ||
      parsed.protocol === "blob:"
    ) {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}
