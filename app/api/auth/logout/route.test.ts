import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/auth/logout/route";
import { AUTH_COOKIE_NAME } from "@/lib/auth/jwt";

describe("POST /api/auth/logout", () => {
  it("clears the auth session cookie and disables caching", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ ok: true });

    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${AUTH_COOKIE_NAME}=;`);
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("HttpOnly");
  });
});
