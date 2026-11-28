import { describe, expect, it, vi } from "vitest";
import { getSafeRedirectPath, performHardAuthNavigation } from "@/lib/auth/client-navigation";

describe("getSafeRedirectPath", () => {
  it("falls back to root for empty, external, protocol-relative, or login paths", () => {
    expect(getSafeRedirectPath(null)).toBe("/");
    expect(getSafeRedirectPath(undefined)).toBe("/");
    expect(getSafeRedirectPath("")).toBe("/");
    expect(getSafeRedirectPath("https://evil.example.com")).toBe("/");
    expect(getSafeRedirectPath("//evil.example.com")).toBe("/");
    expect(getSafeRedirectPath("/login")).toBe("/");
    expect(getSafeRedirectPath("/login?redirect=/profile")).toBe("/");
  });

  it("preserves safe in-app redirect paths", () => {
    expect(getSafeRedirectPath("/")).toBe("/");
    expect(getSafeRedirectPath("/profile")).toBe("/profile");
    expect(getSafeRedirectPath("/workflow?tab=draft")).toBe("/workflow?tab=draft");
  });
});

describe("performHardAuthNavigation", () => {
  it("calls location.replace with safe relative target paths", () => {
    const replace = vi.fn();
    performHardAuthNavigation("/login", { replace });
    expect(replace).toHaveBeenCalledWith("/login");

    performHardAuthNavigation("/profile?tab=security", { replace });
    expect(replace).toHaveBeenCalledWith("/profile?tab=security");
  });

  it("falls back to /login when target path is unsafe", () => {
    const replace = vi.fn();
    performHardAuthNavigation("https://evil.example.com", { replace });
    expect(replace).toHaveBeenCalledWith("/login");

    performHardAuthNavigation("//evil.example.com", { replace });
    expect(replace).toHaveBeenCalledWith("/login");
  });
});
