import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { generateOTP, generateEmailToken } from "@/lib/auth/tokens";
import { registerSchema } from "@/lib/validations/auth";
import { sendEmail, buildVerificationEmail, buildOTPEmail } from "@/lib/services/email";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/services/rate-limit";
import { createAuditLog, getClientIp } from "@/lib/services/audit";
import { created, error, serverError } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(request, RATE_LIMITS.auth, "register");
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.format());
    }

    const { name, email, password, role } = parsed.data;

    const existing = await db.execute(
      sql`SELECT id FROM users WHERE email = ${email} AND deleted_at IS NULL`
    );
    if ((existing as unknown as Array<unknown>).length > 0) {
      return created({
        user: { id: "redacted", name, email, role },
        message: "Registration successful. Please verify your email.",
        requiresVerification: true,
      });
    }

    const passwordHash = await hashPassword(password);

    const rows = await db.execute(sql`
      INSERT INTO users (name, email, password_hash, role, is_active, email_verified)
      VALUES (${name}, ${email}, ${passwordHash}, ${role}, true, NULL)
      RETURNING id, name, email, role, is_active, created_at
    `);
    const user = (rows as unknown as Array<Record<string, unknown>>)[0];
    if (!user) return error("Failed to create account", 500);

    const userId = user.id as string;

    // Create user profile
    await db.execute(sql`
      INSERT INTO user_profiles (user_id) VALUES (${userId})
    `).catch(() => {});

    // Create notification preferences
    await db.execute(sql`
      INSERT INTO notification_preferences (user_id) VALUES (${userId})
    `).catch(() => {});

    // Generate and send verification email + OTP (non-blocking, don't fail registration)
    try {
      const emailToken = generateEmailToken();
      await db.execute(sql`
        INSERT INTO email_verification_tokens (user_id, token, expires_at)
        VALUES (${userId}, ${emailToken}, ${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()})
      `);
      const verificationEmail = buildVerificationEmail(name, emailToken);
      await sendEmail({ ...verificationEmail, to: email });
    } catch (e) {
      console.error("Failed to send verification email:", e);
    }

    try {
      const otpCode = generateOTP();
      await db.execute(sql`
        INSERT INTO otp_tokens (user_id, code, type, expires_at)
        Values (${userId}, ${otpCode}, 'email_verification', ${new Date(Date.now() + 10 * 60 * 1000).toISOString()})
      `);
      const otpEmail = buildOTPEmail(name, otpCode, "email verification");
      const sent = await sendEmail({ ...otpEmail, to: email });
      if (!sent) console.error("[REGISTER] OTP email send failed for", email);
    } catch (e) {
      console.error("Failed to send OTP email:", e);
    }

    createAuditLog({
      userId,
      action: "register",
      entityType: "user",
      entityId: userId,
      newValues: { email, role },
      ipAddress: getClientIp(request),
    }).catch(() => {});

    return created({
      user: { id: userId, name, email, role: user.role },
      message: "Registration successful. Please verify your email.",
      requiresVerification: true,
    });
  } catch (err) {
    return serverError(err);
  }
}
