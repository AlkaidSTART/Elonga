const JWT_ISSUER = "elonga-workbench";
const DEV_FALLBACK_SECRET = "elonga-dev-jwt-secret-please-override-in-env-2026";

export const AUTH_COOKIE_NAME = "elonga_session";
export const DEFAULT_SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
export const EXTENDED_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  orgName: string;
}

export interface SessionPayload extends AuthUser {
  sub: string;
  iss: string;
  iat: number;
  exp: number;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret && secret.length >= 16) {
    return secret;
  }
  return DEV_FALLBACK_SECRET;
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeString(value: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlDecodeToBytes(input: string): Uint8Array | null {
  try {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padLength = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + "=".repeat(padLength);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSessionJwt(
  user: AuthUser,
  maxAgeSeconds: number = DEFAULT_SESSION_MAX_AGE,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload: SessionPayload = {
    sub: user.id,
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    orgName: user.orgName,
    iss: JWT_ISSUER,
    iat: now,
    exp: now + maxAgeSeconds,
  };

  const encodedHeader = base64UrlEncodeString(JSON.stringify(header));
  const encodedPayload = base64UrlEncodeString(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await importHmacKey(getJwtSecret());
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput),
  );
  const encodedSignature = base64UrlEncodeBytes(new Uint8Array(signatureBuffer));

  return `${signingInput}.${encodedSignature}`;
}

export async function verifySessionJwt(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

  const headerBytes = base64UrlDecodeToBytes(encodedHeader);
  const payloadBytes = base64UrlDecodeToBytes(encodedPayload);
  const signatureBytes = base64UrlDecodeToBytes(encodedSignature);
  if (!headerBytes || !payloadBytes || !signatureBytes) return null;

  try {
    const header = JSON.parse(new TextDecoder().decode(headerBytes)) as {
      alg?: string;
      typ?: string;
    };
    if (header.alg !== "HS256") return null;

    const key = await importHmacKey(getJwtSecret());
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes.buffer.slice(
        signatureBytes.byteOffset,
        signatureBytes.byteOffset + signatureBytes.byteLength,
      ) as ArrayBuffer,
      new TextEncoder().encode(signingInput),
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as Partial<SessionPayload>;

    const now = Math.floor(Date.now() / 1000);
    if (
      typeof payload.exp !== "number" ||
      payload.exp <= now ||
      payload.iss !== JWT_ISSUER ||
      typeof payload.id !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.orgName !== "string"
    ) {
      return null;
    }

    return {
      sub: payload.sub ?? payload.id,
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      orgName: payload.orgName,
      iss: payload.iss,
      iat: typeof payload.iat === "number" ? payload.iat : now,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export function getAuthCookieOptions(maxAgeSeconds: number) {
  const secureEnv = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
  const secure =
    secureEnv === "true"
      ? true
      : secureEnv === "false"
        ? false
        : process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
