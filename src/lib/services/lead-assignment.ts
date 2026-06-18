import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

interface ScoredAgency {
  id: string;
  name: string;
  score: number;
}

export async function findRelevantAgencies(
  serviceIds: string[] | null,
  industryId: string | null,
  maxResults: number = 10
): Promise<ScoredAgency[]> {
  if (!hasDb()) return [];
  const db = getDb();

  try {
    // Fetch all active agencies with their completeness data
    const agencyRows = await db.execute(sql`
      SELECT
        a.id,
        a.name,
        a.description,
        a.tagline,
        a.website,
        a.logo,
        a.founded_year,
        a.company_size,
        a.hourly_rate,
        a.min_project_size,
        a.phone,
        a.email,
        a.address,
        COALESCE(a.average_rating, 0) as average_rating,
        COALESCE(a.total_reviews, 0) as total_reviews,
        COALESCE(a.total_leads, 0) as total_leads,
        COALESCE(a.profile_views, 0) as profile_views
      FROM agencies a
      WHERE a.status = 'active' AND a.deleted_at IS NULL
    `);
    const agencies = agencyRows as unknown as Array<Record<string, unknown>>;

    if (agencies.length === 0) return [];

    // Fetch service matches for each agency
    const agencyServiceMap = new Map<string, Set<string>>();
    const svcRows = await db.execute(sql`
      SELECT agency_id, service_id FROM agency_services
    `);
    for (const row of svcRows as unknown as Array<{ agency_id: string; service_id: string }>) {
      if (!agencyServiceMap.has(row.agency_id)) {
        agencyServiceMap.set(row.agency_id, new Set());
      }
      agencyServiceMap.get(row.agency_id)!.add(row.service_id);
    }

    // Fetch industry matches
    const agencyIndustryMap = new Map<string, Set<string>>();
    const indRows = await db.execute(sql`
      SELECT agency_id, industry_id FROM agency_industries
    `);
    for (const row of indRows as unknown as Array<{ agency_id: string; industry_id: string }>) {
      if (!agencyIndustryMap.has(row.agency_id)) {
        agencyIndustryMap.set(row.agency_id, new Set());
      }
      agencyIndustryMap.get(row.agency_id)!.add(row.industry_id);
    }

    // Fetch portfolio counts
    const portfolioMap = new Map<string, number>();
    try {
      const portRows = await db.execute(sql`
        SELECT agency_id, COUNT(*)::int as count
        FROM agency_portfolio
        WHERE deleted_at IS NULL
        GROUP BY agency_id
      `);
      for (const row of portRows as unknown as Array<{ agency_id: string; count: number }>) {
        portfolioMap.set(row.agency_id, Number(row.count));
      }
    } catch { /* table may not exist */ }

    // Score each agency
    const scored: ScoredAgency[] = [];

    for (const agency of agencies) {
      const agencyId = agency.id as string;
      let score = 0;

      // 1. Service match (0-30 points)
      if (serviceIds && serviceIds.length > 0) {
        const agencySvcs = agencyServiceMap.get(agencyId) || new Set();
        const matchCount = serviceIds.filter((id) => agencySvcs.has(id)).length;
        score += Math.round((matchCount / serviceIds.length) * 30);
      }

      // 2. Industry match (0-15 points)
      if (industryId) {
        const agencyInds = agencyIndustryMap.get(agencyId) || new Set();
        if (agencyInds.has(industryId)) {
          score += 15;
        }
      }

      // 3. Rating score (0-20 points)
      const rating = Number(agency.average_rating) || 0;
      score += Math.round((rating / 5) * 20);

      // 4. Review count (0-10 points, capped at 20 reviews)
      const reviewCount = Math.min(Number(agency.total_reviews) || 0, 20);
      score += Math.round((reviewCount / 20) * 10);

      // 5. Profile completeness (0-15 points)
      let completeness = 0;
      if (agency.description) completeness += 2;
      if (agency.tagline) completeness += 1;
      if (agency.website) completeness += 1;
      if (agency.logo) completeness += 2;
      if (agency.founded_year) completeness += 1;
      if (agency.company_size) completeness += 1;
      if (agency.hourly_rate) completeness += 1;
      if (agency.phone) completeness += 1;
      if (agency.email) completeness += 1;
      if (agency.address) completeness += 1;
      if ((agencyServiceMap.get(agencyId)?.size ?? 0) > 0) completeness += 1;
      if ((agencyIndustryMap.get(agencyId)?.size ?? 0) > 0) completeness += 1;
      score += Math.min(completeness, 15);

      // 6. Portfolio items (0-10 points, capped at 5 items)
      const portfolioCount = Math.min(portfolioMap.get(agencyId) || 0, 5);
      score += portfolioCount * 2;

      scored.push({
        id: agencyId,
        name: agency.name as string,
        score,
      });
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Return top N with score > 0
    return scored.filter((a) => a.score > 0).slice(0, maxResults);
  } catch (err) {
    console.error("[AUTO-ASSIGN] Error scoring agencies:", err);
    return [];
  }
}

export async function autoAssignLead(
  leadId: string,
  serviceIds: string[] | null,
  industryId: string | null,
): Promise<number> {
  if (!hasDb()) return 0;
  const db = getDb();

  const relevantAgencies = await findRelevantAgencies(serviceIds, industryId, 10);
  if (relevantAgencies.length === 0) return 0;

  let assigned = 0;
  for (const agency of relevantAgencies) {
    try {
      // Check for existing assignment
      const existing = await db.execute(sql`
        SELECT id FROM lead_assignments WHERE lead_id = ${leadId} AND agency_id = ${agency.id}
      `);
      if ((existing as unknown as unknown[]).length > 0) continue;

      // Insert assignment (no credit deduction — credits are used when agency claims)
      await db.execute(sql`
        INSERT INTO lead_assignments (lead_id, agency_id, status)
        VALUES (${leadId}, ${agency.id}, 'sent')
        ON CONFLICT DO NOTHING
      `);

      // Increment total_leads counter
      await db.execute(sql`
        UPDATE agencies SET total_leads = COALESCE(total_leads, 0) + 1 WHERE id = ${agency.id}
      `);

      assigned++;
    } catch { /* skip */ }
  }

  return assigned;
}
