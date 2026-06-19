import { NextRequest, NextResponse } from "next/server";
import { hasDb, getDbWithMigrations } from "@/lib/db";
import { sql } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth/tokens";
import { getClientIp } from "@/lib/services/audit";
import { checkRateLimit, rateLimitResponse } from "@/lib/services/rate-limit";
import { error, serverError } from "@/lib/api/response";
import { z } from "zod";

const clientRegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  leadId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, { windowMs: 60_000, maxRequests: 5 }, "register-client");
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    if (!hasDb()) return error("Database not available", 503);
    const db = await getDbWithMigrations();

    const body = await request.json();
    const parsed = clientRegisterSchema.safeParse(body);
    if (!parsed.success) return error("Invalid input", 400, parsed.error.format());

    const { name, email, password, leadId } = parsed.data;

    const existingRows = await db.execute(
      sql`SELECT id, role FROM users WHERE email = ${email} AND deleted_at IS NULL`
    );
    const existing = (existingRows as unknown as Array<Record<string, unknown>>)[0];

    if (existing) {
      return error("Email already registered. Please sign in instead.", 409);
    }

    const passwordHash = await hashPassword(password);

    const userRows = await db.execute(sql`
      INSERT INTO users (name, email, password_hash, role, is_active, email_verified)
      VALUES (${name}, ${email}, ${passwordHash}, 'client', true, NOW())
      RETURNING id, name, email, role
    `);
    const user = (userRows as unknown as Array<Record<string, unknown>>)[0];

    try {
      await db.execute(sql`INSERT INTO user_profiles (user_id) VALUES (${user.id})`);
    } catch { /* ignore */ }
    try {
      await db.execute(sql`INSERT INTO notification_preferences (user_id) VALUES (${user.id})`);
    } catch { /* ignore */ }

    // Link lead to this user if provided
    if (leadId) {
      try {
        await db.execute(sql`
          UPDATE leads SET user_id = ${user.id} WHERE id = ${leadId} AND user_id IS NULL
        `);
      } catch { /* ignore */ }
    }

    const accessToken = await generateAccessToken({
      sub: user.id as string,
      email: user.email as string,
      role: "client",
      emailVerified: true,
    });

    const refresh = await generateRefreshToken();
    const ip = getClientIp(request);
    const ua = request.headers.get("user-agent") || "";

    await db.execute(sql`
      INSERT INTO refresh_tokens (user_id, token_hash, device_info, ip_address, expires_at)
      VALUES (${user.id}, ${refresh.hash}, ${JSON.stringify({ userAgent: ua })}, ${ip}, ${refresh.expiresAt.toISOString()})
    `);

    const response = NextResponse.json({
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: "client" },
        message: "Account created successfully",
      },
    });

    const secureCookie = process.env.NODE_ENV === "production";
    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });
    response.cookies.set("refresh_token", refresh.token, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[REGISTER-CLIENT] Error:", err);
    }
    return serverError(err);
  }
}
