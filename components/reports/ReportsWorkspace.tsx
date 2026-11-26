"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { EChartsOption } from "echarts";
import {
  Check,
  Copy,
  Download,
  FileBarChart2,
  Loader2,
  Trash2,
} from "lucide-react";
import { EChartBox } from "@/components/charts/EChartBox";
import {
  exportDocumentAsDocx,
  exportDocumentAsMarkdown,
  exportDocumentAsPdf,
  type AssembledDocument,
} from "@/lib/document-exporter";
import {
  buildMonthlySnapshot,
  type MonthlyReportFocus,
  type SavedMonthlyReport,
} from "@/lib/monthly-report";
import { useMonthlyReportStore } from "@/store/useMonthlyReportStore";
import { useOrganizationStore } from "@/store/useOrganizationStore";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

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
    getServerCurrentMonth
  );

  const [selectedMonthOverride, setSelectedMonthOverride] = useState<
    string | null
  >(null);
  const selectedMonth = selectedMonthOverride ?? defaultMonth;

  const [focus, setFocus] = useState<MonthlyReportFocus>("internal");
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"preview" | "edit">("preview");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

  const { history, modelConfig } = useWorkbenchStore();
  const { profile: orgProfile, activities } = useOrganizationStore();
  const { reports, saveReport, updateReportContent, deleteReport } =
    useMonthlyReportStore();

  const snapshot = useMemo(
    () => buildMonthlySnapshot(selectedMonth, history, activities),
    [selectedMonth, history, activities]
  );

  const activeReport = useMemo<SavedMonthlyReport | null>(() => {
    if (activeReportId) {
      const found = reports.find((r) => r.id === activeReportId);
      if (found) return found;
    }
    return reports.find((r) => r.month === selectedMonth) ?? reports[0] ?? null;
  }, [activeReportId, reports, selectedMonth]);

  const channelChartOption = useMemo<EChartsOption>(
    () => ({
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "#FCFBF8",
        borderColor: "#E2DDD3",
        borderWidth: 1,
        textStyle: { color: "#181816", fontSize: 12 },
      },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: "#57534E", fontSize: 11 },
      },
      grid: { left: 6, right: 12, top: 30, bottom: 4, containLabel: true },
      xAxis: {
        type: "category",
        data: snapshot.platformBreakdown.map((p) => p.platformName),
        axisLine: { lineStyle: { color: "#DDD7CA" } },
        axisTick: { show: false },
        axisLabel: { color: "#57534E", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: "#EAE5DC", type: "dashed" } },
        axisLabel: { color: "#8C857B", fontSize: 11 },
      },
      series: [
        {
          name: "已发布",
          type: "bar",
          barMaxWidth: 14,
          itemStyle: { color: "#1B4D3E", borderRadius: [2, 2, 0, 0] },
          data: snapshot.platformBreakdown.map((p) => p.publishedCount),
        },
        {
          name: "已归档",
          type: "bar",
          barMaxWidth: 14,
          itemStyle: { color: "#C4BEB2", borderRadius: [2, 2, 0, 0] },
          data: snapshot.platformBreakdown.map((p) => p.archivedCount),
        },
        {
          name: "爆款",
          type: "bar",
          barMaxWidth: 14,
          itemStyle: { color: "#B85D3B", borderRadius: [2, 2, 0, 0] },
          data: snapshot.platformBreakdown.map((p) => p.viralCount),
        },
      ],
    }),
    [snapshot.platformBreakdown]
  );

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
    platformName:
      report.focus === "donor" ? "对外公益进展月报" : "内部运营复盘月报",
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
    setExportingDocx(true);
    try {
      await exportDocumentAsDocx(buildExportDoc(activeReport));
    } finally {
      setExportingDocx(false);
    }
  };

  const handleCopyReport = async () => {
    if (!activeReport) return;
    const text = `${activeReport.title}\n\n【核心摘要】\n${activeReport.summary}\n\n${activeReport.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-9">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-[#181816]/15 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-editorial text-2xl font-semibold tracking-tight text-[#181816]">
            运营月报
          </h1>
          <p className="mt-1 text-xs text-[#78716C]">
            汇总当月活动档案与发布数据，生成可编辑与导出的月度报告
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonthOverride(e.target.value);
              setActiveReportId(null);
            }}
            className="rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-1.5 font-mono text-xs text-[#181816] outline-none focus:border-[#1B4D3E]"
          />

          <div className="flex items-center gap-0.5 rounded border border-[#E2DDD3] bg-[#EFECE4] p-0.5">
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
            disabled={isGenerating}
            onClick={() => void handleGenerateReport()}
            className="inline-flex items-center gap-1.5 rounded bg-[#1B4D3E] px-4 py-1.5 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F] disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>生成中...</span>
              </>
            ) : (
              <>
                <FileBarChart2 className="h-3.5 w-3.5" />
                <span>生成本月月报</span>
              </>
            )}
          </button>
        </div>
      </header>

      {errorMsg && (
        <p className="border-l-2 border-[#B42318] bg-[#FDF2F2] px-3.5 py-2 text-xs text-[#B42318]">
          {errorMsg}
        </p>
      )}

      {/* Monthly Live Data Snapshot Band (Flush Hairline Grid, Zero Stretched KPI Cards) */}
      <section className="grid grid-cols-1 gap-8 border-b border-[#E2DDD3] pb-8 lg:grid-cols-12 lg:items-center lg:gap-0 lg:divide-x lg:divide-[#E2DDD3]">
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4 lg:col-span-7 lg:pr-8">
          <div>
            <span className="text-[11px] font-medium text-[#78716C]">
              本月建档活动
            </span>
            <p className="mt-2 font-editorial text-3xl font-semibold text-[#181816] tabular-nums">
              {snapshot.activitiesCount}
            </p>
            <Link
              href="/organization"
              className="mt-1 inline-block text-[11px] font-medium text-[#1B4D3E] hover:underline"
            >
              管理档案 →
            </Link>
          </div>

          <div>
            <span className="text-[11px] font-medium text-[#78716C]">
              已发布 / 已归档
            </span>
            <p className="mt-2 font-editorial text-3xl font-semibold text-[#181816] tabular-nums">
              {snapshot.publishedCount}
              <span className="text-base font-normal text-[#8C857B]">
                {" "}
                / {snapshot.archivedCount}
              </span>
            </p>
            <span className="mt-1 block text-[11px] text-[#8C857B]">
              审查通过 {snapshot.reviewApprovedCount} 篇
            </span>
          </div>

          <div>
            <span className="text-[11px] font-medium text-[#78716C]">
              回填总播放/阅读
            </span>
            <p className="mt-2 font-editorial text-3xl font-semibold text-[#181816] tabular-nums">
              {snapshot.totalViews.toLocaleString("zh-CN")}
            </p>
            <Link
              href="/history"
              className="mt-1 inline-block text-[11px] font-medium text-[#1B4D3E] hover:underline"
            >
              去回填数据 →
            </Link>
          </div>

          <div>
            <span className="text-[11px] font-medium text-[#78716C]">
              总互动（赞/评/转）
            </span>
            <p className="mt-2 font-editorial text-3xl font-semibold text-[#181816] tabular-nums">
              {(
                snapshot.totalLikes +
                snapshot.totalComments +
                snapshot.totalShares
              ).toLocaleString("zh-CN")}
            </p>
            <span className="mt-1 block text-[11px] text-[#B85D3B]">
              爆款 {snapshot.viralCount} 篇
            </span>
          </div>
        </div>

        <div className="lg:col-span-5 lg:pl-8">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#181816]">
              {selectedMonth} 渠道分布
            </span>
          </div>
          <EChartBox option={channelChartOption} className="h-36 w-full" />
        </div>
      </section>

      {/* Report Manuscript + Saved Index Sidebar (Hairline Divided) */}
      <section className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Main Report Manuscript */}
        <div className="lg:col-span-8">
          {!activeReport ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center border border-dashed border-[#D5CFC3] bg-[#FCFBF8]/60 px-6 py-12 text-center">
              <FileBarChart2 className="h-7 w-7 text-[#CFC8BA]" />
              <p className="mt-3 font-editorial text-base font-medium text-[#57534E]">
                尚未生成 {selectedMonth} 月报
              </p>
              <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[#8C857B]">
                系统将自动汇总本月「机构中心」活动档案与「创作记录」中已发布/归档的稿件及回填数据，一键生成可编辑、可导出的月报。
              </p>
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => void handleGenerateReport()}
                className="mt-5 inline-flex items-center gap-1.5 rounded bg-[#1B4D3E] px-4 py-2 text-xs font-medium text-[#FCFBF8] hover:bg-[#143A2F]"
              >
                <FileBarChart2 className="h-3.5 w-3.5" />
                <span>立即生成 {selectedMonth} 月报</span>
              </button>
            </div>
          ) : (
            <div className="space-y-5 border-t-2 border-[#181816] bg-[#FCFBF8] p-7 sm:p-9">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DDD3] pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5 rounded border border-[#E2DDD3] bg-[#EFECE4] p-0.5">
                    <button
                      type="button"
                      onClick={() => setViewMode("preview")}
                      className={`rounded-[3px] px-2.5 py-1 text-xs font-medium ${
                        viewMode === "preview"
                          ? "bg-[#FCFBF8] text-[#181816]"
                          : "text-[#78716C]"
                      }`}
                    >
                      预览
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("edit")}
                      className={`rounded-[3px] px-2.5 py-1 text-xs font-medium ${
                        viewMode === "edit"
                          ? "bg-[#FCFBF8] text-[#181816]"
                          : "text-[#78716C]"
                      }`}
                    >
                      编辑
                    </button>
                  </div>
                  <span className="rounded bg-[#EFECE4] px-2 py-0.5 text-[11px] text-[#57534E]">
                    {activeReport.mode === "ai" ? "AI 生成" : "本地汇总模板"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={exportingDocx}
                    onClick={() => void handleExportDocx()}
                    className="inline-flex items-center gap-1 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2.5 py-1 text-xs font-medium text-[#57534E] hover:border-[#181816] hover:text-[#181816] disabled:opacity-50"
                  >
                    <Download className="h-3 w-3" />
                    <span>Word (.docx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      exportDocumentAsPdf(buildExportDoc(activeReport))
                    }
                    className="rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2.5 py-1 text-xs font-medium text-[#57534E] hover:border-[#181816] hover:text-[#181816]"
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      exportDocumentAsMarkdown(buildExportDoc(activeReport))
                    }
                    className="rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2.5 py-1 text-xs font-medium text-[#57534E] hover:border-[#181816] hover:text-[#181816]"
                  >
                    MD
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopyReport()}
                    className="inline-flex items-center gap-1 rounded bg-[#181816] px-3 py-1 text-xs font-medium text-[#FCFBF8] hover:bg-[#2F2E2A]"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-[#86EFAC]" />
                    ) : (
                      <Copy className="h-3 w-3" />
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
                    <p className="font-mono text-[11px] text-[#8C857B]">
                      周期：{activeReport.month} · 生成于{" "}
                      {new Date(activeReport.updatedAt).toLocaleString("zh-CN")}
                    </p>
                  </div>

                  {activeReport.summary && (
                    <div className="border-l-2 border-[#1B4D3E] bg-[#F6F4EF] p-4 text-xs leading-relaxed text-[#57534E]">
                      <span className="mb-1 block font-semibold text-[#181816]">
                        核心摘要
                      </span>
                      {activeReport.summary}
                    </div>
                  )}

                  <div className="whitespace-pre-wrap text-sm leading-8 text-[#292524]">
                    {activeReport.body}
                  </div>
                </article>
              )}
            </div>
          )}
        </div>

        {/* Saved Reports Index Rail */}
        <aside className="border-t border-[#E2DDD3] pt-5 lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
          <h3 className="mb-3 border-b border-[#E2DDD3] pb-2.5 text-xs font-semibold text-[#181816]">
            已保存月报（{reports.length}）
          </h3>
          {reports.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#8C857B]">
              暂无已生成月报
            </p>
          ) : (
            <div className="divide-y divide-[#E2DDD3]">
              {reports.map((rep) => {
                const isSelected = activeReport?.id === rep.id;
                return (
                  <div
                    key={rep.id}
                    className={`flex items-start justify-between gap-2 py-3 transition ${
                      isSelected ? "bg-[#E9F0ED]/50 px-2.5" : "hover:bg-[#FCFBF8]/70 px-1"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveReportId(rep.id);
                        setSelectedMonthOverride(rep.month);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-semibold text-[#1B4D3E]">
                          {rep.month}
                        </span>
                        <span className="rounded bg-[#EFECE4] px-1.5 py-0.5 text-[10px] text-[#57534E]">
                          {rep.focus === "donor" ? "对外汇报" : "对内复盘"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs font-medium text-[#181816]">
                        {rep.title}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteReport(rep.id)}
                      className="rounded p-1 text-[#8C857B] hover:bg-[#FDF2F2] hover:text-[#B42318]"
                      title="删除月报"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
