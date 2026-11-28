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
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
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

export interface PublicUserInfo extends AuthUser {
  username: string;
}

export function getUserById(id: string): PublicUserInfo | null {
  const matched = DEMO_USERS.find((u) => u.id === id);
  if (!matched) return null;
  return {
    id: matched.id,
    username: matched.username,
    email: matched.email,
    name: matched.name,
    role: matched.role,
    orgName: matched.orgName,
  };
}

export function updateUserProfile(
  id: string,
  input: {
    name?: string;
    email?: string;
    role?: string;
    orgName?: string;
  },
): { ok: true; user: PublicUserInfo } | { ok: false; error: string } {
  const matched = DEMO_USERS.find((u) => u.id === id);
  if (!matched) {
    return { ok: false, error: "当前账号不存在" };
  }

  const nextName = typeof input.name === "string" ? input.name.trim() : matched.name;
  const nextEmail =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : matched.email;
  const nextRole = typeof input.role === "string" ? input.role.trim() : matched.role;
  const nextOrgName = typeof input.orgName === "string" ? input.orgName.trim() : matched.orgName;

  if (!nextName) {
    return { ok: false, error: "姓名不能为空" };
  }
  if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
    return { ok: false, error: "请输入有效的电子邮箱地址" };
  }

  const emailTaken = DEMO_USERS.some((u) => u.id !== id && u.email.toLowerCase() === nextEmail);
  if (emailTaken) {
    return { ok: false, error: "该邮箱已被其他成员使用" };
  }

  matched.name = nextName;
  matched.email = nextEmail;
  matched.role = nextRole || matched.role;
  matched.orgName = nextOrgName || matched.orgName;

  return {
    ok: true,
    user: {
      id: matched.id,
      username: matched.username,
      email: matched.email,
      name: matched.name,
      role: matched.role,
      orgName: matched.orgName,
    },
  };
}

export async function changeUserPassword(
  id: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const matched = DEMO_USERS.find((u) => u.id === id);
  if (!matched) {
    return { ok: false, error: "当前账号不存在", status: 404 };
  }

  if (!currentPassword || !newPassword) {
    return { ok: false, error: "请完整填写当前密码和新密码", status: 400 };
  }

  if (newPassword.length < 6) {
    return { ok: false, error: "新密码长度不能少于 6 位", status: 400 };
  }

  const [inputHash, storedHash] = await Promise.all([
    sha256Bytes(currentPassword),
    sha256Bytes(matched.password),
  ]);

  if (!constantTimeEqual(inputHash, storedHash)) {
    return { ok: false, error: "当前密码不正确", status: 401 };
  }

  if (currentPassword === newPassword) {
    return { ok: false, error: "新密码不能与当前密码相同", status: 400 };
  }

  matched.password = newPassword;
  return { ok: true };
}

export async function authenticateUser(
  account: string,
  password: string,
): Promise<AuthUser | null> {
  const normalized = account.trim().toLowerCase();
  if (!normalized || !password) return null;

  const matched = DEMO_USERS.find(
    (u) => u.email.toLowerCase() === normalized || u.username.toLowerCase() === normalized,
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
