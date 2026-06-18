import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { hashToken } from "@/lib/auth/tokens";
import { hashPassword } from "@/lib/auth/password";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/services/rate-limit";
import { createAuditLog, getClientIp } from "@/lib/services/audit";
import { success, error, serverError } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(request, RATE_LIMITS.auth, "reset-password");
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) return error("Validation failed", 400, parsed.error.format());

    const { token, password } = parsed.data;
    const tokenHash = hashToken(token);

    const rows = await db.execute(sql`
      SELECT prt.*, u.id as uid
      FROM password_reset_tokens prt
      JOIN users u ON u.id = prt.user_id
      WHERE prt.token_hash = ${tokenHash}
        AND prt.used_at IS NULL
        AND prt.expires_at > NOW()
        AND u.deleted_at IS NULL
    `);
    const row = (rows as unknown as Array<Record<string, unknown>>)[0];

    if (!row) return error("Invalid or expired reset link", 400);

    const newHash = await hashPassword(password);

    await db.execute(sql`
      UPDATE users SET password_hash = ${newHash}, failed_login_attempts = 0, locked_until = NULL
      WHERE id = ${row.uid}
    `);

    await db.execute(sql`
      UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ${row.id}
    `);

    // Revoke all refresh tokens for security
    await db.execute(sql`
      UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ${row.uid} AND revoked_at IS NULL
    `);

    await createAuditLog({
      userId: row.uid as string,
      action: "password_reset",
      entityType: "user",
      entityId: row.uid as string,
      ipAddress: getClientIp(request),
    });

    return success({ message: "Password reset successfully. Please log in." });
  } catch (err) {
    return serverError(err);
  }
}
