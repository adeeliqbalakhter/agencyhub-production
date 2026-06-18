import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { success, error, serverError } from "@/lib/api/response";

const topUpSchema = z.object({
  agencyId: z.string().uuid(),
  amount: z.number().int().min(1).max(1000),
  description: z.string().max(500).optional(),
});

// GET: fetch credit balance for an agency
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole(request, "super_admin", "admin");
    if ("error" in authResult) return authResult.error;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const { searchParams } = request.nextUrl;
    const agencyId = searchParams.get("agencyId");

    if (!agencyId) return error("agencyId required", 400);

    // Get plan limits
    let monthlyCredits = 1;
    try {
      const planRows = await db.execute(sql`
        SELECT p.monthly_lead_credits FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.agency_id = ${agencyId} AND s.status = 'active'
      `);
      const plan = (planRows as unknown as Array<Record<string, unknown>>)[0];
      if (plan) monthlyCredits = Number(plan.monthly_lead_credits);
    } catch { /* default */ }

    // Get consumed this month
    let consumed = 0;
    try {
      const usedRows = await db.execute(sql`
        SELECT COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as used
        FROM lead_credit_transactions
        WHERE agency_id = ${agencyId} AND type = 'consume'
          AND created_at >= date_trunc('month', NOW())
      `);
      consumed = Number((usedRows as unknown as Array<Record<string, unknown>>)[0]?.used ?? 0);
    } catch { /* table may not exist */ }

    // Get granted (bonus) credits
    let granted = 0;
    try {
      const grantRows = await db.execute(sql`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM lead_credit_transactions
        WHERE agency_id = ${agencyId} AND type = 'grant'
      `);
      granted = Number((grantRows as unknown as Array<Record<string, unknown>>)[0]?.total ?? 0);
    } catch { /* table may not exist */ }

    const available = (monthlyCredits === -1 ? 999 : monthlyCredits) + granted - consumed;

    return success({
      agencyId,
      monthlyCredits,
      consumed,
      granted,
      available: Math.max(available, 0),
    });
  } catch (err) {
    return serverError(err);
  }
}

// POST: top up credits for an agency
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole(request, "super_admin");
    if ("error" in authResult) return authResult.error;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const body = await request.json();
    const parsed = topUpSchema.safeParse(body);
    if (!parsed.success) return error("Validation failed", 400, parsed.error.format());

    const { agencyId, amount, description } = parsed.data;

    // Verify agency exists
    const agencyRows = await db.execute(sql`SELECT id, name FROM agencies WHERE id = ${agencyId}`);
    const agency = (agencyRows as unknown as Array<Record<string, unknown>>)[0];
    if (!agency) return error("Agency not found", 404);

    // Ensure table exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lead_credit_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        type VARCHAR(30) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Insert grant
    await db.execute(sql`
      INSERT INTO lead_credit_transactions (agency_id, amount, type, description)
      VALUES (${agencyId}, ${amount}, 'grant', ${description || `Admin top-up: ${amount} credits`})
    `);

    return success({
      message: `Added ${amount} credits to ${agency.name}`,
      agencyId,
      amount,
    });
  } catch (err) {
    return serverError(err);
  }
}
