import { NextRequest, NextResponse } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth/password";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth/tokens";
import { loginSchema } from "@/lib/validations/auth";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/services/rate-limit";
import { logLoginAttempt, getClientIp } from "@/lib/services/audit";
import { success, error, serverError } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(request, RATE_LIMITS.auth, "login");
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return error("Invalid credentials", 400);
    }

    const { email, password } = parsed.data;

    const rows = await db.execute(
      sql`SELECT id, name, email, password_hash, role, is_active, email_verified, locked_until, failed_login_attempts
          FROM users WHERE email = ${email} AND deleted_at IS NULL`
    );
    const user = (rows as unknown as Array<Record<string, unknown>>)[0];

    if (!user || !user.password_hash) {
      return error("Invalid email or password", 401);
    }

    // Check account lock
    if (user.locked_until && new Date(user.locked_until as string) > new Date()) {
      return error("Account is temporarily locked. Try again later.", 423);
    }

    if (!user.is_active) {
      return error("Account is deactivated. Contact support.", 403);
    }

    const validPassword = await verifyPassword(password, user.password_hash as string);
    if (!validPassword) {
      const attempts = ((user.failed_login_attempts as number) || 0) + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;

      await db.execute(sql`
        UPDATE users SET failed_login_attempts = ${attempts},
        locked_until = ${lockUntil}
        WHERE id = ${user.id}
      `);

      await logLoginAttempt(user.id as string, request, "failed", "invalid_password");
      return error("Invalid email or password", 401);
    }

    // Reset failed attempts on success
    await db.execute(sql`
      UPDATE users SET
        failed_login_attempts = 0,
        locked_until = NULL,
        last_login_at = NOW(),
        login_count = COALESCE(login_count, 0) + 1
      WHERE id = ${user.id}
    `);

    const emailVerified = user.email_verified !== null;

    const accessToken = await generateAccessToken({
      sub: user.id as string,
      email: user.email as string,
      role: user.role as string,
      emailVerified,
    });

    const refresh = await generateRefreshToken();
    const ip = getClientIp(request);
    const ua = request.headers.get("user-agent") || "";

    await db.execute(sql`
      INSERT INTO refresh_tokens (user_id, token_hash, device_info, ip_address, expires_at)
      VALUES (${user.id}, ${refresh.hash}, ${JSON.stringify({ userAgent: ua })}, ${ip}, ${refresh.expiresAt.toISOString()})
    `);

    await logLoginAttempt(user.id as string, request, "success");

    const response = NextResponse.json({
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified,
        },
        accessToken,
        refreshToken: refresh.token,
        requiresVerification: !emailVerified,
      },
    });

    const secureCookie = process.env.NODE_ENV === "production";
    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60, // 15 minutes
    });
    response.cookies.set("refresh_token", refresh.token, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err) {
    console.error("[LOGIN] Error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(`Server error: ${message}`, 500);
  }
}
