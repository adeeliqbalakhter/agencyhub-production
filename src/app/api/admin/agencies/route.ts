import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/guards";
import { paginated, error } from "@/lib/api/response";

const AGENCY_COLS = `a.id, a.name, a.slug, a.email, a.status, a.is_verified, a.is_featured, a.is_premium,
       a.average_rating, a.total_reviews, a.created_at, u.name as owner_name, u.email as owner_email`;

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
    const status = searchParams.get("status") || "";
    const query = searchParams.get("query") || "";

    let countQuery;
    let dataQuery;

    if (status && query) {
      const pattern = `%${query}%`;
      countQuery = sql`SELECT count(*) as count FROM agencies a WHERE a.deleted_at IS NULL AND a.status = ${status} AND a.name ILIKE ${pattern}`;
      dataQuery = sql`SELECT ${sql.raw(AGENCY_COLS)} FROM agencies a LEFT JOIN users u ON u.id = a.user_id WHERE a.deleted_at IS NULL AND a.status = ${status} AND a.name ILIKE ${pattern} ORDER BY a.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (status) {
      countQuery = sql`SELECT count(*) as count FROM agencies a WHERE a.deleted_at IS NULL AND a.status = ${status}`;
      dataQuery = sql`SELECT ${sql.raw(AGENCY_COLS)} FROM agencies a LEFT JOIN users u ON u.id = a.user_id WHERE a.deleted_at IS NULL AND a.status = ${status} ORDER BY a.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else if (query) {
      const pattern = `%${query}%`;
      countQuery = sql`SELECT count(*) as count FROM agencies a WHERE a.deleted_at IS NULL AND a.name ILIKE ${pattern}`;
      dataQuery = sql`SELECT ${sql.raw(AGENCY_COLS)} FROM agencies a LEFT JOIN users u ON u.id = a.user_id WHERE a.deleted_at IS NULL AND a.name ILIKE ${pattern} ORDER BY a.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else {
      countQuery = sql`SELECT count(*) as count FROM agencies a WHERE a.deleted_at IS NULL`;
      dataQuery = sql`SELECT ${sql.raw(AGENCY_COLS)} FROM agencies a LEFT JOIN users u ON u.id = a.user_id WHERE a.deleted_at IS NULL ORDER BY a.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    }

    const countResult = await db.execute(countQuery);
    const total = Number((countResult as unknown as Array<{ count: string }>)[0]?.count ?? 0);

    const rows = await db.execute(dataQuery);

    return paginated(rows as unknown as Array<Record<string, unknown>>, { page, limit, total });
  } catch (err) {
    console.error("[ADMIN-AGENCIES] Error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return error(`Server error: ${msg}`, 500);
  }
}
