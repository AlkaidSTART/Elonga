"use client";

import { useEffect } from "react";
import {
  WORKSPACE_BOOT_OVERLAY_ID,
  clearWorkspaceBootPending,
} from "@/lib/auth/workspace-boot";

const FADE_OUT_MS = 240;

/**
 * Dismisses the SSR workspace boot overlay smoothly once the client workspace has hydrated.
 */
export function WorkspaceBootDismiss() {
  useEffect(() => {
    clearWorkspaceBootPending();

    const overlay = document.getElementById(WORKSPACE_BOOT_OVERLAY_ID);
    if (!overlay || overlay.getAttribute("data-boot-state") !== "active") {
      return;
    }

    let timerId: number | undefined;
    const rafId = window.requestAnimationFrame(() => {
      overlay.setAttribute("data-boot-state", "exiting");
      timerId = window.setTimeout(() => {
        overlay.setAttribute("data-boot-state", "done");
      }, FADE_OUT_MS);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
      }
    };
  }, []);

  return null;
}
