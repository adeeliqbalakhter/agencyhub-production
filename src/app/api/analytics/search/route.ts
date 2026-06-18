import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/guards";
import { success, error, serverError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole(request, "super_admin", "admin");
    if ("error" in authResult) return authResult.error;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const { searchParams } = request.nextUrl;
    const days = Math.min(90, Math.max(7, parseInt(searchParams.get("days") || "30")));

    const [topQueries, dailySearches, totalSearches] = await Promise.all([
      db.execute(sql`
        SELECT query, count(*) as count
        FROM search_logs
        WHERE created_at >= CURRENT_DATE - ${days} AND query IS NOT NULL AND query != ''
        GROUP BY query ORDER BY count DESC LIMIT 20
      `),
      db.execute(sql`
        SELECT DATE(created_at) as date, count(*) as count
        FROM search_logs WHERE created_at >= CURRENT_DATE - ${days}
        GROUP BY DATE(created_at) ORDER BY date ASC
      `),
      db.execute(sql`
        SELECT count(*) as count FROM search_logs WHERE created_at >= CURRENT_DATE - ${days}
      `),
    ]);

    return success({
      topQueries,
      dailySearches,
      totalSearches: Number((totalSearches as unknown as Array<{ count: string }>)[0]?.count ?? 0),
    });
  } catch (err) {
    return serverError(err);
  }
}
