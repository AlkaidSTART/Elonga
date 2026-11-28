import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getUserById } from "@/lib/auth/users";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const record = getUserById(session.id);

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: session.id,
        username: record?.username ?? session.email.split("@")[0] ?? session.id,
        email: session.email,
        name: session.name,
        role: session.role,
        orgName: session.orgName,
      },
      iat: session.iat,
      exp: session.exp,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
