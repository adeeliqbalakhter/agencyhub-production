import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guards";
import { isAdmin } from "@/lib/auth/rbac";
import { success, error, notFound, serverError } from "@/lib/api/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    const { id } = await params;
    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const rows = await db.execute(sql`SELECT * FROM leads WHERE id = ${id}`);
    const lead = (rows as unknown as Array<Record<string, unknown>>)[0];
    if (!lead) return notFound("Lead not found");

    // Access: admin, lead creator, or assigned agency
    if (!isAdmin(user.role) && lead.user_id !== user.id) {
      const assignment = await db.execute(sql`
        SELECT la.id FROM lead_assignments la
        JOIN agencies a ON a.id = la.agency_id
        WHERE la.lead_id = ${id} AND (a.user_id = ${user.id}
          OR EXISTS (SELECT 1 FROM agency_team_members atm WHERE atm.agency_id = a.id AND atm.user_id = ${user.id} AND atm.status = 'active'))
      `);
      if ((assignment as unknown as Array<unknown>).length === 0) {
        return error("Access denied", 403);
      }
    }

    let assignments: unknown[] = [];
    try {
      assignments = await db.execute(sql`
        SELECT la.*, a.name as agency_name
        FROM lead_assignments la
        JOIN agencies a ON a.id = la.agency_id
        WHERE la.lead_id = ${id}
      `) as unknown as unknown[];
    } catch { /* ignore */ }

    let activityLogs: unknown[] = [];
    try {
      activityLogs = await db.execute(sql`
        SELECT * FROM lead_activity_logs WHERE lead_id = ${id} ORDER BY created_at DESC LIMIT 50
      `) as unknown as unknown[];
    } catch { /* ignore */ }

    return success({ ...lead, assignments, activityLogs });
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    const { id } = await params;
    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    // Verify the lead exists
    const leadRows = await db.execute(sql`SELECT * FROM leads WHERE id = ${id}`);
    const lead = (leadRows as unknown as Array<Record<string, unknown>>)[0];
    if (!lead) return notFound("Lead not found");

    const isOwner = isAdmin(user.role) || lead.user_id === user.id || lead.contact_email === user.email;
    if (!isOwner) {
      const assignment = await db.execute(sql`
        SELECT la.id FROM lead_assignments la
        JOIN agencies a ON a.id = la.agency_id
        WHERE la.lead_id = ${id} AND (a.user_id = ${user.id}
          OR EXISTS (SELECT 1 FROM agency_team_members atm WHERE atm.agency_id = a.id AND atm.user_id = ${user.id} AND atm.status = 'active'))
      `);
      if ((assignment as unknown as Array<unknown>).length === 0) {
        return error("Access denied", 403);
      }
    }

    const body = await request.json();

    // Status update (agency or admin)
    if (body.status) {
      const { status } = body as { status: string };
      if (!["new", "sent", "viewed", "responded", "won", "lost", "expired"].includes(status)) {
        return error("Invalid status", 400);
      }
      await db.execute(sql`UPDATE leads SET status = ${status}, updated_at = NOW() WHERE id = ${id}`);
      try {
        await db.execute(sql`
          INSERT INTO lead_activity_logs (lead_id, user_id, action, details)
          VALUES (${id}, ${user.id}, 'status_changed', ${JSON.stringify({ status })})
        `);
      } catch { /* ignore */ }
      return success({ message: "Lead updated" });
    }

    // Brief edit (client only — must be owner)
    if (!isOwner) return error("Only the project owner can edit the brief", 403);

    const updates: string[] = [];
    const { projectDescription, budget, timeline, companyName } = body;
    if (projectDescription !== undefined) updates.push("project_description");
    if (budget !== undefined) updates.push("budget");
    if (timeline !== undefined) updates.push("timeline");
    if (companyName !== undefined) updates.push("company_name");

    if (updates.length === 0) return error("No fields to update", 400);

    await db.execute(sql`
      UPDATE leads SET
        project_description = COALESCE(${projectDescription ?? null}, project_description),
        budget = COALESCE(${budget ?? null}, budget),
        timeline = COALESCE(${timeline ?? null}, timeline),
        company_name = COALESCE(${companyName ?? null}, company_name),
        updated_at = NOW()
      WHERE id = ${id}
    `);

    return success({ message: "Brief updated" });
  } catch (err) {
    return serverError(err);
  }
}
