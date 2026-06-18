import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    if (!hasDb()) {
      return Response.json({ error: "Database not available" }, { status: 503 });
    }

    const db = getDb();

    // Get the user's agency
    const agencyRows = await db.execute(
      sql`SELECT id FROM agencies WHERE user_id = ${user.id} AND deleted_at IS NULL LIMIT 1`
    );
    const agency = (agencyRows as unknown as Array<{ id: string }>)[0];

    if (!agency) {
      return Response.json(
        { error: "No agency found for this user" },
        { status: 404 }
      );
    }

    const agencyId = agency.id;

    // Get subscription joined with plan
    const subscriptionRows = await db.execute(
      sql`SELECT s.*, p.name as plan_name, p.tier, p.monthly_lead_credits, p.max_portfolio_items, p.max_team_members, p.features, p.monthly_price, p.yearly_price FROM subscriptions s JOIN plans p ON s.plan_id = p.id WHERE s.agency_id = ${agencyId} AND s.status = 'active'`
    );
    const subscription = (subscriptionRows as unknown as Array<Record<string, unknown>>)[0] ?? null;

    // Get credit balance for current month
    const creditRows = await db.execute(
      sql`SELECT COALESCE(SUM(amount), 0) as balance FROM lead_credit_transactions WHERE agency_id = ${agencyId} AND created_at >= date_trunc('month', NOW())`
    );
    const creditBalance = Number(
      (creditRows as unknown as Array<{ balance: string }>)[0]?.balance ?? 0
    );

    // Get usage stats
    const portfolioRows = await db.execute(
      sql`SELECT count(*) as count FROM portfolio_items WHERE agency_id = ${agencyId} AND deleted_at IS NULL`
    );
    const portfolioCount = Number(
      (portfolioRows as unknown as Array<{ count: string }>)[0]?.count ?? 0
    );

    const teamRows = await db.execute(
      sql`SELECT count(*) as count FROM agency_team_members WHERE agency_id = ${agencyId} AND status = 'active'`
    );
    const teamMemberCount = Number(
      (teamRows as unknown as Array<{ count: string }>)[0]?.count ?? 0
    );

    // If no subscription, return free plan defaults
    if (!subscription) {
      return Response.json({
        data: {
          subscription: {
            plan_name: "Free",
            tier: "free",
            status: "active",
            monthly_lead_credits: 10,
            max_portfolio_items: 5,
            max_team_members: 1,
            features: {},
            monthly_price: 0,
            yearly_price: 0,
          },
          creditBalance,
          usage: {
            portfolioCount,
            teamMemberCount,
          },
        },
      });
    }

    return Response.json({
      data: {
        subscription,
        creditBalance,
        usage: {
          portfolioCount,
          teamMemberCount,
        },
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/subscriptions error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: "Internal server error", details: msg },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    if (!hasDb()) {
      return Response.json({ error: "Database not available" }, { status: 503 });
    }

    const db = getDb();

    // Get the user's agency
    const agencyRows = await db.execute(
      sql`SELECT id FROM agencies WHERE user_id = ${user.id} AND deleted_at IS NULL LIMIT 1`
    );
    const agency = (agencyRows as unknown as Array<{ id: string }>)[0];

    if (!agency) {
      return Response.json(
        { error: "No agency found for this user" },
        { status: 404 }
      );
    }

    const agencyId = agency.id;

    // Check if subscription already exists
    const existingRows = await db.execute(
      sql`SELECT id FROM subscriptions WHERE agency_id = ${agencyId} AND status = 'active'`
    );
    const existing = (existingRows as unknown as Array<Record<string, unknown>>)[0];

    if (existing) {
      return Response.json(
        { error: "An active subscription already exists for this agency" },
        { status: 409 }
      );
    }

    // Get the free plan
    const planRows = await db.execute(
      sql`SELECT * FROM plans WHERE tier = 'free' AND is_active = true LIMIT 1`
    );
    const freePlan = (planRows as unknown as Array<Record<string, unknown>>)[0];

    if (!freePlan) {
      return Response.json(
        { error: "Free plan not found" },
        { status: 500 }
      );
    }

    const planId = freePlan.id as string;
    const monthlyCredits = (freePlan.monthly_lead_credits as number) ?? 10;

    // Create subscription
    const subscriptionRows = await db.execute(
      sql`INSERT INTO subscriptions (agency_id, plan_id, status, billing_cycle, current_period_start, current_period_end) VALUES (${agencyId}, ${planId}, 'active', 'monthly', NOW(), NOW() + INTERVAL '1 month') RETURNING *`
    );
    const subscription = (subscriptionRows as unknown as Array<Record<string, unknown>>)[0];

    // Grant initial monthly credits
    await db.execute(
      sql`INSERT INTO lead_credit_transactions (agency_id, amount, type, description) VALUES (${agencyId}, ${monthlyCredits}, 'grant', 'Initial monthly credit grant - Free plan')`
    );

    return Response.json({ data: subscription }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/subscriptions error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: "Internal server error", details: msg },
      { status: 500 }
    );
  }
}
