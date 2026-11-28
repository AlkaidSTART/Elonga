"use client";

import { Header } from "@/components/Header";
import { SettingsModal } from "@/components/SettingsModal";
import { CopywritingWorkspace } from "@/components/copywriting/CopywritingWorkspace";
import { ImageStudioWorkspace } from "@/components/image-studio/ImageStudioWorkspace";
import { useWorkbenchStore } from "@/store/useWorkbenchStore";

export function WorkbenchShell() {
  const activeTab = useWorkbenchStore((s) => s.activeTab);

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F9FB]">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === "copywriting" ? <CopywritingWorkspace /> : <ImageStudioWorkspace />}
      </main>
      <SettingsModal />
    </div>
  );
}
