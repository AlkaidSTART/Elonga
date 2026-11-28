import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from "@/lib/auth/jwt";

export async function POST() {
  const response = NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    ...getAuthCookieOptions(0),
    expires: new Date(0),
  });
  return response;
}
