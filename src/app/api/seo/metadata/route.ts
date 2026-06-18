import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/guards";
import { z } from "zod";
import { success, created, error, serverError } from "@/lib/api/response";

const metadataSchema = z.object({
  pagePath: z.string().min(1).max(500),
  title: z.string().max(70).optional(),
  description: z.string().max(160).optional(),
  ogImage: z.string().optional(),
  canonicalUrl: z.string().max(500).optional(),
  robots: z.string().max(100).optional(),
  structuredData: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const { searchParams } = request.nextUrl;
    const pagePath = searchParams.get("path");

    if (pagePath) {
      const rows = await db.execute(sql`SELECT * FROM seo_metadata WHERE page_path = ${pagePath}`);
      const meta = (rows as unknown as Array<Record<string, unknown>>)[0];
      return success(meta || null);
    }

    const rows = await db.execute(sql`SELECT * FROM seo_metadata ORDER BY page_path ASC`);
    return success(rows);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireRole(request, "super_admin", "admin");
    if ("error" in authResult) return authResult.error;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const body = await request.json();
    const parsed = metadataSchema.safeParse(body);
    if (!parsed.success) return error("Validation failed", 400, parsed.error.format());

    const data = parsed.data;
    const rows = await db.execute(sql`
      INSERT INTO seo_metadata (page_path, title, description, og_image, canonical_url, robots, structured_data, updated_at)
      VALUES (${data.pagePath}, ${data.title ?? null}, ${data.description ?? null},
              ${data.ogImage ?? null}, ${data.canonicalUrl ?? null}, ${data.robots ?? null},
              ${data.structuredData ? JSON.stringify(data.structuredData) : null}, NOW())
      ON CONFLICT (page_path) DO UPDATE SET
        title = COALESCE(EXCLUDED.title, seo_metadata.title),
        description = COALESCE(EXCLUDED.description, seo_metadata.description),
        og_image = COALESCE(EXCLUDED.og_image, seo_metadata.og_image),
        canonical_url = COALESCE(EXCLUDED.canonical_url, seo_metadata.canonical_url),
        robots = COALESCE(EXCLUDED.robots, seo_metadata.robots),
        structured_data = COALESCE(EXCLUDED.structured_data, seo_metadata.structured_data),
        updated_at = NOW()
      RETURNING *
    `);

    return created((rows as unknown as Array<Record<string, unknown>>)[0]);
  } catch (err) {
    return serverError(err);
  }
}
