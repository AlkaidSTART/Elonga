"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenText,
  Clapperboard,
  Eraser,
  History,
  Image as ImageIcon,
  Newspaper,
  PenTool,
  SlidersHorizontal,
  Sparkles,
  Video,
  Wand2,
} from "lucide-react";
import { PLATFORMS } from "@/lib/platforms";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

const CONTAINER_VARIANTS = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
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
      className="space-y-6"
    >
      {/* Hero Banner */}
      <motion.section
        variants={ITEM_VARIANTS}
        className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-7 shadow-xs sm:p-9"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-50/80 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/60 px-3 py-1 text-xs font-medium text-indigo-700">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Elonga 简悦创作台</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              让每一条内容都精准触达流量
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              一站式多平台推流文案撰写与轻量视觉处理工坊。选择你熟悉的创作模块，即可开始高效输出。
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-3">
            <Link
              href="/copywriting"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700"
            >
              <PenTool className="h-4 w-4" />
              <span>开始写文案</span>
            </Link>
            <Link
              href="/image-studio"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <ImageIcon className="h-4 w-4" />
              <span>打开图片工坊</span>
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Core Modules Grid */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <motion.div variants={ITEM_VARIANTS}>
          <Link
            href="/copywriting"
            className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition hover:border-indigo-200 hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                  <PenTool className="h-5 w-5" />
                </span>
                <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-600" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                多平台推流文案
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                针对抖音、今日头条、快手、微信公众号的推荐算法与受众习惯，生成高点击标题、黄金开头、结构化正文与互动引导语。
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { label: "抖音", icon: Clapperboard },
                { label: "今日头条", icon: Newspaper },
                { label: "快手", icon: Video },
                { label: "微信公众号", icon: BookOpenText },
              ].map((p) => {
                const Icon = p.icon;
                return (
                  <span
                    key={p.label}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                  >
                    <Icon className="h-3 w-3" />
                    {p.label}
                  </span>
                );
              })}
            </div>
          </Link>
        </motion.div>

        <motion.div variants={ITEM_VARIANTS}>
          <Link
            href="/image-studio"
            className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition hover:border-indigo-200 hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 transition group-hover:bg-violet-600 group-hover:text-white">
                  <ImageIcon className="h-5 w-5" />
                </span>
                <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-600" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                图片工坊：打码与二维风格化
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                支持本地 StackBlur 高斯模糊、像素马赛克与矩形隐私遮盖；并可调用大模型或本地算法将照片一键转换为二维动漫插画风格。
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                <Eraser className="h-3 w-3" />
                智能涂抹打码
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                <Wand2 className="h-3 w-3" />
                大模型二维风格化
              </span>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* Bottom Quick Status Row */}
      <motion.div
        variants={ITEM_VARIANTS}
        className="grid grid-cols-1 gap-5 md:grid-cols-3"
      >
        <Link
          href="/history"
          className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-slate-300"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <History className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">已保存创作记录</div>
              <div className="mt-0.5 text-lg font-bold text-slate-900">
                {history.length} 篇
              </div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </Link>

        <Link
          href="/settings"
          className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-slate-300"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500">当前模型引擎</div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900">
                {hasApiKey ? "云端大模型已就绪" : "内置智能引擎"}
              </div>
            </div>
          </div>
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              hasApiKey ? "bg-emerald-500" : "bg-slate-300"
            }`}
          />
        </Link>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div>
            <div className="text-xs text-slate-500">最近一次创作平台</div>
            <div className="mt-0.5 text-sm font-semibold text-slate-900">
              {history[0]
                ? `${PLATFORMS[history[0].platform].name} · ${history[0].topic.slice(0, 12)}`
                : "暂无创作记录"}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
