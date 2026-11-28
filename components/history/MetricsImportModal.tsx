"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  Download,
  FileSpreadsheet,
  Upload,
  X,
} from "lucide-react";
import {
  buildMetricsImportTemplateCsv,
  decodeCsvBuffer,
  matchRowsToHistory,
  parseMetricsCsv,
  type BatchSyncPublishItem,
  type MatchedMetricsRow,
  type MatchReason,
} from "@/lib/metrics-import";
import { PLATFORMS, type CopywritingResult, type PlatformId } from "@/lib/platforms";

interface MetricsImportModalProps {
  history: CopywritingResult[];
  onClose: () => void;
  onConfirmSync: (items: BatchSyncPublishItem[]) => void;
}

type InputMode = "file" | "paste";

interface PreviewRowState {
  key: string;
  row: MatchedMetricsRow;
  selected: boolean;
  targetHistoryId: string | null;
}

const PLATFORM_IDS: PlatformId[] = ["douyin", "toutiao", "xiaohongshu", "wechat"];

const MATCH_REASON_LABELS: Record<MatchReason, string> = {
  url: "链接精确匹配",
  "title-exact": "标题精确匹配",
  "title-similar": "标题相似匹配",
  unmatched: "将新建归档",
};

function formatMetric(value?: number): string {
  if (value === undefined) return "—";
  return value.toLocaleString("zh-CN");
}

