import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAgencyAccess } from "@/lib/auth/guards";
import { z } from "zod";
import { createAuditLog, getClientIp } from "@/lib/services/audit";
import { success, created, error, serverError } from "@/lib/api/response";
import { checkTeamLimit } from "@/lib/subscriptions/gates";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["member", "editor", "manager"]).default("member"),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await requireAgencyAccess(request, id);
    if ("error" in authResult) return authResult.error;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const rows = await db.execute(sql`
      SELECT atm.id, atm.role, atm.status, atm.invited_at, atm.accepted_at,
             u.id as user_id, u.name, u.email, u.image
      FROM agency_team_members atm
      JOIN users u ON u.id = atm.user_id
      WHERE atm.agency_id = ${id}
      ORDER BY atm.created_at ASC
    `);

    return success(rows);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await requireAgencyAccess(request, id);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    const teamCheck = await checkTeamLimit(id);
    if (!teamCheck.allowed) {
      return Response.json({ error: "Team member limit reached for your plan", limit: teamCheck.limit }, { status: 403 });
    }

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) return error("Validation failed", 400, parsed.error.format());

    const { email, role } = parsed.data;

    // Find user by email
    const userRows = await db.execute(
      sql`SELECT id FROM users WHERE email = ${email} AND deleted_at IS NULL`
    );
    const targetUser = (userRows as unknown as Array<Record<string, unknown>>)[0];
    if (!targetUser) return error("No user found with this email", 404);

    // Check if already a member
    const existing = await db.execute(sql`
      SELECT id FROM agency_team_members WHERE agency_id = ${id} AND user_id = ${targetUser.id}
    `);
    if ((existing as unknown as Array<unknown>).length > 0) {
      return error("User is already a team member", 409);
    }

    const rows = await db.execute(sql`
      INSERT INTO agency_team_members (agency_id, user_id, role, invited_by, status)
      VALUES (${id}, ${targetUser.id}, ${role}, ${user.id}, 'pending')
      RETURNING *
    `);

    // Update user role if they're a regular user
    await db.execute(sql`
      UPDATE users SET role = 'agency_team_member' WHERE id = ${targetUser.id} AND role = 'user'
    `);

    await createAuditLog({
      userId: user.id,
      action: "team_member_invited",
      entityType: "agency_team_member",
      entityId: id,
      newValues: { email, role },
      ipAddress: getClientIp(request),
    });

    return created((rows as unknown as Array<Record<string, unknown>>)[0]);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await requireAgencyAccess(request, id);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const { searchParams } = request.nextUrl;
    const memberId = searchParams.get("memberId");
    if (!memberId) return error("memberId query parameter required", 400);

    await db.execute(sql`
      DELETE FROM agency_team_members WHERE id = ${memberId} AND agency_id = ${id}
    `);

    await createAuditLog({
      userId: user.id,
      action: "team_member_removed",
      entityType: "agency_team_member",
      entityId: memberId,
      ipAddress: getClientIp(request),
    });

    return success({ message: "Team member removed" });
  } catch (err) {
    return serverError(err);
  }
}
