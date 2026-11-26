import type {
  ContentTypeId,
  CopywritingResult,
  PlatformId,
  ToneId,
  WordCountId,
} from "@/lib/platforms";
import type { ActivityContextPayload } from "@/lib/organization";

export interface ModelConfigPayload {
  apiKey?: string;
  baseUrl?: string;
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
  modelConfig?: ModelConfigPayload;
}

export interface WorkflowOutput {
  result: CopywritingResult;
  trendInsights: DouyinTrendInsights;
  skillTraces: SkillTraceItem[];
}
