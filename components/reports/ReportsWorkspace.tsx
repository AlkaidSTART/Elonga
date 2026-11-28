"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  FileBarChart2,
  Loader2,
  PanelRightOpen,
} from "lucide-react";
import {
  exportDocumentAsDocx,
  exportDocumentAsMarkdown,
  exportDocumentAsPdf,
  type AssembledDocument,
} from "@/lib/document-exporter";
import {
  buildMonthlySnapshot,
  formatReportPlainText,
  resolveActiveMonthlyReport,
  type MonthlyReportFocus,
  type SavedMonthlyReport,
} from "@/lib/monthly-report";
import { useMonthlyReportStore } from "@/store/useMonthlyReportStore";
import { useOrganizationStore } from "@/store/useOrganizationStore";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";
import { ReportsContextDrawer, type ReportsDrawerTab } from "./ReportsContextDrawer";

const emptySubscribe = () => () => {};
const getClientCurrentMonth = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};
const getServerCurrentMonth = () => "2026-11";

function createReportId(month: string): string {
  return `rep_${month}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function ReportsWorkspace() {
  const defaultMonth = useSyncExternalStore(
    emptySubscribe,
    getClientCurrentMonth,
    getServerCurrentMonth,
  );

  const [selectedMonthOverride, setSelectedMonthOverride] = useState<string | null>(null);
  const selectedMonth = selectedMonthOverride ?? defaultMonth;

  const [focus, setFocus] = useState<MonthlyReportFocus>("internal");
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"preview" | "edit">("preview");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<ReportsDrawerTab>("data");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  const { history, modelConfig } = useWorkbenchStore();
  const { profile: orgProfile, activities } = useOrganizationStore();
  const { reports, saveReport, updateReportContent, deleteReport } = useMonthlyReportStore();

  useEffect(() => {
    if (!exportMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [exportMenuOpen]);

  const snapshot = useMemo(
    () => buildMonthlySnapshot(selectedMonth, history, activities),
    [selectedMonth, history, activities],
  );

  const activeReport = useMemo<SavedMonthlyReport | null>(
    () => resolveActiveMonthlyReport(reports, activeReportId, selectedMonth),
    [activeReportId, reports, selectedMonth],
  );

  const totalInteractions = snapshot.totalLikes + snapshot.totalComments + snapshot.totalShares;

  const openDrawer = (tab: ReportsDrawerTab) => {
    setDrawerTab(tab);
    setDrawerOpen(true);
  };

  const handleGenerateReport = async () => {
    setErrorMsg(null);
    setIsGenerating(true);
    try {
      const res = await fetch("/api/monthly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgProfile,
          snapshot,
          focus,
          modelConfig: {
            apiKey: modelConfig.textApiKey,
            baseUrl: modelConfig.textBaseUrl,
            port: modelConfig.textPort,
            endpointPath: modelConfig.textEndpointPath,
            apiFormat: modelConfig.textApiFormat,
            textModel: modelConfig.textModel,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "生成月报失败");
      }

      const now = new Date().toISOString();
      const newReport: SavedMonthlyReport = {
        id: createReportId(selectedMonth),
        month: selectedMonth,
        focus,
        title: data.title,
        summary: data.summary,
        body: data.body,
        mode: data.mode === "ai" ? "ai" : "local",
        createdAt: now,
        updatedAt: now,
        snapshot,
      };
      saveReport(newReport);
      setActiveReportId(newReport.id);
      setViewMode("preview");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "生成月报失败");
    } finally {
      setIsGenerating(false);
    }
  };

  const buildExportDoc = (report: SavedMonthlyReport): AssembledDocument => ({
    title: report.title,
    platform: "wechat",
    platformName: report.focus === "donor" ? "对外公益进展月报" : "内部运营复盘月报",
    topic: `${report.month} 月度运营报告`,
    hook: report.summary,
    body: report.body,
    tags: [orgProfile.name, `${report.month}月报`, "公益传播"],
    algorithmTips: [],
    images: [],
    createdAt: new Date(report.updatedAt).getTime() || 0,
  });

  const handleExportDocx = async () => {
    if (!activeReport) return;
    setExportMenuOpen(false);
    setExportingDocx(true);
    try {
      await exportDocumentAsDocx(buildExportDoc(activeReport));
    } finally {
      setExportingDocx(false);
    }
  };

  const handleCopyReport = async () => {
    if (!activeReport) return;
    try {
      await navigator.clipboard.writeText(formatReportPlainText(activeReport));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  const isSameAsActive =
    activeReport !== null &&
    activeReport.month === selectedMonth &&
    activeReport.focus === focus;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Masthead Header */}
      <header className="flex flex-col gap-4 border-b border-[#181816]/15 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-editorial text-2xl font-semibold tracking-tight text-[#181816]">
            运营月报
          </h1>
          <p className="mt-1 text-xs text-[#78716C]">
            选定月份与受众，一键生成、编辑并导出月度公报
          </p>
        </div>

        <button
          type="button"
          onClick={() => openDrawer(reports.length > 0 ? "archive" : "data")}
          className="inline-flex items-center gap-1.5 self-start rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3.5 py-2 text-xs font-medium text-[#181816] transition hover:border-[#181816] sm:self-auto"
        >
          <PanelRightOpen className="h-3.5 w-3.5 text-[#57534E]" />
          <span>数据与档案</span>
          {reports.length > 0 && (
            <span className="rounded bg-[#EFECE4] px-1.5 py-0.5 font-mono text-[10px] text-[#57534E] tabular-nums">
              {reports.length}
            </span>
          )}
        </button>
      </header>

      {errorMsg && (
        <p className="border-l-2 border-[#B42318] bg-[#FDF2F2] px-3.5 py-2 text-xs text-[#B42318]">
          {errorMsg}
        </p>
      )}

      {!activeReport ? (
        /* Focused Single-Action Empty State */
        <section className="border-t-2 border-[#181816] bg-[#FCFBF8] px-7 py-9 sm:px-10 sm:py-10">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2DDD3] pb-4 text-[11px] text-[#8C857B]">
            <span className="font-medium text-[#181816]">{orgProfile.name} · 月度公报</span>
            <span className="font-mono tabular-nums">{selectedMonth}</span>
          </div>

          <div className="mt-7 space-y-6">
            <div>
              <h2 className="font-editorial text-2xl font-semibold text-[#181816]">
                生成 {selectedMonth}{" "}
                {focus === "donor" ? "对外公益进展月报" : "内部运营复盘月报"}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-[#57534E]">
                选择统计周期与阅读对象后点击下方按钮，系统会自动汇总当月活动档案与发布数据，生成可编辑、可导出的正式月报。
              </p>
            </div>

            {/* Inline Controls */}
            <div className="flex flex-wrap items-center gap-3 border-y border-[#E2DDD3] py-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#78716C]">月份</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonthOverride(e.target.value);
                    setActiveReportId(null);
                  }}
                  className="rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-1.5 font-mono text-xs text-[#181816] outline-none focus:border-[#1B4D3E]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#78716C]">受众</span>
                <div className="inline-flex items-center gap-0.5 rounded border border-[#E2DDD3] bg-[#EFECE4] p-0.5">
                  <button
                    type="button"
                    onClick={() => setFocus("internal")}
                    className={`rounded-[3px] px-2.5 py-1 text-xs font-medium transition ${
                      focus === "internal"
                        ? "bg-[#FCFBF8] text-[#181816]"
                        : "text-[#78716C] hover:text-[#181816]"
                    }`}
                  >
                    对内复盘
                  </button>
                  <button
                    type="button"
                    onClick={() => setFocus("donor")}
                    className={`rounded-[3px] px-2.5 py-1 text-xs font-medium transition ${
                      focus === "donor"
                        ? "bg-[#FCFBF8] text-[#181816]"
                        : "text-[#78716C] hover:text-[#181816]"
                    }`}
                  >
                    对外汇报
                  </button>
                </div>
              </div>
            </div>

            {/* Quiet 1-line Data Readiness Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#78716C]">
              <span className="tabular-nums">
                本月已汇集：活动{" "}
                <strong className="font-mono font-medium text-[#181816]">
                  {snapshot.activitiesCount}
                </strong>{" "}
                项 · 已发布{" "}
                <strong className="font-mono font-medium text-[#181816]">
                  {snapshot.publishedCount}
                </strong>{" "}
                篇 · 播放{" "}
                <strong className="font-mono font-medium text-[#181816]">
                  {snapshot.totalViews.toLocaleString("zh-CN")}
                </strong>{" "}
                · 互动{" "}
                <strong className="font-mono font-medium text-[#181816]">
                  {totalInteractions.toLocaleString("zh-CN")}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => openDrawer("data")}
                className="text-xs font-medium text-[#1B4D3E] hover:underline"
              >
                查看数据明细 →
              </button>
            </div>

            <div className="pt-1">
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => void handleGenerateReport()}
                className="inline-flex items-center gap-2 rounded bg-[#1B4D3E] px-5 py-2.5 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F] disabled:opacity-60"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>编印中...</span>
                  </>
                ) : (
                  <>
                    <FileBarChart2 className="h-3.5 w-3.5" />
                    <span>立即生成 {selectedMonth} 月报</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>
      ) : (
        /* Focused Reading & Editing Workspace */
        <div className="space-y-4">
          {/* Compact Single-Row Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DDD3] pb-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonthOverride(e.target.value);
                  setActiveReportId(null);
                }}
                className="rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-1.5 font-mono text-xs text-[#181816] outline-none focus:border-[#1B4D3E]"
              />

              <div className="inline-flex items-center gap-0.5 rounded border border-[#E2DDD3] bg-[#EFECE4] p-0.5">
                <button
                  type="button"
                  onClick={() => setFocus("internal")}
                  className={`rounded-[3px] px-2.5 py-1 text-xs font-medium transition ${
                    focus === "internal"
                      ? "bg-[#FCFBF8] text-[#181816]"
                      : "text-[#78716C] hover:text-[#181816]"
                  }`}
                >
                  对内复盘
                </button>
                <button
                  type="button"
                  onClick={() => setFocus("donor")}
                  className={`rounded-[3px] px-2.5 py-1 text-xs font-medium transition ${
                    focus === "donor"
                      ? "bg-[#FCFBF8] text-[#181816]"
                      : "text-[#78716C] hover:text-[#181816]"
                  }`}
                >
                  对外汇报
                </button>
              </div>

              <button
                type="button"
                onClick={() => openDrawer("data")}
                className="text-xs text-[#78716C] transition hover:text-[#1B4D3E] tabular-nums"
              >
                活动 {snapshot.activitiesCount} · 发布 {snapshot.publishedCount} · 播放{" "}
                {snapshot.totalViews.toLocaleString("zh-CN")}
              </button>
            </div>

            <button
              type="button"
              disabled={isGenerating}
              onClick={() => void handleGenerateReport()}
              className="inline-flex items-center gap-1.5 rounded bg-[#1B4D3E] px-4 py-1.5 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F] disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>编印中...</span>
                </>
              ) : (
                <>
                  <FileBarChart2 className="h-3.5 w-3.5" />
                  <span>{isSameAsActive ? "重新生成" : "生成本月月报"}</span>
                </>
              )}
            </button>
          </div>

          {/* Warm Ivory Manuscript Sheet */}
          <section className="space-y-5 border-t-2 border-[#181816] bg-[#FCFBF8] p-7 sm:p-9">
            {/* Manuscript Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DDD3] pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-0.5 rounded border border-[#E2DDD3] bg-[#EFECE4] p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode("preview")}
                    className={`rounded-[3px] px-2.5 py-1 text-xs font-medium transition ${
                      viewMode === "preview"
                        ? "bg-[#FCFBF8] text-[#181816]"
                        : "text-[#78716C] hover:text-[#181816]"
                    }`}
                  >
                    预览
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("edit")}
                    className={`rounded-[3px] px-2.5 py-1 text-xs font-medium transition ${
                      viewMode === "edit"
                        ? "bg-[#FCFBF8] text-[#181816]"
                        : "text-[#78716C] hover:text-[#181816]"
                    }`}
                  >
                    编辑
                  </button>
                </div>
                <span className="rounded bg-[#EFECE4] px-2 py-0.5 text-[11px] text-[#57534E]">
                  {activeReport.mode === "ai" ? "AI 生成" : "本地模板"}
                </span>
                <span className="rounded bg-[#E9F0ED] px-2 py-0.5 text-[11px] font-medium text-[#1B4D3E]">
                  {activeReport.focus === "donor" ? "对外汇报" : "对内复盘"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Consolidated Export Dropdown */}
                <div ref={exportMenuRef} className="relative">
                  <button
                    type="button"
                    disabled={exportingDocx}
                    onClick={() => setExportMenuOpen((open) => !open)}
                    aria-expanded={exportMenuOpen}
                    aria-haspopup="menu"
                    className="inline-flex items-center gap-1.5 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-1.5 text-xs font-medium text-[#181816] transition hover:border-[#181816] disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5 text-[#57534E]" />
                    <span>{exportingDocx ? "导出中..." : "导出"}</span>
                    <ChevronDown className="h-3 w-3 text-[#8C857B]" />
                  </button>

                  {exportMenuOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 z-20 mt-1.5 w-40 rounded border border-[#E2DDD3] bg-[#FCFBF8] py-1 shadow-[0_12px_28px_-12px_rgba(24,24,22,0.2)]"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => void handleExportDocx()}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-[#181816] transition hover:bg-[#EFECE4]/70"
                      >
                        <span>Word 文档</span>
                        <span className="font-mono text-[10px] text-[#8C857B]">.docx</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setExportMenuOpen(false);
                          exportDocumentAsPdf(buildExportDoc(activeReport));
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-[#181816] transition hover:bg-[#EFECE4]/70"
                      >
                        <span>PDF 打印版</span>
                        <span className="font-mono text-[10px] text-[#8C857B]">.pdf</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setExportMenuOpen(false);
                          exportDocumentAsMarkdown(buildExportDoc(activeReport));
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-[#181816] transition hover:bg-[#EFECE4]/70"
                      >
                        <span>Markdown</span>
                        <span className="font-mono text-[10px] text-[#8C857B]">.md</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void handleCopyReport()}
                  className="inline-flex items-center gap-1.5 rounded bg-[#181816] px-3 py-1.5 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#2F2E2A]"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-[#86EFAC]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copied ? "已复制" : "复制全文"}</span>
                </button>
              </div>
            </div>

            {viewMode === "edit" ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={activeReport.title}
                  onChange={(e) =>
                    updateReportContent(activeReport.id, {
                      title: e.target.value,
                    })
                  }
                  className="w-full border-b border-[#E2DDD3] pb-2 font-editorial text-xl font-semibold text-[#181816] outline-none focus:border-[#1B4D3E]"
                />
                <textarea
                  rows={3}
                  value={activeReport.summary}
                  onChange={(e) =>
                    updateReportContent(activeReport.id, {
                      summary: e.target.value,
                    })
                  }
                  placeholder="月报核心摘要..."
                  className="w-full resize-none rounded border border-[#E2DDD3] bg-[#F6F4EF] p-3 text-xs leading-relaxed text-[#181816] outline-none focus:border-[#1B4D3E]"
                />
                <textarea
                  rows={18}
                  value={activeReport.body}
                  onChange={(e) =>
                    updateReportContent(activeReport.id, {
                      body: e.target.value,
                    })
                  }
                  className="w-full resize-y rounded border border-[#E2DDD3] bg-transparent p-3 text-sm leading-7 text-[#292524] outline-none focus:border-[#1B4D3E]"
                />
              </div>
            ) : (
              <article className="space-y-5">
                <div className="space-y-2">
                  <h2 className="font-editorial text-2xl font-semibold tracking-tight text-[#181816]">
                    {activeReport.title}
                  </h2>
                  <p className="font-mono text-[11px] text-[#8C857B] tabular-nums">
                    周期：{activeReport.month} · 更新于{" "}
                    {new Date(activeReport.updatedAt).toLocaleString("zh-CN")}
                  </p>
                </div>

                {activeReport.summary && (
                  <div className="border-l-2 border-[#1B4D3E] bg-[#F6F4EF] p-4 text-xs leading-relaxed text-[#57534E]">
                    <span className="mb-1 block font-semibold text-[#181816]">核心摘要</span>
                    {activeReport.summary}
                  </div>
                )}

                <div className="whitespace-pre-wrap text-sm leading-8 text-[#292524]">
                  {activeReport.body}
                </div>
              </article>
            )}
          </section>
        </div>
      )}

      {/* Consolidated Side Drawer: Live Data Snapshot + Historical Reports Archive */}
      <AnimatePresence>
        {drawerOpen && (
          <ReportsContextDrawer
            activeTab={drawerTab}
            onTabChange={setDrawerTab}
            onClose={() => setDrawerOpen(false)}
            selectedMonth={selectedMonth}
            snapshot={snapshot}
            activities={activities}
            reports={reports}
            activeReportId={activeReport?.id ?? null}
            onSelectReport={(rep) => {
              setActiveReportId(rep.id);
              setSelectedMonthOverride(rep.month);
              setFocus(rep.focus);
              setViewMode("preview");
            }}
            onDeleteReport={(id) => {
              deleteReport(id);
              if (activeReportId === id) {
                setActiveReportId(null);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
