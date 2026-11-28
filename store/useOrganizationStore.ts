import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  DEFAULT_ORGANIZATION_PROFILE,
  INITIAL_ACTIVITIES,
  type ActivityArchive,
  type OrganizationProfile,
} from "@/lib/organization";
import { indexedDBStorage } from "@/lib/storage/indexeddb-storage";

interface OrganizationState {
  profile: OrganizationProfile;
  activities: ActivityArchive[];

  updateProfile: (partial: Partial<OrganizationProfile>) => void;
  addActivity: (
    activity: Omit<ActivityArchive, "id" | "createdAt" | "updatedAt">,
  ) => ActivityArchive;
  updateActivity: (id: string, partial: Partial<Omit<ActivityArchive, "id" | "createdAt">>) => void;
  deleteActivity: (id: string) => void;
}

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set) => ({
      profile: { ...DEFAULT_ORGANIZATION_PROFILE },
      activities: [...INITIAL_ACTIVITIES],

      updateProfile: (partial) =>
        set((state) => ({
          profile: {
            ...state.profile,
            ...partial,
            updatedAt: new Date().toISOString(),
          },
        })),

      addActivity: (input) => {
        const now = new Date().toISOString();
        const created: ActivityArchive = {
          ...input,
          id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          activities: [created, ...state.activities],
        }));
        return created;
      },

      updateActivity: (id, partial) =>
        set((state) => ({
          activities: state.activities.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...partial,
                  updatedAt: new Date().toISOString(),
                }
              : item,
          ),
        })),

      deleteActivity: (id) =>
        set((state) => ({
          activities: state.activities.filter((item) => item.id !== id),
        })),
    }),
    {
      name: "elonga-organization-storage",
      storage: createJSONStorage(() => indexedDBStorage),
    },
  ),
);
