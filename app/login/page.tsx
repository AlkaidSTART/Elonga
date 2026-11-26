import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginCard } from "@/components/auth/LoginCard";

export const metadata: Metadata = {
  title: "登录 - Elonga 简悦内容推流与视觉创作台",
  description: "使用您的账号登录 Elonga 工作台，采用 JWT + HttpOnly Cookie 会话鉴权。",
};

function LoginCardFallback() {
  return (
    <div className="w-full max-w-[420px]">
      <div className="mb-7 flex flex-col items-center">
        <div className="mb-3.5 h-11 w-11 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-3.5 w-48 animate-pulse rounded bg-slate-200/80" />
      </div>
      <div className="h-[380px] animate-pulse rounded-xl border border-[#E2E8F0] bg-white" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#F6F7F9] px-4 py-12">
      {/* Subtle Architectural Grid Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(15, 23, 42, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 23, 42, 0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 h-[320px] w-[640px] -translate-x-1/2 rounded-full bg-[#1D4ED8]/[0.06] blur-3xl"
      />

      <div className="relative z-10 flex w-full justify-center">
        <Suspense fallback={<LoginCardFallback />}>
          <LoginCard />
        </Suspense>
      </div>
    </div>
  );
}
