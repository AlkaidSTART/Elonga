"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  EyeOff,
  FileCheck2,
  Plus,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { ActivityArchive } from "@/lib/organization";
import {
  replaceAllLiteral,
  SENSITIVE_CATEGORY_META,
  type SensitiveMatch,
  type TextRedactionRecord,
} from "@/lib/text-redaction";
import {
  evaluatePublishReview,
  FACT_CATEGORY_META,
  type PublishReviewReport,
  type PublishReviewState,
} from "@/lib/publish-review";

interface RedactionAndReviewPanelProps {
  title: string;
  hook: string;
  body: string;
  onApplyTextChange: (next: {
    title: string;
    hook: string;
    body: string;
  }) => void;
  activity?: ActivityArchive | null;
  orgRedlines?: string;
  unredactedImageCount?: number;
  redactionRecords: TextRedactionRecord[];
  onChangeRedactionRecords: (records: TextRedactionRecord[]) => void;
  reviewState?: PublishReviewState;
  onChangeReviewState: (next: PublishReviewState) => void;
}

function createRedactionRecordId(): string {
  return `red_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function RedactionAndReviewPanel({
  title,
  hook,
  body,
  onApplyTextChange,
  activity,
  orgRedlines,
  unredactedImageCount = 0,
  redactionRecords,
  onChangeRedactionRecords,
  reviewState,
  onChangeReviewState,
}: RedactionAndReviewPanelProps) {
  const [activeTab, setActiveTab] = useState<"redaction" | "review">("review");
  const [customReplacements, setCustomReplacements] = useState<
    Record<string, string>
  >({});
  const [manualOriginal, setManualOriginal] = useState("");
  const [manualReplacement, setManualReplacement] = useState("");

  const report: PublishReviewReport = useMemo(
    () =>
      evaluatePublishReview({
        title,
        hook,
        body,
        orgRedlines,
        unredactedImageCount,
        redactionRecords,
        reviewState,
      }),
    [
      title,
      hook,
      body,
      orgRedlines,
      unredactedImageCount,
      redactionRecords,
      reviewState,
    ]
  );

  const applySingleRedaction = (match: SensitiveMatch) => {
    const replacement =
      customReplacements[match.id]?.trim() || match.suggestedReplacement;
    const nextTitle = replaceAllLiteral(title, match.original, replacement);
    const nextHook = replaceAllLiteral(hook, match.original, replacement);
    const nextBody = replaceAllLiteral(body, match.original, replacement);

    onApplyTextChange({ title: nextTitle, hook: nextHook, body: nextBody });

    const newRecord: TextRedactionRecord = {
      id: createRedactionRecordId(),
      category: match.category,
      categoryLabel: match.categoryLabel,
      original: match.original,
      replacement,
      appliedAt: new Date().toISOString(),
    };
    onChangeRedactionRecords([newRecord, ...redactionRecords]);

    if (reviewState?.checkedAt) {
      const nextReport = evaluatePublishReview({
        title: nextTitle,
        hook: nextHook,
        body: nextBody,
        orgRedlines,
        unredactedImageCount,
        redactionRecords: [newRecord, ...redactionRecords],
        reviewState,
      });
      onChangeReviewState({
        ...reviewState,
        checkedAt: new Date().toISOString(),
        checkedFingerprint: nextReport.fingerprint,
        approvedAt:
          nextReport.unresolvedRiskCount === 0 &&
          nextReport.unconfirmedFactCount === 0
            ? new Date().toISOString()
            : undefined,
      });
    }
  };

  const applyAllRedactions = () => {
    if (report.privacyMatches.length === 0) return;
    let nextTitle = title;
    let nextHook = hook;
    let nextBody = body;
    const newRecords: TextRedactionRecord[] = [];

    for (const match of report.privacyMatches) {
      const replacement =
        customReplacements[match.id]?.trim() || match.suggestedReplacement;
      nextTitle = replaceAllLiteral(nextTitle, match.original, replacement);
      nextHook = replaceAllLiteral(nextHook, match.original, replacement);
      nextBody = replaceAllLiteral(nextBody, match.original, replacement);
      newRecords.push({
        id: createRedactionRecordId(),
        category: match.category,
        categoryLabel: match.categoryLabel,
        original: match.original,
        replacement,
        appliedAt: new Date().toISOString(),
      });
    }

    onApplyTextChange({ title: nextTitle, hook: nextHook, body: nextBody });
    const mergedRecords = [...newRecords, ...redactionRecords];
    onChangeRedactionRecords(mergedRecords);

    if (reviewState?.checkedAt) {
      const nextReport = evaluatePublishReview({
        title: nextTitle,
        hook: nextHook,
        body: nextBody,
        orgRedlines,
        unredactedImageCount,
        redactionRecords: mergedRecords,
        reviewState,
      });
      onChangeReviewState({
        ...reviewState,
        checkedAt: new Date().toISOString(),
        checkedFingerprint: nextReport.fingerprint,
        approvedAt:
          nextReport.unresolvedRiskCount === 0 &&
          nextReport.unconfirmedFactCount === 0
            ? new Date().toISOString()
            : undefined,
      });
    }
  };

  const handleManualRedaction = () => {
    const orig = manualOriginal.trim();
    const repl = manualReplacement.trim();
    if (!orig || !repl || orig === repl) return;
    const combined = `${title}\n${hook}\n${body}`;
    if (!combined.includes(orig)) return;

    const nextTitle = replaceAllLiteral(title, orig, repl);
    const nextHook = replaceAllLiteral(hook, orig, repl);
    const nextBody = replaceAllLiteral(body, orig, repl);

    onApplyTextChange({ title: nextTitle, hook: nextHook, body: nextBody });
    const newRecord: TextRedactionRecord = {
      id: createRedactionRecordId(),
      category: "custom",
      categoryLabel: "自定义脱敏",
      original: orig,
      replacement: repl,
      appliedAt: new Date().toISOString(),
    };
    onChangeRedactionRecords([newRecord, ...redactionRecords]);
    setManualOriginal("");
    setManualReplacement("");
  };

  const revertRedaction = (record: TextRedactionRecord) => {
    const nextTitle = replaceAllLiteral(
      title,
      record.replacement,
      record.original
    );
    const nextHook = replaceAllLiteral(
      hook,
      record.replacement,
      record.original
    );
    const nextBody = replaceAllLiteral(
      body,
      record.replacement,
      record.original
    );
    onApplyTextChange({ title: nextTitle, hook: nextHook, body: nextBody });
    onChangeRedactionRecords(
      redactionRecords.filter((r) => r.id !== record.id)
    );
  };

  const handleInitiateReview = () => {
    const now = new Date().toISOString();
    const nextState: PublishReviewState = {
      checkedAt: now,
      checkedFingerprint: report.fingerprint,
      waivedRiskIds: reviewState?.waivedRiskIds ?? [],
      confirmedFactKeys: reviewState?.confirmedFactKeys ?? [],
      approvedAt:
        report.unresolvedRiskCount === 0 && report.unconfirmedFactCount === 0
          ? now
          : undefined,
    };
    onChangeReviewState(nextState);
    setActiveTab("review");
  };

  const toggleWaiveRisk = (riskId: string) => {
    const current = new Set(reviewState?.waivedRiskIds ?? []);
    if (current.has(riskId)) {
      current.delete(riskId);
    } else {
      current.add(riskId);
    }
    const nextWaived = Array.from(current);
    const now = new Date().toISOString();
    const nextDraftState: PublishReviewState = {
      checkedAt: reviewState?.checkedAt ?? now,
      checkedFingerprint: report.fingerprint,
      waivedRiskIds: nextWaived,
      confirmedFactKeys: reviewState?.confirmedFactKeys ?? [],
    };
    const nextReport = evaluatePublishReview({
      title,
      hook,
      body,
      orgRedlines,
      unredactedImageCount,
      redactionRecords,
      reviewState: nextDraftState,
    });
    onChangeReviewState({
      ...nextDraftState,
      approvedAt: nextReport.isEligible ? now : undefined,
    });
  };

  const toggleConfirmFact = (factKey: string) => {
    const current = new Set(reviewState?.confirmedFactKeys ?? []);
    if (current.has(factKey)) {
      current.delete(factKey);
    } else {
      current.add(factKey);
    }
    const nextConfirmed = Array.from(current);
    const now = new Date().toISOString();
    const nextDraftState: PublishReviewState = {
      checkedAt: reviewState?.checkedAt ?? now,
      checkedFingerprint: report.fingerprint,
      waivedRiskIds: reviewState?.waivedRiskIds ?? [],
      confirmedFactKeys: nextConfirmed,
    };
    const nextReport = evaluatePublishReview({
      title,
      hook,
      body,
      orgRedlines,
      unredactedImageCount,
      redactionRecords,
      reviewState: nextDraftState,
    });
    onChangeReviewState({
      ...nextDraftState,
      approvedAt: nextReport.isEligible ? now : undefined,
    });
  };

  const waivedSet = new Set(reviewState?.waivedRiskIds ?? []);
  const confirmedSet = new Set(reviewState?.confirmedFactKeys ?? []);

  return (
    <section className="space-y-4 rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      {/* Top Status Banner + Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3">
        <div className="flex items-center gap-0.5 rounded-md border border-[#E2E8F0] bg-[#F1F5F9] p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("review")}
            className={`inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-medium transition ${
              activeTab === "review"
                ? "bg-white text-[#0F172A] shadow-2xs"
                : "text-slate-500 hover:text-[#0F172A]"
            }`}
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            <span>发布审查</span>
            {report.unresolvedRiskCount + report.unconfirmedFactCount > 0 && (
              <span className="rounded bg-amber-100 px-1 py-px font-mono text-[10px] leading-tight text-amber-800">
                {report.unresolvedRiskCount + report.unconfirmedFactCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("redaction")}
            className={`inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-medium transition ${
              activeTab === "redaction"
                ? "bg-white text-[#0F172A] shadow-2xs"
                : "text-slate-500 hover:text-[#0F172A]"
            }`}
          >
            <EyeOff className="h-3.5 w-3.5" />
            <span>编辑脱敏</span>
            {report.privacyMatches.length > 0 ? (
              <span className="rounded bg-rose-100 px-1 py-px font-mono text-[10px] leading-tight text-rose-700">
                {report.privacyMatches.length}
              </span>
            ) : redactionRecords.length > 0 ? (
              <span className="rounded bg-emerald-100 px-1 py-px font-mono text-[10px] leading-tight text-emerald-700">
                {redactionRecords.length}
              </span>
            ) : null}
          </button>
        </div>

        {/* Eligibility Badge / Action */}
        {report.isEligible ? (
          <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>已获发布资格</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleInitiateReview}
            className="inline-flex items-center gap-1 rounded-md bg-[#1D4ED8] px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-[#1E40AF]"
          >
            <FileCheck2 className="h-3 w-3" />
            <span>
              {reviewState?.checkedAt && !report.isStale
                ? "重新检查"
                : "发起审查"}
            </span>
          </button>
        )}
      </div>

      {/* TAB 1: PUBLISH REVIEW */}
      {activeTab === "review" && (
        <div className="space-y-4">
          {!reviewState?.checkedAt ? (
            <div className="rounded-md border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4 text-center">
              <p className="text-xs font-medium text-[#0F172A]">
                尚未发起发布前检查
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                系统将同步脱敏状态、扫描合规风险，并标注金额与人数等事实数据供人工核对。
              </p>
              <button
                type="button"
                onClick={handleInitiateReview}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-[#0F172A] px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
              >
                <FileCheck2 className="h-3.5 w-3.5" />
                <span>立即发起发布前检查</span>
              </button>
            </div>
          ) : (
            <>
              {report.isStale && (
                <div className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                  <span>正文已修改，需重新确认检查以更新发布资格。</span>
                  <button
                    type="button"
                    onClick={handleInitiateReview}
                    className="shrink-0 rounded bg-amber-600 px-2 py-0.5 font-medium text-white transition hover:bg-amber-700"
                  >
                    更新检查
                  </button>
                </div>
              )}

              {/* Part 1: Risk Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A]">
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                    <span>风险项检查（需全部处理）</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                    待处理 {report.unresolvedRiskCount} / {report.riskItems.length}
                  </span>
                </div>

                {report.riskItems.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-md border border-emerald-200/80 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span>
                      未发现未脱敏隐私或合规风险
                      {redactionRecords.length > 0
                        ? `（已同步 ${redactionRecords.length} 条脱敏记录）`
                        : ""}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {report.riskItems.map((risk) => {
                      const isWaived = risk.canWaive && waivedSet.has(risk.id);
                      const matchedPrivacy =
                        risk.category === "privacy"
                          ? report.privacyMatches.find(
                              (m) => `privacy:${m.id}` === risk.id
                            )
                          : undefined;

                      return (
                        <div
                          key={risk.id}
                          className={`rounded-md border p-3 text-xs transition ${
                            isWaived
                              ? "border-slate-200 bg-slate-50/80 opacity-75"
                              : risk.severity === "high"
                                ? "border-rose-200 bg-rose-50/50"
                                : "border-amber-200 bg-amber-50/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <p className="font-medium text-[#0F172A]">
                                {risk.title}
                              </p>
                              <p className="text-[11px] leading-relaxed text-slate-600">
                                {risk.detail}
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                              {matchedPrivacy && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    applySingleRedaction(matchedPrivacy)
                                  }
                                  className="rounded bg-[#0F172A] px-2 py-1 text-[11px] font-medium text-white transition hover:bg-slate-800"
                                >
                                  一键脱敏
                                </button>
                              )}
                              {risk.canWaive && (
                                <button
                                  type="button"
                                  onClick={() => toggleWaiveRisk(risk.id)}
                                  className={`rounded border px-2 py-1 text-[11px] font-medium transition ${
                                    isWaived
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-slate-300 bg-white text-slate-600 hover:text-[#0F172A]"
                                  }`}
                                >
                                  {isWaived ? "已人工确认" : "确认无风险"}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Part 2: Factual Info Verification */}
              <div className="space-y-2 border-t border-[#F1F5F9] pt-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#0F172A]">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <span>事实信息人工核对</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                    已核对 {report.factItems.length - report.unconfirmedFactCount}{" "}
                    / {report.factItems.length}
                  </span>
                </div>

                <p className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-[11px] leading-relaxed text-slate-600">
                  提示：金额、人数、物资与日期等事实信息
                  <strong className="font-semibold text-[#0F172A]">
                    系统仅做标记提醒，不做对错判定
                  </strong>
                  ，请人工核对原始台账后逐条确认。
                </p>

                {activity && (
                  <div className="space-y-0.5 rounded-md border border-blue-200/80 bg-[#EFF6FF]/60 px-3 py-2 text-[11px] text-slate-700">
                    <div className="font-medium text-[#1E3A8A]">
                      关联活动档案参考：{activity.title}
                    </div>
                    {activity.date && <div>日期：{activity.date}</div>}
                    {activity.participantCount && (
                      <div>人数：{activity.participantCount}</div>
                    )}
                    {activity.fundOrGoods && (
                      <div>善款/物资：{activity.fundOrGoods}</div>
                    )}
                  </div>
                )}

                {report.factItems.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    正文中未检测到具体金额、人数、物资或日期数字。
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {report.factItems.map((fact) => {
                      const confirmed = confirmedSet.has(fact.key);
                      const meta = FACT_CATEGORY_META[fact.category];
                      return (
                        <label
                          key={fact.key}
                          className={`flex cursor-pointer items-start justify-between gap-2 rounded-md border px-3 py-2 text-xs transition ${
                            confirmed
                              ? "border-emerald-200 bg-emerald-50/40"
                              : "border-[#E2E8F0] bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex min-w-0 items-start gap-2">
                            <input
                              type="checkbox"
                              checked={confirmed}
                              onChange={() => toggleConfirmFact(fact.key)}
                              className="mt-0.5 h-3.5 w-3.5 rounded accent-[#1D4ED8]"
                            />
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`rounded border px-1.5 py-px text-[10px] font-medium ${meta.badgeClass}`}
                                >
                                  {meta.label}
                                </span>
                                <span className="font-semibold text-[#0F172A]">
                                  {fact.value}
                                </span>
                              </div>
                              <p className="truncate text-[11px] text-slate-500">
                                {fact.contextSnippet}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`shrink-0 text-[10px] font-medium ${
                              confirmed ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            {confirmed ? "已核对" : "待核对"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: TEXT REDACTION */}
      {activeTab === "redaction" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#0F172A]">
              隐私识别与化名替换
            </span>
            {report.privacyMatches.length > 0 && (
              <button
                type="button"
                onClick={applyAllRedactions}
                className="inline-flex items-center gap-1 rounded-md bg-[#0F172A] px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-slate-800"
              >
                <EyeOff className="h-3 w-3" />
                <span>一键全部脱敏 ({report.privacyMatches.length})</span>
              </button>
            )}
          </div>

          {report.privacyMatches.length === 0 ? (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200/80 bg-emerald-50/70 px-3 py-2.5 text-xs text-emerald-800">
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>
                当前正文未检测到未脱敏的姓名、住址、联系方式或证件信息（结果已实时同步至发布审查）。
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {report.privacyMatches.map((match) => {
                const meta = SENSITIVE_CATEGORY_META[match.category];
                const currentValue =
                  customReplacements[match.id] ?? match.suggestedReplacement;

                return (
                  <div
                    key={match.id}
                    className="space-y-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded border px-1.5 py-px text-[10px] font-medium ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-xs font-semibold text-[#0F172A]">
                          {match.original}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          ×{match.occurrences}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      {match.contextSnippet}
                    </p>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={currentValue}
                        onChange={(e) =>
                          setCustomReplacements((prev) => ({
                            ...prev,
                            [match.id]: e.target.value,
                          }))
                        }
                        className="min-w-0 flex-1 rounded-md border border-[#D5DAE2] bg-white px-2.5 py-1 text-xs text-[#0F172A] outline-none transition focus:border-[#1D4ED8]"
                        placeholder="化名或模糊替换词"
                      />
                      <button
                        type="button"
                        onClick={() => applySingleRedaction(match)}
                        className="shrink-0 rounded-md bg-[#1D4ED8] px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-[#1E40AF]"
                      >
                        替换
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Manual Custom Redaction */}
          <div className="space-y-2 border-t border-[#F1F5F9] pt-3">
            <span className="block text-[11px] font-medium text-slate-600">
              手动补充脱敏（针对未自动命中的昵称、地名或机构名）
            </span>
            <div className="flex flex-col gap-1.5 sm:flex-row">
              <input
                type="text"
                value={manualOriginal}
                onChange={(e) => setManualOriginal(e.target.value)}
                placeholder="原敏感词（如：王小明）"
                className="min-w-0 flex-1 rounded-md border border-[#D5DAE2] bg-white px-2.5 py-1.5 text-xs text-[#0F172A] outline-none transition focus:border-[#1D4ED8]"
              />
              <input
                type="text"
                value={manualReplacement}
                onChange={(e) => setManualReplacement(e.target.value)}
                placeholder="替换为（如：小王（化名））"
                className="min-w-0 flex-1 rounded-md border border-[#D5DAE2] bg-white px-2.5 py-1.5 text-xs text-[#0F172A] outline-none transition focus:border-[#1D4ED8]"
              />
              <button
                type="button"
                onClick={handleManualRedaction}
                disabled={!manualOriginal.trim() || !manualReplacement.trim()}
                className="inline-flex shrink-0 items-center justify-center gap-1 rounded-md bg-[#0F172A] px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>替换</span>
              </button>
            </div>
          </div>

          {/* Applied Redaction Records */}
          {redactionRecords.length > 0 && (
            <div className="space-y-1.5 border-t border-[#F1F5F9] pt-3">
              <span className="block text-[11px] font-medium text-slate-600">
                已脱敏记录（已同步至发布审查 · 共 {redactionRecords.length} 项）
              </span>
              <div className="space-y-1">
                {redactionRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-[11px]"
                  >
                    <div className="min-w-0 truncate text-slate-600">
                      <span className="text-slate-400 line-through">
                        {rec.original}
                      </span>
                      <span className="mx-1.5 text-slate-400">→</span>
                      <span className="font-medium text-[#1D4ED8]">
                        {rec.replacement}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => revertRedaction(rec)}
                      className="inline-flex shrink-0 items-center gap-0.5 text-[10px] text-slate-400 transition hover:text-rose-600"
                      title="撤销此条脱敏"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>还原</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
