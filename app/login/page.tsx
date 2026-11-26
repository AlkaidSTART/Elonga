import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { LoginCard } from "@/components/auth/LoginCard";

const LOGIN_HERO_BLUR_DATA_URL =
  "data:image/webp;base64,UklGRlQAAABXRUJQVlA4IEgAAABwAQCdASoQAA0ABUB8JbACdAAAAAD+OcrAZeibRNmo4DQJfkbKrVh15iDp2ruoPjVlDHgiEb1Nq4C0eteAr63vctFX/2PfAAA=";

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
      {/* Left Pure Illustration Panel */}
      <aside className="relative hidden overflow-hidden bg-[#162A24] lg:col-span-6 lg:block">
        <Image
          src="/images/login-hero.webp"
          alt="昆明市官渡区晨希公益服务中心志愿者陪伴儿童学习插画"
          fill
          unoptimized
          loading="lazy"
          decoding="async"
          placeholder="blur"
          blurDataURL={LOGIN_HERO_BLUR_DATA_URL}
          className="object-cover object-center"
        />
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
