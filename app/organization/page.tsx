"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Building2,
  Calendar,
  Check,
  Edit3,
  FolderPlus,
  MapPin,
  PenTool,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  Wallet,
  Workflow,
  X,
} from "lucide-react";
import { CONTENT_TYPES, TONES, type CharityScenarioId, type ToneId } from "@/lib/platforms";
import {
  ACTIVITY_STATUS_META,
  type ActivityArchive,
  type ActivityStatus,
} from "@/lib/organization";
import { useOrganizationStore } from "@/store/useOrganizationStore";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

type ActivityFormState = {
  title: string;
  date: string;
  location: string;
  category: CharityScenarioId;
  participantCount: string;
  fundOrGoods: string;
  highlights: string;
  notes: string;
  status: ActivityStatus;
};

function createEmptyForm(defaultDate = ""): ActivityFormState {
  return {
    title: "",
    date: defaultDate,
    location: "",
    category: "activity",
    participantCount: "",
    fundOrGoods: "",
    highlights: "",
    notes: "",
    status: "completed",
  };
}

export default function OrganizationPage() {
  const router = useRouter();
  const { profile, activities, updateProfile, addActivity, updateActivity, deleteActivity } =
    useOrganizationStore();
  const { history, setSelectedActivityId, setTopic, setContentType } =
    useWorkbenchStore();

  const [orgForm, setOrgForm] = useState(profile);
  const [profileSaved, setProfileSaved] = useState(false);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ActivityStatus>("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activityForm, setActivityForm] = useState<ActivityFormState>(() =>
    createEmptyForm()
  );
  const [formError, setFormError] = useState<string | null>(null);

  const draftCountByActivity = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of history) {
      if (item.activityId) {
        map.set(item.activityId, (map.get(item.activityId) ?? 0) + 1);
      }
    }
    return map;
  }, [history]);

  const filteredActivities = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activities.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.highlights.toLowerCase().includes(q) ||
        item.fundOrGoods.toLowerCase().includes(q)
      );
    });
  }, [activities, query, statusFilter]);

  const handleSaveProfile = () => {
    updateProfile({
      name: orgForm.name.trim() || "未命名公益机构",
      mission: orgForm.mission.trim(),
      defaultTone: orgForm.defaultTone,
      defaultSignOff: orgForm.defaultSignOff.trim(),
      complianceRedlines: orgForm.complianceRedlines.trim(),
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 1800);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setActivityForm(createEmptyForm(new Date().toISOString().slice(0, 10)));
    setFormError(null);
    setEditorOpen(true);
  };

  const openEditModal = (item: ActivityArchive) => {
    setEditingId(item.id);
    setActivityForm({
      title: item.title,
      date: item.date,
      location: item.location,
      category: item.category,
      participantCount: item.participantCount,
      fundOrGoods: item.fundOrGoods,
      highlights: item.highlights,
      notes: item.notes,
      status: item.status,
    });
    setFormError(null);
    setEditorOpen(true);
  };

  const handleSubmitActivity = () => {
    if (!activityForm.title.trim()) {
      setFormError("请填写活动名称");
      return;
    }
    if (editingId) {
      updateActivity(editingId, {
        ...activityForm,
        title: activityForm.title.trim(),
        location: activityForm.location.trim(),
        participantCount: activityForm.participantCount.trim(),
        fundOrGoods: activityForm.fundOrGoods.trim(),
        highlights: activityForm.highlights.trim(),
        notes: activityForm.notes.trim(),
      });
    } else {
      addActivity({
        ...activityForm,
        title: activityForm.title.trim(),
        location: activityForm.location.trim(),
        participantCount: activityForm.participantCount.trim(),
        fundOrGoods: activityForm.fundOrGoods.trim(),
        highlights: activityForm.highlights.trim(),
        notes: activityForm.notes.trim(),
      });
    }
    setEditorOpen(false);
  };

  const handleUseInCopywriting = (activity: ActivityArchive) => {
    setSelectedActivityId(activity.id);
    setTopic(activity.title);
    setContentType(activity.category);
    router.push("/copywriting");
  };

  const handleUseInWorkflow = (activity: ActivityArchive) => {
    setSelectedActivityId(activity.id);
    router.push(`/workflow?activityId=${encodeURIComponent(activity.id)}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-[#E4E7EC] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold tracking-tight text-[#0F172A]">
            机构中心
          </h1>
          <span className="font-mono text-[11px] tracking-wider text-slate-400 uppercase">
            ORGANIZATION & ARCHIVES
          </span>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#1D4ED8] px-3.5 py-2 text-xs font-medium text-white shadow-2xs transition hover:bg-[#1E40AF]"
        >
          <FolderPlus className="h-3.5 w-3.5" />
          <span>新建活动档案</span>
        </button>
      </header>

      {/* Organization Profile Card */}
      <section className="rounded-lg border border-[#E4E7EC] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#F1F3F6] pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#1D4ED8]" />
            <h2 className="text-sm font-semibold text-[#0F172A]">
              机构基础档案（AI 创作默认读取）
            </h2>
          </div>
          <button
            type="button"
            onClick={handleSaveProfile}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#0F172A] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
          >
            {profileSaved ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>已保存</span>
              </>
            ) : (
              <span>保存机构资料</span>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="block text-xs font-medium text-slate-600">
              机构名称
            </span>
            <input
              type="text"
              value={orgForm.name}
              onChange={(e) =>
                setOrgForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="例如：微光公益服务中心"
              className="w-full rounded-md border border-[#E4E7EC] bg-[#F8FAFC] px-3 py-2 text-xs text-[#0F172A] outline-none transition focus:border-[#1D4ED8] focus:bg-white"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-xs font-medium text-slate-600">
              默认传播口吻
            </span>
            <select
              value={orgForm.defaultTone}
              onChange={(e) =>
                setOrgForm((prev) => ({
                  ...prev,
                  defaultTone: e.target.value as ToneId,
                }))
              }
              className="w-full rounded-md border border-[#E4E7EC] bg-[#F8FAFC] px-3 py-2 text-xs text-[#0F172A] outline-none transition focus:border-[#1D4ED8] focus:bg-white"
            >
              {TONES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 md:col-span-2">
            <span className="block text-xs font-medium text-slate-600">
              机构使命与简介
            </span>
            <textarea
              rows={2}
              value={orgForm.mission}
              onChange={(e) =>
                setOrgForm((prev) => ({ ...prev, mission: e.target.value }))
              }
              placeholder="简要描述机构服务领域、核心理念与公益定位，便于 AI 准确把握机构语调..."
              className="w-full resize-none rounded-md border border-[#E4E7EC] bg-[#F8FAFC] px-3 py-2 text-xs leading-relaxed text-[#0F172A] outline-none transition focus:border-[#1D4ED8] focus:bg-white"
            />
          </label>

          <label className="space-y-1.5">
            <span className="block text-xs font-medium text-slate-600">
              固定落款 / 引导语参考
            </span>
            <input
              type="text"
              value={orgForm.defaultSignOff}
              onChange={(e) =>
                setOrgForm((prev) => ({
                  ...prev,
                  defaultSignOff: e.target.value,
                }))
              }
              placeholder="例如：微光汇聚，温暖同行..."
              className="w-full rounded-md border border-[#E4E7EC] bg-[#F8FAFC] px-3 py-2 text-xs text-[#0F172A] outline-none transition focus:border-[#1D4ED8] focus:bg-white"
            />
          </label>

          <label className="space-y-1.5">
            <span className="flex items-center gap-1 text-xs font-medium text-slate-600">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
              <span>机构红线禁用词（逗号分隔，自动同步至发布审查）</span>
            </span>
            <input
              type="text"
              value={orgForm.complianceRedlines}
              onChange={(e) =>
                setOrgForm((prev) => ({
                  ...prev,
                  complianceRedlines: e.target.value,
                }))
              }
              placeholder="例如：包治百病, 100%保证, 私下转账"
              className="w-full rounded-md border border-[#E4E7EC] bg-[#F8FAFC] px-3 py-2 text-xs text-[#0F172A] outline-none transition focus:border-[#1D4ED8] focus:bg-white"
            />
          </label>
        </div>
      </section>

      {/* Activity Archives Section */}
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-semibold text-[#0F172A]">
              活动建档库
              <span className="ml-2 font-mono text-xs font-normal text-slate-400">
                {activities.length} 项
              </span>
            </h2>

            <div className="flex items-center gap-0.5 rounded-md border border-[#E4E7EC] bg-[#F1F3F6] p-0.5">
              {(
                [
                  { id: "all", label: "全部" },
                  { id: "ongoing", label: "进行中" },
                  { id: "completed", label: "已完成" },
                  { id: "planned", label: "筹备中" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-[5px] px-2.5 py-1 text-xs font-medium transition ${
                    statusFilter === tab.id
                      ? "bg-white text-[#0F172A] shadow-2xs"
                      : "text-slate-500 hover:text-[#0F172A]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="检索活动名称、地点或物资..."
              className="w-full rounded-md border border-[#E4E7EC] bg-white py-1.5 pl-8 pr-3 text-xs text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#1D4ED8]"
            />
          </div>
        </div>

        {filteredActivities.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-[#E4E7EC] bg-white text-center">
            <p className="text-sm font-medium text-slate-400">
              {activities.length === 0 ? "尚未建立活动档案" : "无匹配的活动档案"}
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-3 inline-flex items-center gap-1 rounded-md border border-[#E4E7EC] px-3 py-1.5 text-xs font-medium text-[#0F172A] hover:bg-slate-50"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>立即新建活动档案</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredActivities.map((act) => {
              const statusMeta = ACTIVITY_STATUS_META[act.status];
              const categoryLabel =
                CONTENT_TYPES.find((c) => c.id === act.category)?.label ?? "公益活动";
              const linkedDrafts = draftCountByActivity.get(act.id) ?? 0;

              return (
                <article
                  key={act.id}
                  className="flex flex-col justify-between rounded-lg border border-[#E4E7EC] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition hover:border-slate-300"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium ${statusMeta.badgeClass}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${statusMeta.dotClass}`}
                            />
                            {statusMeta.label}
                          </span>
                          <span className="rounded bg-[#EFF6FF] px-1.5 py-0.5 text-[11px] font-medium text-[#1D4ED8]">
                            {categoryLabel}
                          </span>
                          {linkedDrafts > 0 && (
                            <span className="font-mono text-[11px] text-slate-400">
                              关联 {linkedDrafts} 篇稿件
                            </span>
                          )}
                        </div>
                        <h3 className="text-[15px] font-semibold text-[#0F172A]">
                          {act.title}
                        </h3>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(act)}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-[#0F172A]"
                          title="编辑档案"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteActivity(act.id)}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          title="删除档案"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 rounded-md bg-[#F8FAFC] p-3 text-xs text-slate-600 sm:grid-cols-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{act.date || "未填写日期"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{act.location || "未填写地点"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:col-span-2">
                        <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>{act.participantCount || "未填写人数"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:col-span-2">
                        <Wallet className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>{act.fundOrGoods || "未填写善款/物资明细"}</span>
                      </div>
                    </div>

                    {act.highlights && (
                      <p className="line-clamp-3 text-xs leading-relaxed text-slate-600">
                        {act.highlights}
                      </p>
                    )}

                    {act.notes && (
                      <p className="rounded border border-amber-200/80 bg-amber-50/60 px-2.5 py-1.5 text-[11px] leading-relaxed text-amber-800">
                        隐私与合规备注：{act.notes}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[#F1F3F6] pt-3">
                    <button
                      type="button"
                      onClick={() => handleUseInCopywriting(act)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#E4E7EC] bg-white px-2.5 py-1.5 text-xs font-medium text-[#0F172A] transition hover:border-[#0F172A] hover:bg-[#0F172A] hover:text-white"
                    >
                      <PenTool className="h-3 w-3" />
                      <span>AI 写推流文案</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUseInWorkflow(act)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#1D4ED8] px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-[#1E40AF]"
                    >
                      <Workflow className="h-3 w-3" />
                      <span>带入图文工作流</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Activity Create / Edit Modal */}
      <AnimatePresence>
        {editorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditorOpen(false)}
              className="fixed inset-0 bg-slate-950/35 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between border-b border-[#F1F3F6] pb-3">
                <h3 className="text-base font-semibold text-[#0F172A]">
                  {editingId ? "编辑活动档案" : "新建活动档案"}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 sm:col-span-2">
                  <span className="block text-xs font-medium text-slate-700">
                    活动名称 *
                  </span>
                  <input
                    type="text"
                    value={activityForm.title}
                    onChange={(e) =>
                      setActivityForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="例如：2026秋季乡村小学图书角捐赠行动"
                    className="w-full rounded-md border border-[#E4E7EC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#1D4ED8]"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-xs font-medium text-slate-700">
                    活动日期
                  </span>
                  <input
                    type="date"
                    value={activityForm.date}
                    onChange={(e) =>
                      setActivityForm((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-[#E4E7EC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#1D4ED8]"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-xs font-medium text-slate-700">
                    活动地点
                  </span>
                  <input
                    type="text"
                    value={activityForm.location}
                    onChange={(e) =>
                      setActivityForm((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                    placeholder="例如：云南省丽江市宁蒗县某乡村小学"
                    className="w-full rounded-md border border-[#E4E7EC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#1D4ED8]"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="block text-xs font-medium text-slate-700">
                    内容场景分类
                  </span>
                  <select
                    value={activityForm.category}
                    onChange={(e) =>
                      setActivityForm((prev) => ({
                        ...prev,
                        category: e.target.value as CharityScenarioId,
                      }))
                    }
                    className="w-full rounded-md border border-[#E4E7EC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#1D4ED8]"
                  >
                    {CONTENT_TYPES.map((ct) => (
                      <option key={ct.id} value={ct.id}>
                        {ct.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="block text-xs font-medium text-slate-700">
                    活动状态
                  </span>
                  <select
                    value={activityForm.status}
                    onChange={(e) =>
                      setActivityForm((prev) => ({
                        ...prev,
                        status: e.target.value as ActivityStatus,
                      }))
                    }
                    className="w-full rounded-md border border-[#E4E7EC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#1D4ED8]"
                  >
                    <option value="planned">筹备中</option>
                    <option value="ongoing">进行中</option>
                    <option value="completed">已完成</option>
                  </select>
                </label>

                <label className="space-y-1.5 sm:col-span-2">
                  <span className="block text-xs font-medium text-slate-700">
                    参与与受益人数（核对基准）
                  </span>
                  <input
                    type="text"
                    value={activityForm.participantCount}
                    onChange={(e) =>
                      setActivityForm((prev) => ({
                        ...prev,
                        participantCount: e.target.value,
                      }))
                    }
                    placeholder="例如：18名志愿者，惠及126名在校学生"
                    className="w-full rounded-md border border-[#E4E7EC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#1D4ED8]"
                  />
                </label>

                <label className="space-y-1.5 sm:col-span-2">
                  <span className="block text-xs font-medium text-slate-700">
                    善款与物资明细（核对基准）
                  </span>
                  <input
                    type="text"
                    value={activityForm.fundOrGoods}
                    onChange={(e) =>
                      setActivityForm((prev) => ({
                        ...prev,
                        fundOrGoods: e.target.value,
                      }))
                    }
                    placeholder="例如：募集善款18,500元，捐赠少儿图书620册"
                    className="w-full rounded-md border border-[#E4E7EC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#1D4ED8]"
                  />
                </label>

                <label className="space-y-1.5 sm:col-span-2">
                  <span className="block text-xs font-medium text-slate-700">
                    现场亮点与故事素材（供 AI 读取）
                  </span>
                  <textarea
                    rows={3}
                    value={activityForm.highlights}
                    onChange={(e) =>
                      setActivityForm((prev) => ({
                        ...prev,
                        highlights: e.target.value,
                      }))
                    }
                    placeholder="记录活动过程中的真实故事、细节与成果，AI 写稿时会自动读取..."
                    className="w-full resize-none rounded-md border border-[#E4E7EC] px-3 py-2 text-xs leading-relaxed text-[#0F172A] outline-none focus:border-[#1D4ED8]"
                  />
                </label>

                <label className="space-y-1.5 sm:col-span-2">
                  <span className="block text-xs font-medium text-slate-700">
                    隐私与合规备注
                  </span>
                  <input
                    type="text"
                    value={activityForm.notes}
                    onChange={(e) =>
                      setActivityForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="例如：受助儿童须化名处理，禁止披露具体村组门牌"
                    className="w-full rounded-md border border-[#E4E7EC] px-3 py-2 text-xs text-[#0F172A] outline-none focus:border-[#1D4ED8]"
                  />
                </label>
              </div>

              {formError && (
                <p className="mt-3 text-xs text-rose-600">{formError}</p>
              )}

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-[#F1F3F6] pt-4">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="rounded-md border border-[#E4E7EC] px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSubmitActivity}
                  className="rounded-md bg-[#1D4ED8] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#1E40AF]"
                >
                  {editingId ? "保存修改" : "确认建档"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
