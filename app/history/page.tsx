"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Copy,
  History as HistoryIcon,
  Search,
  Trash2,
} from "lucide-react";
import { PLATFORMS } from "@/lib/platforms";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

export default function HistoryPage() {
  const router = useRouter();
  const { history, selectFromHistory, removeFromHistory } = useWorkbenchStore();
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
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            创作记录
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            查看历史生成的推流文案，支持检索、复制或回到文案台继续微调
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索主题、平台或正文..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/80 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <HistoryIcon className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-sm font-semibold text-slate-900">
            {history.length === 0 ? "还没有创作记录" : "没有匹配的记录"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {history.length === 0
              ? "在推流文案工作台生成文案后，记录会自动保存在这里"
              : "尝试更换搜索关键词"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AnimatePresence>
            {filtered.map((item) => {
              const p = PLATFORMS[item.platform];
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                          {p.name}
                        </span>
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                          {item.mode === "ai" ? "大模型" : "内置引擎"}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(item.createdAt).toLocaleString("zh-CN", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <h3 className="mt-3 line-clamp-1 text-sm font-semibold text-slate-900">
                      {item.titles[0] || item.topic}
                    </h3>
                    <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-slate-500">
                      {item.body}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => handleOpenInEditor(item.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      <span>在文案台打开</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            item.id,
                            `${item.titles[0] || ""}\n\n${item.hook}\n\n${item.body}`
                          )
                        }
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
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
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        title="删除记录"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
