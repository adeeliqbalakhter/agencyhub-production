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

    const [usersCount, agenciesCount, reviewsCount, leadsCount, pendingAgencies, pendingReviews, recentUsers] =
      await Promise.all([
        db.execute(sql`SELECT count(*) as count FROM users WHERE deleted_at IS NULL`),
        db.execute(sql`SELECT count(*) as count FROM agencies WHERE deleted_at IS NULL`),
        db.execute(sql`SELECT count(*) as count FROM reviews WHERE deleted_at IS NULL`),
        db.execute(sql`SELECT count(*) as count FROM leads`),
        db.execute(sql`SELECT count(*) as count FROM agencies WHERE status = 'draft' AND deleted_at IS NULL`),
        db.execute(sql`SELECT count(*) as count FROM reviews WHERE status = 'pending' AND deleted_at IS NULL`),
        db.execute(sql`SELECT id, name, email, role, created_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 10`),
      ]);

    const extract = (r: unknown) => Number((r as Array<{ count: string }>)[0]?.count ?? 0);

    return success({
      stats: {
        totalUsers: extract(usersCount),
        totalAgencies: extract(agenciesCount),
        totalReviews: extract(reviewsCount),
        totalLeads: extract(leadsCount),
        pendingAgencies: extract(pendingAgencies),
        pendingReviews: extract(pendingReviews),
      },
      recentUsers,
    });
  } catch (err) {
    return serverError(err);
  }
}
