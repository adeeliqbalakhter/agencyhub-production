import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAgencyAccess } from "@/lib/auth/guards";
import { success, error, serverError } from "@/lib/api/response";
import { checkRateLimit, rateLimitResponse } from "@/lib/services/rate-limit";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await requireAgencyAccess(request, id);
    if ("error" in authResult) return authResult.error;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const { searchParams } = request.nextUrl;
    const days = Math.min(90, Math.max(7, parseInt(searchParams.get("days") || "30")));

    const [agency, dailyStats, totalLeads, reviewStats] = await Promise.all([
      db.execute(sql`
        SELECT profile_views, total_reviews, total_leads, average_rating
        FROM agencies WHERE id = ${id}
      `),
      db.execute(sql`
        SELECT date, profile_views, search_impressions, website_clicks, phone_clicks, email_clicks, lead_requests
        FROM agency_analytics_daily
        WHERE agency_id = ${id} AND date >= CURRENT_DATE - ${days}
        ORDER BY date ASC
      `),
      db.execute(sql`
        SELECT status, count(*) as count
        FROM lead_assignments WHERE agency_id = ${id}
        GROUP BY status
      `),
      db.execute(sql`
        SELECT
          COUNT(*) as total,
          AVG(overall_rating) as avg_rating,
          COUNT(*) FILTER (WHERE status = 'approved') as approved,
          COUNT(*) FILTER (WHERE status = 'pending') as pending
        FROM reviews WHERE agency_id = ${id} AND deleted_at IS NULL
      `),
    ]);

    return success({
      overview: (agency as unknown as Array<Record<string, unknown>>)[0] || {},
      dailyStats,
      leadsByStatus: totalLeads,
      reviewStats: (reviewStats as unknown as Array<Record<string, unknown>>)[0] || {},
    });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rateLimit = await checkRateLimit(request, { windowMs: 60_000, maxRequests: 30 }, "analytics");
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const { id } = await params;
    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const body = await request.json();
    const event = (body as Record<string, string>).event;

    if (!["profile_view", "website_click", "phone_click", "email_click"].includes(event)) {
      return error("Invalid event type", 400);
    }

    const columnMap: Record<string, string> = {
      profile_view: "profile_views",
      website_click: "website_clicks",
      phone_click: "phone_clicks",
      email_click: "email_clicks",
    };

    await db.execute(sql`
      INSERT INTO agency_analytics_daily (agency_id, date, ${sql.raw(columnMap[event])})
      VALUES (${id}, CURRENT_DATE, 1)
      ON CONFLICT (agency_id, date) DO UPDATE SET ${sql.raw(columnMap[event])} = agency_analytics_daily.${sql.raw(columnMap[event])} + 1
    `).catch(() => {
      // Fallback if unique constraint doesn't exist
    });

    if (event === "profile_view") {
      await db.execute(sql`
        UPDATE agencies SET profile_views = COALESCE(profile_views, 0) + 1 WHERE id = ${id}
      `);
    }

    return success({ recorded: true });
  } catch (err) {
    return serverError(err);
  }
}
