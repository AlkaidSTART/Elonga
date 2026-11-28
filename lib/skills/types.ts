import type {
  ContentTypeId,
  CopywritingResult,
  PlatformId,
  ToneId,
  WordCountId,
} from "@/lib/platforms";
import type { ActivityContextPayload } from "@/lib/organization";
import type { TextApiFormat } from "@/lib/ai/model-client";

export interface ModelConfigPayload {
  apiKey?: string;
  baseUrl?: string;
  port?: string;
  endpointPath?: string;
  apiFormat?: TextApiFormat;
  textModel?: string;
}

export interface DouyinViralSample {
  title: string;
  hook: string;
  angle: string;
  engagementHint: string;
}

export interface PlatformTrendInsights {
  platform?: PlatformId;
  platformName?: string;
  queryTopic: string;
  fetchedAt: string;
  source: "live-api" | "hot-board" | "llm-research" | "local-knowledge";
  sourceLabel: string;
  hotKeywords: string[];
  viralHooks: string[];
  titleFormulas: string[];
  samples: DouyinViralSample[];
  summary: string;
}

export type DouyinTrendInsights = PlatformTrendInsights;

export interface SkillTraceItem {
  skillId: string;
  skillName: string;
  status: "completed" | "reused";
  durationMs: number;
  summary: string;
}

export interface SkillDefinition<TInput, TOutput> {
  id: string;
  name: string;
  description: string;
  version: string;
  execute: (input: TInput) => Promise<TOutput>;
}

export interface PlatformWritingSkillInput {
  topic?: string;
  contentType?: ContentTypeId;
  wordCount?: WordCountId;
}

export interface PlatformWritingGuidance {
  skillId: string;
  skillName: string;
  shortName: string;
  platform: PlatformId;
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
  promptInstructions: string;
}

export interface PlatformWritingSkillDefinition extends Omit<
  SkillDefinition<PlatformWritingSkillInput | undefined, PlatformWritingGuidance>,
  "execute"
> {
  platform: PlatformId;
  shortName: string;
  positioning: string;
  quickHighlights: string[];
  execute: (input?: PlatformWritingSkillInput) => Promise<PlatformWritingGuidance>;
}

export interface CharityCopywritingInput {
  platform: PlatformId;
  contentType: ContentTypeId;
  tone?: ToneId;
  wordCount: WordCountId;
  topic: string;
  keywords?: string;
  targetAudience?: string;
  activityContext?: ActivityContextPayload;
  trendInsights?: DouyinTrendInsights;
  platformWritingGuidance?: PlatformWritingGuidance;
  modelConfig?: ModelConfigPayload;
}

export interface WorkflowOutput {
  result: CopywritingResult;
  trendInsights: DouyinTrendInsights;
  skillTraces: SkillTraceItem[];
}