export function MetricsImportModal({
  history,
  onClose,
  onConfirmSync,
}: MetricsImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [inputMode, setInputMode] = useState<InputMode>("file");
  const [defaultPlatform, setDefaultPlatform] = useState<PlatformId>("douyin");
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [archiveOnImport, setArchiveOnImport] = useState(true);

  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRowState[]>([]);

  const parseAndMatch = (text: string, platform: PlatformId) => {
    setErrorMessage(null);
    const parsed = parseMetricsCsv(text, platform);
    setWarnings(parsed.warnings);

    if (parsed.rows.length === 0) {
      setPreviewRows([]);
      if (parsed.warnings.length > 0) {
        setErrorMessage(parsed.warnings[0]);
      }
      return;
    }

    const matched = matchRowsToHistory(parsed.rows, history);
    setPreviewRows(
      matched.map((row) => ({
        key: `${row.rowIndex}-${row.title}`,
        row,
        selected: true,
        targetHistoryId: row.matchedHistoryId,
      })),
    );
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const decoded = decodeCsvBuffer(buffer);
      setRawText(decoded);
      parseAndMatch(decoded, defaultPlatform);
    } catch {
      setErrorMessage("文件读取失败，请确认文件未损坏且为 CSV/TSV 格式。");
      setPreviewRows([]);
    }
  };

  const handlePlatformChange = (nextPlatform: PlatformId) => {
    setDefaultPlatform(nextPlatform);
    if (rawText.trim()) {
      parseAndMatch(rawText, nextPlatform);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = buildMetricsImportTemplateCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "elonga-作品数据同步模板.csv";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const summary = useMemo(() => {
    const selected = previewRows.filter((item) => item.selected);
    const matchedCount = selected.filter((item) => item.targetHistoryId !== null).length;
    const createdCount = selected.length - matchedCount;
    return {
      total: previewRows.length,
      selectedCount: selected.length,
      matchedCount,
      createdCount,
    };
  }, [previewRows]);

  const allSelected = previewRows.length > 0 && summary.selectedCount === previewRows.length;

  const toggleAllRows = () => {
    const next = !allSelected;
    setPreviewRows((prev) => prev.map((item) => ({ ...item, selected: next })));
  };

  const toggleRow = (key: string) => {
    setPreviewRows((prev) =>
      prev.map((item) => (item.key === key ? { ...item, selected: !item.selected } : item)),
    );
  };

  const updateRowTarget = (key: string, targetHistoryId: string | null) => {
    setPreviewRows((prev) =>
      prev.map((item) => (item.key === key ? { ...item, targetHistoryId } : item)),
    );
  };

  const handleSubmit = () => {
    const items: BatchSyncPublishItem[] = previewRows
      .filter((item) => item.selected)
      .map((item) => ({
        targetHistoryId: item.targetHistoryId,
        platform: item.row.platform,
        title: item.row.title,
        publishedUrl: item.row.publishedUrl,
        publishedAt: item.row.publishedAt,
        metrics: item.row.metrics,
        notes: item.row.notes,
        archived: archiveOnImport,
      }));

    if (items.length === 0) {
      setErrorMessage("请至少勾选一条需要同步的作品记录。");
      return;
    }

    onConfirmSync(items);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#181816]/35 p-4">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="metrics-import-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg border border-[#E2DDD3] bg-[#FCFBF8] shadow-[0_16px_40px_-16px_rgba(24,24,22,0.22)]"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E2DDD3] px-6 py-4">
          <div>
            <h2
              id="metrics-import-title"
              className="font-editorial text-lg font-semibold text-[#181816]"
            >
              创作者后台报表批量同步
            </h2>
            <p className="mt-0.5 text-xs text-[#78716C]">
              导入抖音、今日头条、小红书或微信公众号导出的 CSV/TSV
              作品数据表，自动匹配已有稿件并回填月报指标
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭弹窗"
            className="rounded p-1 text-[#8C857B] transition hover:bg-[#EFECE4] hover:text-[#181816]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Controls Strip: Input Mode + Default Platform + Template */}
          <div className="flex flex-col gap-3 border-b border-[#E2DDD3] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-0.5 rounded border border-[#E2DDD3] bg-[#EFECE4] p-0.5">
                <button
                  type="button"
                  onClick={() => setInputMode("file")}
                  className={`inline-flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 text-xs font-medium transition ${
                    inputMode === "file"
                      ? "bg-[#FCFBF8] text-[#181816]"
                      : "text-[#78716C] hover:text-[#181816]"
                  }`}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>上传 CSV 文件</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("paste")}
                  className={`inline-flex items-center gap-1.5 rounded-[3px] px-2.5 py-1 text-xs font-medium transition ${
                    inputMode === "paste"
                      ? "bg-[#FCFBF8] text-[#181816]"
                      : "text-[#78716C] hover:text-[#181816]"
                  }`}
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  <span>粘贴表格数据</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="import-default-platform"
                  className="text-xs font-medium text-[#57534E]"
                >
                  默认平台
                </label>
                <select
                  id="import-default-platform"
                  value={defaultPlatform}
                  onChange={(e) => handlePlatformChange(e.target.value as PlatformId)}
                  className="rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2.5 py-1 text-xs text-[#181816] outline-none transition focus:border-[#1B4D3E]"
                >
                  {PLATFORM_IDS.map((pid) => (
                    <option key={pid} value={pid}>
                      {PLATFORMS[pid].name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 self-start rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-1.5 text-xs font-medium text-[#181816] transition hover:border-[#181816] sm:self-auto"
            >
              <Download className="h-3.5 w-3.5" />
              <span>下载标准 CSV 模板</span>
            </button>
          </div>

          {/* Input Zone */}
          {inputMode === "file" ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) {
                  void handleFile(dropped);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded border border-dashed px-6 py-7 text-center transition ${
                isDragging
                  ? "border-[#1B4D3E] bg-[#E9F0ED]/50"
                  : "border-[#CFC8BA] bg-[#F6F4EF]/60 hover:border-[#1B4D3E]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
                className="hidden"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) {
                    void handleFile(selectedFile);
                  }
                  e.target.value = "";
                }}
              />
              <Upload className="h-5 w-5 text-[#1B4D3E]" />
              <p className="mt-2.5 text-xs font-medium text-[#181816]">
                {fileName ? `已载入：${fileName}` : "点击选择或拖拽创作者后台导出的 CSV / TSV 文件"}
              </p>
              <p className="mt-1 text-[11px] text-[#78716C]">
                自动兼容 UTF-8 与 GBK 编码，支持识别「作品标题 / 播放量 / 阅读量 / 点赞 / 评论 /
                转发 / 发布时间 / 链接」等常见表头
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <textarea
                rows={5}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={
                  "直接从 Excel、WPS 或创作者后台复制带表头的表格内容并粘贴至此处...\n例如：\n作品标题\t播放量\t点赞数\t评论数\t转发数\n暖冬图书角公益记录\t1.2万\t680\t45\t120"
                }
                className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 font-mono text-xs text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => parseAndMatch(rawText, defaultPlatform)}
                  disabled={!rawText.trim()}
                  className="inline-flex items-center gap-1.5 rounded border border-[#1B4D3E]/35 bg-[#E9F0ED] px-3.5 py-1.5 text-xs font-medium text-[#1B4D3E] transition hover:bg-[#1B4D3E] hover:text-[#FCFBF8] disabled:opacity-50"
                >
                  <span>解析并匹配作品</span>
                </button>
              </div>
            </div>
          )}

          {/* Error / Warning Banners */}
          {errorMessage && (
            <p className="flex items-center gap-2 border-l-2 border-[#B42318] bg-[#FDF2F2] px-3.5 py-2 text-xs text-[#B42318]">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </p>
          )}

          {!errorMessage && warnings.length > 0 && (
            <div className="border-l-2 border-[#B85D3B] bg-[#FBF3EC] px-3.5 py-2 text-xs text-[#9A4A22]">
              {warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
          )}

          {/* Preview Ledger */}
          {previewRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#57534E]">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 font-medium text-[#181816]">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAllRows}
                      className="h-3.5 w-3.5 rounded accent-[#1B4D3E]"
                    />
                    <span>全选</span>
                  </label>
                  <span className="font-mono tabular-nums">
                    已选 <strong className="text-[#181816]">{summary.selectedCount}</strong> /{" "}
                    {summary.total} 条
                  </span>
                  <span className="rounded bg-[#E9F0ED] px-1.5 py-0.5 font-mono text-[11px] text-[#1B4D3E] tabular-nums">
                    更新已有稿件 {summary.matchedCount}
                  </span>
                  <span className="rounded bg-[#EFECE4] px-1.5 py-0.5 font-mono text-[11px] text-[#57534E] tabular-nums">
                    新建外部归档 {summary.createdCount}
                  </span>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[#57534E]">
                  <input
                    type="checkbox"
                    checked={archiveOnImport}
                    onChange={(e) => setArchiveOnImport(e.target.checked)}
                    className="h-3.5 w-3.5 rounded accent-[#1B4D3E]"
                  />
                  <span>同步后标记为「已归档」（纳入概览与月报）</span>
                </label>
              </div>

              <div className="divide-y divide-[#E2DDD3] border-y border-[#E2DDD3]">
                {previewRows.map((entry, idx) => {
                  const { row } = entry;
                  const isMatched = entry.targetHistoryId !== null;
                  const reasonLabel =
                    entry.targetHistoryId === row.matchedHistoryId
                      ? MATCH_REASON_LABELS[row.matchReason]
                      : isMatched
                        ? "已手动绑定"
                        : "将新建归档";

                  return (
                    <div
                      key={entry.key}
                      className={`flex flex-col gap-3 py-3 transition-colors lg:flex-row lg:items-center lg:justify-between ${
                        entry.selected ? "bg-transparent" : "opacity-50"
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <input
                          type="checkbox"
                          checked={entry.selected}
                          onChange={() => toggleRow(entry.key)}
                          aria-label={`选择第 ${idx + 1} 条作品`}
                          className="mt-1 h-3.5 w-3.5 shrink-0 rounded accent-[#1B4D3E]"
                        />
                        <span className="hidden pt-0.5 font-mono text-[11px] text-[#8C857B] tabular-nums sm:inline">
                          {String(idx + 1).padStart(2, "0")}
                        </span>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded bg-[#E9F0ED] px-1.5 py-0.5 text-[10px] font-medium text-[#1B4D3E]">
                              {PLATFORMS[row.platform].name}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                isMatched
                                  ? "border border-[#1B4D3E]/25 bg-[#E9F0ED] text-[#1B4D3E]"
                                  : "bg-[#FBF3EC] text-[#9A4A22]"
                              }`}
                            >
                              {reasonLabel}
                            </span>
                            {row.publishedAt && (
                              <span className="font-mono text-[11px] text-[#8C857B] tabular-nums">
                                {row.publishedAt.slice(0, 10)}
                              </span>
                            )}
                          </div>

                          <p className="truncate font-editorial text-sm font-semibold text-[#181816]">
                            {row.title}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-[#57534E] tabular-nums">
                            <span>
                              播放/阅读{" "}
                              <strong className="text-[#181816]">
                                {formatMetric(row.metrics.views)}
                              </strong>
                            </span>
                            <span>
                              点赞{" "}
                              <strong className="text-[#181816]">
                                {formatMetric(row.metrics.likes)}
                              </strong>
                            </span>
                            <span>
                              评论{" "}
                              <strong className="text-[#181816]">
                                {formatMetric(row.metrics.comments)}
                              </strong>
                            </span>
                            <span>
                              转发{" "}
                              <strong className="text-[#181816]">
                                {formatMetric(row.metrics.shares)}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Target History Selector */}
                      <div className="w-full shrink-0 pl-6 lg:w-64 lg:pl-0">
                        <select
                          aria-label={`第 ${idx + 1} 条匹配目标`}
                          value={entry.targetHistoryId ?? "__create__"}
                          onChange={(e) =>
                            updateRowTarget(
                              entry.key,
                              e.target.value === "__create__" ? null : e.target.value,
                            )
                          }
                          className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2.5 py-1.5 text-xs text-[#181816] outline-none transition focus:border-[#1B4D3E]"
                        >
                          <option value="__create__">+ 新建外部已发布作品记录</option>
                          {history.map((h) => (
                            <option key={h.id} value={h.id}>
                              [{PLATFORMS[h.platform].name}] {h.titles[0] || h.topic}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-[#E2DDD3] px-6 py-4">
          <p className="text-[11px] text-[#8C857B]">
            仅在浏览器本地解析并写入台账，不上传账号凭证
          </p>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3.5 py-1.5 text-xs font-medium text-[#57534E] transition hover:border-[#181816] hover:text-[#181816]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={summary.selectedCount === 0}
              className="inline-flex items-center gap-1.5 rounded bg-[#1B4D3E] px-4 py-1.5 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F] disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>确认同步（{summary.selectedCount} 条）</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
