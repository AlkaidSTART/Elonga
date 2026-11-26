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

export default function ReportsPage() {
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
        backgroundColor: "#FFFFFF",
        borderColor: "#E5E7EB",
        borderWidth: 1,
        textStyle: { color: "#111827", fontSize: 12 },
      },
      legend: {
        top: 0,
        right: 0,
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: "#64748B", fontSize: 11 },
      },
      grid: { left: 6, right: 8, top: 30, bottom: 4, containLabel: true },
      xAxis: {
        type: "category",
        data: snapshot.platformBreakdown.map((p) => p.platformName),
        axisLine: { lineStyle: { color: "#E2E8F0" } },
        axisTick: { show: false },
        axisLabel: { color: "#475569", fontSize: 11 },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { color: "#F1F5F9" } },
        axisLabel: { color: "#94A3B8", fontSize: 11 },
      },
      series: [
        {
          name: "已发布",
          type: "bar",
          barMaxWidth: 16,
          itemStyle: { color: "#1D4ED8", borderRadius: [2, 2, 0, 0] },
          data: snapshot.platformBreakdown.map((p) => p.publishedCount),
        },
        {
          name: "已归档",
          type: "bar",
          barMaxWidth: 16,
          itemStyle: { color: "#059669", borderRadius: [2, 2, 0, 0] },
          data: snapshot.platformBreakdown.map((p) => p.archivedCount),
        },
        {
          name: "爆款",
          type: "bar",
          barMaxWidth: 16,
          itemStyle: { color: "#D97706", borderRadius: [2, 2, 0, 0] },
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
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-[#E5E7EB] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#111827]">
            运营月报
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
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
            className="rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 font-mono text-xs text-[#111827] outline-none focus:border-[#3451E5]"
          />

          <div className="flex items-center gap-0.5 rounded-md border border-[#E5E7EB] bg-[#F3F4F6] p-0.5">
            <button
              type="button"
              onClick={() => setFocus("internal")}
              className={`rounded-[5px] px-2.5 py-1 text-xs font-medium transition ${
                focus === "internal"
                  ? "bg-white text-[#111827] shadow-2xs"
                  : "text-gray-500 hover:text-[#111827]"
              }`}
            >
              对内复盘
            </button>
            <button
              type="button"
              onClick={() => setFocus("donor")}
              className={`rounded-[5px] px-2.5 py-1 text-xs font-medium transition ${
                focus === "donor"
                  ? "bg-white text-[#111827] shadow-2xs"
                  : "text-gray-500 hover:text-[#111827]"
              }`}
            >
              对外汇报
            </button>
          </div>

          <button
            type="button"
            disabled={isGenerating}
            onClick={() => void handleGenerateReport()}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#3451E5] px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-[#2740C7] disabled:opacity-60"
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
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {errorMsg}
        </p>
      )}

      {/* Monthly Live Data Snapshot Band */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-7">
          <div className="rounded-lg border border-[#E4E7EC] bg-white p-4">
            <span className="text-[11px] font-medium text-slate-500">
              本月建档活动
            </span>
            <p className="mt-2 font-mono text-2xl font-semibold text-[#0F172A] tabular-nums">
              {snapshot.activitiesCount}
            </p>
            <Link
              href="/organization"
              className="mt-1 inline-block text-[11px] text-[#1D4ED8] hover:underline"
            >
              管理档案 →
            </Link>
          </div>

          <div className="rounded-lg border border-[#E4E7EC] bg-white p-4">
            <span className="text-[11px] font-medium text-slate-500">
              已发布 / 已归档
            </span>
            <p className="mt-2 font-mono text-2xl font-semibold text-[#0F172A] tabular-nums">
              {snapshot.publishedCount}
              <span className="text-sm font-normal text-slate-400">
                {" "}
                / {snapshot.archivedCount}
              </span>
            </p>
            <span className="mt-1 block text-[11px] text-slate-400">
              审查通过 {snapshot.reviewApprovedCount} 篇
            </span>
          </div>

          <div className="rounded-lg border border-[#E4E7EC] bg-white p-4">
            <span className="text-[11px] font-medium text-slate-500">
              回填总播放/阅读
            </span>
            <p className="mt-2 font-mono text-2xl font-semibold text-[#0F172A] tabular-nums">
              {snapshot.totalViews.toLocaleString("zh-CN")}
            </p>
            <Link
              href="/history"
              className="mt-1 inline-block text-[11px] text-[#1D4ED8] hover:underline"
            >
              去回填数据 →
            </Link>
          </div>

          <div className="rounded-lg border border-[#E4E7EC] bg-white p-4">
            <span className="text-[11px] font-medium text-slate-500">
              总互动（赞/评/转）
            </span>
            <p className="mt-2 font-mono text-2xl font-semibold text-[#0F172A] tabular-nums">
              {(
                snapshot.totalLikes +
                snapshot.totalComments +
                snapshot.totalShares
              ).toLocaleString("zh-CN")}
            </p>
            <span className="mt-1 block text-[11px] text-slate-400">
              爆款 {snapshot.viralCount} 篇
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 lg:col-span-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#111827]">
              {selectedMonth} 渠道分布
            </span>
          </div>
          <EChartBox option={channelChartOption} className="h-36 w-full" />
        </div>
      </section>

      {/* Report Viewer + History Sidebar */}
      <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Main Report Manuscript */}
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-6 lg:col-span-8">
          {!activeReport ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
              <FileBarChart2 className="h-8 w-8 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-600">
                尚未生成 {selectedMonth} 月报
              </p>
              <p className="mt-1 max-w-md text-xs leading-relaxed text-gray-400">
                系统将自动汇总本月「机构中心」活动档案与「创作记录」中已发布/归档的稿件及回填数据，一键生成可编辑、可导出的月报。
              </p>
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => void handleGenerateReport()}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-[#3451E5] px-4 py-2 text-xs font-medium text-white hover:bg-[#2740C7]"
              >
                <FileBarChart2 className="h-3.5 w-3.5" />
                <span>立即生成 {selectedMonth} 月报</span>
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1F3F6] pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5 rounded-md border border-[#E4E7EC] bg-[#F1F3F6] p-0.5">
                    <button
                      type="button"
                      onClick={() => setViewMode("preview")}
                      className={`rounded-[5px] px-2.5 py-1 text-xs font-medium ${
                        viewMode === "preview"
                          ? "bg-white text-[#0F172A] shadow-2xs"
                          : "text-slate-500"
                      }`}
                    >
                      预览
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("edit")}
                      className={`rounded-[5px] px-2.5 py-1 text-xs font-medium ${
                        viewMode === "edit"
                          ? "bg-white text-[#0F172A] shadow-2xs"
                          : "text-slate-500"
                      }`}
                    >
                      编辑
                    </button>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                    {activeReport.mode === "ai" ? "AI 生成" : "本地汇总模板"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={exportingDocx}
                    onClick={() => void handleExportDocx()}
                    className="inline-flex items-center gap-1 rounded-md border border-[#E4E7EC] bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Download className="h-3 w-3" />
                    <span>Word (.docx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      exportDocumentAsPdf(buildExportDoc(activeReport))
                    }
                    className="rounded-md border border-[#E4E7EC] bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      exportDocumentAsMarkdown(buildExportDoc(activeReport))
                    }
                    className="rounded-md border border-[#E4E7EC] bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    MD
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopyReport()}
                    className="inline-flex items-center gap-1 rounded-md bg-[#0F172A] px-3 py-1 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-emerald-400" />
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
                    className="w-full border-b border-[#E4E7EC] pb-2 text-lg font-semibold text-[#0F172A] outline-none focus:border-[#1D4ED8]"
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
                    className="w-full resize-none rounded-md border border-[#E4E7EC] bg-[#F8FAFC] p-3 text-xs leading-relaxed text-[#0F172A] outline-none focus:border-[#1D4ED8]"
                  />
                  <textarea
                    rows={18}
                    value={activeReport.body}
                    onChange={(e) =>
                      updateReportContent(activeReport.id, {
                        body: e.target.value,
                      })
                    }
                    className="w-full resize-y rounded-md border border-[#E4E7EC] p-3 text-sm leading-7 text-slate-800 outline-none focus:border-[#1D4ED8]"
                  />
                </div>
              ) : (
                <article className="space-y-5">
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold tracking-tight text-[#0F172A]">
                      {activeReport.title}
                    </h2>
                    <p className="font-mono text-[11px] text-slate-400">
                      周期：{activeReport.month} · 生成于{" "}
                      {new Date(activeReport.updatedAt).toLocaleString("zh-CN")}
                    </p>
                  </div>

                  {activeReport.summary && (
                    <div className="rounded-lg border-l-3 border-[#1D4ED8] bg-[#F8FAFC] p-4 text-xs leading-relaxed text-slate-700">
                      <span className="mb-1 block font-semibold text-[#0F172A]">
                        核心摘要
                      </span>
                      {activeReport.summary}
                    </div>
                  )}

                  <div className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                    {activeReport.body}
                  </div>
                </article>
              )}
            </div>
          )}
        </div>

        {/* Saved Reports List */}
        <aside className="rounded-lg border border-[#E4E7EC] bg-white p-5 lg:col-span-4">
          <h3 className="mb-3 border-b border-[#F1F3F6] pb-2.5 text-xs font-semibold text-[#0F172A]">
            已保存月报（{reports.length}）
          </h3>
          {reports.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              暂无已生成月报
            </p>
          ) : (
            <div className="space-y-2">
              {reports.map((rep) => {
                const isSelected = activeReport?.id === rep.id;
                return (
                  <div
                    key={rep.id}
                    className={`flex items-start justify-between gap-2 rounded-lg border p-3 transition ${
                      isSelected
                        ? "border-[#1D4ED8] bg-[#EFF6FF]/60"
                        : "border-[#ECEEF2] hover:bg-slate-50"
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
                        <span className="font-mono text-[11px] font-semibold text-[#1D4ED8]">
                          {rep.month}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600">
                          {rep.focus === "donor" ? "对外汇报" : "对内复盘"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs font-medium text-[#0F172A]">
                        {rep.title}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteReport(rep.id)}
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
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
