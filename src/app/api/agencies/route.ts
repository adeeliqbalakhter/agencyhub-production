import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { createAgencySchema, searchParamsSchema } from "@/lib/validations";
import slugify from "slugify";
import { paginated, success, error, serverError, created } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    if (!hasDb()) {
      return paginated([], { page: 1, limit: 20, total: 0 });
    }

    const db = getDb();
    const { searchParams } = request.nextUrl;

    const params = searchParamsSchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );

    if (!params.success) {
      return error("Invalid query parameters", 400, params.error.format());
    }

    const { page, limit, query, sortBy } = params.data;
    const offset = (page - 1) * limit;

    // Whitelist-safe ORDER BY — prevents SQL injection via sortBy
    const ALLOWED_SORT_COLUMNS: Record<string, string> = {
      rating: "average_rating DESC NULLS LAST",
      reviews: "total_reviews DESC NULLS LAST",
      name: "name ASC",
      newest: "created_at DESC",
    };
    const sortColumn = ALLOWED_SORT_COLUMNS[sortBy ?? ""] ?? "created_at DESC";

    let results;
    let total;

    if (query) {
      results = await db.execute(
        sql`SELECT * FROM agencies WHERE deleted_at IS NULL AND status = 'active' AND name ILIKE ${`%${query}%`} ORDER BY ${sql.raw(sortColumn)} LIMIT ${limit} OFFSET ${offset}`
      );
      const countResult = await db.execute(
        sql`SELECT count(*) as count FROM agencies WHERE deleted_at IS NULL AND status = 'active' AND name ILIKE ${`%${query}%`}`
      );
      total = Number((countResult as unknown as Array<{ count: string }>)[0]?.count ?? 0);
    } else {
      results = await db.execute(
        sql`SELECT * FROM agencies WHERE deleted_at IS NULL AND status = 'active' ORDER BY ${sql.raw(sortColumn)} LIMIT ${limit} OFFSET ${offset}`
      );
      const countResult = await db.execute(
        sql`SELECT count(*) as count FROM agencies WHERE deleted_at IS NULL AND status = 'active'`
      );
      total = Number((countResult as unknown as Array<{ count: string }>)[0]?.count ?? 0);
    }

    return paginated(results, { page, limit, total });
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("GET /api/agencies error:", err);
    }
    return serverError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    if (!hasDb()) return error("Database not available", 503);

    const db = getDb();
    const body = await request.json();
    const parsed = createAgencySchema.safeParse(body);

    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.format());
    }

    const data = parsed.data;

    const baseSlug = slugify(data.name, { lower: true, strict: true });
    const slug = `${baseSlug}-${Date.now()}`;

    const { serviceIds, industryIds, logo, coverImage, ...rest } = data;

    const socialLinks: Record<string, string> = {};
    if (rest.linkedinUrl) socialLinks.linkedin = rest.linkedinUrl;
    if (rest.twitterUrl) socialLinks.twitter = rest.twitterUrl;
    if (rest.facebookUrl) socialLinks.facebook = rest.facebookUrl;
    if (rest.instagramUrl) socialLinks.instagram = rest.instagramUrl;

    const rows = await db.execute(sql`
      INSERT INTO agencies (
        user_id, name, slug, tagline, description,
        website, email, phone, founded_year, company_size,
        hourly_rate, min_project_size, country_id, city_id, address,
        latitude, longitude, status, social_links,
        meta_title, meta_description
      ) VALUES (
        ${user.id}, ${rest.name}, ${slug},
        ${rest.tagline ?? null}, ${rest.description ?? null},
        ${rest.website ?? null}, ${rest.email ?? null}, ${rest.phone ?? null},
        ${rest.foundedYear ?? null}, ${rest.companySize ?? null},
        ${rest.hourlyRate ?? null}, ${rest.minProjectSize ?? null},
        ${rest.countryId ?? null}, ${rest.cityId ?? null}, ${rest.address ?? null},
        ${rest.latitude ?? null}, ${rest.longitude ?? null},
        'draft',
        ${Object.keys(socialLinks).length > 0 ? JSON.stringify(socialLinks) : null},
        ${rest.metaTitle ?? null}, ${rest.metaDescription ?? null}
      ) RETURNING *
    `);

    const agency = (rows as unknown as Array<Record<string, unknown>>)[0];

    if (!agency) {
      return error("Failed to create agency", 500);
    }

    const agencyId = agency.id as string;

    if (logo) {
      await db.execute(sql`UPDATE agencies SET logo = ${logo} WHERE id = ${agencyId}`);
    }
    if (coverImage) {
      await db.execute(sql`UPDATE agencies SET cover_image = ${coverImage} WHERE id = ${agencyId}`);
    }

    if (serviceIds?.length) {
      for (const serviceId of serviceIds) {
        try {
          await db.execute(
            sql`INSERT INTO agency_services (agency_id, service_id) VALUES (${agencyId}, ${serviceId}) ON CONFLICT DO NOTHING`
          );
        } catch { /* skip invalid */ }
      }
    }

    if (industryIds?.length) {
      for (const industryId of industryIds) {
        try {
          await db.execute(
            sql`INSERT INTO agency_industries (agency_id, industry_id) VALUES (${agencyId}, ${industryId}) ON CONFLICT DO NOTHING`
          );
        } catch { /* skip invalid */ }
      }
    }

    const finalRows = await db.execute(sql`SELECT * FROM agencies WHERE id = ${agencyId}`);
    const finalAgency = (finalRows as unknown as Array<Record<string, unknown>>)[0] ?? agency;

    return created(finalAgency);
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("POST /api/agencies error:", err);
    }
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return error("An agency with this name already exists. Please use a different name.", 409);
    }
    return serverError(err);
  }
}
