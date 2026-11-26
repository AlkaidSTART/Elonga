import type { AuthUser } from "./jwt";

interface UserRecord extends AuthUser {
  username: string;
  password: string;
}

const DEMO_USERS: UserRecord[] = [
  {
    id: "usr_admin_01",
    username: "admin",
    email: "admin@elonga.cn",
    name: "林清禾",
    role: "主理人 / 管理员",
    orgName: "微光公益服务中心",
    password: process.env.AUTH_ADMIN_PASSWORD || "elonga2026",
  },
  {
    id: "usr_editor_02",
    username: "editor",
    email: "editor@elonga.cn",
    name: "周明远",
    role: "内容运营",
    orgName: "微光公益服务中心",
    password: process.env.AUTH_EDITOR_PASSWORD || "editor2026",
  },
];

async function sha256Bytes(input: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input)
  );
  return new Uint8Array(digest);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export async function authenticateUser(
  account: string,
  password: string
): Promise<AuthUser | null> {
  const normalized = account.trim().toLowerCase();
  if (!normalized || !password) return null;

  const matched = DEMO_USERS.find(
    (u) =>
      u.email.toLowerCase() === normalized ||
      u.username.toLowerCase() === normalized
  );
  if (!matched) return null;

  const [inputHash, storedHash] = await Promise.all([
    sha256Bytes(password),
    sha256Bytes(matched.password),
  ]);

  if (!constantTimeEqual(inputHash, storedHash)) {
    return null;
  }

  return {
    id: matched.id,
    email: matched.email,
    name: matched.name,
    role: matched.role,
    orgName: matched.orgName,
  };
}
