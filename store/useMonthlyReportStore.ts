import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SavedMonthlyReport } from "@/lib/monthly-report";
import { indexedDBStorage } from "@/lib/storage/indexeddb-storage";

interface MonthlyReportState {
  reports: SavedMonthlyReport[];
  saveReport: (report: SavedMonthlyReport) => void;
  updateReportContent: (
    id: string,
    partial: Partial<Pick<SavedMonthlyReport, "title" | "summary" | "body">>,
  ) => void;
  deleteReport: (id: string) => void;
}

export const useMonthlyReportStore = create<MonthlyReportState>()(
  persist(
    (set) => ({
      reports: [],
      saveReport: (report) =>
        set((state) => ({
          reports: [report, ...state.reports.filter((r) => r.id !== report.id)].slice(0, 36),
        })),
      updateReportContent: (id, partial) =>
        set((state) => ({
          reports: state.reports.map((r) =>
            r.id === id ? { ...r, ...partial, updatedAt: new Date().toISOString() } : r,
          ),
        })),
      deleteReport: (id) =>
        set((state) => ({
          reports: state.reports.filter((r) => r.id !== id),
        })),
    }),
    {
      name: "elonga-monthly-reports-storage",
      storage: createJSONStorage(() => indexedDBStorage),
    },
  ),
);
