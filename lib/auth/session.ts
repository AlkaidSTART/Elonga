import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionJwt, type SessionPayload } from "./jwt";

export async function getServerSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  return verifySessionJwt(token);
}
