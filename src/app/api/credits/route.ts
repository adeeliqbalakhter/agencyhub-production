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

    // Get user's agency
    const agencyRows = await db.execute(sql`
      SELECT id FROM agencies WHERE user_id = ${user.id} AND deleted_at IS NULL LIMIT 1
    `);
    const agency = (agencyRows as unknown as Array<Record<string, unknown>>)[0];
    if (!agency) return success({ available: 0, monthlyCredits: 0, consumed: 0, granted: 0 });

    const agencyId = agency.id as string;

    let monthlyCredits = 1;
    try {
      const planRows = await db.execute(sql`
        SELECT p.monthly_lead_credits FROM subscriptions s
        JOIN plans p ON s.plan_id = p.id
        WHERE s.agency_id = ${agencyId} AND s.status = 'active'
      `);
      const plan = (planRows as unknown as Array<Record<string, unknown>>)[0];
      if (plan) monthlyCredits = Number(plan.monthly_lead_credits) || 1;
    } catch { /* default */ }

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

    let granted = 0;
    try {
      const grantRows = await db.execute(sql`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM lead_credit_transactions
        WHERE agency_id = ${agencyId} AND type = 'grant'
      `);
      granted = Number((grantRows as unknown as Array<Record<string, unknown>>)[0]?.total ?? 0);
    } catch { /* table may not exist */ }

    const available = Math.max((monthlyCredits === -1 ? 999999 : monthlyCredits) + granted - consumed, 0);

    return success({ available, monthlyCredits, consumed, granted });
  } catch (err) {
    return serverError(err);
  }
}
