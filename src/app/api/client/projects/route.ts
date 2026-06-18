import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { success, error, serverError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    // Auto-link any leads that match user's email but have no user_id
    try {
      await db.execute(sql`
        UPDATE leads SET user_id = ${user.id}
        WHERE user_id IS NULL AND contact_email = ${user.email}
      `);
    } catch { /* ignore */ }

    // Get all leads by this client
    try {
      const rows = await db.execute(sql`
        SELECT
          l.id, l.company_name, l.project_description, l.budget, l.timeline,
          l.status, l.created_at,
          COALESCE(
            json_agg(
              json_build_object(
                'assignmentId', la.id,
                'agencyId', la.agency_id,
                'agencyName', a.name,
                'agencyLogo', a.logo,
                'agencySlug', a.slug,
                'assignmentStatus', la.status,
                'respondedAt', la.responded_at
              )
            ) FILTER (WHERE la.id IS NOT NULL), '[]'
          ) as agencies
        FROM leads l
        LEFT JOIN lead_assignments la ON la.lead_id = l.id
        LEFT JOIN agencies a ON a.id = la.agency_id AND a.deleted_at IS NULL
        WHERE l.user_id = ${user.id} OR l.contact_email = ${user.email}
        GROUP BY l.id
        ORDER BY l.created_at DESC
      `);
      return success(rows);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[CLIENT_PROJECTS] Query error:", err);
      }
      // Fallback: simpler query without join
      try {
        const rows = await db.execute(sql`
          SELECT id, company_name, project_description, budget, timeline, status, created_at
          FROM leads
          WHERE user_id = ${user.id} OR contact_email = ${user.email}
          ORDER BY created_at DESC
        `);
        const withEmptyAgencies = (rows as unknown as Array<Record<string, unknown>>).map(r => ({
          ...r,
          agencies: [],
        }));
        return success(withEmptyAgencies);
      } catch {
        return success([]);
      }
    }
  } catch (err) {
    return serverError(err);
  }
}
