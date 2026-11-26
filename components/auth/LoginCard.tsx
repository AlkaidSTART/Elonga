"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const DEMO_ACCOUNTS = [
  {
    label: "主理人账号",
    account: "admin@elonga.cn",
    password: "elonga2026",
    role: "管理员",
  },
  {
    label: "运营账号",
    account: "editor@elonga.cn",
    password: "editor2026",
    role: "内容运营",
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[420px]"
    >
      {/* Brand Header */}
      <div className="mb-7 flex flex-col items-center text-center">
        <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F172A] text-white shadow-sm">
          <svg
            width="20"
            height="20"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M3 3.25H13V5.25H5.25V7H11.5V9H5.25V10.75H13V12.75H3V3.25Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-[#0F172A]">
            Elonga
          </h1>
          <span className="font-mono text-[11px] font-medium tracking-wider text-slate-400 uppercase">
            PRO
          </span>
        </div>
        <p className="mt-1.5 text-[13px] text-slate-500">
          简悦内容推流与视觉创作台 · 工作区身份认证
        </p>
      </div>

      {/* Login Card */}
      <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
        {/* Top Accent Strip */}
        <div className="h-[3px] w-full bg-gradient-to-r from-[#0F172A] via-[#1D4ED8] to-[#3B82F6]" />

        <div className="p-6 sm:p-7">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-semibold tracking-tight text-[#0F172A]">
                登录工作台
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                验证凭据后签发加密会话进入创作空间
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-md border border-blue-100 bg-blue-50/70 px-2 py-1 font-mono text-[10px] font-medium text-[#1D4ED8]">
              <ShieldCheck className="h-3 w-3" />
              JWT · Cookie
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Account Input */}
            <div>
              <label
                htmlFor="login-account"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                邮箱 / 用户名
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-account"
                  name="account"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="admin@elonga.cn 或 admin"
                  disabled={submitting}
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2.5 pl-9 pr-3 text-[13px] text-[#0F172A] placeholder:text-slate-400 transition focus:border-[#1D4ED8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/15 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="login-password"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                登录密码
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  disabled={submitting}
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2.5 pl-9 pr-10 text-[13px] text-[#0F172A] placeholder:text-slate-400 transition focus:border-[#1D4ED8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/15 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
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
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  disabled={submitting}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-[#1D4ED8]"
                />
                <span>保持登录状态（30 天）</span>
              </label>
              <span className="font-mono text-[10px] text-slate-400">
                HttpOnly · SameSite=Lax
              </span>
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
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50/80 px-3 py-2.5 text-xs text-red-700"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F172A] px-4 py-2.5 text-[13px] font-medium text-white shadow-xs transition hover:bg-[#1E293B] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/30 disabled:cursor-not-allowed disabled:opacity-65"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>正在验证身份...</span>
                </>
              ) : (
                <>
                  <span>登录并进入工作台</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill */}
          <div className="mt-6 border-t border-[#E2E8F0] pt-4">
            <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-[#1D4ED8]" />
              <span>体验账号一键填充</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((demo) => (
                <button
                  key={demo.account}
                  type="button"
                  disabled={submitting}
                  onClick={() => applyDemoAccount(demo.account, demo.password)}
                  className="flex flex-col items-start rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-left transition hover:border-[#CBD5E1] hover:bg-slate-50 disabled:opacity-60"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-medium text-[#0F172A]">
                      {demo.label}
                    </span>
                    <span className="rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-500 ring-1 ring-[#E2E8F0]">
                      {demo.role}
                    </span>
                  </div>
                  <span className="mt-1 truncate font-mono text-[10px] text-slate-500">
                    {demo.account}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Subtle Footer */}
      <p className="mt-5 text-center font-mono text-[11px] text-slate-400">
        ELONGA CONTENT WORKBENCH · HS256 SESSION AUTH
      </p>
    </motion.div>
  );
}
