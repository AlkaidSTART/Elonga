import { Suspense } from "react";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { LoginCard } from "@/components/auth/LoginCard";

export const metadata: Metadata = {
  title: "登录 - Elonga",
  description: "登录 Elonga 内容创作工作台。",
};

function LoginCardFallback() {
  return (
    <div className="w-full max-w-[360px] space-y-5">
      <div className="h-6 w-28 animate-pulse rounded bg-[#E5E0D5]" />
      <div className="h-4 w-48 animate-pulse rounded bg-[#EFECE4]" />
      <div className="space-y-4 pt-4">
        <div className="h-10 animate-pulse rounded bg-[#EFECE4]" />
        <div className="h-10 animate-pulse rounded bg-[#EFECE4]" />
        <div className="h-10 animate-pulse rounded bg-[#E5E0D5]" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen w-full grid-cols-1 bg-[#F6F4EF] lg:grid-cols-12">
      {/* Left Editorial Masthead (Deep Pine Charcoal) */}
      <aside className="hidden flex-col justify-between bg-[#162A24] px-12 py-12 text-[#F5F2EB] lg:col-span-6 lg:flex xl:px-16">
        <div className="flex items-center gap-2.5">
          <BrandLogo size={24} />
          <span className="font-editorial text-lg font-semibold tracking-tight text-[#FCFBF8]">
            Elonga
          </span>
          <span className="ml-1 text-[11px] tracking-widest text-[#94ACA3]">
            简悦内容工坊
          </span>
        </div>

        <div className="max-w-md space-y-8">
          <div className="space-y-4">
            <h2 className="font-editorial text-3xl font-semibold leading-[1.35] tracking-tight text-[#FCFBF8] xl:text-[36px]">
              微光成卷，让每一次公益行动都被认真看见。
            </h2>
            <p className="text-xs leading-relaxed text-[#A3B8B0]">
              面向公益机构与社会组织的原创内容编辑台，串联活动建档、隐私脱敏、多平台撰稿与月度复盘。
            </p>
          </div>

          <div className="divide-y divide-white/10 border-y border-white/10">
            <div className="flex items-baseline gap-4 py-3.5">
              <span className="font-mono text-[11px] text-[#D4A373]">01</span>
              <div>
                <div className="text-xs font-medium text-[#FCFBF8]">
                  活动建档与事实核对
                </div>
                <div className="mt-0.5 text-[11px] text-[#8DA69D]">
                  沉淀善款、物资与受益人数基准，防止传播失实
                </div>
              </div>
            </div>
            <div className="flex items-baseline gap-4 py-3.5">
              <span className="font-mono text-[11px] text-[#D4A373]">02</span>
              <div>
                <div className="text-xs font-medium text-[#FCFBF8]">
                  图文双重隐私保护
                </div>
                <div className="mt-0.5 text-[11px] text-[#8DA69D]">
                  正文化名脱敏与现场图片智能打码、二维风格化重绘
                </div>
              </div>
            </div>
            <div className="flex items-baseline gap-4 py-3.5">
              <span className="font-mono text-[11px] text-[#D4A373]">03</span>
              <div>
                <div className="text-xs font-medium text-[#FCFBF8]">
                  多端推流与月报归档
                </div>
                <div className="mt-0.5 text-[11px] text-[#8DA69D]">
                  适配抖音、头条、小红书与公众号，一键导出汇报文档
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#7D978E]">
          <span>微光公益服务中心 · 协作工作区</span>
          <span className="font-mono">ELONGA STUDIO</span>
        </div>
      </aside>

      {/* Right Flush Warm-Paper Sign-In Surface (Zero Floating Card) */}
      <main className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:col-span-6 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-[360px]">
          <Suspense fallback={<LoginCardFallback />}>
            <LoginCard />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
