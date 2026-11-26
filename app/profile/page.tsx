"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  Camera,
  Check,
  Clock,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { PLATFORMS, TONES, type PlatformId, type ToneId } from "@/lib/platforms";
import { useOrganizationStore } from "@/store/useOrganizationStore";
import {
  AVATAR_ACCENTS,
  DEFAULT_PERSONAL_EXTRAS,
  PROFILE_UPDATED_EVENT,
  getAvatarAccentMeta,
  useProfileStore,
  type AvatarAccentId,
} from "@/store/useProfileStore";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

type ProfileTab = "basic" | "security" | "preferences";

interface SessionUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  orgName: string;
}

interface SessionMeta {
  iat?: number;
  exp?: number;
}

function formatUnixTime(seconds?: number): string {
  if (!seconds) return "—";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(seconds * 1000));
  } catch {
    return "—";
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const history = useWorkbenchStore((s) => s.history);
  const modelConfig = useWorkbenchStore((s) => s.modelConfig);
  const activities = useOrganizationStore((s) => s.activities);

  const updateExtras = useProfileStore((s) => s.updateExtras);

  const [activeTab, setActiveTab] = useState<ProfileTab>("basic");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sessionMeta, setSessionMeta] = useState<SessionMeta>({});

  // Basic info form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [orgName, setOrgName] = useState("");
  const [phone, setPhone] = useState("");
  const [wechat, setWechat] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [avatarAccent, setAvatarAccent] = useState<AvatarAccentId>("indigo");

  const [savingBasic, setSavingBasic] = useState(false);
  const [basicMessage, setBasicMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Preferences form state
  const [signature, setSignature] = useState("");
  const [preferredPlatforms, setPreferredPlatforms] = useState<PlatformId[]>(
    DEFAULT_PERSONAL_EXTRAS.preferredPlatforms
  );
  const [defaultTone, setDefaultTone] = useState<ToneId>(
    DEFAULT_PERSONAL_EXTRAS.defaultTone
  );
  const [autoAppendSignature, setAutoAppendSignature] = useState(true);
  const [autoComplianceReminder, setAutoComplianceReminder] = useState(true);
  const [includeEditorInExport, setIncludeEditorInExport] = useState(true);
  const [prefSaved, setPrefSaved] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [loggingOut, setLoggingOut] = useState(false);

  // Load current user session
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            authenticated?: boolean;
            user?: SessionUser;
            iat?: number;
            exp?: number;
          } | null
        ) => {
          if (cancelled) return;
          if (data?.authenticated && data.user) {
            setUser(data.user);
            setSessionMeta({ iat: data.iat, exp: data.exp });
            setName(data.user.name);
            setEmail(data.user.email);
            setRole(data.user.role);
            setOrgName(data.user.orgName);

            const extras =
              useProfileStore.getState().profilesByUserId[data.user.id] ??
              DEFAULT_PERSONAL_EXTRAS;
            setPhone(extras.phone);
            setWechat(extras.wechat);
            setLocation(extras.location);
            setBio(extras.bio);
            setAvatarDataUrl(extras.avatarDataUrl);
            setAvatarAccent(extras.avatarAccent);
            setSignature(extras.signature || `责编：${data.user.name}`);
            setPreferredPlatforms(extras.preferredPlatforms);
            setDefaultTone(extras.defaultTone);
            setAutoAppendSignature(extras.autoAppendSignature);
            setAutoComplianceReminder(extras.autoComplianceReminder);
            setIncludeEditorInExport(extras.includeEditorInExport);
          }
          setLoading(false);
        }
      )
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const publishedCount = useMemo(
    () => history.filter((item) => item.isPublished).length,
    [history]
  );

  const hasModelConfigured = Boolean(
    modelConfig.textApiKey.trim() || modelConfig.imageApiKey.trim()
  );

  const accentMeta = getAvatarAccentMeta(avatarAccent);
  const avatarInitial = (name || user?.name || "E").trim().slice(0, 1);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setBasicMessage({ type: "error", text: "请选择图片格式文件（PNG/JPG/WebP）" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setBasicMessage({ type: "error", text: "头像图片大小不能超过 2MB" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarDataUrl(reader.result);
        setBasicMessage(null);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSaveBasic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || savingBasic) return;

    setSavingBasic(true);
    setBasicMessage(null);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role: role.trim(),
          orgName: orgName.trim(),
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        user?: SessionUser;
        error?: string;
      } | null;

      if (!res.ok || !data?.ok || !data.user) {
        setBasicMessage({
          type: "error",
          text: data?.error || "保存失败，请检查输入信息",
        });
        return;
      }

      setUser(data.user);
      setName(data.user.name);
      setEmail(data.user.email);
      setRole(data.user.role);
      setOrgName(data.user.orgName);

      updateExtras(data.user.id, {
        phone: phone.trim(),
        wechat: wechat.trim(),
        location: location.trim(),
        bio: bio.trim(),
        avatarDataUrl,
        avatarAccent,
      });

      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
      setBasicMessage({ type: "success", text: "个人信息已保存并同步至当前会话" });
    } catch {
      setBasicMessage({ type: "error", text: "网络异常，请稍后重试" });
    } finally {
      setSavingBasic(false);
    }
  };

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    updateExtras(user.id, {
      signature: signature.trim(),
      preferredPlatforms:
        preferredPlatforms.length > 0 ? preferredPlatforms : ["douyin"],
      defaultTone,
      autoAppendSignature,
      autoComplianceReminder,
      includeEditorInExport,
    });
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 1800);
  };

  const handleResetPreferences = () => {
    if (!user) return;
    const defaultSignature = `责编：${user.name}`;
    updateExtras(user.id, {
      signature: defaultSignature,
      preferredPlatforms: DEFAULT_PERSONAL_EXTRAS.preferredPlatforms,
      defaultTone: DEFAULT_PERSONAL_EXTRAS.defaultTone,
      autoAppendSignature: DEFAULT_PERSONAL_EXTRAS.autoAppendSignature,
      autoComplianceReminder: DEFAULT_PERSONAL_EXTRAS.autoComplianceReminder,
      includeEditorInExport: DEFAULT_PERSONAL_EXTRAS.includeEditorInExport,
    });
    setSignature(defaultSignature);
    setPreferredPlatforms(DEFAULT_PERSONAL_EXTRAS.preferredPlatforms);
    setDefaultTone(DEFAULT_PERSONAL_EXTRAS.defaultTone);
    setAutoAppendSignature(DEFAULT_PERSONAL_EXTRAS.autoAppendSignature);
    setAutoComplianceReminder(DEFAULT_PERSONAL_EXTRAS.autoComplianceReminder);
    setIncludeEditorInExport(DEFAULT_PERSONAL_EXTRAS.includeEditorInExport);
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 1800);
  };

  const togglePreferredPlatform = (platformId: PlatformId) => {
    setPreferredPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingPassword) return;

    setPasswordMessage(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: "error", text: "请完整填写所有密码输入框" });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "新密码长度不能少于 6 位" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "两次输入的新密码不一致" });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;

      if (!res.ok || !data?.ok) {
        setPasswordMessage({
          type: "error",
          text: data?.error || "密码修改失败，请重试",
        });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({
        type: "success",
        text: "登录密码已更新，下次登录请使用新密码",
      });
    } catch {
      setPasswordMessage({ type: "error", text: "网络异常，请稍后重试" });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setLoggingOut(false);
      router.replace("/login");
      router.refresh();
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="h-14 animate-pulse rounded-lg border border-[#E5E7EB] bg-white" />
        <div className="h-36 animate-pulse rounded-lg border border-[#E5E7EB] bg-white" />
        <div className="h-80 animate-pulse rounded-lg border border-[#E5E7EB] bg-white" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] pb-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold tracking-tight text-[#111827]">
              个人中心
            </h1>
            <span className="font-mono text-[11px] tracking-wider text-slate-400 uppercase">
              PERSONAL CENTER
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            统一管理个人资料、账号安全、创作偏好与当前登录会话
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>{loggingOut ? "正在退出..." : "退出系统"}</span>
        </button>
      </header>

      {/* Identity Overview Banner */}
      <section className="rounded-lg border border-[#E4E7EC] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {avatarDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarDataUrl}
                  alt={name || "用户头像"}
                  className="h-16 w-16 rounded-xl border border-[#E4E7EC] object-cover"
                />
              ) : (
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-xl text-xl font-semibold ${accentMeta.avatarBgClass} ${accentMeta.avatarTextClass}`}
                >
                  {avatarInitial}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setActiveTab("basic");
                  fileInputRef.current?.click();
                }}
                title="更换头像"
                aria-label="更换头像"
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-[#E4E7EC] bg-white text-slate-600 shadow-xs transition hover:border-[#3451E5] hover:text-[#3451E5]"
              >
                <Camera className="h-3 w-3" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-[#0F172A]">
                  {user?.name ?? "工作区成员"}
                </h2>
                <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-medium text-[#3451E5]">
                  {user?.role ?? "成员"}
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  @{user?.username ?? "member"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {user?.email ?? "—"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  {user?.orgName ?? "未关联机构"}
                </span>
                {location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {location}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Personal Workspace Snapshot */}
          <div className="grid grid-cols-3 gap-3 sm:min-w-[270px]">
            <Link
              href="/history"
              className="rounded-md border border-[#ECEEF2] bg-[#F8FAFC] px-3 py-2 text-center transition hover:border-slate-300 hover:bg-white"
            >
              <div className="text-base font-semibold text-[#0F172A] tabular-nums">
                {history.length}
              </div>
              <div className="text-[11px] text-slate-500">
                创作稿件（{publishedCount} 已发）
              </div>
            </Link>
            <Link
              href="/organization"
              className="rounded-md border border-[#ECEEF2] bg-[#F8FAFC] px-3 py-2 text-center transition hover:border-slate-300 hover:bg-white"
            >
              <div className="text-base font-semibold text-[#0F172A] tabular-nums">
                {activities.length}
              </div>
              <div className="text-[11px] text-slate-500">机构活动档案</div>
            </Link>
            <Link
              href="/settings"
              className="rounded-md border border-[#ECEEF2] bg-[#F8FAFC] px-3 py-2 text-center transition hover:border-slate-300 hover:bg-white"
            >
              <div className="flex items-center justify-center gap-1 text-base font-semibold text-[#0F172A]">
                <span
                  className={`h-2 w-2 rounded-full ${
                    hasModelConfigured ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
                <span className="text-xs font-medium">
                  {hasModelConfigured ? "已连接" : "未配置"}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">AI 模型密钥</div>
            </Link>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[#E4E7EC] bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
        {(
          [
            { id: "basic", label: "基本信息", icon: UserRound },
            { id: "security", label: "账号安全", icon: ShieldCheck },
            { id: "preferences", label: "创作偏好", icon: Sparkles },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-medium transition ${
                active
                  ? "bg-[#EEF2FF] text-[#3451E5]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-[#0F172A]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Basic Profile */}
      {activeTab === "basic" && (
        <form
          onSubmit={handleSaveBasic}
          className="divide-y divide-[#ECEEF2] rounded-lg border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
        >
          {/* Identity & Org Band */}
          <section className="grid grid-cols-1 gap-6 p-6 sm:p-7 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 className="text-sm font-semibold text-[#0F172A]">账号与身份</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                用于工作台展示、登录会话凭证与协同署名，保存后立即同步侧边栏。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-8">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  姓名 / 显示名称 *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入姓名"
                  className="w-full rounded-md border border-[#D5DAE2] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  电子邮箱 *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@elonga.cn"
                  className="w-full rounded-md border border-[#D5DAE2] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  岗位 / 角色头衔
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="例如：内容运营 / 主理人"
                  className="w-full rounded-md border border-[#D5DAE2] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600">
                    所属机构
                  </label>
                  <Link
                    href="/organization"
                    className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#3451E5] hover:underline"
                  >
                    机构中心
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="例如：微光公益服务中心"
                  className="w-full rounded-md border border-[#D5DAE2] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
                />
              </div>
            </div>
          </section>

          {/* Avatar & Appearance Band */}
          <section className="grid grid-cols-1 gap-6 p-6 sm:p-7 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 className="text-sm font-semibold text-[#0F172A]">头像与标识</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                支持上传本地图片作为个人头像，或选择专属首字底色。
              </p>
            </div>

            <div className="space-y-4 lg:col-span-8">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#D5DAE2] bg-white px-3 py-1.5 text-xs font-medium text-[#0F172A] transition hover:bg-slate-50"
                >
                  <Camera className="h-3.5 w-3.5 text-slate-500" />
                  <span>上传本地头像</span>
                </button>
                {avatarDataUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarDataUrl(null)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#E4E7EC] bg-white px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>移除图片</span>
                  </button>
                )}
                <span className="text-[11px] text-slate-400">
                  支持 PNG / JPG / WebP，不超过 2MB
                </span>
              </div>

              <div>
                <span className="mb-2 block text-xs font-medium text-slate-600">
                  默认文字头像底色
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  {AVATAR_ACCENTS.map((item) => {
                    const selected = avatarAccent === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setAvatarAccent(item.id)}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
                          selected
                            ? "border-[#3451E5] bg-[#EEF2FF] text-[#3451E5]"
                            : "border-[#E4E7EC] bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${item.swatchClass}`}
                        />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Contact & Bio Band */}
          <section className="grid grid-cols-1 gap-6 p-6 sm:p-7 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 className="text-sm font-semibold text-[#0F172A]">联络与简介</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                记录常用联络方式与个人职责简介，方便团队协作与活动对接。
              </p>
            </div>

            <div className="space-y-4 lg:col-span-8">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-600">
                    <Phone className="h-3 w-3 text-slate-400" />
                    <span>联系电话</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="选填"
                    className="w-full rounded-md border border-[#D5DAE2] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-600">
                    <MessageSquare className="h-3 w-3 text-slate-400" />
                    <span>微信号 / 联络号</span>
                  </label>
                  <input
                    type="text"
                    value={wechat}
                    onChange={(e) => setWechat(e.target.value)}
                    placeholder="选填"
                    className="w-full rounded-md border border-[#D5DAE2] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-600">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    <span>常驻城市</span>
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="例如：北京 / 杭州"
                    className="w-full rounded-md border border-[#D5DAE2] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">
                  个人简介 / 负责方向
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="简要描述你负责的内容板块、公益项目方向或协作说明..."
                  className="w-full resize-none rounded-md border border-[#D5DAE2] bg-white px-3 py-2 text-sm leading-relaxed text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
                />
              </div>
            </div>
          </section>

          {/* Footer Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F9FAFB] px-6 py-4 sm:px-7">
            <div className="min-h-[20px] text-xs">
              {basicMessage && (
                <span
                  className={
                    basicMessage.type === "success"
                      ? "inline-flex items-center gap-1 font-medium text-emerald-600"
                      : "font-medium text-rose-600"
                  }
                >
                  {basicMessage.type === "success" && (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {basicMessage.text}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={savingBasic}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#3451E5] px-4 py-2 text-xs font-medium text-white shadow-2xs transition hover:bg-[#2740C7] disabled:opacity-50"
            >
              <span>{savingBasic ? "正在保存..." : "保存基本信息"}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Account Security */}
      {activeTab === "security" && (
        <div className="divide-y divide-[#ECEEF2] rounded-lg border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          {/* Change Password Band */}
          <form
            onSubmit={handleChangePassword}
            className="grid grid-cols-1 gap-6 p-6 sm:p-7 lg:grid-cols-12"
          >
            <div className="lg:col-span-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[#3451E5]" />
                <h2 className="text-sm font-semibold text-[#0F172A]">
                  修改登录密码
                </h2>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                建议使用 8 位以上字母与数字组合密码，定期更换以保障账号安全。
              </p>
            </div>

            <div className="space-y-4 lg:col-span-8">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600">
                    当前密码
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPasswords((v) => !v)}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#0F172A]"
                  >
                    {showPasswords ? (
                      <>
                        <EyeOff className="h-3 w-3" />
                        <span>隐藏密码</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3" />
                        <span>显示密码</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="输入当前登录密码"
                  autoComplete="current-password"
                  className="w-full rounded-md border border-[#D5DAE2] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    新密码（至少 6 位）
                  </label>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="输入新密码"
                    autoComplete="new-password"
                    className="w-full rounded-md border border-[#D5DAE2] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    确认新密码
                  </label>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次输入新密码"
                    autoComplete="new-password"
                    className="w-full rounded-md border border-[#D5DAE2] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="min-h-[20px] text-xs">
                  {passwordMessage && (
                    <span
                      className={
                        passwordMessage.type === "success"
                          ? "inline-flex items-center gap-1 font-medium text-emerald-600"
                          : "font-medium text-rose-600"
                      }
                    >
                      {passwordMessage.type === "success" && (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      {passwordMessage.text}
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#0F172A] px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  <span>{savingPassword ? "正在更新..." : "更新登录密码"}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Session Info Band */}
          <section className="grid grid-cols-1 gap-6 p-6 sm:p-7 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-[#0F172A]">
                  当前登录会话
                </h2>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                会话采用 HttpOnly 签名凭证保护，退出登录后将立即失效。
              </p>
            </div>

            <div className="space-y-4 lg:col-span-8">
              <div className="grid grid-cols-1 gap-3 rounded-md border border-[#ECEEF2] bg-[#F8FAFC] p-4 text-xs sm:grid-cols-2">
                <div>
                  <span className="text-slate-400">登录账号</span>
                  <div className="mt-0.5 font-mono font-medium text-[#0F172A]">
                    {user?.username ?? "—"}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">成员编号</span>
                  <div className="mt-0.5 font-mono font-medium text-[#0F172A]">
                    {user?.id ?? "—"}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">签发时间</span>
                  <div className="mt-0.5 font-medium text-[#0F172A] tabular-nums">
                    {formatUnixTime(sessionMeta.iat)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">会话有效期至</span>
                  <div className="mt-0.5 font-medium text-[#0F172A] tabular-nums">
                    {formatUnixTime(sessionMeta.exp)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border border-rose-200/70 bg-rose-50/40 px-4 py-3">
                <div>
                  <div className="text-xs font-medium text-[#0F172A]">
                    退出当前系统登录
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    清除当前浏览器会话凭证并返回登录页
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-600 hover:text-white disabled:opacity-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{loggingOut ? "正在退出..." : "退出系统"}</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Tab 3: Creative Preferences */}
      {activeTab === "preferences" && (
        <form
          onSubmit={handleSavePreferences}
          className="divide-y divide-[#ECEEF2] rounded-lg border border-[#E4E7EC] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
        >
          {/* Default Platforms & Tone */}
          <section className="grid grid-cols-1 gap-6 p-6 sm:p-7 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 className="text-sm font-semibold text-[#0F172A]">
                常用渠道与风格
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                配置你的常用发布平台、内容口吻与个人默认署名。
              </p>
            </div>

            <div className="space-y-5 lg:col-span-8">
              <div>
                <span className="mb-2 block text-xs font-medium text-slate-600">
                  常用发布平台（多选）
                </span>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {(Object.keys(PLATFORMS) as PlatformId[]).map((platformId) => {
                    const meta = PLATFORMS[platformId];
                    const selected = preferredPlatforms.includes(platformId);
                    return (
                      <button
                        key={platformId}
                        type="button"
                        onClick={() => togglePreferredPlatform(platformId)}
                        className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-xs font-medium transition ${
                          selected
                            ? "border-[#3451E5] bg-[#EEF2FF] text-[#3451E5]"
                            : "border-[#E4E7EC] bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span>{meta.name}</span>
                        {selected && <Check className="h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    个人默认文案口吻
                  </label>
                  <select
                    value={defaultTone}
                    onChange={(e) => setDefaultTone(e.target.value as ToneId)}
                    className="w-full rounded-md border border-[#D5DAE2] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
                  >
                    {TONES.map((tone) => (
                      <option key={tone.id} value={tone.id}>
                        {tone.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    默认个人署名 / 责编落款
                  </label>
                  <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder={`例如：责编：${user?.name ?? "林清禾"}`}
                    className="w-full rounded-md border border-[#D5DAE2] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/10"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Workflow Toggles */}
          <section className="grid grid-cols-1 gap-6 p-6 sm:p-7 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 className="text-sm font-semibold text-[#0F172A]">工作台习惯</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                控制日常文案撰写、合规审查与文档导出时的默认辅助行为。
              </p>
            </div>

            <div className="space-y-3 lg:col-span-8">
              {[
                {
                  checked: autoAppendSignature,
                  onChange: setAutoAppendSignature,
                  title: "文案结尾自动带入个人署名参考",
                  desc: "在多平台推流文案中保留责任编辑署名占位，便于审核归档",
                },
                {
                  checked: autoComplianceReminder,
                  onChange: setAutoComplianceReminder,
                  title: "发布前开启敏感词与隐私脱敏提醒",
                  desc: "优先提示受助人化名、手机号、门牌号等隐私合规风险",
                },
                {
                  checked: includeEditorInExport,
                  onChange: setIncludeEditorInExport,
                  title: "导出 Word / 月报文档附带个人与机构署名",
                  desc: "导出归档文件时自动附加所属机构名称与责任编辑信息",
                },
              ].map((item) => (
                <label
                  key={item.title}
                  className="flex cursor-pointer items-start justify-between gap-4 rounded-md border border-[#ECEEF2] bg-[#F8FAFC] px-4 py-3 transition hover:border-slate-300"
                >
                  <div>
                    <div className="text-xs font-medium text-[#0F172A]">
                      {item.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {item.desc}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => item.onChange(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-[#3451E5]"
                  />
                </label>
              ))}
            </div>
          </section>

          {/* Quick Links to Related Settings */}
          <section className="grid grid-cols-1 gap-6 p-6 sm:p-7 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 className="text-sm font-semibold text-[#0F172A]">关联配置入口</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                快速跳转至模型密钥与机构档案配置。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-8">
              <Link
                href="/settings"
                className="flex items-center justify-between rounded-md border border-[#E4E7EC] bg-white px-4 py-3 transition hover:border-[#3451E5]/50 hover:bg-[#F8FAFC]"
              >
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="h-4 w-4 text-[#3451E5]" />
                  <div>
                    <div className="text-xs font-medium text-[#0F172A]">
                      模型配置
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {hasModelConfigured ? "已配置 API 密钥" : "尚未配置密钥"}
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </Link>

              <Link
                href="/organization"
                className="flex items-center justify-between rounded-md border border-[#E4E7EC] bg-white px-4 py-3 transition hover:border-[#3451E5]/50 hover:bg-[#F8FAFC]"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-[#3451E5]" />
                  <div>
                    <div className="text-xs font-medium text-[#0F172A]">
                      机构中心
                    </div>
                    <div className="text-[11px] text-slate-500">
                      管理机构使命与 {activities.length} 项活动档案
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </section>

          {/* Footer Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F9FAFB] px-6 py-4 sm:px-7">
            <button
              type="button"
              onClick={handleResetPreferences}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#E4E7EC] bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-[#0F172A]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>恢复默认偏好</span>
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#3451E5] px-4 py-2 text-xs font-medium text-white shadow-2xs transition hover:bg-[#2740C7]"
            >
              {prefSaved && <Check className="h-3.5 w-3.5" />}
              <span>{prefSaved ? "已保存偏好" : "保存偏好设置"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
