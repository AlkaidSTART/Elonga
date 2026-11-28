import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { PlatformId, ToneId } from "@/lib/platforms";
import { indexedDBStorage } from "@/lib/storage/indexeddb-storage";

export const PROFILE_UPDATED_EVENT = "elonga:profile-updated";

export type AvatarAccentId = "indigo" | "emerald" | "amber" | "rose" | "slate";

export const AVATAR_ACCENTS: {
  id: AvatarAccentId;
  label: string;
  swatchClass: string;
  avatarBgClass: string;
  avatarTextClass: string;
}[] = [
  {
    id: "indigo",
    label: "靛蓝",
    swatchClass: "bg-[#3451E5]",
    avatarBgClass: "bg-[#3451E5]/10",
    avatarTextClass: "text-[#3451E5]",
  },
  {
    id: "emerald",
    label: "松绿",
    swatchClass: "bg-emerald-600",
    avatarBgClass: "bg-emerald-50",
    avatarTextClass: "text-emerald-700",
  },
  {
    id: "amber",
    label: "暖琥珀",
    swatchClass: "bg-amber-600",
    avatarBgClass: "bg-amber-50",
    avatarTextClass: "text-amber-700",
  },
  {
    id: "rose",
    label: "茜红",
    swatchClass: "bg-rose-600",
    avatarBgClass: "bg-rose-50",
    avatarTextClass: "text-rose-700",
  },
  {
    id: "slate",
    label: "石墨",
    swatchClass: "bg-slate-700",
    avatarBgClass: "bg-slate-100",
    avatarTextClass: "text-slate-700",
  },
];

export function getAvatarAccentMeta(accent?: AvatarAccentId) {
  return AVATAR_ACCENTS.find((item) => item.id === accent) ?? AVATAR_ACCENTS[0];
}

export interface PersonalProfileExtras {
  phone: string;
  wechat: string;
  location: string;
  bio: string;
  avatarDataUrl: string | null;
  avatarAccent: AvatarAccentId;
  signature: string;
  preferredPlatforms: PlatformId[];
  defaultTone: ToneId;
  autoAppendSignature: boolean;
  autoComplianceReminder: boolean;
  includeEditorInExport: boolean;
  updatedAt: string;
}

export const DEFAULT_PERSONAL_EXTRAS: PersonalProfileExtras = {
  phone: "",
  wechat: "",
  location: "",
  bio: "",
  avatarDataUrl: null,
  avatarAccent: "indigo",
  signature: "",
  preferredPlatforms: ["douyin", "xiaohongshu", "wechat"],
  defaultTone: "warm",
  autoAppendSignature: true,
  autoComplianceReminder: true,
  includeEditorInExport: true,
  updatedAt: "",
};

interface ProfileState {
  profilesByUserId: Record<string, PersonalProfileExtras>;
  updateExtras: (userId: string, partial: Partial<PersonalProfileExtras>) => void;
  resetExtras: (userId: string) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profilesByUserId: {},

      updateExtras: (userId, partial) =>
        set((state) => {
          const current = state.profilesByUserId[userId] ?? DEFAULT_PERSONAL_EXTRAS;
          return {
            profilesByUserId: {
              ...state.profilesByUserId,
              [userId]: {
                ...current,
                ...partial,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        }),

      resetExtras: (userId) =>
        set((state) => ({
          profilesByUserId: {
            ...state.profilesByUserId,
            [userId]: {
              ...DEFAULT_PERSONAL_EXTRAS,
              updatedAt: new Date().toISOString(),
            },
          },
        })),
    }),
    {
      name: "elonga-personal-profile-storage",
      storage: createJSONStorage(() => indexedDBStorage),
    },
  ),
);
