import { NextRequest } from "next/server";

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number };
}

const store: RateLimitStore = {};

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const key of Object.keys(store)) {
    if (store[key].resetAt < now) delete store[key];
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

export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  prefix = "global"
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanup();

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const key = `${prefix}:${ip}`;
  const now = Date.now();

  const entry = store[key];
  if (!entry || entry.resetAt < now) {
    store[key] = { count: 1, resetAt: now + config.windowMs };
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: store[key].resetAt };
  }

  entry.count++;
  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
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
