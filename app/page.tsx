"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BookOpenText,
  Clapperboard,
  Eraser,
  Image as ImageIcon,
  Newspaper,
  PenTool,
  Video,
  Wand2,
} from "lucide-react";
import { PLATFORMS } from "@/lib/platforms";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

const CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function OverviewPage() {
  const history = useWorkbenchStore((s) => s.history);
  const hasApiKey = useWorkbenchStore((s) =>
    Boolean(s.modelConfig.apiKey.trim())
  );

  return (
    <motion.div
      variants={CONTAINER_VARIANTS}
      initial="hidden"
      animate="show"
      className="space-y-10"
    >
      {/* Clean Editorial Header */}
      <motion.section
        variants={ITEM_VARIANTS}
        className="flex flex-col gap-5 border-b border-neutral-200/80 pb-8 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="max-w-xl">
          <p className="text-xs font-medium tracking-wide text-blue-600 uppercase">
            Elonga Workspace
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            内容推流与视觉创作台
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            以克制、高效的方式完成多平台推流文案撰写与图像隐私处理及二维风格重绘。
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <Link
            href="/copywriting"
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-neutral-800"
          >
            <PenTool className="h-3.5 w-3.5" />
            <span>撰写推流文案</span>
          </Link>
          <Link
            href="/image-studio"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>进入图片工坊</span>
          </Link>
        </div>
      </motion.section>

      {/* Unified Two-Column Capability Panel (No card stacking) */}
      <motion.section
        variants={ITEM_VARIANTS}
        className="grid grid-cols-1 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white md:grid-cols-2 md:divide-x md:divide-y-0"
      >
        <Link
          href="/copywriting"
          className="group flex flex-col justify-between p-6 transition hover:bg-[#FAFAFA] sm:p-7"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PenTool className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-neutral-900">
                  多平台推流文案
                </span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-neutral-700" />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-neutral-500">
              适配抖音、今日头条、快手与微信公众号的内容分发逻辑，输出备选标题、黄金开头、结构化正文与互动引导语。
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-[11px] text-neutral-500">
            <span className="inline-flex items-center gap-1">
              <Clapperboard className="h-3 w-3 text-neutral-400" /> 抖音
            </span>
            <span className="text-neutral-300">/</span>
            <span className="inline-flex items-center gap-1">
              <Newspaper className="h-3 w-3 text-neutral-400" /> 今日头条
            </span>
            <span className="text-neutral-300">/</span>
            <span className="inline-flex items-center gap-1">
              <Video className="h-3 w-3 text-neutral-400" /> 快手
            </span>
            <span className="text-neutral-300">/</span>
            <span className="inline-flex items-center gap-1">
              <BookOpenText className="h-3 w-3 text-neutral-400" /> 微信公众号
            </span>
          </div>
        </Link>

        <Link
          href="/image-studio"
          className="group flex flex-col justify-between p-6 transition hover:bg-[#FAFAFA] sm:p-7"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ImageIcon className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-neutral-900">
                  图片工坊
                </span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-neutral-700" />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-neutral-500">
              内置 StackBlur 柔焦模糊与像素马赛克打码，同时支持调用大模型或本地算法将图片重绘为二维动漫插画风格。
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-[11px] text-neutral-500">
            <span className="inline-flex items-center gap-1">
              <Eraser className="h-3 w-3 text-neutral-400" /> 隐私涂抹打码
            </span>
            <span className="text-neutral-300">/</span>
            <span className="inline-flex items-center gap-1">
              <Wand2 className="h-3 w-3 text-neutral-400" /> 二维风格重绘
            </span>
          </div>
        </Link>
      </motion.section>

      {/* Minimalist Status & Recent Drafts List */}
      <motion.section variants={ITEM_VARIANTS} className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-neutral-500">工作台状态与最近草稿</span>
          <div className="flex items-center gap-4 text-neutral-500">
            <Link href="/settings" className="hover:text-neutral-900">
              引擎：{hasApiKey ? "云端大模型" : "内置引擎"}
            </Link>
            <Link href="/history" className="hover:text-neutral-900">
              全部记录 ({history.length})
            </Link>
          </div>
        </div>

        <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
          {history.length === 0 ? (
            <div className="px-5 py-6 text-xs text-neutral-400">
              暂无创作记录，前往「推流文案」生成第一篇内容后将显示于此。
            </div>
          ) : (
            history.slice(0, 4).map((item) => (
              <Link
                key={item.id}
                href="/history"
                className="flex items-center justify-between px-5 py-3.5 text-xs transition hover:bg-[#FAFAFA]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="shrink-0 rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
                    {PLATFORMS[item.platform].name}
                  </span>
                  <span className="truncate font-medium text-neutral-900">
                    {item.titles[0] || item.topic}
                  </span>
                </div>
                <span className="ml-4 shrink-0 font-mono text-[11px] text-neutral-400">
                  {new Date(item.createdAt).toLocaleDateString("zh-CN")}
                </span>
              </Link>
            ))
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}
