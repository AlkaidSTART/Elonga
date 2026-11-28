export function getSafeRedirectPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/login")) {
    return "/";
  }
  return raw;
}

/**
 * Perform a full-page navigation for auth boundary transitions (login / logout).
 * Using a hard navigation clears Next.js client Router Cache, cached RSC payloads,
 * and in-memory client component state so stale auth/loading states never leak across sessions.
 */
export function performHardAuthNavigation(
  targetPath: string,
  locationLike?: Pick<Location, "replace">,
): void {
  const safeTarget =
    targetPath.startsWith("/") && !targetPath.startsWith("//") ? targetPath : "/login";

  if (locationLike) {
    locationLike.replace(safeTarget);
    return;
  }

  if (typeof window !== "undefined" && window.location) {
    window.location.replace(safeTarget);
  }
}
