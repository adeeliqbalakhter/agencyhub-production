import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/guards";
import { z } from "zod";
import { createAuditLog, getClientIp } from "@/lib/services/audit";
import { created, error, serverError } from "@/lib/api/response";

const assignSchema = z.object({
  agencyIds: z.array(z.string().uuid()).min(1),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireRole(request, "super_admin", "admin");
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    const { id } = await params;
    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const body = await request.json();
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) return error("Validation failed", 400, parsed.error.format());

    // Check each agency's credit balance before assignment
    const agenciesWithoutCredits: string[] = [];
    for (const agencyId of parsed.data.agencyIds) {
      try {
        const subRows = await db.execute(sql`
          SELECT s.id, p.monthly_lead_credits, p.tier
          FROM subscriptions s
          JOIN plans p ON s.plan_id = p.id
          WHERE s.agency_id = ${agencyId} AND s.status = 'active'
        `);
        const sub = (subRows as unknown as Array<Record<string, unknown>>)[0];

        const monthlyCredits = sub ? Number(sub.monthly_lead_credits) : 1; // free plan default

        // -1 means unlimited
        if (monthlyCredits !== -1) {
          const usedRows = await db.execute(sql`
            SELECT COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as used
            FROM lead_credit_transactions
            WHERE agency_id = ${agencyId}
              AND type = 'consume'
              AND created_at >= date_trunc('month', NOW())
          `);
          const used = Number((usedRows as unknown as Array<Record<string, unknown>>)[0]?.used ?? 0);

          if (used >= monthlyCredits) {
            agenciesWithoutCredits.push(agencyId);
          }
        }
      } catch {
        // Tables may not exist yet — allow assignment to proceed
      }
    }

    if (agenciesWithoutCredits.length === parsed.data.agencyIds.length) {
      return error("Agency has no remaining lead credits this month", 403);
    }

    const eligibleAgencyIds = parsed.data.agencyIds.filter(
      (id) => !agenciesWithoutCredits.includes(id)
    );

    const results: Array<Record<string, unknown>> = [];
    for (const agencyId of eligibleAgencyIds) {
      try {
        const rows = await db.execute(sql`
          INSERT INTO lead_assignments (lead_id, agency_id, status)
          VALUES (${id}, ${agencyId}, 'sent')
          ON CONFLICT DO NOTHING
          RETURNING *
        `);
        const row = (rows as unknown as Array<Record<string, unknown>>)[0];
        if (row) {
          results.push(row);
          // Record credit consumption for successful assignment
          try {
            await db.execute(sql`
              INSERT INTO lead_credit_transactions (agency_id, amount, type, description)
              VALUES (${agencyId}, -1, 'consume', ${'Lead assignment: ' + id})
            `);
          } catch {
            // Credit tracking table may not exist
          }
        }
      } catch { /* skip invalid */ }
    }

    await db.execute(sql`
      INSERT INTO lead_activity_logs (lead_id, user_id, action, details)
      VALUES (${id}, ${user.id}, 'assigned', ${JSON.stringify({ agencyIds: parsed.data.agencyIds })})
    `);

    await createAuditLog({
      userId: user.id,
      action: "lead_assigned",
      entityType: "lead",
      entityId: id,
      newValues: { agencyIds: parsed.data.agencyIds },
      ipAddress: getClientIp(request),
    });

    return created({ assignments: results });
  } catch (err) {
    return serverError(err);
  }
}
