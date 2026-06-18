import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/guards";
import { updateUserRoleSchema } from "@/lib/validations/auth";
import { canManageRole, type Role } from "@/lib/auth/rbac";
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
    const parsed = updateUserRoleSchema.safeParse(body);
    if (!parsed.success) return error("Validation failed", 400, parsed.error.format());

    const { role: newRole } = parsed.data;

    if (!canManageRole(actor.role, newRole as Role)) {
      return error("Cannot assign a role equal to or above your own", 403);
    }

    const rows = await db.execute(
      sql`SELECT id, role FROM users WHERE id = ${id} AND deleted_at IS NULL`
    );
    const target = (rows as unknown as Array<Record<string, unknown>>)[0];
    if (!target) return error("User not found", 404);

    if (!canManageRole(actor.role, target.role as Role)) {
      return error("Cannot modify a user with equal or higher role", 403);
    }

    await db.execute(sql`UPDATE users SET role = ${newRole}, updated_at = NOW() WHERE id = ${id}`);

    await createAuditLog({
      userId: actor.id,
      action: "role_changed",
      entityType: "user",
      entityId: id,
      oldValues: { role: target.role },
      newValues: { role: newRole },
      ipAddress: getClientIp(request),
    });

    return success({ message: "Role updated", role: newRole });
  } catch (err) {
    return serverError(err);
  }
}
