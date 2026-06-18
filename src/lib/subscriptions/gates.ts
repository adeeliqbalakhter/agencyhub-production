import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

export interface PlanLimits {
  tier: string;
  monthlyLeadCredits: number;
  maxPortfolioItems: number;
  maxTeamMembers: number;
  features: Record<string, boolean>;
}

const FREE_DEFAULTS: PlanLimits = {
  tier: "free",
  monthlyLeadCredits: 1,
  maxPortfolioItems: 5,
  maxTeamMembers: 1,
  features: { basicProfile: true, reviews: true, basicAnalytics: true },
};

export async function getAgencyPlanLimits(agencyId: string): Promise<PlanLimits> {
  try {
    if (!hasDb()) return FREE_DEFAULTS;
    const db = getDb();
    const rows = await db.execute(sql`
      SELECT p.tier, p.monthly_lead_credits, p.max_portfolio_items, p.max_team_members, p.features
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.agency_id = ${agencyId} AND s.status = 'active'
    `);
    const row = (rows as unknown as Array<Record<string, unknown>>)[0];
    if (!row) return FREE_DEFAULTS;
    return {
      tier: row.tier as string,
      monthlyLeadCredits: Number(row.monthly_lead_credits),
      maxPortfolioItems: Number(row.max_portfolio_items),
      maxTeamMembers: Number(row.max_team_members),
      features: (typeof row.features === 'string' ? JSON.parse(row.features) : row.features) as Record<string, boolean>,
    };
  } catch {
    return FREE_DEFAULTS;
  }
}

export async function checkPortfolioLimit(agencyId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limits = await getAgencyPlanLimits(agencyId);
  if (limits.maxPortfolioItems === -1) return { allowed: true, current: 0, limit: -1 };
  try {
    if (!hasDb()) return { allowed: true, current: 0, limit: limits.maxPortfolioItems };
    const db = getDb();
    const rows = await db.execute(sql`
      SELECT count(*) as count FROM agency_portfolio WHERE agency_id = ${agencyId} AND deleted_at IS NULL
    `);
    const current = Number((rows as unknown as Array<{ count: string }>)[0]?.count ?? 0);
    return { allowed: current < limits.maxPortfolioItems, current, limit: limits.maxPortfolioItems };
  } catch {
    return { allowed: true, current: 0, limit: limits.maxPortfolioItems };
  }
}

export async function checkTeamLimit(agencyId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limits = await getAgencyPlanLimits(agencyId);
  if (limits.maxTeamMembers === -1) return { allowed: true, current: 0, limit: -1 };
  try {
    if (!hasDb()) return { allowed: true, current: 0, limit: limits.maxTeamMembers };
    const db = getDb();
    const rows = await db.execute(sql`
      SELECT count(*) as count FROM agency_team_members WHERE agency_id = ${agencyId} AND status = 'active'
    `);
    const current = Number((rows as unknown as Array<{ count: string }>)[0]?.count ?? 0);
    return { allowed: current < limits.maxTeamMembers, current, limit: limits.maxTeamMembers };
  } catch {
    return { allowed: true, current: 0, limit: limits.maxTeamMembers };
  }
}

export async function hasFeature(agencyId: string, feature: string): Promise<boolean> {
  const limits = await getAgencyPlanLimits(agencyId);
  return limits.features[feature] === true;
}
