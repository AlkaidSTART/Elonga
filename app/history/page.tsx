"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Check, Copy, Search, Trash2 } from "lucide-react";
import { PLATFORMS } from "@/lib/platforms";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

type FilterMode = "all" | "published" | "viral";

export default function HistoryPage() {
  const router = useRouter();
  const {
    history,
    selectFromHistory,
    removeFromHistory,
    togglePublished,
    toggleViral,
  } = useWorkbenchStore();
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = history.filter((item) => {
    if (filterMode === "published" && !item.isPublished) return false;
    if (filterMode === "viral" && !item.isViral) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.topic.toLowerCase().includes(q) ||
      item.body.toLowerCase().includes(q) ||
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

  return (
    <div className="space-y-6">
      {/* Header & Filter Strip */}
      <header className="flex flex-col gap-4 border-b border-[#E4E7EC] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-lg font-semibold tracking-tight text-[#0F172A]">
            创作记录
          </h1>

          <div className="flex items-center gap-0.5 rounded-md border border-[#E4E7EC] bg-[#F1F3F6] p-0.5">
            {(
              [
                { id: "all", label: "全部" },
                { id: "published", label: "已发布" },
                { id: "viral", label: "爆款" },
              ] as const
            ).map((tab) => {
              const active = filterMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterMode(tab.id)}
                  className={`rounded-[5px] px-3 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-white text-[#0F172A] shadow-2xs"
                      : "text-slate-500 hover:text-[#0F172A]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Crisp Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="检索标题、正文或平台..."
            className="w-full rounded-md border border-[#E4E7EC] bg-white py-1.5 pl-8 pr-3 text-xs text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
          />
        </div>
      </header>

      {/* Structured Ledger Surface */}
      {filtered.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-[#E4E7EC] bg-white text-center">
          <div className="h-6 w-px bg-[#CBD5E1]" />
          <p className="mt-3 text-sm font-medium text-slate-400">
            {history.length === 0 ? "暂无创作记录" : "无匹配结果"}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#ECEEF2] overflow-hidden rounded-lg border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <AnimatePresence>
            {filtered.map((item, idx) => {
              const p = PLATFORMS[item.platform];
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.14 }}
                  className="group flex flex-col justify-between gap-4 px-5 py-4 transition-colors hover:bg-[#F8FAFC] sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-baseline gap-4">
                    <span className="hidden w-6 shrink-0 font-mono text-xs text-slate-400 tabular-nums sm:inline">
                      {String(idx + 1).padStart(2, "0")}
                    </span>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="rounded bg-[#EFF6FF] px-1.5 py-0.5 text-[11px] font-medium text-[#1D4ED8]">
                          {p.name}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                          {new Date(item.createdAt).toLocaleString("zh-CN", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <h3 className="truncate text-[14px] font-semibold text-[#0F172A]">
                        {item.titles[0] || item.topic}
                      </h3>
                      <p className="truncate text-xs text-slate-500">
                        {item.body}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => togglePublished(item.id)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                        item.isPublished
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-[#E4E7EC] bg-white text-slate-500 hover:bg-slate-50 hover:text-[#0F172A]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          item.isPublished ? "bg-emerald-600" : "bg-slate-300"
                        }`}
                      />
                      <span>已发布</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleViral(item.id)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                        item.isViral
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-[#E4E7EC] bg-white text-slate-500 hover:bg-slate-50 hover:text-[#0F172A]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          item.isViral ? "bg-amber-500" : "bg-slate-300"
                        }`}
                      />
                      <span>爆款</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenInEditor(item.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-[#E4E7EC] bg-white px-2.5 py-1 text-xs font-medium text-[#0F172A] transition hover:border-[#0F172A] hover:bg-[#0F172A] hover:text-white"
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
                      className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-[#0F172A]"
                      title="复制"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => removeFromHistory(item.id)}
                      className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
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
    </div>
  );
}
