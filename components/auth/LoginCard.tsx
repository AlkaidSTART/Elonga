"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const DEMO_ACCOUNTS = [
  {
    role: "管理员",
    account: "admin@elonga.cn",
    password: "elonga2026",
  },
  {
    role: "内容运营",
    account: "editor@elonga.cn",
    password: "editor2026",
  },
] as const;

function getSafeRedirect(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/login")) {
    return "/";
  }
  return raw;
}

export function LoginCard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const trimmedAccount = account.trim();
    if (!trimmedAccount || !password) {
      setError("请输入账号和密码");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: trimmedAccount,
          password,
          remember,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        ok?: boolean;
      } | null;

      if (!response.ok || !data?.ok) {
        setError(data?.error || "登录失败，请检查账号和密码");
        setSubmitting(false);
        return;
      }

      const redirectTarget = getSafeRedirect(searchParams.get("redirect"));
      router.replace(redirectTarget);
      router.refresh();
    } catch {
      setError("网络请求异常，请检查服务是否正常运行");
      setSubmitting(false);
    }
  };

  const applyDemoAccount = (demoAccount: string, demoPassword: string) => {
    setAccount(demoAccount);
    setPassword(demoPassword);
    setError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[380px]"
    >
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-7 shadow-[0_1px_3px_rgba(17,24,39,0.04),0_8px_24px_rgba(17,24,39,0.04)] sm:p-8">
        {/* Header */}
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7EB]/80 bg-[#F9FAFB]">
            <BrandLogo size={26} />
          </div>
          <h1 className="text-[19px] font-semibold tracking-tight text-[#111827]">
            登录 Elonga
          </h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            输入账号与密码进入工作台
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Account Input */}
          <div>
            <label
              htmlFor="login-account"
              className="mb-1.5 block text-[13px] font-medium text-neutral-700"
            >
              邮箱或用户名
            </label>
            <input
              id="login-account"
              name="account"
              type="text"
              autoComplete="username"
              autoFocus
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="name@elonga.cn"
              disabled={submitting}
              className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 text-[13.5px] text-[#111827] placeholder:text-neutral-400 transition hover:border-[#D1D5DB] focus:border-[#3451E5] focus:outline-none focus:ring-3 focus:ring-[#3451E5]/12 disabled:bg-neutral-50 disabled:opacity-60"
            />
          </div>

          {/* Password Input */}
          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-[13px] font-medium text-neutral-700"
            >
              密码
            </label>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                disabled={submitting}
                className="h-10 w-full rounded-lg border border-[#E5E7EB] bg-white pl-3 pr-10 text-[13.5px] text-[#111827] placeholder:text-neutral-400 transition hover:border-[#D1D5DB] focus:border-[#3451E5] focus:outline-none focus:ring-3 focus:ring-[#3451E5]/12 disabled:bg-neutral-50 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="pt-0.5">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-neutral-600 select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={submitting}
                className="h-3.5 w-3.5 rounded border-neutral-300 accent-[#3451E5]"
              />
              <span>30 天内保持登录</span>
            </label>
          </div>

          {/* Error Banner */}
          <AnimatePresence initial={false}>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200/80 bg-red-50/70 px-3 py-2.5 text-[12.5px] text-red-600"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#111827] px-4 text-[13.5px] font-medium text-white transition hover:bg-[#1F2937] focus:outline-none focus:ring-3 focus:ring-[#3451E5]/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>登录中...</span>
              </>
            ) : (
              <span>登录</span>
            )}
          </button>
        </form>

        {/* Quick Demo Fill */}
        <div className="mt-6 border-t border-[#F3F4F6] pt-5">
          <p className="mb-2.5 text-center text-[11.5px] text-neutral-400">
            演示账号快捷填充
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((demo) => {
              const isSelected = account === demo.account;
              return (
                <button
                  key={demo.account}
                  type="button"
                  disabled={submitting}
                  onClick={() => applyDemoAccount(demo.account, demo.password)}
                  className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left transition disabled:opacity-60 ${
                    isSelected
                      ? "border-[#3451E5]/40 bg-[#3451E5]/[0.04]"
                      : "border-[#E5E7EB] bg-[#FAFAFA] hover:border-[#D1D5DB] hover:bg-neutral-50"
                  }`}
                >
                  <span className="text-[12px] font-medium text-[#111827]">
                    {demo.role}
                  </span>
                  <span className="mt-0.5 w-full truncate text-[11px] text-neutral-500">
                    {demo.account}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
