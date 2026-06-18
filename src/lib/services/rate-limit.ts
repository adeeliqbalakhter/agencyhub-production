import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

// In-memory fallback store
interface RateLimitStore {
  [key: string]: { count: number; resetAt: number };
}
const memoryStore: RateLimitStore = {};
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanupMemory() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const key of Object.keys(memoryStore)) {
    if (memoryStore[key].resetAt < now) delete memoryStore[key];
  }
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export const RATE_LIMITS = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
  otp: { windowMs: 60 * 1000, maxRequests: 3 },
  api: { windowMs: 60 * 1000, maxRequests: 60 },
  upload: { windowMs: 60 * 1000, maxRequests: 10 },
  search: { windowMs: 60 * 1000, maxRequests: 30 },
} satisfies Record<string, RateLimitConfig>;

function getClientIp(request: NextRequest): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    const trustedProxyCount = parseInt(process.env.TRUSTED_PROXY_COUNT || "1");
    const index = Math.max(ips.length - trustedProxyCount - 1, 0);
    return ips[index] || "unknown";
  }
  return "unknown";
}

// Database-backed rate limiting
async function checkDbRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: number } | null> {
  if (!hasDb()) return null;
  try {
    const db = getDb();
    const now = Date.now();
    const windowStart = new Date(now - config.windowMs).toISOString();

    // Create table if not exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id SERIAL PRIMARY KEY,
        identifier VARCHAR(255) NOT NULL,
        requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(identifier, requested_at)
      )
    `);

    // Clean old entries
    await db.execute(sql`DELETE FROM rate_limits WHERE requested_at < ${windowStart}`);

    // Count current entries in window
    const countResult = await db.execute(sql`
      SELECT COUNT(*)::int as count FROM rate_limits WHERE identifier = ${identifier} AND requested_at >= ${windowStart}
    `);
    const count = Number((countResult as unknown as Array<{ count: number }>)[0]?.count ?? 0);

    if (count >= config.maxRequests) {
      const oldestResult = await db.execute(sql`
        SELECT requested_at FROM rate_limits WHERE identifier = ${identifier} ORDER BY requested_at ASC LIMIT 1
      `);
      const oldest = (oldestResult as unknown as Array<{ requested_at: string }>)[0];
      const resetAt = oldest ? new Date(oldest.requested_at).getTime() + config.windowMs : now + config.windowMs;
      return { allowed: false, remaining: 0, resetAt };
    }

    // Insert new entry
    await db.execute(sql`INSERT INTO rate_limits (identifier) VALUES (${identifier}) ON CONFLICT DO NOTHING`);

    return { allowed: true, remaining: config.maxRequests - count - 1, resetAt: now + config.windowMs };
  } catch {
    return null; // Fall back to memory
  }
}

// Memory-based rate limiting (fallback)
function checkMemoryRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanupMemory();
  const now = Date.now();
  const entry = memoryStore[identifier];

  if (!entry || entry.resetAt < now) {
    memoryStore[identifier] = { count: 1, resetAt: now + config.windowMs };
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: memoryStore[identifier].resetAt };
  }

  entry.count++;
  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  prefix = "global"
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const ip = getClientIp(request);
  const identifier = `${prefix}:${ip}`;

  // Try database first, fall back to memory
  const dbResult = await checkDbRateLimit(identifier, config);
  if (dbResult) return dbResult;

  return checkMemoryRateLimit(identifier, config);
}

export function rateLimitResponse(resetAt: number): Response {
  return Response.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
        "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
      },
    }
  );
}
