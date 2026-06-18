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

    // Auto-link leads by email
    try {
      await db.execute(sql`
        UPDATE leads SET user_id = ${user.id}
        WHERE user_id IS NULL AND contact_email = ${user.email}
      `);
    } catch { /* ignore */ }

    // Get conversations — show any assignment that is claimed/responded/won or has messages
    try {
      const rows = await db.execute(sql`
        SELECT
          la.id as assignment_id,
          la.lead_id,
          la.status as assignment_status,
          l.company_name,
          l.project_description,
          a.id as agency_id,
          a.name as agency_name,
          a.logo as agency_logo,
          a.slug as agency_slug,
          (SELECT count(*) FROM messages m WHERE m.lead_assignment_id = la.id) as message_count,
          (SELECT m.content FROM messages m WHERE m.lead_assignment_id = la.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
          (SELECT m.created_at FROM messages m WHERE m.lead_assignment_id = la.id ORDER BY m.created_at DESC LIMIT 1) as last_message_at
        FROM lead_assignments la
        JOIN leads l ON l.id = la.lead_id
        JOIN agencies a ON a.id = la.agency_id AND a.deleted_at IS NULL
        WHERE (l.user_id = ${user.id} OR l.contact_email = ${user.email})
          AND (
            la.status IN ('claimed', 'responded', 'won')
            OR EXISTS (SELECT 1 FROM messages m WHERE m.lead_assignment_id = la.id)
          )
        ORDER BY last_message_at DESC NULLS LAST, la.created_at DESC
      `);
      return success(rows);
    } catch (err) {
      console.error("[CLIENT_MESSAGES] Query error:", err);
      return success([]);
    }
  } catch (err) {
    return serverError(err);
  }
}
