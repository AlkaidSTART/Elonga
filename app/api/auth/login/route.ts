import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  DEFAULT_SESSION_MAX_AGE,
  EXTENDED_SESSION_MAX_AGE,
  getAuthCookieOptions,
  signSessionJwt,
} from "@/lib/auth/jwt";
import { authenticateUser } from "@/lib/auth/users";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      account?: unknown;
      password?: unknown;
      remember?: unknown;
    } | null;

    const account = typeof body?.account === "string" ? body.account.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const remember = Boolean(body?.remember);

    if (!account || !password) {
      return NextResponse.json(
        { error: "请输入账号和密码" },
        { status: 400 }
      );
    }

    const user = await authenticateUser(account, password);
    if (!user) {
      return NextResponse.json(
        { error: "账号或密码不正确，请检查后重试" },
        { status: 401 }
      );
    }

    const maxAge = remember
      ? EXTENDED_SESSION_MAX_AGE
      : DEFAULT_SESSION_MAX_AGE;
    const token = await signSessionJwt(user, maxAge);

    const response = NextResponse.json({
      ok: true,
      user,
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, getAuthCookieOptions(maxAge));
    return response;
  } catch {
    return NextResponse.json(
      { error: "登录服务暂时不可用，请稍后重试" },
      { status: 500 }
    );
  }
}
