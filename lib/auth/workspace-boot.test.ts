import { describe, expect, it } from "vitest";
import {
  WORKSPACE_BOOT_FAILSAFE_MS,
  WORKSPACE_BOOT_OVERLAY_ID,
  WORKSPACE_BOOT_STORAGE_KEY,
  WORKSPACE_BOOT_TTL_MS,
  buildWorkspaceBootRevealScript,
  clearWorkspaceBootPending,
  isWorkspaceBootPending,
  markWorkspaceBootPending,
} from "./workspace-boot";

function createMemoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem(key: string) {
      return map.has(key) ? (map.get(key) ?? null) : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
  };
}

describe("workspace-boot first-login transition helpers", () => {
  it("marks and detects a fresh first-login boot transition", () => {
    const storage = createMemoryStorage();
    const now = 1_700_000_000_000;

    expect(isWorkspaceBootPending(storage, now)).toBe(false);

    markWorkspaceBootPending(storage, now);
    expect(storage.getItem(WORKSPACE_BOOT_STORAGE_KEY)).toBe(String(now));
    expect(isWorkspaceBootPending(storage, now + 1_500)).toBe(true);
    expect(isWorkspaceBootPending(storage, now + WORKSPACE_BOOT_TTL_MS)).toBe(true);
  });

  it("clears stale or invalid entries automatically", () => {
    const storage = createMemoryStorage();
    const now = 1_700_000_000_000;

    markWorkspaceBootPending(storage, now);
    expect(isWorkspaceBootPending(storage, now + WORKSPACE_BOOT_TTL_MS + 1)).toBe(false);
    expect(storage.getItem(WORKSPACE_BOOT_STORAGE_KEY)).toBeNull();

    storage.setItem(WORKSPACE_BOOT_STORAGE_KEY, "not-a-timestamp");
    expect(isWorkspaceBootPending(storage, now)).toBe(false);
    expect(storage.getItem(WORKSPACE_BOOT_STORAGE_KEY)).toBeNull();

    // Future timestamps (clock skew / tampering) should also be cleared
    storage.setItem(WORKSPACE_BOOT_STORAGE_KEY, String(now + 5_000));
    expect(isWorkspaceBootPending(storage, now)).toBe(false);
    expect(storage.getItem(WORKSPACE_BOOT_STORAGE_KEY)).toBeNull();
  });

  it("clears pending marker explicitly", () => {
    const storage = createMemoryStorage();
    const now = 1_700_000_000_000;

    markWorkspaceBootPending(storage, now);
    clearWorkspaceBootPending(storage);
    expect(isWorkspaceBootPending(storage, now)).toBe(false);
  });

  it("handles null or throwing storage gracefully", () => {
    const throwingStorage = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
      removeItem() {
        throw new Error("blocked");
      },
    };

    expect(() => markWorkspaceBootPending(null)).not.toThrow();
    expect(() => markWorkspaceBootPending(throwingStorage)).not.toThrow();
    expect(isWorkspaceBootPending(null)).toBe(false);
    expect(isWorkspaceBootPending(throwingStorage)).toBe(false);
    expect(() => clearWorkspaceBootPending(null)).not.toThrow();
    expect(() => clearWorkspaceBootPending(throwingStorage)).not.toThrow();
  });

  it("generates an inline reveal script referencing the storage key, overlay id, and failsafe", () => {
    const script = buildWorkspaceBootRevealScript();
    expect(script).toContain(WORKSPACE_BOOT_STORAGE_KEY);
    expect(script).toContain(WORKSPACE_BOOT_OVERLAY_ID);
    expect(script).toContain(String(WORKSPACE_BOOT_TTL_MS));
    expect(script).toContain(String(WORKSPACE_BOOT_FAILSAFE_MS));
    expect(script).toContain('setAttribute("data-boot-state","active")');
  });
});
