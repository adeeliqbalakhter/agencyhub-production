import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guards";
import { isAdmin } from "@/lib/auth/rbac";
import { z } from "zod";
import { success, created, error, notFound, serverError } from "@/lib/api/response";

const messageSchema = z.object({
  assignmentId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    const { id } = await params;
    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    // Verify lead exists and check access
    const leadRows = await db.execute(sql`SELECT * FROM leads WHERE id = ${id}`);
    const lead = (leadRows as unknown as Array<Record<string, unknown>>)[0];
    if (!lead) return notFound("Lead not found");

    // Access: admin, lead owner (by user_id or contact_email), or assigned agency
    const isOwner = lead.user_id === user.id || lead.contact_email === user.email;
    if (!isAdmin(user.role) && !isOwner) {
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

    // Auto-link lead to user if it matches by email but has no user_id
    if (!lead.user_id && lead.contact_email === user.email) {
      try {
        await db.execute(sql`UPDATE leads SET user_id = ${user.id} WHERE id = ${id} AND user_id IS NULL`);
      } catch { /* ignore */ }
    }

    const { searchParams } = request.nextUrl;
    const assignmentId = searchParams.get("assignmentId");
    if (!assignmentId) return error("assignmentId required", 400);

    const rows = await db.execute(sql`
      SELECT m.*, u.name as sender_name
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.lead_assignment_id = ${assignmentId}
      ORDER BY m.created_at ASC
    `);

    return success(rows);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    const { id } = await params;
    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    // Verify lead exists and check access
    const leadRows = await db.execute(sql`SELECT * FROM leads WHERE id = ${id}`);
    const lead = (leadRows as unknown as Array<Record<string, unknown>>)[0];
    if (!lead) return notFound("Lead not found");

    const isOwner = lead.user_id === user.id || lead.contact_email === user.email;
    if (!isAdmin(user.role) && !isOwner) {
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
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) return error("Validation failed", 400, parsed.error.format());

    const rows = await db.execute(sql`
      INSERT INTO messages (lead_assignment_id, sender_id, content)
      VALUES (${parsed.data.assignmentId}, ${user.id}, ${parsed.data.content})
      RETURNING *
    `);

    // Update assignment responded_at if this is agency's first response (don't overwrite won/lost)
    try {
      await db.execute(sql`
        UPDATE lead_assignments SET responded_at = COALESCE(responded_at, NOW()), status = 'responded'
        WHERE id = ${parsed.data.assignmentId} AND status IN ('sent', 'claimed')
      `);
    } catch { /* non-critical */ }

    return created((rows as unknown as Array<Record<string, unknown>>)[0]);
  } catch (err) {
    return serverError(err);
  }
}
