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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      {/* Mobile Brand Header */}
      <div className="mb-8 flex items-center gap-2.5 lg:hidden">
        <BrandLogo size={24} />
        <span className="font-editorial text-lg font-semibold text-[#181816]">
          Elonga
        </span>
      </div>

      {/* Heading */}
      <div className="mb-8 border-b border-[#E2DDD3] pb-5">
        <h1 className="font-editorial text-2xl font-semibold tracking-tight text-[#181816]">
          登录工作台
        </h1>
        <p className="mt-1.5 text-xs text-[#78716C]">
          使用机构成员邮箱或用户名进入 Elonga 内容创作台
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Account Input */}
        <div>
          <label
            htmlFor="login-account"
            className="mb-1.5 block text-xs font-medium text-[#57534E]"
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
            className="h-10 w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] px-3 text-[13.5px] text-[#181816] placeholder:text-[#A8A29E] transition hover:border-[#B5AEA0] focus:border-[#1B4D3E] focus:outline-none disabled:opacity-60"
          />
        </div>

        {/* Password Input */}
        <div>
          <label
            htmlFor="login-password"
            className="mb-1.5 block text-xs font-medium text-[#57534E]"
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
              className="h-10 w-full rounded border border-[#D5CFC3] bg-[#FCFBF8] pl-3 pr-10 text-[13.5px] text-[#181816] placeholder:text-[#A8A29E] transition hover:border-[#B5AEA0] focus:border-[#1B4D3E] focus:outline-none disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-[#8C857B] transition hover:text-[#181816]"
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
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[#57534E] select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={submitting}
              className="h-3.5 w-3.5 rounded border-[#CFC8BA] accent-[#1B4D3E]"
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
              className="flex items-start gap-2 border-l-2 border-[#B42318] bg-[#FDF2F2] px-3 py-2.5 text-xs text-[#B42318]"
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
          className="flex h-10 w-full items-center justify-center gap-2 rounded bg-[#1B4D3E] px-4 text-[13.5px] font-medium text-[#FCFBF8] transition hover:bg-[#143A2F] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>登录中...</span>
            </>
          ) : (
            <span>进入工作台</span>
          )}
        </button>
      </form>

      {/* Quick Demo Fill (Hairline Ledger Style) */}
      <div className="mt-8 border-t border-[#E2DDD3] pt-5">
        <p className="mb-3 text-[11px] text-[#8C857B]">演示账号快捷填充</p>
        <div className="divide-y divide-[#E2DDD3] border-y border-[#E2DDD3]">
          {DEMO_ACCOUNTS.map((demo) => {
            const isSelected = account === demo.account;
            return (
              <button
                key={demo.account}
                type="button"
                disabled={submitting}
                onClick={() => applyDemoAccount(demo.account, demo.password)}
                className={`flex w-full items-center justify-between py-2.5 text-left transition disabled:opacity-60 ${
                  isSelected
                    ? "bg-[#E9F0ED]/60 px-2 text-[#1B4D3E]"
                    : "px-1 text-[#57534E] hover:bg-[#EFECE4]/50 hover:text-[#181816]"
                }`}
              >
                <span className="text-xs font-medium">{demo.role}</span>
                <span className="font-mono text-[11px] text-[#8C857B]">
                  {demo.account}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
