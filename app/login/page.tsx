import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginCard } from "@/components/auth/LoginCard";

export const metadata: Metadata = {
  title: "登录 - Elonga",
  description: "登录 Elonga 内容推流与视觉创作台。",
};

function LoginCardFallback() {
  return (
    <div className="w-full max-w-[400px]">
      <div className="mb-8 flex flex-col items-center">
        <div className="mb-3 h-10 w-10 animate-pulse rounded-xl bg-gray-200" />
        <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-3.5 w-44 animate-pulse rounded bg-gray-200/80" />
      </div>
      <div className="h-[360px] animate-pulse rounded-xl border border-[#E5E7EB] bg-white" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#F7F8FA] px-4 py-12">
      <Suspense fallback={<LoginCardFallback />}>
        <LoginCard />
      </Suspense>
    </div>
  );
}
