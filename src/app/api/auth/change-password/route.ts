import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { changePasswordSchema } from "@/lib/validations/auth";
import { requireAuth } from "@/lib/auth/guards";
import { createAuditLog, getClientIp } from "@/lib/services/audit";
import { success, error, serverError } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) return error("Validation failed", 400, parsed.error.format());

    const { currentPassword, newPassword } = parsed.data;

    const rows = await db.execute(
      sql`SELECT password_hash FROM users WHERE id = ${user.id}`
    );
    const row = (rows as unknown as Array<Record<string, unknown>>)[0];
    if (!row?.password_hash) return error("Password change not available for this account", 400);

    const valid = await verifyPassword(currentPassword, row.password_hash as string);
    if (!valid) return error("Current password is incorrect", 400);

    const newHash = await hashPassword(newPassword);
    await db.execute(sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${user.id}`);

    await createAuditLog({
      userId: user.id,
      action: "password_changed",
      entityType: "user",
      entityId: user.id,
      ipAddress: getClientIp(request),
    });

    return success({ message: "Password changed successfully" });
  } catch (err) {
    return serverError(err);
  }
}
