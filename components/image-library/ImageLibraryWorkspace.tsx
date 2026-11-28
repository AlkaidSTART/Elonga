"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Download,
  Edit3,
  Eye,
  Images,
  PenTool,
  Search,
  Trash2,
  X,
} from "lucide-react";
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

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hours}:${minutes}`;
}

export function ImageLibraryWorkspace() {
  const router = useRouter();
  const { items, updateImage, deleteImage, queueImportToWorkflow } = useImageLibraryStore();

  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | ImageLibrarySource>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewItem, setPreviewItem] = useState<ImageLibraryItem | null>(null);
  const previewSrc = previewItem ? sanitizeImageSrc(previewItem.dataUrl) : null;
  const [editingItem, setEditingItem] = useState<ImageLibraryItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editCaption, setEditCaption] = useState("");

  const filteredItems = useMemo(
    () => filterImageLibraryItems(items, { query, source: sourceFilter }),
    [items, query, sourceFilter],
  );

  const mosaicCount = useMemo(
    () => items.filter((item) => item.source === "mosaic").length,
    [items],
  );
  const stylizeCount = useMemo(
    () => items.filter((item) => item.source === "stylize").length,
    [items],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id],
    );
  };

  const handleUseInWorkflow = (ids: string[]) => {
    if (ids.length === 0) return;
    queueImportToWorkflow(ids);
    router.push("/workflow");
  };

  const handleDownload = (item: ImageLibraryItem) => {
    const safeSrc = sanitizeImageSrc(item.dataUrl);
    if (!safeSrc) return;
    const link = document.createElement("a");
    link.download = `${item.name.replace(/\.[^.]+$/, "") || "elonga-image"}.png`;
    link.href = safeSrc;
    link.click();
  };

  const openEditModal = (item: ImageLibraryItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditCaption(item.caption);
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    updateImage(editingItem.id, {
      name: editName.trim() || editingItem.name,
      caption: editCaption.trim(),
    });
    setEditingItem(null);
  };

  const handleDelete = (id: string) => {
    deleteImage(id);
    setSelectedIds((prev) => prev.filter((itemId) => itemId !== id));
    if (previewItem?.id === id) setPreviewItem(null);
    if (editingItem?.id === id) setEditingItem(null);
  };

  return (
    <div className="space-y-8">
      {/* Editorial Masthead */}
      <header className="flex flex-col gap-4 border-b border-[#181816]/15 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-editorial text-2xl font-semibold tracking-tight text-[#181816]">
            图片库
          </h1>
          <p className="mt-1 text-xs text-[#78716C]">
            统一沉淀图片工坊制作的打码与二维风格化素材，内容创作时可直接调用
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => handleUseInWorkflow(selectedIds)}
              className="inline-flex items-center gap-1.5 rounded bg-[#1B4D3E] px-4 py-2 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F]"
            >
              <PenTool className="h-3.5 w-3.5" />
              <span className="font-mono tabular-nums">
                带 {selectedIds.length} 张图去创作
              </span>
            </button>
          )}
          <Link
            href="/image-studio"
            className="inline-flex items-center gap-1.5 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3.5 py-2 text-xs font-medium text-[#181816] transition hover:border-[#181816]"
          >
            <span>前往图片工坊</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-[#8C857B]" />
          </Link>
        </div>
      </header>

      {/* Editorial KPI Strip */}
      <section className="grid grid-cols-3 divide-x divide-[#E2DDD3] border-b border-[#E2DDD3] pb-6">
        <div className="pr-4">
          <div className="text-[11px] text-[#78716C]">全部资产</div>
          <div className="mt-1 font-editorial text-2xl font-semibold text-[#181816] tabular-nums">
            {items.length}
          </div>
        </div>
        <div className="px-4 sm:px-6">
          <div className="text-[11px] text-[#78716C]">智能打码</div>
          <div className="mt-1 font-editorial text-2xl font-semibold text-[#1B4D3E] tabular-nums">
            {mosaicCount}
          </div>
        </div>
        <div className="pl-4 sm:pl-6">
          <div className="text-[11px] text-[#78716C]">二维风格化</div>
          <div className="mt-1 font-editorial text-2xl font-semibold text-[#B85D3B] tabular-nums">
            {stylizeCount}
          </div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-0.5 self-start rounded border border-[#E2DDD3] bg-[#EFECE4] p-0.5">
          {SOURCE_TABS.map((tab) => {
            const active = sourceFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSourceFilter(tab.id)}
                className={`rounded-[3px] px-3 py-1 text-xs font-medium transition ${
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

        <div className="flex items-center gap-2.5">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs text-[#78716C] transition hover:text-[#181816]"
            >
              取消选择
            </button>
          )}
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8C857B]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索图片名称、图注或风格..."
              className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] py-1.5 pl-8 pr-3 text-xs text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
            />
          </div>
        </div>
      </div>

      {/* Content Area */}
      {items.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center border border-dashed border-[#D5CFC3] bg-[#FCFBF8]/60 px-6 py-12 text-center">
          <div className="h-7 w-px bg-[#CFC8BA]" />
          <p className="mt-4 font-editorial text-base font-medium text-[#57534E]">
            图片库暂未收录素材
          </p>
          <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[#8C857B]">
            在图片工坊完成隐私打码或二维风格化后，成品将自动或一键沉淀到这里，方便内容创作直接导入。
          </p>
          <Link
            href="/image-studio"
            className="mt-5 inline-flex items-center gap-1.5 rounded bg-[#1B4D3E] px-4 py-2 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F]"
          >
            <Images className="h-3.5 w-3.5" />
            <span>去图片工坊制作首张素材</span>
          </Link>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center border border-dashed border-[#D5CFC3] bg-[#FCFBF8]/60 px-6 py-10 text-center">
          <div className="h-6 w-px bg-[#CFC8BA]" />
          <p className="mt-3 font-editorial text-base font-medium text-[#57534E]">
            未找到匹配的图片素材
          </p>
          <p className="mt-1 text-xs text-[#8C857B]">请尝试切换来源筛选或更换关键词</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item, idx) => {
            const safeSrc = sanitizeImageSrc(item.dataUrl);
            const selected = selectedIds.includes(item.id);
            return (
              <article
                key={item.id}
                className={`group flex flex-col border transition-colors ${
                  selected
                    ? "border-[#1B4D3E] bg-[#FCFBF8]"
                    : "border-[#E2DDD3] bg-[#FCFBF8] hover:border-[#CFC8BA]"
                }`}
              >
                {/* Thumbnail Studio Frame */}
                <div className="relative aspect-[16/10] overflow-hidden border-b border-[#E2DDD3] bg-[#EFECE4]/70 studio-grid-light">
                  {safeSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={safeSrc}
                      alt={item.name}
                      className="h-full w-full object-contain p-2 transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[#8C857B]">
                      图片不可用
                    </div>
                  )}

                  {/* Top-left index & checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleSelect(item.id)}
                    aria-label={selected ? "取消选择该图片" : "选择该图片"}
                    className={`absolute left-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded border transition ${
                      selected
                        ? "border-[#1B4D3E] bg-[#1B4D3E] text-[#FCFBF8]"
                        : "border-[#CFC8BA] bg-[#FCFBF8]/90 text-transparent hover:border-[#1B4D3E]"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>

                  {/* Top-right source badge */}
                  <span
                    className={`absolute right-2.5 top-2.5 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      item.source === "mosaic"
                        ? "bg-[#E9F0ED] text-[#1B4D3E]"
                        : "bg-[#FBF3EC] text-[#9A4A22]"
                    }`}
                  >
                    {getLibraryItemProcessBadge(item)}
                  </span>

                  {/* Quick preview button */}
                  <button
                    type="button"
                    onClick={() => setPreviewItem(item)}
                    className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded border border-[#D5CFC3] bg-[#FCFBF8]/95 px-2 py-1 text-[11px] font-medium text-[#181816] opacity-0 transition hover:border-[#181816] group-hover:opacity-100"
                  >
                    <Eye className="h-3 w-3" />
                    <span>预览</span>
                  </button>
                </div>

                {/* Metadata & Actions */}
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="truncate font-editorial text-[15px] font-semibold text-[#181816]">
                        {item.name}
                      </h3>
                      <span className="shrink-0 font-mono text-[10px] text-[#8C857B] tabular-nums">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-xs text-[#78716C]">
                      {item.caption || "暂无图注"}
                    </p>
                    <div className="flex items-center gap-2 pt-1 font-mono text-[10px] text-[#8C857B] tabular-nums">
                      <span>{formatImageDimensions(item.width, item.height)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatShortDate(item.createdAt)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#E2DDD3] pt-3">
                    <button
                      type="button"
                      onClick={() => handleUseInWorkflow([item.id])}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#1B4D3E] transition hover:underline"
                    >
                      <PenTool className="h-3 w-3" />
                      <span>带图去创作</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        title="编辑名称与图注"
                        aria-label="编辑名称与图注"
                        className="rounded p-1.5 text-[#78716C] transition hover:bg-[#EFECE4] hover:text-[#181816]"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(item)}
                        title="下载图片"
                        aria-label="下载图片"
                        className="rounded p-1.5 text-[#78716C] transition hover:bg-[#EFECE4] hover:text-[#181816]"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        title="从图片库移除"
                        aria-label="从图片库移除"
                        className="rounded p-1.5 text-[#78716C] transition hover:bg-[#FDF2F2] hover:text-[#B42318]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Lightbox Preview Modal */}
      <AnimatePresence>
        {previewItem && (
          <div
            onClick={() => setPreviewItem(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#181816]/45 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-[#E2DDD3] bg-[#FCFBF8] shadow-[0_16px_40px_-16px_rgba(24,24,22,0.28)]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#E2DDD3] px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate font-editorial text-lg font-semibold text-[#181816]">
                      {previewItem.name}
                    </h2>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        previewItem.source === "mosaic"
                          ? "bg-[#E9F0ED] text-[#1B4D3E]"
                          : "bg-[#FBF3EC] text-[#9A4A22]"
                      }`}
                    >
                      {getLibraryItemProcessBadge(previewItem)}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-[#78716C] tabular-nums">
                    {formatImageDimensions(previewItem.width, previewItem.height)} ·{" "}
                    {formatShortDate(previewItem.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="rounded p-1 text-[#8C857B] transition hover:bg-[#EFECE4] hover:text-[#181816]"
                  aria-label="关闭预览"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-1 items-center justify-center overflow-auto bg-[#EFECE4]/70 p-5 studio-grid-light">
                {previewSrc && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewSrc}
                    alt={previewItem.name}
                    className="max-h-[60vh] w-auto rounded-[4px] object-contain shadow-[0_8px_24px_rgba(24,24,22,0.12)]"
                  />
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2DDD3] px-5 py-3.5">
                <p className="min-w-0 flex-1 truncate text-xs text-[#57534E]">
                  图注：{previewItem.caption || "暂无图注"}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(previewItem)}
                    className="inline-flex items-center gap-1.5 rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-1.5 text-xs font-medium text-[#181816] transition hover:border-[#181816]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>下载</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUseInWorkflow([previewItem.id])}
                    className="inline-flex items-center gap-1.5 rounded bg-[#1B4D3E] px-3.5 py-1.5 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F]"
                  >
                    <PenTool className="h-3.5 w-3.5" />
                    <span>带图去创作</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Name & Caption Modal */}
      <AnimatePresence>
        {editingItem && (
          <div
            onClick={() => setEditingItem(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#181816]/35 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-lg border border-[#E2DDD3] bg-[#FCFBF8] p-6 shadow-[0_16px_40px_-16px_rgba(24,24,22,0.22)]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[#E2DDD3] pb-4">
                <div>
                  <h2 className="font-editorial text-lg font-semibold text-[#181816]">
                    编辑素材信息
                  </h2>
                  <p className="mt-0.5 text-xs text-[#78716C]">
                    修改后的图注会在导入内容创作时自动带入
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded p-1 text-[#8C857B] transition hover:bg-[#EFECE4] hover:text-[#181816]"
                  aria-label="关闭弹窗"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 py-5">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#57534E]">
                    素材名称
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="输入图片名称..."
                    className="w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 text-xs text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#57534E]">
                    默认图注
                  </label>
                  <textarea
                    rows={3}
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    placeholder="例如：乡村小学图书角捐赠现场..."
                    className="w-full resize-none rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 py-2 text-xs text-[#181816] outline-none transition placeholder:text-[#A8A29E] focus:border-[#1B4D3E]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-[#E2DDD3] pt-4">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3.5 py-1.5 text-xs font-medium text-[#57534E] transition hover:border-[#181816] hover:text-[#181816]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="rounded bg-[#1B4D3E] px-4 py-1.5 text-xs font-medium text-[#FCFBF8] transition hover:bg-[#143A2F]"
                >
                  保存修改
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
