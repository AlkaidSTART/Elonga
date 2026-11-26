import type { CharityScenarioId, ToneId } from "./platforms";

export type ActivityStatus = "planned" | "ongoing" | "completed";

export interface OrganizationProfile {
  name: string;
  mission: string;
  defaultTone: ToneId;
  defaultSignOff: string;
  complianceRedlines: string;
  updatedAt: string;
}

export interface ActivityArchive {
  id: string;
  title: string;
  date: string;
  location: string;
  category: CharityScenarioId;
  participantCount: string;
  fundOrGoods: string;
  highlights: string;
  notes: string;
  status: ActivityStatus;
  createdAt: string;
  updatedAt: string;
}

export const ACTIVITY_STATUS_META: Record<
  ActivityStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  planned: {
    label: "筹备中",
    badgeClass: "border-slate-200 bg-slate-50 text-slate-600",
    dotClass: "bg-slate-400",
  },
  ongoing: {
    label: "进行中",
    badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
    dotClass: "bg-blue-600",
  },
  completed: {
    label: "已完成",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dotClass: "bg-emerald-600",
  },
};

export const DEFAULT_ORGANIZATION_PROFILE: OrganizationProfile = {
  name: "微光公益服务中心",
  mission:
    "聚焦乡村儿童阅读、社区流浪动物科学救助与城市微环保，坚持公开透明、尊重受助者尊严的日常公益行动。",
  defaultTone: "warm",
  defaultSignOff: "微光汇聚，温暖同行。感谢每一位愿意停下来关注并转发的你。",
  complianceRedlines: "包治百病, 100%保证, 私下微信转账, 绝对有效, 最惨",
  updatedAt: "2026-11-20T09:00:00.000Z",
};

export const INITIAL_ACTIVITIES: ActivityArchive[] = [
  {
    id: "act_demo_books_2026",
    title: "2026秋季乡村小学图书角捐赠行动",
    date: "2026-11-18",
    location: "云南省丽江市宁蒗县某乡村小学",
    category: "activity",
    participantCount: "18名志愿者，惠及126名在校学生",
    fundOrGoods: "募集善款18,500元，落地捐赠少儿绘本与科普图书620册、书架6组",
    highlights:
      "志愿者利用周末完成6间教室图书角搭建，受助学生王小明（需化名）第一次读到天文绘本，主动担任班级图书管理员。现场完成了全部图书编号与借阅登记。",
    notes: "对外发布时受助学生姓名、具体班级与家庭住址须全部做化名及模糊处理，严禁出现未打码儿童正脸。",
    status: "completed",
    createdAt: "2026-11-19T10:00:00.000Z",
    updatedAt: "2026-11-19T10:00:00.000Z",
  },
  {
    id: "act_demo_cats_2026",
    title: "冬季社区流浪猫科学TNR绝育与领养日",
    date: "2026-11-23",
    location: "杭州市西湖区翠苑社区公益驿站",
    category: "story",
    participantCount: "12名社区志愿者，3位合作宠物医院医师，到访居民85人",
    fundOrGoods: "投入绝育专项经费6,400元，完成16只流浪猫绝育与免疫，现场成功领养4只",
    highlights:
      "社区志愿者李芳（需化名）连续三晚配合科学诱捕，完成绝育剪耳与术后观察放归；通过邻里科普展板缓解了社区居民对流浪猫过冬扰民的担忧。",
    notes: "避免暴露具体楼栋门牌号和志愿者私人手机号，强调科学TNR与文明养宠。",
    status: "ongoing",
    createdAt: "2026-11-24T08:30:00.000Z",
    updatedAt: "2026-11-24T08:30:00.000Z",
  },
];

export interface ActivityContextPayload {
  orgName: string;
  orgMission: string;
  orgSignOff?: string;
  activityId?: string;
  activityTitle?: string;
  activityDate?: string;
  activityLocation?: string;
  participantCount?: string;
  fundOrGoods?: string;
  highlights?: string;
  notes?: string;
}

export function buildActivityContextPayload(
  org: OrganizationProfile,
  activity?: ActivityArchive | null
): ActivityContextPayload {
  if (!activity) {
    return {
      orgName: org.name,
      orgMission: org.mission,
      orgSignOff: org.defaultSignOff,
    };
  }
  return {
    orgName: org.name,
    orgMission: org.mission,
    orgSignOff: org.defaultSignOff,
    activityId: activity.id,
    activityTitle: activity.title,
    activityDate: activity.date,
    activityLocation: activity.location,
    participantCount: activity.participantCount,
    fundOrGoods: activity.fundOrGoods,
    highlights: activity.highlights,
    notes: activity.notes,
  };
}

export function formatActivityContextForPrompt(
  ctx?: ActivityContextPayload
): string {
  if (!ctx) return "";
  const lines: string[] = [];
  if (ctx.orgName) {
    lines.push(`【机构背景档案】`);
    lines.push(`- 机构名称：${ctx.orgName}`);
    if (ctx.orgMission) lines.push(`- 机构使命：${ctx.orgMission}`);
    if (ctx.orgSignOff) lines.push(`- 常用落款参考：${ctx.orgSignOff}`);
  }
  if (ctx.activityTitle) {
    lines.push(`【关联公益活动档案（请优先基于以下真实档案创作，切勿编造未提供的数据）】`);
    lines.push(`- 活动名称：${ctx.activityTitle}`);
    if (ctx.activityDate) lines.push(`- 活动日期：${ctx.activityDate}`);
    if (ctx.activityLocation) lines.push(`- 活动地点：${ctx.activityLocation}`);
    if (ctx.participantCount) lines.push(`- 参与/受益人数：${ctx.participantCount}`);
    if (ctx.fundOrGoods) lines.push(`- 善款/物资明细：${ctx.fundOrGoods}`);
    if (ctx.highlights) lines.push(`- 现场亮点与故事：${ctx.highlights}`);
    if (ctx.notes) lines.push(`- 隐私与发布备注：${ctx.notes}`);
  }
  return lines.join("\n");
}
