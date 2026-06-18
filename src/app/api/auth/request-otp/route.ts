import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { generateOTP } from "@/lib/auth/tokens";
import { requestOTPSchema } from "@/lib/validations/auth";
import { sendEmail, buildOTPEmail } from "@/lib/services/email";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/services/rate-limit";
import { success, error, serverError } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(request, RATE_LIMITS.otp, "request-otp");
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const body = await request.json();
    const parsed = requestOTPSchema.safeParse(body);
    if (!parsed.success) return error("Validation failed", 400, parsed.error.format());

    const { email, type } = parsed.data;

    const userRows = await db.execute(
      sql`SELECT id, name, email, is_active FROM users WHERE email = ${email} AND deleted_at IS NULL`
    );
    const user = (userRows as unknown as Array<Record<string, unknown>>)[0];

    // Don't reveal whether user exists
    if (!user || !user.is_active) {
      return success({ message: "If an account exists, a verification code has been sent." });
    }

    const code = generateOTP();

    // Invalidate previous unused OTPs and insert new one
    try {
      await db.execute(sql`
        UPDATE otp_tokens SET used_at = NOW()
        WHERE user_id = ${user.id} AND type = ${type} AND used_at IS NULL
      `);
    } catch { /* table may not exist */ }

    try {
      await db.execute(sql`
        INSERT INTO otp_tokens (user_id, code, type, expires_at)
        VALUES (${user.id}, ${code}, ${type}, ${new Date(Date.now() + 10 * 60 * 1000).toISOString()})
      `);
    } catch (e) {
      console.error("Failed to insert OTP token:", e);
      return success({ message: "If an account exists, a verification code has been sent." });
    }

    const purposeMap: Record<string, string> = {
      email_verification: "email verification",
      login: "login",
      password_reset: "password reset",
    };

    const emailData = buildOTPEmail(
      (user.name as string) || "",
      code,
      purposeMap[type] || type
    );
    const sent = await sendEmail({ ...emailData, to: email });

    if (!sent) {
      console.error("[OTP] Email send failed for", email);
    }

    return success({
      message: "If an account exists, a verification code has been sent.",
      emailSent: sent,
    });
  } catch (err) {
    return serverError(err);
  }
}
