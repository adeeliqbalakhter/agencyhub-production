import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/guards";
import { updateUserStatusSchema } from "@/lib/validations/auth";
import { createAuditLog, getClientIp } from "@/lib/services/audit";
import { success, error, serverError } from "@/lib/api/response";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireRole(request, "super_admin", "admin");
    if ("error" in authResult) return authResult.error;
    const { user: actor } = authResult;

    const { id } = await params;
    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const body = await request.json();
    const parsed = updateUserStatusSchema.safeParse(body);
    if (!parsed.success) return error("Validation failed", 400, parsed.error.format());

    if (id === actor.id) return error("Cannot change your own status", 400);

    await db.execute(sql`
      UPDATE users SET is_active = ${parsed.data.isActive}, updated_at = NOW() WHERE id = ${id}
    `);

    if (!parsed.data.isActive) {
      await db.execute(sql`
        UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ${id} AND revoked_at IS NULL
      `);
    }

    await createAuditLog({
      userId: actor.id,
      action: parsed.data.isActive ? "user_activated" : "user_suspended",
      entityType: "user",
      entityId: id,
      newValues: { isActive: parsed.data.isActive, reason: parsed.data.reason },
      ipAddress: getClientIp(request),
    });

    return success({ message: `User ${parsed.data.isActive ? "activated" : "suspended"}` });
  } catch (err) {
    return serverError(err);
  }
}
