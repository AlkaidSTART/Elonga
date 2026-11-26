import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginCard } from "@/components/auth/LoginCard";

export const metadata: Metadata = {
  title: "登录 - Elonga",
  description: "登录 Elonga 内容创作工作台。",
};

function LoginCardFallback() {
  return (
    <div className="w-full max-w-[380px]">
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-[0_1px_3px_rgba(17,24,39,0.04),0_8px_24px_rgba(17,24,39,0.04)]">
        <div className="mb-7 flex flex-col items-center">
          <div className="mb-3.5 h-11 w-11 animate-pulse rounded-xl bg-neutral-100" />
          <div className="h-5 w-28 animate-pulse rounded bg-neutral-200" />
          <div className="mt-2 h-3.5 w-36 animate-pulse rounded bg-neutral-100" />
        </div>
        <div className="space-y-4">
          <div className="h-10 animate-pulse rounded-lg bg-neutral-100" />
          <div className="h-10 animate-pulse rounded-lg bg-neutral-100" />
          <div className="h-10 animate-pulse rounded-lg bg-neutral-200" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#F7F8FA] px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(ellipse_at_top,rgba(52,81,229,0.05),transparent_70%)]"
      />

      <div className="relative z-10 flex w-full justify-center">
        <Suspense fallback={<LoginCardFallback />}>
          <LoginCard />
        </Suspense>
      </div>
    </div>
  );
}
