import { NextRequest } from "next/server";
import { hasDb, getDbWithMigrations } from "@/lib/db";
import { sql } from "drizzle-orm";
import { verifyOTPSchema } from "@/lib/validations/auth";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/services/rate-limit";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth/tokens";
import { createAuditLog, getClientIp } from "@/lib/services/audit";
import { success, error, serverError } from "@/lib/api/response";

const MAX_OTP_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, RATE_LIMITS.otp, "verify-otp");
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    if (!hasDb()) return error("Database not available", 503);
    const db = await getDbWithMigrations();

    const body = await request.json();
    const parsed = verifyOTPSchema.safeParse(body);
    if (!parsed.success) return error("Validation failed", 400, parsed.error.format());

    const { email, code, type } = parsed.data;

    const userRows = await db.execute(
      sql`SELECT id, name, email, role, email_verified, is_active FROM users WHERE email = ${email} AND deleted_at IS NULL`
    );
    const user = (userRows as unknown as Array<Record<string, unknown>>)[0];
    if (!user) return error("Invalid verification code", 400);
    if (!user.is_active) return error("Account is deactivated", 403);

    let otp: Record<string, unknown> | undefined;
    try {
      const otpRows = await db.execute(sql`
        SELECT * FROM otp_tokens
        WHERE user_id = ${user.id}
          AND type = ${type}
          AND used_at IS NULL
          AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
      `);
      otp = (otpRows as unknown as Array<Record<string, unknown>>)[0];
    } catch {
      return error("Verification service temporarily unavailable. Please try again later.", 503);
    }

    if (!otp) return error("No valid verification code found. Request a new one.", 400);

    if ((otp.attempts as number) >= MAX_OTP_ATTEMPTS) {
      await db.execute(sql`UPDATE otp_tokens SET used_at = NOW() WHERE id = ${otp.id}`).catch(() => {});
      return error("Too many attempts. Request a new code.", 400);
    }

    if (otp.code !== code) {
      await db.execute(sql`UPDATE otp_tokens SET attempts = attempts + 1 WHERE id = ${otp.id}`).catch(() => {});
      return error("Invalid verification code", 400);
    }

    // Mark OTP as used
    await db.execute(sql`UPDATE otp_tokens SET used_at = NOW() WHERE id = ${otp.id}`).catch(() => {});

    if (type === "email_verification") {
      await db.execute(sql`UPDATE users SET email_verified = NOW() WHERE id = ${user.id}`);

      await createAuditLog({
        userId: user.id as string,
        action: "email_verified_otp",
        entityType: "user",
        entityId: user.id as string,
        ipAddress: getClientIp(request),
      });

      // Issue tokens after email verification
      const accessToken = await generateAccessToken({
        sub: user.id as string,
        email: user.email as string,
        role: user.role as string,
        emailVerified: true,
      });

      const refresh = await generateRefreshToken();
      const ip = getClientIp(request);
      const ua = request.headers.get("user-agent") || "";

      await db.execute(sql`
        INSERT INTO refresh_tokens (user_id, token_hash, device_info, ip_address, expires_at)
        VALUES (${user.id}, ${refresh.hash}, ${JSON.stringify({ userAgent: ua })}, ${ip}, ${refresh.expiresAt.toISOString()})
      `).catch((e) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to store refresh token:", e);
        }
      });

      return success({
        message: "Email verified successfully",
        accessToken,
        refreshToken: refresh.token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: true },
      });
    }

    return success({ message: "OTP verified successfully", verified: true });
  } catch (err) {
    return serverError(err);
  }
}
