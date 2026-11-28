"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { getSafeRedirectPath, performHardAuthNavigation } from "@/lib/auth/client-navigation";

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

export function LoginCard() {
  const searchParams = useSearchParams();

  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resetSubmitting = () => setSubmitting(false);
    window.addEventListener("pageshow", resetSubmitting);
    return () => {
      window.removeEventListener("pageshow", resetSubmitting);
    };
  }, []);

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
        credentials: "same-origin",
        cache: "no-store",
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

      const redirectTarget = getSafeRedirectPath(searchParams.get("redirect"));
      performHardAuthNavigation(redirectTarget);
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
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      {/* Brand Eyebrow */}
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#E5DFD3] bg-white/80 shadow-[0_1px_2px_rgba(24,24,22,0.04)]">
          <BrandLogo size={18} />
        </div>
        <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-[#57534E]">
          <span>Elonga</span>
          <span className="h-1 w-1 rounded-full bg-[#B85D3B]" />
          <span className="text-[#8C857B]">内容创作台</span>
        </div>
      </div>

      {/* Heading */}
      <div className="mb-7">
        <h1 className="font-editorial text-[28px] leading-tight font-semibold tracking-tight text-[#181816]">
          欢迎回到工作台
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[#78716C]">
          使用机构成员邮箱或用户名登录，继续你的内容创作与协作
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Account Input */}
        <div className="group">
          <label
            htmlFor="login-account"
            className="mb-1.5 block text-xs font-medium text-[#57534E] transition-colors group-focus-within:text-[#1B4D3E]"
          >
            邮箱或用户名
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A8A29E] transition-colors group-focus-within:text-[#1B4D3E]" />
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
              className="h-11 w-full rounded-xl border border-[#DDD7CB] bg-white/75 pl-10 pr-3.5 text-[13.5px] text-[#181816] shadow-[0_1px_2px_rgba(24,24,22,0.03)] placeholder:text-[#A8A29E] transition-all duration-150 hover:border-[#C7BFB0] hover:bg-white focus:border-[#1B4D3E] focus:bg-white focus:ring-4 focus:ring-[#1B4D3E]/10 focus:outline-none disabled:opacity-60"
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="group">
          <label
            htmlFor="login-password"
            className="mb-1.5 block text-xs font-medium text-[#57534E] transition-colors group-focus-within:text-[#1B4D3E]"
          >
            密码
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A8A29E] transition-colors group-focus-within:text-[#1B4D3E]" />
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              disabled={submitting}
              className="h-11 w-full rounded-xl border border-[#DDD7CB] bg-white/75 pl-10 pr-11 text-[13.5px] text-[#181816] shadow-[0_1px_2px_rgba(24,24,22,0.03)] placeholder:text-[#A8A29E] transition-all duration-150 hover:border-[#C7BFB0] hover:bg-white focus:border-[#1B4D3E] focus:bg-white focus:ring-4 focus:ring-[#1B4D3E]/10 focus:outline-none disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#8C857B] transition hover:bg-[#EFECE4]/70 hover:text-[#181816]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <div className="pt-0.5">
          <label className="group/check inline-flex cursor-pointer items-center gap-2.5 text-xs text-[#57534E] select-none">
            <span className="relative flex h-4 w-4 items-center justify-center">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={submitting}
                className="peer sr-only"
              />
              <span className="flex h-4 w-4 items-center justify-center rounded-[5px] border border-[#CFC8BA] bg-white/80 transition-all duration-150 group-hover/check:border-[#1B4D3E]/60 peer-checked:border-[#1B4D3E] peer-checked:bg-[#1B4D3E] peer-focus-visible:ring-4 peer-focus-visible:ring-[#1B4D3E]/15">
                <Check
                  className={`h-3 w-3 stroke-[2.8] text-white transition-transform duration-150 ${
                    remember ? "scale-100 opacity-100" : "scale-50 opacity-0"
                  }`}
                />
              </span>
            </span>
            <span className="transition-colors group-hover/check:text-[#181816]">
              30 天内保持登录
            </span>
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
              className="flex items-start gap-2 rounded-xl border border-[#F3D0CE] bg-[#FDF2F2] px-3.5 py-2.5 text-xs text-[#B42318]"
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
          className="group mt-1 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1B4D3E] px-4 text-[13.5px] font-medium text-[#FCFBF8] shadow-[0_8px_20px_-8px_rgba(27,77,62,0.55)] transition-all duration-150 hover:bg-[#143A2F] hover:shadow-[0_10px_22px_-8px_rgba(27,77,62,0.65)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>正在进入...</span>
            </>
          ) : (
            <>
              <span>进入工作台</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      {/* Quick Demo Fill Cards */}
      <div className="mt-8">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#8C857B]">
            <Sparkles className="h-3 w-3 text-[#B85D3B]" />
            演示账号快捷填充
          </span>
          <span className="h-px flex-1 bg-[#E5DFD3]" />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {DEMO_ACCOUNTS.map((demo) => {
            const isSelected = account === demo.account;
            return (
              <button
                key={demo.account}
                type="button"
                disabled={submitting}
                onClick={() => applyDemoAccount(demo.account, demo.password)}
                className={`group relative flex cursor-pointer flex-col items-start rounded-xl border p-3 text-left transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSelected
                    ? "border-[#1B4D3E]/45 bg-[#E9F0ED]/70 shadow-[0_2px_8px_-2px_rgba(27,77,62,0.12)]"
                    : "border-[#E5DFD3] bg-white/55 hover:-translate-y-0.5 hover:border-[#CFC8BA] hover:bg-white/95 hover:shadow-[0_4px_12px_-4px_rgba(24,24,22,0.08)]"
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span
                    className={`text-xs font-medium transition-colors ${
                      isSelected ? "text-[#1B4D3E]" : "text-[#181816] group-hover:text-[#1B4D3E]"
                    }`}
                  >
                    {demo.role}
                  </span>
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full transition-all ${
                      isSelected
                        ? "bg-[#1B4D3E] text-white"
                        : "bg-[#EFECE4] text-transparent group-hover:bg-[#E9F0ED] group-hover:text-[#1B4D3E]"
                    }`}
                  >
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                </div>
                <span className="mt-1.5 w-full truncate font-mono text-[11px] text-[#8C857B]">
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
