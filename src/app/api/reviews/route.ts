import { NextRequest } from "next/server";
import { z } from "zod";
import { checkRateLimit, rateLimitResponse } from "@/lib/services/rate-limit";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { createReviewSchema } from "@/lib/validations";

const reviewQuerySchema = z.object({
  agencyId: z.string().uuid(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sortBy: z.enum(["newest", "oldest", "highest", "lowest", "helpful"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const params = reviewQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );

    if (!params.success) {
      return Response.json({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });
    }

    if (!hasDb()) {
      return Response.json({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });
    }

    const db = getDb();
    const { agencyId, page, limit, sortBy } = params.data;
    const offset = (page - 1) * limit;

    let orderClause = "ORDER BY r.created_at DESC";
    if (sortBy === "oldest") orderClause = "ORDER BY r.created_at ASC";
    else if (sortBy === "highest") orderClause = "ORDER BY r.overall_rating DESC";
    else if (sortBy === "lowest") orderClause = "ORDER BY r.overall_rating ASC";
    else if (sortBy === "helpful") orderClause = "ORDER BY r.helpful_count DESC NULLS LAST";

    const results = await db.execute(
      sql`SELECT r.*, u.name as user_name, u.image as user_image
          FROM reviews r
          LEFT JOIN users u ON r.user_id = u.id
          WHERE r.agency_id = ${agencyId}
            AND r.status = 'approved'
            AND r.deleted_at IS NULL
          ${sql.raw(orderClause)}
          LIMIT ${limit} OFFSET ${offset}`
    );

    const countResult = await db.execute(
      sql`SELECT count(*) as count FROM reviews
          WHERE agency_id = ${agencyId} AND status = 'approved' AND deleted_at IS NULL`
    );
    const total = Number((countResult as unknown as Array<{ count: string }>)[0]?.count ?? 0);

    return Response.json({
      data: results,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/reviews error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimit = await checkRateLimit(request, { windowMs: 3600_000, maxRequests: 10 }, `review:${ip}`);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const body = await request.json();

    if (body.website) {
      return Response.json({ data: { id: "ok" } }, { status: 201 });
    }

    if (body.formLoadedAt && Date.now() - body.formLoadedAt < 5000) {
      return Response.json({ data: { id: "ok" } }, { status: 201 });
    }

    const urlPattern = /https?:\/\/|www\./gi;
    const combinedText = `${body.objective || ""} ${body.enjoyed || ""} ${body.improvements || ""}`;
    const urlMatches = combinedText.match(urlPattern);
    if (urlMatches && urlMatches.length > 3) {
      return Response.json({ error: "Too many links in review" }, { status: 400 });
    }

    let userId: string | null = null;
    let reviewerName: string | null = null;
    let reviewerEmail: string | null = null;

    try {
      const { requireAuth } = await import("@/lib/auth/guards");
      const authResult = await requireAuth(request);
      if (!("error" in authResult)) {
        userId = authResult.user.id;
      }
    } catch {}

    if (!userId) {
      if (!body.reviewerName || typeof body.reviewerName !== "string" || body.reviewerName.trim().length < 2 || body.reviewerName.trim().length > 100) {
        return Response.json({ error: "Full name is required (2-100 characters)" }, { status: 400 });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!body.reviewerEmail || !emailRegex.test(body.reviewerEmail)) {
        return Response.json({ error: "Valid email is required" }, { status: 400 });
      }
      reviewerName = body.reviewerName.trim();
      reviewerEmail = body.reviewerEmail.trim().toLowerCase();
    }

    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
    }

    if (!hasDb()) return Response.json({ error: "Database not available" }, { status: 503 });
    const db = getDb();
    const data = parsed.data;

    const agencyRows = await db.execute(
      sql`SELECT id FROM agencies WHERE id = ${data.agencyId} AND status = 'active' AND deleted_at IS NULL`
    );
    if (!(agencyRows as unknown as Array<Record<string, unknown>>)[0]) {
      return Response.json({ error: "Agency not found" }, { status: 404 });
    }

    if (userId) {
      const existing = await db.execute(
        sql`SELECT id FROM reviews WHERE agency_id = ${data.agencyId} AND user_id = ${userId} AND deleted_at IS NULL`
      );
      if ((existing as unknown as Array<Record<string, unknown>>)[0]) {
        return Response.json({ error: "You have already reviewed this agency" }, { status: 409 });
      }
    } else if (reviewerEmail) {
      const existing = await db.execute(
        sql`SELECT id FROM reviews WHERE agency_id = ${data.agencyId} AND reviewer_email = ${reviewerEmail} AND deleted_at IS NULL`
      );
      if ((existing as unknown as Array<Record<string, unknown>>)[0]) {
        return Response.json({ error: "A review from this email already exists for this agency" }, { status: 409 });
      }
    }

    const overallRating = (data.budgetRating + data.qualityRating + data.scheduleRating + data.collaborationRating) / 4;
    const title = data.objective.slice(0, 255);

    const rows = await db.execute(sql`
      INSERT INTO reviews (
        agency_id, user_id, reviewer_name, reviewer_email, reviewer_job_title,
        overall_rating, budget_rating, quality_rating, schedule_rating, collaboration_rating,
        title, content, objective, enjoyed, improvements,
        service_provided, would_recommend,
        company_name, company_size, reviewer_company_industry,
        status, is_verified, helpful_count
      ) VALUES (
        ${data.agencyId},
        ${userId},
        ${reviewerName ?? data.reviewerName ?? null},
        ${reviewerEmail ?? data.reviewerEmail ?? null},
        ${data.reviewerJobTitle ?? null},
        ${overallRating},
        ${data.budgetRating},
        ${data.qualityRating},
        ${data.scheduleRating},
        ${data.collaborationRating},
        ${title},
        ${data.objective},
        ${data.objective},
        ${data.enjoyed},
        ${data.improvements ?? null},
        ${data.serviceProvided ?? null},
        ${data.wouldRecommend},
        ${data.companyName ?? null},
        ${data.companySize ?? null},
        ${data.companyIndustry ?? null},
        'pending',
        false,
        0
      ) RETURNING *
    `);

    return Response.json({ data: (rows as unknown as Array<Record<string, unknown>>)[0] }, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/reviews error:", err);
    const e = err as Record<string, unknown>;
    const detail = {
      message: e?.message ?? "Unknown",
      code: e?.code ?? null,
      detail: e?.detail ?? null,
      constraint: e?.constraint ?? null,
      cause: e?.cause ? String(e.cause) : null,
    };
    return Response.json({ error: "Review submission failed", debug: detail }, { status: 500 });
  }
}
