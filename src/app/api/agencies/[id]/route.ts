import { NextRequest } from "next/server";
import { requireAuth, requireAgencyAccess } from "@/lib/auth/guards";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { success, error, serverError } from "@/lib/api/response";

const updateAgencySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  tagline: z.string().max(500).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  website: z.string().url().max(500).optional().nullable().or(z.literal("")),
  email: z.string().email().max(255).optional().nullable().or(z.literal("")),
  phone: z.string().max(50).optional().nullable(),
  logo: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  foundedYear: z.number().int().min(1900).max(2030).optional().nullable(),
  companySize: z.string().max(50).optional().nullable(),
  hourlyRate: z.string().max(50).optional().nullable(),
  minProjectSize: z.number().min(0).optional().nullable(),
  countryId: z.string().uuid().optional().nullable(),
  cityId: z.string().uuid().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  linkedinUrl: z.string().max(500).optional().nullable(),
  twitterUrl: z.string().max(500).optional().nullable(),
  facebookUrl: z.string().max(500).optional().nullable(),
  instagramUrl: z.string().max(500).optional().nullable(),
  metaTitle: z.string().max(70).optional().nullable(),
  metaDescription: z.string().max(160).optional().nullable(),
  serviceIds: z.array(z.string().uuid()).optional(),
  industryIds: z.array(z.string().uuid()).optional(),
  status: z.enum(["draft", "pending"]).optional(),
}).passthrough();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!hasDb()) return error("Database not available", 503);

    const db = getDb();
    const rows = await db.execute(
      sql`SELECT * FROM agencies WHERE id = ${id} AND deleted_at IS NULL`
    );
    const agency = (rows as unknown as Array<Record<string, unknown>>)[0];

    if (!agency) return error("Agency not found", 404);

    return success(agency);
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("GET /api/agencies/[id] error:", err);
    }
    return serverError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await requireAgencyAccess(request, id);
    if ("error" in authResult) return authResult.error;

    if (!hasDb()) return error("Database not available", 503);

    const db = getDb();

    const existingRows = await db.execute(
      sql`SELECT * FROM agencies WHERE id = ${id} AND deleted_at IS NULL`
    );
    const existing = (existingRows as unknown as Array<Record<string, unknown>>)[0];

    if (!existing) return error("Agency not found", 404);

    const body = await request.json();

    const parsed = updateAgencySchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.format());
    }
    const data = parsed.data;

    const socialLinks: Record<string, string> = {};
    if (data.linkedinUrl) socialLinks.linkedin = data.linkedinUrl;
    if (data.twitterUrl) socialLinks.twitter = data.twitterUrl;
    if (data.facebookUrl) socialLinks.facebook = data.facebookUrl;
    if (data.instagramUrl) socialLinks.instagram = data.instagramUrl;

    const { serviceIds, industryIds, status, ...updateFields } = data;

    const hasSocial = Object.keys(socialLinks).length > 0;

    await db.execute(sql`
      UPDATE agencies SET
        name = COALESCE(${updateFields.name ?? null}, name),
        tagline = COALESCE(${updateFields.tagline ?? null}, tagline),
        description = COALESCE(${updateFields.description ?? null}, description),
        website = COALESCE(${updateFields.website === "" ? null : (updateFields.website ?? null)}, website),
        email = COALESCE(${updateFields.email === "" ? null : (updateFields.email ?? null)}, email),
        phone = COALESCE(${updateFields.phone ?? null}, phone),
        logo = COALESCE(${updateFields.logo ?? null}, logo),
        cover_image = COALESCE(${updateFields.coverImage ?? null}, cover_image),
        founded_year = COALESCE(${updateFields.foundedYear ?? null}, founded_year),
        company_size = COALESCE(${updateFields.companySize ?? null}, company_size),
        hourly_rate = COALESCE(${updateFields.hourlyRate ?? null}, hourly_rate),
        min_project_size = COALESCE(${updateFields.minProjectSize ?? null}, min_project_size),
        country_id = COALESCE(${updateFields.countryId ?? null}, country_id),
        city_id = COALESCE(${updateFields.cityId ?? null}, city_id),
        address = COALESCE(${updateFields.address ?? null}, address),
        latitude = COALESCE(${updateFields.latitude ?? null}, latitude),
        longitude = COALESCE(${updateFields.longitude ?? null}, longitude),
        social_links = COALESCE(${hasSocial ? JSON.stringify(socialLinks) : null}, social_links),
        meta_title = COALESCE(${updateFields.metaTitle ?? null}, meta_title),
        meta_description = COALESCE(${updateFields.metaDescription ?? null}, meta_description),
        status = COALESCE(${status ?? null}, status),
        updated_at = NOW()
      WHERE id = ${id}
    `);

    // Update agency services if provided
    if (serviceIds) {
      try {
        await db.execute(
          sql`DELETE FROM agency_services WHERE agency_id = ${id}`
        );
        for (const serviceId of serviceIds) {
          try {
            await db.execute(
              sql`INSERT INTO agency_services (agency_id, service_id) VALUES (${id}, ${serviceId}) ON CONFLICT DO NOTHING`
            );
          } catch { /* skip invalid service */ }
        }
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to update agency_services:", e);
        }
      }
    }

    // Update agency industries if provided
    if (industryIds) {
      try {
        await db.execute(
          sql`DELETE FROM agency_industries WHERE agency_id = ${id}`
        );
        for (const industryId of industryIds) {
          try {
            await db.execute(
              sql`INSERT INTO agency_industries (agency_id, industry_id) VALUES (${id}, ${industryId}) ON CONFLICT DO NOTHING`
            );
          } catch { /* skip invalid industry */ }
        }
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to update agency_industries:", e);
        }
      }
    }

    const updatedRows = await db.execute(
      sql`SELECT * FROM agencies WHERE id = ${id}`
    );
    const updated = (updatedRows as unknown as Array<Record<string, unknown>>)[0];

    // Bust ISR cache for public profile
    const slug = updated?.slug as string | undefined;
    if (slug) {
      revalidatePath(`/agencies/${slug}`);
    }
    revalidatePath("/agencies");

    return success(updated);
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("PATCH /api/agencies/[id] error:", err);
    }
    return serverError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await requireAgencyAccess(request, id);
    if ("error" in authResult) return authResult.error;

    if (!hasDb()) return error("Database not available", 503);

    const db = getDb();

    const existingRows = await db.execute(
      sql`SELECT id FROM agencies WHERE id = ${id}`
    );
    const existing = (existingRows as unknown as Array<Record<string, unknown>>)[0];

    if (!existing) return error("Agency not found", 404);

    // Get slug before deleting for cache invalidation
    const slugRows = await db.execute(sql`SELECT slug FROM agencies WHERE id = ${id} LIMIT 1`);
    const slug = (slugRows as unknown as Array<{ slug: string }>)[0]?.slug;

    // Hard delete: remove related data then the agency
    await db.execute(sql`DELETE FROM agency_portfolio WHERE agency_id = ${id}`);
    await db.execute(sql`DELETE FROM agency_services WHERE agency_id = ${id}`);
    await db.execute(sql`DELETE FROM agency_industries WHERE agency_id = ${id}`);
    await db.execute(sql`DELETE FROM reviews WHERE agency_id = ${id}`);
    await db.execute(sql`DELETE FROM agencies WHERE id = ${id}`);

    if (slug) revalidatePath(`/agencies/${slug}`);
    revalidatePath("/agencies");

    return success({ message: "Agency permanently deleted" });
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("DELETE /api/agencies/[id] error:", err);
    }
    return serverError(err);
  }
}
