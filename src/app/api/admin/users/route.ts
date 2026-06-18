import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/guards";
import { paginated, error } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole(request, "super_admin", "admin");
    if ("error" in authResult) return authResult.error;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;
    const query = searchParams.get("query") || "";
    const role = searchParams.get("role") || "";
    const status = searchParams.get("status") || "";

    let countQuery;
    let dataQuery;

    if (query && role && status === "active") {
      const pattern = `%${query}%`;
      countQuery = sql`SELECT count(*) as count FROM users u WHERE u.deleted_at IS NULL AND (u.name ILIKE ${pattern} OR u.email ILIKE ${pattern}) AND u.role = ${role} AND u.is_active = true`;
      dataQuery = sql`SELECT u.id, u.name, u.email, u.role, u.is_active, u.email_verified, u.last_login_at, u.login_count, u.created_at FROM users u WHERE u.deleted_at IS NULL AND (u.name ILIKE ${pattern} OR u.email ILIKE ${pattern}) AND u.role = ${role} AND u.is_active = true ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (query && role) {
      const pattern = `%${query}%`;
      countQuery = sql`SELECT count(*) as count FROM users u WHERE u.deleted_at IS NULL AND (u.name ILIKE ${pattern} OR u.email ILIKE ${pattern}) AND u.role = ${role}`;
      dataQuery = sql`SELECT u.id, u.name, u.email, u.role, u.is_active, u.email_verified, u.last_login_at, u.login_count, u.created_at FROM users u WHERE u.deleted_at IS NULL AND (u.name ILIKE ${pattern} OR u.email ILIKE ${pattern}) AND u.role = ${role} ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (query) {
      const pattern = `%${query}%`;
      countQuery = sql`SELECT count(*) as count FROM users u WHERE u.deleted_at IS NULL AND (u.name ILIKE ${pattern} OR u.email ILIKE ${pattern})`;
      dataQuery = sql`SELECT u.id, u.name, u.email, u.role, u.is_active, u.email_verified, u.last_login_at, u.login_count, u.created_at FROM users u WHERE u.deleted_at IS NULL AND (u.name ILIKE ${pattern} OR u.email ILIKE ${pattern}) ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (role) {
      countQuery = sql`SELECT count(*) as count FROM users u WHERE u.deleted_at IS NULL AND u.role = ${role}`;
      dataQuery = sql`SELECT u.id, u.name, u.email, u.role, u.is_active, u.email_verified, u.last_login_at, u.login_count, u.created_at FROM users u WHERE u.deleted_at IS NULL AND u.role = ${role} ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (status === "active") {
      countQuery = sql`SELECT count(*) as count FROM users u WHERE u.deleted_at IS NULL AND u.is_active = true`;
      dataQuery = sql`SELECT u.id, u.name, u.email, u.role, u.is_active, u.email_verified, u.last_login_at, u.login_count, u.created_at FROM users u WHERE u.deleted_at IS NULL AND u.is_active = true ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (status === "inactive") {
      countQuery = sql`SELECT count(*) as count FROM users u WHERE u.deleted_at IS NULL AND u.is_active = false`;
      dataQuery = sql`SELECT u.id, u.name, u.email, u.role, u.is_active, u.email_verified, u.last_login_at, u.login_count, u.created_at FROM users u WHERE u.deleted_at IS NULL AND u.is_active = false ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else {
      countQuery = sql`SELECT count(*) as count FROM users u WHERE u.deleted_at IS NULL`;
      dataQuery = sql`SELECT u.id, u.name, u.email, u.role, u.is_active, u.email_verified, u.last_login_at, u.login_count, u.created_at FROM users u WHERE u.deleted_at IS NULL ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    }

    const countResult = await db.execute(countQuery);
    const total = Number((countResult as unknown as Array<{ count: string }>)[0]?.count ?? 0);

    const rows = await db.execute(dataQuery);

    return paginated(rows as unknown as Array<Record<string, unknown>>, { page, limit, total });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[ADMIN-USERS] Error:", err);
    }
    const msg = err instanceof Error ? err.message : "Unknown error";
    return error(`Server error: ${msg}`, 500);
  }
}
