import { NextRequest, NextResponse } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth/tokens";
import { getClientIp } from "@/lib/services/audit";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/services/rate-limit";
import { error, serverError } from "@/lib/api/response";
import { z } from "zod";

const verifySignupSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, RATE_LIMITS.otp, "verify-signup");
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const body = await request.json();
    const parsed = verifySignupSchema.safeParse(body);
    if (!parsed.success) {
      return error("Invalid input", 400);
    }

    const { email, code } = parsed.data;

    // Ensure signup_otps table exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS signup_otps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        code VARCHAR(6) NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Look up latest valid signup OTP
    const otpRows = await db.execute(
      sql`SELECT * FROM signup_otps
          WHERE email = ${email} AND used_at IS NULL AND expires_at > NOW()
          ORDER BY created_at DESC LIMIT 1`
    );
    const otpRecord = (otpRows as unknown as Array<Record<string, unknown>>)[0];

    if (!otpRecord) {
      return error("Invalid or expired code. Please request a new one.", 400);
    }

    // Check max attempts
    if ((otpRecord.attempts as number) >= 5) {
      await db.execute(
        sql`UPDATE signup_otps SET used_at = NOW() WHERE id = ${otpRecord.id}`
      );
      return error("Too many attempts. Please request a new code.", 400);
    }

    // Check code match
    if (otpRecord.code !== code) {
      await db.execute(
        sql`UPDATE signup_otps SET attempts = attempts + 1 WHERE id = ${otpRecord.id}`
      );
      return error("Invalid verification code", 400);
    }

    // Mark OTP as used
    await db.execute(
      sql`UPDATE signup_otps SET used_at = NOW() WHERE id = ${otpRecord.id}`
    );

    // Check if email already exists
    const existingRows = await db.execute(
      sql`SELECT id, deleted_at FROM users WHERE email = ${email}`
    );
    const existing = (existingRows as unknown as Array<Record<string, unknown>>)[0];
    if (existing && !existing.deleted_at) {
      return error("This email is already registered. Please sign in instead.", 409);
    }
    // Clean up soft-deleted user so re-registration works
    if (existing && existing.deleted_at) {
      const uid = existing.id as string;
      await db.execute(sql`DELETE FROM notification_preferences WHERE user_id = ${uid}`);
      await db.execute(sql`DELETE FROM user_profiles WHERE user_id = ${uid}`);
      await db.execute(sql`DELETE FROM refresh_tokens WHERE user_id = ${uid}`);
      await db.execute(sql`DELETE FROM reviews WHERE user_id = ${uid}`);
      await db.execute(sql`DELETE FROM users WHERE id = ${uid}`);
    }

    // Create user with email_verified = NOW()
    const userRows = await db.execute(
      sql`INSERT INTO users (name, email, password_hash, role, is_active, email_verified)
          VALUES (${otpRecord.name}, ${email}, ${otpRecord.password_hash}, ${otpRecord.role}, true, NOW())
          RETURNING id, name, email, role`
    );
    const user = (userRows as unknown as Array<Record<string, unknown>>)[0];

    // Create user_profiles
    try {
      await db.execute(sql`INSERT INTO user_profiles (user_id) VALUES (${user.id})`);
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[VERIFY-SIGNUP] Failed to create user_profiles:", e);
      }
    }

    // Create notification_preferences
    try {
      await db.execute(sql`INSERT INTO notification_preferences (user_id) VALUES (${user.id})`);
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[VERIFY-SIGNUP] Failed to create notification_preferences:", e);
      }
    }

    // Generate tokens
    const accessToken = await generateAccessToken({
      sub: user.id as string,
      email: user.email as string,
      role: user.role as string,
      emailVerified: true,
    });

    const refresh = await generateRefreshToken();
    const ip = getClientIp(request);
    const ua = request.headers.get("user-agent") || "";

    // Store refresh token
    await db.execute(sql`
      INSERT INTO refresh_tokens (user_id, token_hash, device_info, ip_address, expires_at)
      VALUES (${user.id}, ${refresh.hash}, ${JSON.stringify({ userAgent: ua })}, ${ip}, ${refresh.expiresAt.toISOString()})
    `);

    // Build response with cookies (matching login route pattern)
    const response = NextResponse.json({
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: true,
        },
        message: "Account created and verified successfully",
      },
    });

    const secureCookie = process.env.NODE_ENV !== "development";
    response.cookies.set("access_token", accessToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: "strict",
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
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[VERIFY-SIGNUP] Error:", err);
    }
    return serverError(err);
  }
}
