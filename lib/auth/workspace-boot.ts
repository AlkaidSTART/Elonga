export const WORKSPACE_BOOT_STORAGE_KEY = "elonga:workspace-boot-entering";
export const WORKSPACE_BOOT_OVERLAY_ID = "elonga-workspace-boot-overlay";
export const WORKSPACE_BOOT_TTL_MS = 30_000;
export const WORKSPACE_BOOT_FAILSAFE_MS = 8_000;

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;
type StorageRemover = Pick<Storage, "removeItem">;
type StorageLike = StorageReader & StorageRemover;

function getBrowserSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Mark that the user has just completed login and is transitioning into the workspace.
 * Used so the workspace boot animation only appears on the first-login entry flow.
 */
export function markWorkspaceBootPending(
  storage?: StorageWriter | null,
  now: number = Date.now(),
): void {
  const target = storage === undefined ? getBrowserSessionStorage() : storage;
  if (!target) return;
  try {
    target.setItem(WORKSPACE_BOOT_STORAGE_KEY, String(now));
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

/**
 * Check whether a fresh first-login workspace boot transition is in progress.
 * Stale or malformed entries are automatically cleared.
 */
export function isWorkspaceBootPending(
  storage?: StorageLike | null,
  now: number = Date.now(),
): boolean {
  const target = storage === undefined ? getBrowserSessionStorage() : storage;
  if (!target) return false;

  try {
    const raw = target.getItem(WORKSPACE_BOOT_STORAGE_KEY);
    if (!raw) return false;
    const timestamp = Number(raw);
    const age = now - timestamp;
    if (!Number.isFinite(timestamp) || age < 0 || age > WORKSPACE_BOOT_TTL_MS) {
      target.removeItem(WORKSPACE_BOOT_STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear the first-login workspace boot transition marker.
 */
export function clearWorkspaceBootPending(storage?: StorageRemover | null): void {
  const target = storage === undefined ? getBrowserSessionStorage() : storage;
  if (!target) return;
  try {
    target.removeItem(WORKSPACE_BOOT_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Inline script executed before React hydration in the workspace layout.
 * Synchronously reveals the SSR boot overlay only when arriving from login.
 */
export function buildWorkspaceBootRevealScript(): string {
  return `(function(){try{var k=${JSON.stringify(WORKSPACE_BOOT_STORAGE_KEY)};var raw=window.sessionStorage.getItem(k);if(!raw)return;var ts=Number(raw);var age=Date.now()-ts;if(!isFinite(ts)||age<0||age>${WORKSPACE_BOOT_TTL_MS}){window.sessionStorage.removeItem(k);return;}var el=document.getElementById(${JSON.stringify(WORKSPACE_BOOT_OVERLAY_ID)});if(!el)return;el.setAttribute("data-boot-state","active");window.setTimeout(function(){if(el.getAttribute("data-boot-state")==="active"){el.setAttribute("data-boot-state","done");try{window.sessionStorage.removeItem(k);}catch(e){}}},${WORKSPACE_BOOT_FAILSAFE_MS});}catch(e){}})();`;
}
