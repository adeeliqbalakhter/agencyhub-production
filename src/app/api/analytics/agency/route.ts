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

    const [topAgencies, statusBreakdown, dailyRegistrations] = await Promise.all([
      db.execute(sql`
        SELECT id, name, average_rating, total_reviews, total_leads, profile_views
        FROM agencies WHERE deleted_at IS NULL
        ORDER BY profile_views DESC NULLS LAST
        LIMIT 20
      `),
      db.execute(sql`
        SELECT status, count(*) as count FROM agencies WHERE deleted_at IS NULL GROUP BY status
      `),
      db.execute(sql`
        SELECT DATE(created_at) as date, count(*) as count
        FROM agencies WHERE deleted_at IS NULL AND created_at >= CURRENT_DATE - ${days}
        GROUP BY DATE(created_at) ORDER BY date ASC
      `),
    ]);

    return success({ topAgencies, statusBreakdown, dailyRegistrations });
  } catch (err) {
    return serverError(err);
  }
}
