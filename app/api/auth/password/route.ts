import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { changeUserPassword } from "@/lib/auth/users";

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "未登录或登录会话已失效，请重新登录" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    currentPassword?: unknown;
    newPassword?: unknown;
  } | null;

  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  const result = await changeUserPassword(session.id, currentPassword, newPassword);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
