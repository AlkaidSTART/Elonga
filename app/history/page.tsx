"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArrowUpRight,
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  PLATFORM_CREATOR_URLS,
  PLATFORMS,
  type CopywritingResult,
} from "@/lib/platforms";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

type FilterMode = "all" | "eligible" | "published" | "archived" | "viral";

interface BackfillFormState {
  publishedUrl: string;
  publishedDate: string;
  views: string;
  likes: string;
  comments: string;
  shares: string;
  conversions: string;
  notes: string;
  archived: boolean;
}

function parseOptionalInt(raw: string): number | undefined {
  const cleaned = raw.replace(/,/g, "").trim();
  if (!cleaned) return undefined;
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? Math.round(num) : undefined;
}

function formatNumber(n?: number): string {
  if (n === undefined) return "0";
  return n.toLocaleString("zh-CN");
}

export default function HistoryPage() {
  const router = useRouter();
  const {
    history,
    selectFromHistory,
    removeFromHistory,
    togglePublished,
    toggleViral,
    updatePublishArchive,
  } = useWorkbenchStore();

  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [backfillTarget, setBackfillTarget] =
    useState<CopywritingResult | null>(null);
  const [backfillForm, setBackfillForm] = useState<BackfillFormState>({
    publishedUrl: "",
    publishedDate: "",
    views: "",
    likes: "",
    comments: "",
    shares: "",
    conversions: "",
    notes: "",
    archived: true,
  });

  const filtered = history.filter((item) => {
    if (filterMode === "eligible" && !item.reviewState?.approvedAt) return false;
    if (filterMode === "published" && !item.isPublished) return false;
    if (filterMode === "archived" && !item.publishArchive?.archived)
      return false;
    if (filterMode === "viral" && !item.isViral) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.topic.toLowerCase().includes(q) ||
      item.body.toLowerCase().includes(q) ||
      (item.activityTitle ?? "").toLowerCase().includes(q) ||
      PLATFORMS[item.platform].name.includes(q)
    );
  });

  const handleOpenInEditor = (id: string) => {
    selectFromHistory(id);
    router.push("/copywriting");
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // ignore
    }
  };

  const openBackfillModal = (item: CopywritingResult) => {
    const existing = item.publishArchive;
    const defaultDate = (
      existing?.publishedAt ??
      item.publishedAt ??
      new Date().toISOString()
    ).slice(0, 10);

    setBackfillTarget(item);
    setBackfillForm({
      publishedUrl: existing?.publishedUrl ?? "",
      publishedDate: defaultDate,
      views:
        existing?.metrics.views !== undefined
          ? String(existing.metrics.views)
          : "",
      likes:
        existing?.metrics.likes !== undefined
          ? String(existing.metrics.likes)
          : "",
      comments:
        existing?.metrics.comments !== undefined
          ? String(existing.metrics.comments)
          : "",
      shares:
        existing?.metrics.shares !== undefined
          ? String(existing.metrics.shares)
          : "",
      conversions: existing?.metrics.conversions ?? "",
      notes: existing?.notes ?? "",
      archived: existing?.archived ?? true,
    });
  };

  const handleSaveBackfill = () => {
    if (!backfillTarget) return;
    const publishedIso = backfillForm.publishedDate
      ? new Date(`${backfillForm.publishedDate}T12:00:00`).toISOString()
      : new Date().toISOString();

    updatePublishArchive(backfillTarget.id, {
      publishedUrl: backfillForm.publishedUrl.trim() || undefined,
      publishedAt: publishedIso,
      metrics: {
        views: parseOptionalInt(backfillForm.views),
        likes: parseOptionalInt(backfillForm.likes),
        comments: parseOptionalInt(backfillForm.comments),
        shares: parseOptionalInt(backfillForm.shares),
        conversions: backfillForm.conversions.trim() || undefined,
      },
      archived: backfillForm.archived,
      archivedAt: backfillForm.archived ? new Date().toISOString() : undefined,
      notes: backfillForm.notes.trim() || undefined,
    });
    setBackfillTarget(null);
  };

  return (
    <div className="space-y-7">
      {/* Header & Filter Strip */}
      <header className="flex flex-col gap-4 border-b border-[#181816]/15 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div>
            <h1 className="font-editorial text-2xl font-semibold tracking-tight text-[#181816]">
              创作记录与稿件归档
            </h1>
            <p className="mt-1 text-xs text-[#78716C]">
              管理所有已生成稿件的发布状态、数据回填与月报归档
            </p>
          </div>

          <div className="inline-flex flex-wrap items-center gap-0.5 rounded border border-[#E2DDD3] bg-[#EFECE4] p-0.5">
            {(
              [
                { id: "all", label: "全部" },
                { id: "eligible", label: "审查通过" },
                { id: "published", label: "已发布" },
                { id: "archived", label: "已归档" },
                { id: "viral", label: "爆款" },
              ] as const
            ).map((tab) => {
              const active = filterMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={`rounded-[3px] px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-[#FCFBF8] text-[#181816]"
                      : "text-[#78716C] hover:text-[#181816]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Crisp Search Input (widened so placeholder never clips) */}
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8C857B]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="检索标题、活动档案或平台..."
            className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] py-1.5 pl-8 pr-3 text-xs text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
          />
        </div>
      </header>

      {/* Flush Structured Editorial Ledger */}
      {filtered.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center border border-dashed border-[#D5CFC3] bg-[#FCFBF8]/60 px-6 py-12 text-center">
          <div className="h-7 w-px bg-[#CFC8BA]" />
          <p className="mt-4 font-editorial text-base font-medium text-[#57534E]">
            {history.length === 0 ? "暂无创作记录" : "无匹配结果"}
          </p>
          <p className="mt-1.5 text-xs text-[#8C857B]">
            {history.length === 0
              ? "在内容创作中生成第一篇推流稿件后，将自动沉淀至此台账"
              : "尝试更换筛选状态或清空检索关键词"}
          </p>
          {history.length === 0 && (
            <button
              type="button"
              onClick={() => router.push("/workflow")}
              className="mt-5 inline-flex items-center gap-1.5 rounded bg-[#1B4D3E] px-4 py-2 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F]"
            >
              <span>前往内容创作</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-[#E2DDD3] border-b border-[#E2DDD3]">
          <AnimatePresence>
            {filtered.map((item, idx) => {
              const p = PLATFORMS[item.platform];
              const archive = item.publishArchive;
              const hasMetrics =
                archive &&
                (archive.metrics.views !== undefined ||
                  archive.metrics.likes !== undefined ||
                  archive.metrics.comments !== undefined ||
                  archive.metrics.shares !== undefined ||
                  Boolean(archive.metrics.conversions));

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.14 }}
                  className="group flex flex-col justify-between gap-4 py-4 transition-colors hover:bg-[#FCFBF8]/70 lg:flex-row lg:items-center lg:px-2"
                >
                  <div className="flex min-w-0 flex-1 items-baseline gap-4">
                    <span className="hidden w-6 shrink-0 font-mono text-xs text-[#8C857B] tabular-nums sm:inline">
                      {String(idx + 1).padStart(2, "0")}
                    </span>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-[#E9F0ED] px-1.5 py-0.5 text-[11px] font-medium text-[#1B4D3E]">
                          {p.name}
                        </span>
                        {item.activityTitle && (
                          <span className="max-w-[200px] truncate rounded bg-[#EFECE4] px-1.5 py-0.5 text-[11px] text-[#57534E]">
                            档案：{item.activityTitle}
                          </span>
                        )}
                        {item.reviewState?.approvedAt && (
                          <span className="inline-flex items-center gap-1 rounded border border-[#1B4D3E]/25 bg-[#E9F0ED] px-1.5 py-0.5 text-[11px] font-medium text-[#1B4D3E]">
                            <ShieldCheck className="h-3 w-3" />
                            已获发布资格
                          </span>
                        )}
                        {archive?.archived && (
                          <span className="inline-flex items-center gap-1 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-1.5 py-0.5 text-[11px] font-medium text-[#57534E]">
                            <Archive className="h-3 w-3" />
                            已归档
                          </span>
                        )}
                        <span className="font-mono text-[11px] text-[#8C857B] tabular-nums">
                          {new Date(item.createdAt).toLocaleString("zh-CN", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <h3 className="truncate font-editorial text-[15px] font-semibold text-[#181816]">
                        {item.titles[0] || item.topic}
                      </h3>
                      <p className="truncate text-xs text-[#78716C]">
                        {item.body}
                      </p>

                      {/* Backfilled Metrics & Link Strip */}
                      {(hasMetrics || archive?.publishedUrl) && (
                        <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px] text-[#57534E]">
                          {archive?.metrics.views !== undefined && (
                            <span className="font-mono">
                              播放/阅读{" "}
                              <strong className="text-[#181816]">
                                {formatNumber(archive.metrics.views)}
                              </strong>
                            </span>
                          )}
                          {archive?.metrics.likes !== undefined && (
                            <span className="font-mono">
                              点赞{" "}
                              <strong className="text-[#181816]">
                                {formatNumber(archive.metrics.likes)}
                              </strong>
                            </span>
                          )}
                          {archive?.metrics.comments !== undefined && (
                            <span className="font-mono">
                              评论{" "}
                              <strong className="text-[#181816]">
                                {formatNumber(archive.metrics.comments)}
                              </strong>
                            </span>
                          )}
                          {archive?.metrics.shares !== undefined && (
                            <span className="font-mono">
                              转发{" "}
                              <strong className="text-[#181816]">
                                {formatNumber(archive.metrics.shares)}
                              </strong>
                            </span>
                          )}
                          {archive?.metrics.conversions && (
                            <span className="rounded bg-[#FBF3EC] px-1.5 py-0.5 text-[#9A4A22]">
                              转化：{archive.metrics.conversions}
                            </span>
                          )}
                          {archive?.publishedUrl && (
                            <a
                              href={archive.publishedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-[#1B4D3E] hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>查看原帖</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openBackfillModal(item)}
                      className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-medium transition ${
                        archive?.archived
                          ? "border-[#D5CFC3] bg-[#EFECE4] text-[#181816] hover:border-[#181816]"
                          : "border-[#1B4D3E]/35 bg-[#E9F0ED] text-[#1B4D3E] hover:bg-[#1B4D3E] hover:text-[#FCFBF8]"
                      }`}
                    >
                      <BarChart3 className="h-3 w-3" />
                      <span>{archive?.archived ? "更新回填" : "回填数据/归档"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => togglePublished(item.id)}
                      className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium transition ${
                        item.isPublished
                          ? "border-[#1B4D3E]/30 bg-[#E9F0ED] text-[#1B4D3E]"
                          : "border-[#D5CFC3] bg-[#FCFBF8] text-[#78716C] hover:text-[#181816]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          item.isPublished ? "bg-[#1B4D3E]" : "bg-[#CFC8BA]"
                        }`}
                      />
                      <span>已发布</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleViral(item.id)}
                      className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-medium transition ${
                        item.isViral
                          ? "border-[#B85D3B]/35 bg-[#FBF3EC] text-[#9A4A22]"
                          : "border-[#D5CFC3] bg-[#FCFBF8] text-[#78716C] hover:text-[#181816]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          item.isViral ? "bg-[#B85D3B]" : "bg-[#CFC8BA]"
                        }`}
                      />
                      <span>爆款</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenInEditor(item.id)}
                      className="inline-flex items-center gap-1 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-2.5 py-1 text-xs font-medium text-[#181816] transition hover:border-[#181816] hover:bg-[#181816] hover:text-[#FCFBF8]"
                    >
                      <span>编辑</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          item.id,
                          `${item.titles[0] || ""}\n\n${item.hook}\n\n${item.body}`
                        )
                      }
                      className="rounded p-1.5 text-[#8C857B] transition hover:bg-[#EFECE4] hover:text-[#181816]"
                      title="复制文案"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-3.5 w-3.5 text-[#1B4D3E]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => removeFromHistory(item.id)}
                      className="rounded p-1.5 text-[#8C857B] transition hover:bg-[#FDF2F2] hover:text-[#B42318]"
                      title="删除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Publish Backfill & Archive Modal */}
      <AnimatePresence>
        {backfillTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBackfillTarget(null)}
              className="fixed inset-0 bg-slate-950/35 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-[#E4E7EC] bg-white p-6 shadow-xl"
            >
              <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#F1F3F6] pb-3">
                <div>
                  <h2 className="text-base font-semibold text-[#0F172A]">
                    外部发布回填与稿件归档
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {PLATFORMS[backfillTarget.platform].name} ·{" "}
                    {backfillTarget.titles[0] || backfillTarget.topic}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBackfillTarget(null)}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Step 1: Copy & Go Publish */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E4E7EC] bg-[#F8FAFC] p-3 text-xs">
                <span className="text-slate-600">
                  1. 复制文案后前往外部平台发布，再将链接与数据回填到下方：
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        `modal-${backfillTarget.id}`,
                        `${backfillTarget.titles[0] || ""}\n\n${backfillTarget.hook}\n\n${backfillTarget.body}\n\n${backfillTarget.cta}\n\n${backfillTarget.tags.map((t) => `#${t}`).join(" ")}`
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-[#E4E7EC] bg-white px-2.5 py-1 text-xs font-medium text-[#0F172A] hover:bg-slate-100"
                  >
                    {copiedId === `modal-${backfillTarget.id}` ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>
                      {copiedId === `modal-${backfillTarget.id}`
                        ? "已复制全文"
                        : "复制全文"}
                    </span>
                  </button>
                  <a
                    href={PLATFORM_CREATOR_URLS[backfillTarget.platform].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-[#0F172A] px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    <span>
                      打开{PLATFORM_CREATOR_URLS[backfillTarget.platform].label}
                    </span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Step 2: Backfill URL & Metrics */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <label className="space-y-1 sm:col-span-2">
                  <span className="block text-xs font-medium text-slate-700">
                    外部发布链接（URL）
                  </span>
                  <input
                    type="url"
                    value={backfillForm.publishedUrl}
                    onChange={(e) =>
                      setBackfillForm((prev) => ({
                        ...prev,
                        publishedUrl: e.target.value,
                      }))
                    }
                    placeholder="https://..."
                    className="w-full rounded-md border border-[#E4E7EC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#1D4ED8]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="block text-xs font-medium text-slate-700">
                    发布日期
                  </span>
                  <input
                    type="date"
                    value={backfillForm.publishedDate}
                    onChange={(e) =>
                      setBackfillForm((prev) => ({
                        ...prev,
                        publishedDate: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-[#E4E7EC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#1D4ED8]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="block text-xs font-medium text-slate-700">
                    播放 / 阅读量
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={backfillForm.views}
                    onChange={(e) =>
                      setBackfillForm((prev) => ({
                        ...prev,
                        views: e.target.value,
                      }))
                    }
                    placeholder="例如：12500"
                    className="w-full rounded-md border border-[#E4E7EC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#1D4ED8]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="block text-xs font-medium text-slate-700">
                    点赞 / 在看数
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={backfillForm.likes}
                    onChange={(e) =>
                      setBackfillForm((prev) => ({
                        ...prev,
                        likes: e.target.value,
                      }))
                    }
                    placeholder="例如：680"
                    className="w-full rounded-md border border-[#E4E7EC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#1D4ED8]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="block text-xs font-medium text-slate-700">
                    评论数
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={backfillForm.comments}
                    onChange={(e) =>
                      setBackfillForm((prev) => ({
                        ...prev,
                        comments: e.target.value,
                      }))
                    }
                    placeholder="例如：52"
                    className="w-full rounded-md border border-[#E4E7EC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#1D4ED8]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="block text-xs font-medium text-slate-700">
                    转发 / 收藏数
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={backfillForm.shares}
                    onChange={(e) =>
                      setBackfillForm((prev) => ({
                        ...prev,
                        shares: e.target.value,
                      }))
                    }
                    placeholder="例如：134"
                    className="w-full rounded-md border border-[#E4E7EC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#1D4ED8]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="block text-xs font-medium text-slate-700">
                    公益转化备注（可选）
                  </span>
                  <input
                    type="text"
                    value={backfillForm.conversions}
                    onChange={(e) =>
                      setBackfillForm((prev) => ({
                        ...prev,
                        conversions: e.target.value,
                      }))
                    }
                    placeholder="例如：新增志愿者报名 8 人 / 筹款 26 笔"
                    className="w-full rounded-md border border-[#E4E7EC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#1D4ED8]"
                  />
                </label>

                <label className="space-y-1 sm:col-span-2">
                  <span className="block text-xs font-medium text-slate-700">
                    复盘备注（将同步进入 AI 月报）
                  </span>
                  <textarea
                    rows={2}
                    value={backfillForm.notes}
                    onChange={(e) =>
                      setBackfillForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="例如：前3秒实拍画面完播率高，评论区对图书清单询问较多..."
                    className="w-full resize-none rounded-md border border-[#E4E7EC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#1D4ED8]"
                  />
                </label>

                <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={backfillForm.archived}
                    onChange={(e) =>
                      setBackfillForm((prev) => ({
                        ...prev,
                        archived: e.target.checked,
                      }))
                    }
                    className="h-3.5 w-3.5 rounded accent-[#1D4ED8]"
                  />
                  <span className="text-xs font-medium text-[#0F172A]">
                    保存同时标记为「已归档」（纳入概览统计与 AI 月报汇总）
                  </span>
                </label>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-[#F1F3F6] pt-4">
                <button
                  type="button"
                  onClick={() => setBackfillTarget(null)}
                  className="rounded-md border border-[#E4E7EC] px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveBackfill}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#1D4ED8] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#1E40AF]"
                >
                  <Archive className="h-3.5 w-3.5" />
                  <span>保存回填并归档</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
