import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAgencyAccess } from "@/lib/auth/guards";
import { z } from "zod";
import { success, created, error, serverError } from "@/lib/api/response";
import { checkPortfolioLimit } from "@/lib/subscriptions/gates";

const portfolioSchema = z.object({
  title: z.string().min(2).max(255),
  description: z.string().max(5000).optional(),
  imageUrl: z.string().optional(),
  projectUrl: z.string().max(500).optional(),
  clientName: z.string().max(255).optional(),
  clientLogo: z.string().optional(),
  projectSchedule: z.string().max(255).optional(),
  projectSize: z.string().max(100).optional(),
  challenge: z.string().max(5000).optional(),
  approach: z.string().max(5000).optional(),
  results: z.string().max(5000).optional(),
  servicesProvided: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).optional(),
}).passthrough();

async function ensurePortfolioTable() {
  const db = getDb();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agency_portfolio (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      image_url TEXT,
      project_url TEXT,
      client_name VARCHAR(255),
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`ALTER TABLE agency_portfolio ADD COLUMN IF NOT EXISTS client_logo TEXT`);
  await db.execute(sql`ALTER TABLE agency_portfolio ADD COLUMN IF NOT EXISTS project_schedule VARCHAR(255)`);
  await db.execute(sql`ALTER TABLE agency_portfolio ADD COLUMN IF NOT EXISTS project_size VARCHAR(100)`);
  await db.execute(sql`ALTER TABLE agency_portfolio ADD COLUMN IF NOT EXISTS challenge TEXT`);
  await db.execute(sql`ALTER TABLE agency_portfolio ADD COLUMN IF NOT EXISTS approach TEXT`);
  await db.execute(sql`ALTER TABLE agency_portfolio ADD COLUMN IF NOT EXISTS results TEXT`);
  await db.execute(sql`ALTER TABLE agency_portfolio ADD COLUMN IF NOT EXISTS services_provided TEXT`);
  await db.execute(sql`ALTER TABLE agency_portfolio ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);
}

function logErr(label: string, err: unknown) {
  if (process.env.NODE_ENV !== "production") {
    const e = err as Record<string, unknown>;
    console.error(`[PORTFOLIO] ${label}:`, {
      message: e?.message ?? "Unknown",
      code: e?.code ?? null,
      detail: e?.detail ?? null,
    });
  }
}

async function revalidateAgency(agencyId: string) {
  try {
    const db = getDb();
    const slugRows = await db.execute(sql`SELECT slug FROM agencies WHERE id = ${agencyId} LIMIT 1`);
    const slug = (slugRows as unknown as Array<{ slug: string }>)[0]?.slug;
    if (slug) {
      revalidatePath(`/agencies/${slug}`);
    }
    revalidatePath("/agencies");
  } catch { /* ignore */ }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    await ensurePortfolioTable();

    const rows = await db.execute(sql`
      SELECT * FROM agency_portfolio WHERE agency_id = ${id} AND deleted_at IS NULL ORDER BY sort_order ASC, created_at DESC
    `);

    return success(rows as unknown as Record<string, unknown>[]);
  } catch (err) {
    logErr("GET", err);
    return serverError(err);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await requireAgencyAccess(request, id);
    if ("error" in authResult) return authResult.error;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    await ensurePortfolioTable();

    const portfolioCheck = await checkPortfolioLimit(id);
    if (!portfolioCheck.allowed) {
      return error("Portfolio item limit reached for your plan", 403, { limit: portfolioCheck.limit });
    }

    const body = await request.json();
    const parsed = portfolioSchema.safeParse(body);
    if (!parsed.success) return error("Validation failed", 400, parsed.error.format());

    const data = parsed.data;
    const rows = await db.execute(sql`
      INSERT INTO agency_portfolio (
        agency_id, title, description, image_url, project_url, client_name, client_logo,
        project_schedule, project_size, challenge, approach, results, services_provided, sort_order
      ) VALUES (
        ${id}, ${data.title}, ${data.description ?? null}, ${data.imageUrl ?? null},
        ${data.projectUrl ?? null}, ${data.clientName ?? null}, ${data.clientLogo ?? null},
        ${data.projectSchedule ?? null}, ${data.projectSize ?? null},
        ${data.challenge ?? null}, ${data.approach ?? null}, ${data.results ?? null},
        ${data.servicesProvided ?? null}, ${data.sortOrder ?? 0}
      ) RETURNING *
    `);

    await revalidateAgency(id);
    return created((rows as unknown as Array<Record<string, unknown>>)[0]);
  } catch (err) {
    logErr("POST", err);
    return serverError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await requireAgencyAccess(request, id);
    if ("error" in authResult) return authResult.error;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    await ensurePortfolioTable();

    const body = await request.json();
    const itemId = body.itemId;
    if (!itemId) return error("itemId required", 400);

    const parsed = portfolioSchema.partial().safeParse(body);
    if (!parsed.success) return error("Validation failed", 400, parsed.error.format());

    const data = parsed.data;
    await db.execute(sql`
      UPDATE agency_portfolio SET
        title = COALESCE(${data.title ?? null}, title),
        description = COALESCE(${data.description ?? null}, description),
        image_url = COALESCE(${data.imageUrl ?? null}, image_url),
        project_url = COALESCE(${data.projectUrl ?? null}, project_url),
        client_name = COALESCE(${data.clientName ?? null}, client_name),
        client_logo = COALESCE(${data.clientLogo ?? null}, client_logo),
        project_schedule = COALESCE(${data.projectSchedule ?? null}, project_schedule),
        project_size = COALESCE(${data.projectSize ?? null}, project_size),
        challenge = COALESCE(${data.challenge ?? null}, challenge),
        approach = COALESCE(${data.approach ?? null}, approach),
        results = COALESCE(${data.results ?? null}, results),
        services_provided = COALESCE(${data.servicesProvided ?? null}, services_provided),
        sort_order = COALESCE(${data.sortOrder ?? null}, sort_order)
      WHERE id = ${itemId} AND agency_id = ${id}
    `);

    const updated = await db.execute(sql`SELECT * FROM agency_portfolio WHERE id = ${itemId}`);
    await revalidateAgency(id);
    return success((updated as unknown as Array<Record<string, unknown>>)[0]);
  } catch (err) {
    logErr("PATCH", err);
    return serverError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authResult = await requireAgencyAccess(request, id);
    if ("error" in authResult) return authResult.error;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    await ensurePortfolioTable();

    const { searchParams } = request.nextUrl;
    const itemId = searchParams.get("itemId");
    if (!itemId) return error("itemId query parameter required", 400);

    await db.execute(sql`UPDATE agency_portfolio SET deleted_at = NOW() WHERE id = ${itemId} AND agency_id = ${id}`);
    await revalidateAgency(id);
    return success({ message: "Portfolio item deleted" });
  } catch (err) {
    logErr("DELETE", err);
    return serverError(err);
  }
}
