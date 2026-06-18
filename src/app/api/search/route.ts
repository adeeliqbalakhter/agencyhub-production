import { NextRequest } from "next/server";
import { searchParamsSchema } from "@/lib/validations";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { checkRateLimit, rateLimitResponse } from "@/lib/services/rate-limit";
import { authenticateRequest } from "@/lib/auth/guards";

// ─── GET /api/search ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // Rate limit: 60 requests per minute per IP
    const rateLimit = checkRateLimit(request, { windowMs: 60_000, maxRequests: 60 }, "search");
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    if (!hasDb()) {
      return Response.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    const db = getDb();
    const { searchParams } = request.nextUrl;

    const params = searchParamsSchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );

    if (!params.success) {
      return Response.json(
        { error: "Invalid query parameters", details: params.error.format() },
        { status: 400 }
      );
    }

    const {
      query,
      services,
      industries,
      country,
      city,
      minRating,
      companySize,
      minBudget,
      maxBudget,
      sortBy,
      page,
      limit,
    } = params.data;

    // Build WHERE conditions
    const conditions: ReturnType<typeof sql>[] = [
      sql`a.status = 'active'`,
      sql`a.deleted_at IS NULL`,
    ];

    if (query) {
      conditions.push(
        sql`(a.name ILIKE ${"%" + query + "%"} OR a.tagline ILIKE ${"%" + query + "%"} OR a.description ILIKE ${"%" + query + "%"})`
      );
    }

    if (services && services.length > 0) {
      // Agency must have at least one of the requested services (by slug)
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM agency_services asvc
          JOIN services s ON s.id = asvc.service_id
          WHERE asvc.agency_id = a.id AND s.slug = ANY(${services})
        )`
      );
    }

    if (industries && industries.length > 0) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM agency_industries ai
          JOIN industries i ON i.id = ai.industry_id
          WHERE ai.agency_id = a.id AND i.slug = ANY(${industries})
        )`
      );
    }

    if (country) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM countries co WHERE co.id = a.country_id AND co.slug = ${country}
        )`
      );
    }

    if (city) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM cities ci WHERE ci.id = a.city_id AND ci.slug = ${city}
        )`
      );
    }

    if (minRating) {
      conditions.push(sql`a.average_rating >= ${minRating}`);
    }

    if (companySize) {
      conditions.push(sql`a.company_size = ${companySize}`);
    }

    if (minBudget) {
      conditions.push(sql`a.min_project_size >= ${minBudget}`);
    }

    if (maxBudget) {
      conditions.push(sql`a.min_project_size <= ${maxBudget}`);
    }

    // Combine conditions
    const whereClause = sql.join(conditions, sql` AND `);

    // Sort
    let orderClause;
    if (sortBy === "rating") {
      orderClause = sql`a.average_rating DESC NULLS LAST`;
    } else if (sortBy === "reviews") {
      orderClause = sql`a.total_reviews DESC NULLS LAST`;
    } else if (sortBy === "name") {
      orderClause = sql`a.name ASC`;
    } else if (sortBy === "newest") {
      orderClause = sql`a.created_at DESC`;
    } else if (query) {
      // When searching, sort by relevance (name match first)
      orderClause = sql`
        CASE WHEN a.name ILIKE ${"%" + query + "%"} THEN 0 ELSE 1 END,
        a.average_rating DESC NULLS LAST
      `;
    } else {
      orderClause = sql`a.average_rating DESC NULLS LAST`;
    }

    const offset = (page - 1) * limit;

    // Count total
    const countResult = await db.execute(
      sql`SELECT COUNT(*)::int AS total FROM agencies a WHERE ${whereClause}`
    );
    const total = (countResult as any[])[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    // Fetch agencies
    const agencyRows = await db.execute(
      sql`SELECT
            a.id, a.name, a.slug, a.tagline, a.description, a.logo, a.website,
            a.company_size, a.hourly_rate, a.min_project_size,
            a.is_verified, a.is_featured, a.average_rating, a.total_reviews,
            co.name AS country_name, co.slug AS country_slug,
            ci.name AS city_name, ci.slug AS city_slug
          FROM agencies a
          LEFT JOIN countries co ON a.country_id = co.id
          LEFT JOIN cities ci ON a.city_id = ci.id
          WHERE ${whereClause}
          ORDER BY ${orderClause}
          LIMIT ${limit} OFFSET ${offset}`
    );

    // Fetch services for each agency
    const data = [];
    const agencyIds = (agencyRows as any[]).map((r: any) => r.id);

    // Batch fetch services for all agencies in the result set
    let serviceMap: Record<string, { id: string; name: string; slug: string }[]> = {};
    if (agencyIds.length > 0) {
      const svcRows = await db.execute(
        sql`SELECT asvc.agency_id, s.id, s.name, s.slug
            FROM agency_services asvc
            JOIN services s ON s.id = asvc.service_id
            WHERE asvc.agency_id = ANY(${agencyIds})`
      );
      for (const row of svcRows as any[]) {
        if (!serviceMap[row.agency_id]) serviceMap[row.agency_id] = [];
        serviceMap[row.agency_id].push({
          id: row.id,
          name: row.name,
          slug: row.slug,
        });
      }
    }

    // Batch fetch industries for all agencies
    let industryMap: Record<string, { id: string; name: string; slug: string }[]> = {};
    if (agencyIds.length > 0) {
      const indRows = await db.execute(
        sql`SELECT ai.agency_id, i.id, i.name, i.slug
            FROM agency_industries ai
            JOIN industries i ON i.id = ai.industry_id
            WHERE ai.agency_id = ANY(${agencyIds})`
      );
      for (const row of indRows as any[]) {
        if (!industryMap[row.agency_id]) industryMap[row.agency_id] = [];
        industryMap[row.agency_id].push({
          id: row.id,
          name: row.name,
          slug: row.slug,
        });
      }
    }

    for (const row of agencyRows as any[]) {
      data.push({
        id: row.id,
        name: row.name,
        slug: row.slug,
        tagline: row.tagline,
        description: row.description,
        logo: row.logo,
        website: row.website,
        companySize: row.company_size,
        hourlyRate: row.hourly_rate,
        minProjectSize: row.min_project_size ? Number(row.min_project_size) : null,
        isVerified: row.is_verified ?? false,
        isFeatured: row.is_featured ?? false,
        averageRating: row.average_rating ? Number(row.average_rating) : 0,
        totalReviews: row.total_reviews ?? 0,
        country: row.country_name
          ? { name: row.country_name, slug: row.country_slug }
          : null,
        city: row.city_name
          ? { name: row.city_name, slug: row.city_slug }
          : null,
        services: serviceMap[row.id] ?? [],
        industries: industryMap[row.id] ?? [],
      });
    }

    // Compute real facets from active agencies only
    const baseFacetWhere = sql`a.status = 'active' AND a.deleted_at IS NULL`;

    const [serviceFacets, industryFacets, countryFacets] = await Promise.all([
      db.execute(
        sql`SELECT s.slug, s.name, COUNT(*)::int AS count
            FROM agency_services asvc
            JOIN services s ON s.id = asvc.service_id
            JOIN agencies a ON a.id = asvc.agency_id
            WHERE ${baseFacetWhere}
            GROUP BY s.slug, s.name
            ORDER BY count DESC`
      ),
      db.execute(
        sql`SELECT i.slug, i.name, COUNT(*)::int AS count
            FROM agency_industries ai
            JOIN industries i ON i.id = ai.industry_id
            JOIN agencies a ON a.id = ai.agency_id
            WHERE ${baseFacetWhere}
            GROUP BY i.slug, i.name
            ORDER BY count DESC`
      ),
      db.execute(
        sql`SELECT co.slug, co.name, COUNT(*)::int AS count
            FROM agencies a
            JOIN countries co ON a.country_id = co.id
            WHERE ${baseFacetWhere}
            GROUP BY co.slug, co.name
            ORDER BY count DESC`
      ),
    ]);

    const facets = {
      services: (serviceFacets as any[]).map((r: any) => ({
        slug: r.slug,
        name: r.name,
        count: r.count,
      })),
      industries: (industryFacets as any[]).map((r: any) => ({
        slug: r.slug,
        name: r.name,
        count: r.count,
      })),
      countries: (countryFacets as any[]).map((r: any) => ({
        slug: r.slug,
        name: r.name,
        count: r.count,
      })),
    };

    // Fire-and-forget: log search query without blocking the response
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? request.headers.get("x-real-ip")
      ?? null;
    let userId: string | null = null;
    try {
      const { user } = await authenticateRequest(request);
      userId = user?.id ?? null;
    } catch {
      // auth extraction failed — proceed without user
    }
    const filters = {
      services: services ?? null,
      industries: industries ?? null,
      country: country ?? null,
      city: city ?? null,
      minRating: minRating ?? null,
      companySize: companySize ?? null,
      minBudget: minBudget ?? null,
      maxBudget: maxBudget ?? null,
      sortBy: sortBy ?? null,
    };
    db.execute(sql`
      INSERT INTO search_logs (query, filters, results_count, user_id, ip_address)
      VALUES (${query ?? null}, ${JSON.stringify(filters)}::jsonb, ${total}, ${userId}, ${ip})
    `).catch(() => {});

    return Response.json({
      data,
      pagination: { page, limit, total, totalPages },
      facets,
    });
  } catch (error) {
    console.error("GET /api/search error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
