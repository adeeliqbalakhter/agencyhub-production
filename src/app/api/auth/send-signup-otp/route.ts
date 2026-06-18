import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { generateOTP } from "@/lib/auth/tokens";
import { registerSchema } from "@/lib/validations/auth";
import { sendEmail, buildOTPEmail } from "@/lib/services/email";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/services/rate-limit";
import { success, error, serverError } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, RATE_LIMITS.otp, "send-signup-otp");
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return error("Invalid input", 400, parsed.error.format());
    }

    const { name, email, password, role } = parsed.data;

    // Check if email already exists
    const existingRows = await db.execute(
      sql`SELECT id FROM users WHERE email = ${email} AND deleted_at IS NULL`
    );
    const existing = (existingRows as unknown as Array<Record<string, unknown>>);
    if (existing.length > 0) {
      return error("Email already registered", 409);
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Generate 6-digit OTP
    const code = generateOTP();

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

    // Invalidate previous signup OTPs for this email
    await db.execute(
      sql`UPDATE signup_otps SET used_at = NOW() WHERE email = ${email} AND used_at IS NULL`
    );

    // Insert new signup OTP (expires in 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await db.execute(
      sql`INSERT INTO signup_otps (email, code, name, password_hash, role, expires_at)
          VALUES (${email}, ${code}, ${name}, ${passwordHash}, ${role}, ${expiresAt})`
    );

    // Build and send OTP email
    const emailData = buildOTPEmail(name, code, "account verification");

    const sent = await sendEmail({ ...emailData, to: email });

    if (!sent) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[SIGNUP-OTP] Failed to send OTP email to:", email);
      }
    }

    return success({
      message: sent ? "Verification code sent to your email" : "Verification code sent to your email",
      emailSent: sent,
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[SEND-SIGNUP-OTP] Error:", err);
    }
    return serverError(err);
  }
}
