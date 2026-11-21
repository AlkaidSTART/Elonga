"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Search, Trash2 } from "lucide-react";
import { PLATFORMS } from "@/lib/platforms";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = history.filter((item) => {
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
      <div className="flex flex-col gap-3 border-b border-neutral-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
            创作记录
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            查看历史生成的推流文案，支持检索、复制或回到文案台继续微调
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索主题、平台或正文..."
            className="w-full rounded-lg border border-neutral-200 bg-[#FAFAFA] py-2 pl-8 pr-3 text-xs text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-[340px] flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-[#FAFAFA] p-8 text-center">
          <h2 className="text-sm font-medium text-neutral-800">
            {history.length === 0 ? "还没有创作记录" : "没有匹配的记录"}
          </h2>
          <p className="mt-1 text-xs text-neutral-400">
            {history.length === 0
              ? "在推流文案工作台生成文案后，记录会自动保存在这里"
              : "尝试更换搜索关键词"}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-neutral-200/80 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <AnimatePresence>
            {filtered.map((item) => {
              const p = PLATFORMS[item.platform];
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col justify-between gap-4 p-5 transition hover:bg-[#FAFAFA] sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
                        {p.name}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        {item.mode === "ai" ? "大模型" : "内置引擎"}
                      </span>
                      <span className="text-neutral-300">·</span>
                      <span className="font-mono text-[11px] text-neutral-400">
                        {new Date(item.createdAt).toLocaleString("zh-CN", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <h3 className="truncate text-sm font-semibold text-neutral-900">
                      {item.titles[0] || item.topic}
                    </h3>
                    <p className="line-clamp-2 text-xs leading-relaxed text-neutral-500">
                      {item.body}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => togglePublished(item.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                        item.isPublished
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                      }`}
                      title={item.isPublished ? "取消已发布标记" : "标记为已发布"}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          item.isPublished ? "bg-emerald-500" : "bg-neutral-300"
                        }`}
                      />
                      <span>{item.isPublished ? "已发布" : "标为发布"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleViral(item.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                        item.isViral
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
                      }`}
                      title={item.isViral ? "取消爆款标记" : "标记为爆款文案"}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          item.isViral ? "bg-amber-500" : "bg-neutral-300"
                        }`}
                      />
                      <span>爆款</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenInEditor(item.id)}
                      className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 hover:text-neutral-900"
                    >
                      打开编辑
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          item.id,
                          `${item.titles[0] || ""}\n\n${item.hook}\n\n${item.body}`
                        )
                      }
                      className="rounded-lg border border-neutral-200 bg-white p-1.5 text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900"
                      title="复制文案"
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
                      className="rounded-lg border border-neutral-200 bg-white p-1.5 text-neutral-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      title="删除记录"
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
