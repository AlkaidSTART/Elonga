"use client";

import { useEffect } from "react";
import {
  WORKSPACE_BOOT_HTML_ATTR,
  clearWorkspaceBootPending,
} from "@/lib/auth/workspace-boot";

const FADE_OUT_MS = 240;

/**
 * Dismisses the SSR workspace boot overlay smoothly once the client workspace has hydrated.
 */
export function WorkspaceBootDismiss() {
  useEffect(() => {
    clearWorkspaceBootPending();

    const root = document.documentElement;
    if (root.getAttribute(WORKSPACE_BOOT_HTML_ATTR) !== "active") {
      return;
    }

    let timerId: number | undefined;
    const rafId = window.requestAnimationFrame(() => {
      root.setAttribute(WORKSPACE_BOOT_HTML_ATTR, "exiting");
      timerId = window.setTimeout(() => {
        root.removeAttribute(WORKSPACE_BOOT_HTML_ATTR);
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
