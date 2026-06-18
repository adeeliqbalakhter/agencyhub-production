import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { verifyEmailTokenSchema } from "@/lib/validations/auth";
import { createAuditLog, getClientIp } from "@/lib/services/audit";
import { success, error, serverError } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const body = await request.json();
    const parsed = verifyEmailTokenSchema.safeParse(body);
    if (!parsed.success) return error("Invalid token", 400);

    const { token } = parsed.data;

    const rows = await db.execute(sql`
      SELECT evt.*, u.id as uid, u.email
      FROM email_verification_tokens evt
      JOIN users u ON u.id = evt.user_id
      WHERE evt.token = ${token}
        AND evt.used_at IS NULL
        AND evt.expires_at > NOW()
    `);
    const row = (rows as unknown as Array<Record<string, unknown>>)[0];

    if (!row) return error("Invalid or expired verification link", 400);

    await db.execute(sql`
      UPDATE users SET email_verified = NOW() WHERE id = ${row.uid}
    `);
    await db.execute(sql`
      UPDATE email_verification_tokens SET used_at = NOW() WHERE id = ${row.id}
    `);

    await createAuditLog({
      userId: row.uid as string,
      action: "email_verified",
      entityType: "user",
      entityId: row.uid as string,
      ipAddress: getClientIp(request),
    });

    return success({ message: "Email verified successfully" });
  } catch (err) {
    return serverError(err);
  }
}
