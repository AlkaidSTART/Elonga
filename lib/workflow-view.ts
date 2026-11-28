import {
  CONTENT_TYPES,
  PLATFORMS,
  TONES,
  WORD_COUNTS,
  type ContentTypeId,
  type PlatformId,
  type PlatformMeta,
  type ToneId,
  type WordCountId,
} from "./platforms";

export type WorkflowLayoutMode = "solo" | "split";

export interface WorkflowLayoutState {
  layoutMode: WorkflowLayoutMode;
  showPreviewPanel: boolean;
  showPreviewTrigger: boolean;
}

/**
 * Resolve whether the workflow workspace should display only the standalone
 * composer ("solo") or squeeze the composer to the left alongside the
 * manuscript preview panel ("split").
 */
export function resolveWorkflowLayoutState(params: {
  hasDocument: boolean;
  isPreviewOpen: boolean;
}): WorkflowLayoutState {
  const showPreviewPanel = params.hasDocument && params.isPreviewOpen;
  return {
    layoutMode: showPreviewPanel ? "split" : "solo",
    showPreviewPanel,
    showPreviewTrigger: params.hasDocument,
  };
}

/**
 * After a generation finishes, keep the preview collapsed by default so the
 * user explicitly clicks the "预览样稿" button to expand it. If the user
 * already had the preview open while regenerating, preserve that open state.
 */
export function resolvePreviewOpenAfterGeneration(currentPreviewOpen: boolean): boolean {
  return currentPreviewOpen;
}

export function getPlatformOptionList(): PlatformMeta[] {
  return (Object.keys(PLATFORMS) as PlatformId[]).map((id) => PLATFORMS[id]);
}

export function getPlatformTriggerMeta(platform: PlatformId): PlatformMeta {
  return PLATFORMS[platform] ?? PLATFORMS.douyin;
}

export interface WorkflowOptionsSummary {
  activeCount: number;
  summaryText: string;
}

export function getWorkflowOptionsSummary(params: {
  selectedActivityTitle?: string | null;
  contentType: ContentTypeId;
  tone: ToneId;
  wordCount: WordCountId;
  targetAudience: string;
  keywords: string;
}): WorkflowOptionsSummary {
  const parts: string[] = [];
  let activeCount = 0;

  if (params.selectedActivityTitle) {
    parts.push(`档案：${params.selectedActivityTitle}`);
    activeCount += 1;
  }

  const contentTypeMeta = CONTENT_TYPES.find((item) => item.id === params.contentType);
  const toneMeta = TONES.find((item) => item.id === params.tone);
  const wordCountMeta = WORD_COUNTS.find((item) => item.id === params.wordCount);

  if (contentTypeMeta) parts.push(contentTypeMeta.label);
  if (toneMeta) parts.push(toneMeta.label);
  if (wordCountMeta) parts.push(wordCountMeta.label);

  if (params.targetAudience.trim()) {
    activeCount += 1;
  }
  if (params.keywords.trim()) {
    activeCount += 1;
  }

  return {
    activeCount,
    summaryText: parts.join(" · "),
  };
}

/**
 * Assemble opening hook, body, and closing CTA into one complete,
 * ready-to-publish copy without duplicating already-included segments.
 */
export function buildPublishableBody(params: {
  hook?: string | null;
  body: string;
  cta?: string | null;
}): string {
  const cleanBody = params.body.trim();
  const cleanHook = params.hook?.trim() ?? "";
  const cleanCta = params.cta?.trim() ?? "";

  const segments: string[] = [];

  if (cleanHook && !cleanBody.startsWith(cleanHook)) {
    segments.push(cleanHook);
  }
  if (cleanBody) {
    segments.push(cleanBody);
  }
  if (cleanCta && !cleanBody.endsWith(cleanCta)) {
    segments.push(cleanCta);
  }

  return segments.join("\n\n");
}

/**
 * Build the complete ready-to-publish post text (title + unified body + tags)
 * for direct one-click copy and publishing.
 */
export function buildPublishableFullText(params: {
  title: string;
  hook?: string | null;
  body: string;
  cta?: string | null;
  tags?: string[];
}): string {
  const cleanTitle = params.title.trim();
  const publishableBody = buildPublishableBody({
    hook: params.hook,
    body: params.body,
    cta: params.cta,
  });
  const tagLine = (params.tags ?? [])
    .map((tag) => tag.trim().replace(/^#+/, ""))
    .filter(Boolean)
    .map((tag) => `#${tag}`)
    .join(" ");

  return [cleanTitle, publishableBody, tagLine].filter(Boolean).join("\n\n");
}
