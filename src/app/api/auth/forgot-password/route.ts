import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { generateEmailToken, hashToken } from "@/lib/auth/tokens";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { sendEmail, buildPasswordResetEmail } from "@/lib/services/email";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/services/rate-limit";
import { success, error, serverError } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, RATE_LIMITS.auth, "forgot-password");
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) return error("Validation failed", 400);

    const { email } = parsed.data;

    const userRows = await db.execute(
      sql`SELECT id, name, email, is_active FROM users WHERE email = ${email} AND deleted_at IS NULL`
    );
    const user = (userRows as unknown as Array<Record<string, unknown>>)[0];

    // Always return same response to prevent email enumeration
    if (!user || !user.is_active) {
      return success({ message: "If an account exists, a password reset link has been sent." });
    }

    const token = generateEmailToken();
    const tokenHash = hashToken(token);

    // Invalidate previous tokens
    await db.execute(sql`
      UPDATE password_reset_tokens SET used_at = NOW()
      WHERE user_id = ${user.id} AND used_at IS NULL
    `);

    await db.execute(sql`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES (${user.id}, ${tokenHash}, ${new Date(Date.now() + 60 * 60 * 1000).toISOString()})
    `);

    const emailData = buildPasswordResetEmail((user.name as string) || "", token);
    await sendEmail({ ...emailData, to: email });

    return success({ message: "If an account exists, a password reset link has been sent." });
  } catch (err) {
    return serverError(err);
  }
}
