import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/guards";
import { paginated, success, error, serverError } from "@/lib/api/response";

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

    const conditions: ReturnType<typeof sql>[] = [];
    if (status) conditions.push(sql`rr.status = ${status}`);

    const where =
      conditions.length === 0
        ? sql``
        : conditions.reduce((acc, cond, i) =>
            i === 0 ? sql`WHERE ${cond}` : sql`${acc} AND ${cond}`
          );

    const countResult = await db.execute(
      sql`SELECT count(*) as count FROM review_reports rr ${where}`
    );
    const total = Number(
      (countResult as unknown as Array<{ count: string }>)[0]?.count ?? 0
    );

    const rows = await db.execute(sql`
      SELECT
        rr.*,
        rev.rating AS review_rating,
        rev.comment AS review_comment,
        rev.status AS review_status,
        reporter.name AS reporter_name,
        reporter.email AS reporter_email,
        resolver.name AS resolved_by_name
      FROM review_reports rr
      LEFT JOIN reviews rev ON rev.id = rr.review_id
      LEFT JOIN users reporter ON reporter.id = rr.reporter_id
      LEFT JOIN users resolver ON resolver.id = rr.resolved_by
      ${where}
      ORDER BY rr.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    return paginated(rows as unknown as Array<Record<string, unknown>>, {
      page,
      limit,
      total,
    });
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireRole(request, "super_admin", "admin");
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const body = await request.json();
    const { id, status } = body as { id?: string; status?: string };

    if (!id) return error("Report id is required", 400);
    if (!status || !["resolved", "dismissed"].includes(status)) {
      return error("Status must be 'resolved' or 'dismissed'", 400);
    }

    const rows = await db.execute(sql`
      UPDATE review_reports
      SET status = ${status}, resolved_by = ${user.id}, resolved_at = NOW()
      WHERE id = ${id} AND status = 'pending'
      RETURNING *
    `);

    const result = rows as unknown as Array<Record<string, unknown>>;
    if (result.length === 0) {
      return error("Report not found or already resolved", 404);
    }

    return success(result[0]);
  } catch (err) {
    return serverError(err);
  }
}
