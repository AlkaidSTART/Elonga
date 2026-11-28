"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Check, Images, Search, X } from "lucide-react";
import {
  filterImageLibraryItems,
  formatImageDimensions,
  getLibraryItemProcessBadge,
  type ImageLibraryItem,
  type ImageLibrarySource,
} from "@/lib/image-library";
import { sanitizeImageSrc } from "@/lib/url-safety";
import { useImageLibraryStore } from "@/store/useImageLibraryStore";

const SOURCE_TABS: Array<{ id: "all" | ImageLibrarySource; label: string }> = [
  { id: "all", label: "全部" },
  { id: "mosaic", label: "智能打码" },
  { id: "stylize", label: "二维风格化" },
];

interface ImageLibraryPickerModalProps {
  open: boolean;
  importedIds?: readonly string[];
  onClose: () => void;
  onConfirm: (selectedItems: ImageLibraryItem[]) => void;
}

export function ImageLibraryPickerModal({
  open,
  importedIds = [],
  onClose,
  onConfirm,
}: ImageLibraryPickerModalProps) {
  const items = useImageLibraryStore((s) => s.items);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | ImageLibrarySource>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const importedIdSet = useMemo(() => new Set(importedIds), [importedIds]);

  const filteredItems = useMemo(
    () => filterImageLibraryItems(items, { query, source: sourceFilter }),
    [items, query, sourceFilter],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id],
    );
  };

  const handleClose = () => {
    setSelectedIds([]);
    setQuery("");
    setSourceFilter("all");
    onClose();
  };

  const handleConfirm = () => {
    const selectedSet = new Set(selectedIds);
    const chosen = items.filter((item) => selectedSet.has(item.id));
    if (chosen.length === 0) return;
    onConfirm(chosen);
    setSelectedIds([]);
    setQuery("");
    setSourceFilter("all");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          onClick={handleClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#181816]/35 p-4"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="从图片库导入"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-[#E2DDD3] bg-[#FCFBF8] shadow-[0_16px_40px_-16px_rgba(24,24,22,0.22)]"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#E2DDD3] px-6 py-4">
              <div>
                <h2 className="font-editorial text-lg font-semibold text-[#181816]">
                  从图片库导入
                </h2>
                <p className="mt-0.5 text-xs text-[#78716C]">
                  选择图片工坊已处理的合规素材，直接加入当前内容配图列表
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/image-library"
                  onClick={handleClose}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#1B4D3E] hover:underline"
                >
                  <span>管理图片库</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded p-1 text-[#8C857B] transition hover:bg-[#EFECE4] hover:text-[#181816]"
                  aria-label="关闭弹窗"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Filter & Search Strip */}
            {items.length > 0 && (
              <div className="flex flex-col gap-3 border-b border-[#E2DDD3] bg-[#F6F4EF]/70 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center gap-0.5 self-start rounded border border-[#E2DDD3] bg-[#EFECE4] p-0.5">
                  {SOURCE_TABS.map((tab) => {
                    const active = sourceFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSourceFilter(tab.id)}
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

                <div className="relative w-full sm:w-56">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8C857B]" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="搜索名称或图注..."
                    className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] py-1.5 pl-8 pr-3 text-xs text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                  />
                </div>
              </div>
            )}

            {/* Grid Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {items.length === 0 ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center border border-dashed border-[#D5CFC3] bg-[#F6F4EF]/60 px-6 py-10 text-center">
                  <div className="h-6 w-px bg-[#CFC8BA]" />
                  <p className="mt-3 font-editorial text-base font-medium text-[#57534E]">
                    图片库还没有可用素材
                  </p>
                  <p className="mt-1 text-xs text-[#8C857B]">
                    先去图片工坊完成打码或二维风格化，成品会自动归档到这里
                  </p>
                  <Link
                    href="/image-studio"
                    onClick={handleClose}
                    className="mt-4 inline-flex items-center gap-1.5 rounded bg-[#1B4D3E] px-4 py-2 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F]"
                  >
                    <Images className="h-3.5 w-3.5" />
                    <span>前往图片工坊</span>
                  </Link>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex min-h-[180px] flex-col items-center justify-center border border-dashed border-[#D5CFC3] bg-[#F6F4EF]/60 px-6 py-8 text-center">
                  <p className="font-editorial text-sm font-medium text-[#57534E]">
                    未找到匹配的图片素材
                  </p>
                  <p className="mt-1 text-xs text-[#8C857B]">请尝试清除关键词或切换来源标签</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3">
                  {filteredItems.map((item) => {
                    const selected = selectedIds.includes(item.id);
                    const alreadyImported = importedIdSet.has(item.id);
                    const safeSrc = sanitizeImageSrc(item.dataUrl);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleSelect(item.id)}
                        className={`group flex flex-col overflow-hidden rounded border text-left transition ${
                          selected
                            ? "border-[#1B4D3E] bg-[#E9F0ED]/35 ring-1 ring-[#1B4D3E]"
                            : "border-[#E2DDD3] bg-[#FCFBF8] hover:border-[#CFC8BA]"
                        }`}
                      >
                        <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-[#E2DDD3] bg-[#EFECE4]/60 studio-grid-light">
                          {safeSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={safeSrc}
                              alt={item.name}
                              className="h-full w-full object-contain p-1.5"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[11px] text-[#8C857B]">
                              不可预览
                            </div>
                          )}

                          <span
                            className={`absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded border transition ${
                              selected
                                ? "border-[#1B4D3E] bg-[#1B4D3E] text-[#FCFBF8]"
                                : "border-[#CFC8BA] bg-[#FCFBF8]/90 text-transparent"
                            }`}
                          >
                            <Check className="h-3 w-3" />
                          </span>

                          {alreadyImported && (
                            <span className="absolute right-2 top-2 rounded bg-[#EFECE4] px-1.5 py-0.5 text-[10px] font-medium text-[#57534E]">
                              已添加
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 p-2.5">
                          <div className="truncate text-xs font-semibold text-[#181816]">
                            {item.name}
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[10px] text-[#78716C]">
                            <span
                              className={`rounded px-1.5 py-0.5 font-medium ${
                                item.source === "mosaic"
                                  ? "bg-[#E9F0ED] text-[#1B4D3E]"
                                  : "bg-[#FBF3EC] text-[#9A4A22]"
                              }`}
                            >
                              {getLibraryItemProcessBadge(item)}
                            </span>
                            <span className="font-mono tabular-nums text-[#8C857B]">
                              {formatImageDimensions(item.width, item.height)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-[#E2DDD3] px-6 py-3.5">
              <span className="font-mono text-xs text-[#78716C] tabular-nums">
                {selectedIds.length > 0 ? `已选择 ${selectedIds.length} 张素材` : "点击图片可多选"}
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3.5 py-1.5 text-xs font-medium text-[#57534E] transition hover:border-[#181816] hover:text-[#181816]"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={selectedIds.length === 0}
                  onClick={handleConfirm}
                  className="rounded bg-[#1B4D3E] px-4 py-1.5 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F] disabled:opacity-45"
                >
                  导入选中图片
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
