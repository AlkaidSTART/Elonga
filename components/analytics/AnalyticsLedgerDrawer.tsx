"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Upload, X } from "lucide-react";
import { PLATFORMS, type CopywritingResult, type PlatformId } from "@/lib/platforms";
import { sanitizeExternalUrl } from "@/lib/url-safety";

interface AnalyticsLedgerDrawerProps {
  records: CopywritingResult[];
  onClose: () => void;
  onOpenImport: () => void;
}

const PLATFORM_IDS: PlatformId[] = ["douyin", "toutiao", "xiaohongshu", "wechat"];

function formatMetric(value?: number): string {
  if (value === undefined) return "—";
  return value.toLocaleString("zh-CN");
}

export function AnalyticsLedgerDrawer({
  records,
  onClose,
  onOpenImport,
}: AnalyticsLedgerDrawerProps) {
  const [platformFilter, setPlatformFilter] = useState<"all" | PlatformId>("all");

  const filtered = useMemo(() => {
    if (platformFilter === "all") return records;
    return records.filter((item) => item.platform === platformFilter);
  }, [records, platformFilter]);

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
        aria-labelledby="analytics-ledger-title"
        className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-[#E2DDD3] bg-[#FCFBF8]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E2DDD3] px-6 py-4">
          <div>
            <h2
              id="analytics-ledger-title"
              className="font-editorial text-lg font-semibold text-[#181816]"
            >
              已同步作品流量台账
            </h2>
            <p className="mt-0.5 text-xs text-[#78716C]">
              共{" "}
              <span className="font-mono font-medium text-[#181816] tabular-nums">
                {records.length}
              </span>{" "}
              篇已同步作品，AI 会话分析将基于此处数据执行
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenImport();
              }}
              className="inline-flex items-center gap-1.5 rounded border border-[#1B4D3E]/35 bg-[#E9F0ED] px-3 py-1.5 text-xs font-medium text-[#1B4D3E] transition hover:bg-[#1B4D3E] hover:text-[#FCFBF8]"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>导入报表</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭台账"
              className="rounded p-1 text-[#8C857B] transition hover:bg-[#EFECE4] hover:text-[#181816]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="border-b border-[#E2DDD3] px-6 py-3">
          <div className="inline-flex flex-wrap items-center gap-0.5 rounded border border-[#E2DDD3] bg-[#EFECE4] p-0.5">
            {(
              [
                { id: "all", label: "全部平台" },
                ...PLATFORM_IDS.map((pid) => ({ id: pid, label: PLATFORMS[pid].name })),
              ] as const
            ).map((tab) => {
              const active = platformFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPlatformFilter(tab.id)}
                  className={`rounded-[3px] px-2.5 py-1 text-xs font-medium transition ${
                    active ? "bg-[#FCFBF8] text-[#181816]" : "text-[#78716C] hover:text-[#181816]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filtered.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center border border-dashed border-[#D5CFC3] bg-[#F6F4EF]/60 px-6 py-10 text-center">
              <div className="h-7 w-px bg-[#CFC8BA]" />
              <p className="mt-4 font-editorial text-base font-medium text-[#57534E]">
                暂无已同步作品数据
              </p>
              <p className="mt-1.5 text-xs text-[#8C857B]">
                点击右上角「导入报表」上传创作者后台 CSV 即可快速同步
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E2DDD3] border-y border-[#E2DDD3]">
              {filtered.map((item, idx) => {
                const archive = item.publishArchive;
                const safeUrl = sanitizeExternalUrl(archive?.publishedUrl);
                return (
                  <div key={item.id} className="space-y-2 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-baseline gap-3">
                        <span className="font-mono text-[11px] text-[#8C857B] tabular-nums">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded bg-[#E9F0ED] px-1.5 py-0.5 text-[10px] font-medium text-[#1B4D3E]">
                              {PLATFORMS[item.platform].name}
                            </span>
                            {(archive?.publishedAt || item.publishedAt) && (
                              <span className="font-mono text-[11px] text-[#8C857B] tabular-nums">
                                {(archive?.publishedAt ?? item.publishedAt)?.slice(0, 10)}
                              </span>
                            )}
                            {safeUrl && (
                              <a
                                href={safeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1B4D3E] hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>原帖</span>
                              </a>
                            )}
                          </div>
                          <p className="truncate font-editorial text-sm font-semibold text-[#181816]">
                            {item.titles[0] || item.topic}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pl-7 font-mono text-[11px] text-[#57534E] tabular-nums">
                      <span>
                        播放/阅读{" "}
                        <strong className="text-[#181816]">
                          {formatMetric(archive?.metrics.views)}
                        </strong>
                      </span>
                      <span>
                        点赞{" "}
                        <strong className="text-[#181816]">
                          {formatMetric(archive?.metrics.likes)}
                        </strong>
                      </span>
                      <span>
                        评论{" "}
                        <strong className="text-[#181816]">
                          {formatMetric(archive?.metrics.comments)}
                        </strong>
                      </span>
                      <span>
                        转发{" "}
                        <strong className="text-[#181816]">
                          {formatMetric(archive?.metrics.shares)}
                        </strong>
                      </span>
                    </div>
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
