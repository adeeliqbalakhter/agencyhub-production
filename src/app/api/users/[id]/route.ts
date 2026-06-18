import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/guards";
import { success, error, notFound, serverError } from "@/lib/api/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireRole(request, "super_admin", "admin");
    if ("error" in authResult) return authResult.error;

    const { id } = await params;
    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const rows = await db.execute(sql`
      SELECT u.id, u.name, u.email, u.role, u.image, u.is_active, u.email_verified,
             u.last_login_at, u.login_count, u.created_at, u.updated_at,
             up.bio, up.phone, up.company_name, up.job_title, up.website, up.avatar_url
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE u.id = ${id} AND u.deleted_at IS NULL
    `);
    const user = (rows as unknown as Array<Record<string, unknown>>)[0];
    if (!user) return notFound("User not found");

    return success(user);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireRole(request, "super_admin");
    if ("error" in authResult) return authResult.error;
    const { user: adminUser } = authResult;

    const { id } = await params;
    if (id === adminUser.id) return error("Cannot delete your own account", 400);

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    // Hard delete: remove related data then the user
    await db.execute(sql`DELETE FROM notification_preferences WHERE user_id = ${id}`);
    await db.execute(sql`DELETE FROM user_profiles WHERE user_id = ${id}`);
    await db.execute(sql`DELETE FROM refresh_tokens WHERE user_id = ${id}`);
    await db.execute(sql`DELETE FROM reviews WHERE user_id = ${id}`);
    await db.execute(sql`DELETE FROM users WHERE id = ${id}`);
    return success({ message: "User permanently deleted" });
  } catch (err) {
    return serverError(err);
  }
}
