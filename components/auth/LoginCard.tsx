"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const DEMO_ACCOUNTS = [
  {
    label: "管理员",
    account: "admin@elonga.cn",
    password: "elonga2026",
  },
  {
    label: "内容运营",
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
      setError("网络请求异常，请稍后重试");
      setSubmitting(false);
    }
  };

  const applyDemoAccount = (demoAccount: string, demoPassword: string) => {
    setAccount(demoAccount);
    setPassword(demoPassword);
    setError(null);
  };

  return (
    <div className="w-full max-w-[400px]">
      {/* Brand Header */}
      <div className="mb-7 flex flex-col items-center text-center">
        <BrandLogo size={44} className="mb-3.5" />
        <h1 className="text-xl font-semibold tracking-tight text-[#111827]">
          登录 Elonga
        </h1>
        <p className="mt-1 text-[13px] text-gray-500">
          内容推流与视觉创作工作台
        </p>
      </div>

      {/* Login Card */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(17,24,39,0.04)] sm:p-7">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Account Input */}
          <div>
            <label
              htmlFor="login-account"
              className="mb-1.5 block text-xs font-medium text-gray-700"
            >
              账号
            </label>
            <input
              id="login-account"
              name="account"
              type="text"
              autoComplete="username"
              autoFocus
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="邮箱或用户名"
              disabled={submitting}
              className="w-full rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-[13px] text-[#111827] placeholder:text-gray-400 transition focus:border-[#3451E5] focus:outline-none focus:ring-2 focus:ring-[#3451E5]/15 disabled:bg-gray-50 disabled:opacity-60"
            />
          </div>

          {/* Password Input */}
          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-xs font-medium text-gray-700"
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
                className="w-full rounded-lg border border-[#D1D5DB] bg-white py-2 pl-3 pr-9 text-[13px] text-[#111827] placeholder:text-gray-400 transition focus:border-[#3451E5] focus:outline-none focus:ring-2 focus:ring-[#3451E5]/15 disabled:bg-gray-50 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition hover:text-gray-600"
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
          <label className="flex cursor-pointer items-center gap-2 pt-0.5 text-xs text-gray-600 select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={submitting}
              className="h-3.5 w-3.5 rounded border-gray-300 accent-[#3451E5]"
            />
            <span>30 天内保持登录</span>
          </label>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3451E5] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#2740C7] focus:outline-none focus:ring-2 focus:ring-[#3451E5]/30 disabled:cursor-not-allowed disabled:opacity-65"
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

        {/* Demo Accounts */}
        <div className="mt-5 border-t border-[#F3F4F6] pt-4">
          <p className="mb-2 text-[11px] text-gray-400">快捷填入体验账号</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((demo) => (
              <button
                key={demo.account}
                type="button"
                disabled={submitting}
                onClick={() => applyDemoAccount(demo.account, demo.password)}
                className="flex flex-col items-start rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-left transition hover:border-gray-300 hover:bg-gray-100/70 disabled:opacity-60"
              >
                <span className="text-xs font-medium text-[#111827]">
                  {demo.label}
                </span>
                <span className="mt-0.5 truncate text-[11px] text-gray-500">
                  {demo.account}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
