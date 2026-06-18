import { randomBytes, createHash } from "crypto";
import { SignJWT, jwtVerify } from "jose";

let _jwtSecret: Uint8Array | null = null;

function getJwtSecret(): Uint8Array {
  if (_jwtSecret) return _jwtSecret;
  const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET or AUTH_SECRET environment variable is required");
  }
  _jwtSecret = new TextEncoder().encode(secret);
  return _jwtSecret;
}

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  emailVerified: boolean;
  type: "access" | "refresh";
}

export async function generateAccessToken(payload: Omit<TokenPayload, "type">): Promise<string> {
  return new SignJWT({ ...payload, type: "access" as const })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(getJwtSecret());
}

export async function generateRefreshToken(): Promise<{ token: string; hash: string; expiresAt: Date }> {
  const token = randomBytes(40).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  return { token, hash, expiresAt };
}

export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (payload.type !== "access") return null;
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateOTP(): string {
  const num = parseInt(randomBytes(3).toString("hex"), 16) % 1000000;
  return num.toString().padStart(6, "0");
}

export function generateEmailToken(): string {
  return randomBytes(32).toString("hex");
}
