"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trash2, X } from "lucide-react";
import type { MonthlyReportSnapshot, SavedMonthlyReport } from "@/lib/monthly-report";
import type { ActivityArchive } from "@/lib/organization";

export type ReportsDrawerTab = "data" | "archive";

interface ReportsContextDrawerProps {
  activeTab: ReportsDrawerTab;
  onTabChange: (tab: ReportsDrawerTab) => void;
  onClose: () => void;
  selectedMonth: string;
  snapshot: MonthlyReportSnapshot;
  activities: ActivityArchive[];
  reports: SavedMonthlyReport[];
  activeReportId: string | null;
  onSelectReport: (report: SavedMonthlyReport) => void;
  onDeleteReport: (id: string) => void;
}

export function ReportsContextDrawer({
  activeTab,
  onTabChange,
  onClose,
  selectedMonth,
  snapshot,
  activities,
  reports,
  activeReportId,
  onSelectReport,
  onDeleteReport,
}: ReportsContextDrawerProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const maxChannelCount = useMemo(
    () => Math.max(1, ...snapshot.platformBreakdown.map((p) => p.publishedCount + p.archivedCount)),
    [snapshot.platformBreakdown],
  );

  const totalInteractions = snapshot.totalLikes + snapshot.totalComments + snapshot.totalShares;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#181816]/35">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reports-context-drawer-title"
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[#E2DDD3] bg-[#FCFBF8]"
      >
        {/* Drawer Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E2DDD3] px-6 py-4">
          <div>
            <h2
              id="reports-context-drawer-title"
              className="font-editorial text-lg font-semibold text-[#181816]"
            >
              数据与月报档案
            </h2>
            <p className="mt-0.5 text-xs text-[#78716C]">
              查看 <span className="font-mono tabular-nums">{selectedMonth}</span> 数据快照或切换历史月报
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭抽屉"
            className="rounded p-1 text-[#8C857B] transition hover:bg-[#EFECE4] hover:text-[#181816]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Tab Switcher */}
        <div className="border-b border-[#E2DDD3] px-6 py-3">
          <div className="inline-flex items-center gap-0.5 rounded border border-[#E2DDD3] bg-[#EFECE4] p-0.5">
            <button
              type="button"
              onClick={() => onTabChange("data")}
              className={`rounded-[3px] px-3 py-1 text-xs font-medium transition ${
                activeTab === "data"
                  ? "bg-[#FCFBF8] text-[#181816]"
                  : "text-[#78716C] hover:text-[#181816]"
              }`}
            >
              本月数据
            </button>
            <button
              type="button"
              onClick={() => onTabChange("archive")}
              className={`inline-flex items-center gap-1.5 rounded-[3px] px-3 py-1 text-xs font-medium transition ${
                activeTab === "archive"
                  ? "bg-[#FCFBF8] text-[#181816]"
                  : "text-[#78716C] hover:text-[#181816]"
              }`}
            >
              <span>历史档案</span>
              <span className="rounded bg-[#EFECE4] px-1.5 py-0.2 font-mono text-[10px] text-[#57534E] tabular-nums">
                {reports.length}
              </span>
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === "data" ? (
            <div className="space-y-7">
              {/* 1. Data Digest Ledger */}
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="font-editorial text-sm font-semibold text-[#181816]">
                    {selectedMonth} 数据台账
                  </h3>
                  <span className="font-mono text-[10px] tracking-[0.12em] text-[#8C857B]">
                    LIVE SNAPSHOT
                  </span>
                </div>

                <dl className="divide-y divide-[#E2DDD3] border-y border-[#E2DDD3] text-xs">
                  <div className="flex items-baseline justify-between py-3">
                    <div>
                      <dt className="text-[#57534E]">本月建档活动</dt>
                      <Link
                        href="/organization"
                        onClick={onClose}
                        className="mt-0.5 inline-block text-[11px] text-[#1B4D3E] hover:underline"
                      >
                        管理活动档案 →
                      </Link>
                    </div>
                    <dd className="font-editorial text-2xl font-semibold text-[#181816] tabular-nums">
                      {snapshot.activitiesCount}
                    </dd>
                  </div>

                  <div className="flex items-baseline justify-between py-3">
                    <div>
                      <dt className="text-[#57534E]">已发布 / 已归档</dt>
                      <span className="mt-0.5 block text-[11px] text-[#8C857B]">
                        审查通过{" "}
                        <span className="font-mono tabular-nums">
                          {snapshot.reviewApprovedCount}
                        </span>{" "}
                        篇
                      </span>
                    </div>
                    <dd className="font-editorial text-2xl font-semibold text-[#181816] tabular-nums">
                      {snapshot.publishedCount}
                      <span className="text-sm font-normal text-[#8C857B]">
                        {" "}
                        / {snapshot.archivedCount}
                      </span>
                    </dd>
                  </div>

                  <div className="flex items-baseline justify-between py-3">
                    <div>
                      <dt className="text-[#57534E]">回填总播放 / 阅读</dt>
                      <Link
                        href="/history"
                        onClick={onClose}
                        className="mt-0.5 inline-block text-[11px] text-[#1B4D3E] hover:underline"
                      >
                        前往回填数据 →
                      </Link>
                    </div>
                    <dd className="font-editorial text-2xl font-semibold text-[#181816] tabular-nums">
                      {snapshot.totalViews.toLocaleString("zh-CN")}
                    </dd>
                  </div>

                  <div className="flex items-baseline justify-between py-3">
                    <div>
                      <dt className="text-[#57534E]">总互动（赞 / 评 / 转）</dt>
                      <span className="mt-0.5 block text-[11px] text-[#B85D3B]">
                        爆款 <span className="font-mono tabular-nums">{snapshot.viralCount}</span>{" "}
                        篇
                      </span>
                    </div>
                    <dd className="font-editorial text-2xl font-semibold text-[#181816] tabular-nums">
                      {totalInteractions.toLocaleString("zh-CN")}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* 2. Channel Breakdown */}
              <div className="space-y-2.5">
                <h3 className="font-editorial text-sm font-semibold text-[#181816]">渠道分布</h3>
                <div className="space-y-2.5">
                  {snapshot.platformBreakdown.map((ch) => {
                    const total = ch.publishedCount + ch.archivedCount;
                    const width =
                      total > 0 ? Math.max(8, Math.round((total / maxChannelCount) * 100)) : 0;
                    return (
                      <div key={ch.platform} className="space-y-1">
                        <div className="flex items-baseline justify-between text-[11px]">
                          <span className="text-[#57534E]">{ch.platformName}</span>
                          <span className="font-mono text-[#8C857B] tabular-nums">
                            发 {ch.publishedCount} · 档 {ch.archivedCount} · 爆 {ch.viralCount}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-xs bg-[#EFECE4]">
                          <div className="h-full bg-[#1B4D3E]" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Activities Preview */}
              {activities.length > 0 && (
                <div className="space-y-2 border-t border-[#E2DDD3] pt-5">
                  <h3 className="font-editorial text-sm font-semibold text-[#181816]">
                    近期活动档案
                  </h3>
                  <ul className="divide-y divide-[#E2DDD3] border-y border-[#E2DDD3] text-xs text-[#57534E]">
                    {activities.slice(0, 6).map((act) => (
                      <li key={act.id} className="flex items-baseline gap-2.5 py-2.5">
                        <span className="shrink-0 font-mono text-[11px] text-[#8C857B] tabular-nums">
                          {act.date || "日期待补"}
                        </span>
                        <span className="truncate font-medium text-[#181816]">{act.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : reports.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center border border-dashed border-[#D5CFC3] bg-[#F6F4EF]/60 px-6 py-10 text-center">
              <div className="h-7 w-px bg-[#CFC8BA]" />
              <p className="mt-4 font-editorial text-base font-medium text-[#57534E]">
                暂无历史月报
              </p>
              <p className="mt-1.5 text-xs text-[#8C857B]">
                生成首份月报后，将自动归档在此处方便随时回看与导出
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E2DDD3] border-y border-[#E2DDD3]">
              {reports.map((rep, idx) => {
                const isSelected = activeReportId === rep.id;
                return (
                  <div
                    key={rep.id}
                    className={`flex items-start justify-between gap-2 py-3 transition ${
                      isSelected ? "bg-[#E9F0ED]/65 px-2.5" : "px-1 hover:bg-[#F6F4EF]/80"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectReport(rep);
                        onClose();
                      }}
                      className="flex min-w-0 flex-1 items-baseline gap-2.5 text-left"
                    >
                      <span className="shrink-0 font-mono text-[11px] text-[#8C857B] tabular-nums">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-semibold text-[#1B4D3E] tabular-nums">
                            {rep.month}
                          </span>
                          <span className="rounded bg-[#EFECE4] px-1.5 py-0.5 text-[10px] text-[#57534E]">
                            {rep.focus === "donor" ? "对外汇报" : "对内复盘"}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs font-medium text-[#181816]">
                          {rep.title}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteReport(rep.id)}
                      className="rounded p-1 text-[#8C857B] transition hover:bg-[#FDF2F2] hover:text-[#B42318]"
                      title="删除月报"
                      aria-label={`删除 ${rep.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
