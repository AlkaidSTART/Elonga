import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  DEFAULT_SESSION_MAX_AGE,
  getAuthCookieOptions,
  signSessionJwt,
} from "@/lib/auth/jwt";
import { getServerSession } from "@/lib/auth/session";
import { updateUserProfile } from "@/lib/auth/users";

export async function PATCH(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "未登录或登录会话已失效，请重新登录" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    email?: unknown;
    role?: unknown;
    orgName?: unknown;
  } | null;

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "请求参数格式不正确" }, { status: 400 });
  }

  const result = updateUserProfile(session.id, {
    name: typeof body.name === "string" ? body.name : undefined,
    email: typeof body.email === "string" ? body.email : undefined,
    role: typeof body.role === "string" ? body.role : undefined,
    orgName: typeof body.orgName === "string" ? body.orgName : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const now = Math.floor(Date.now() / 1000);
  const remainingSeconds = Math.max(session.exp - now, DEFAULT_SESSION_MAX_AGE);

  const token = await signSessionJwt(
    {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      orgName: result.user.orgName,
    },
    remainingSeconds,
  );

  const response = NextResponse.json({
    ok: true,
    user: result.user,
  });

  response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions(remainingSeconds));
  return response;
}
