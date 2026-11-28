import { AppShell } from "@/components/AppShell";
import { WorkspaceBootDismiss } from "@/components/auth/WorkspaceBootDismiss";
import { WorkspaceBootOverlay } from "@/components/auth/WorkspaceBootOverlay";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WorkspaceBootOverlay />
      <WorkspaceBootDismiss />
      <AppShell>{children}</AppShell>
    </>
  );
}
