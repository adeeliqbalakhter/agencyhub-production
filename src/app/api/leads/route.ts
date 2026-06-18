import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth, authenticateRequest } from "@/lib/auth/guards";
import { checkRateLimit, rateLimitResponse } from "@/lib/services/rate-limit";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { createLeadSchema } from "@/lib/validations";
import { isAdmin } from "@/lib/auth/rbac";
import { autoAssignLead } from "@/lib/services/lead-assignment";

const leadQuerySchema = z.object({
  agencyId: z.string().uuid().optional(),
  status: z
    .enum(["new", "sent", "viewed", "responded", "won", "lost", "expired"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    if (!hasDb()) {
      return Response.json({
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });
    }

    const { searchParams } = request.nextUrl;

    const params = leadQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );

    if (!params.success) {
      return Response.json(
        { error: "Invalid query parameters", details: params.error.format() },
        { status: 400 }
      );
    }

    const { agencyId, status, page, limit } = params.data;
    const offset = (page - 1) * limit;
    const db = getDb();

    // Super admin / admin: return ALL leads
    if (isAdmin(user.role) && !agencyId) {
      const leadsQuery = status
        ? sql`SELECT l.* FROM leads l WHERE l.status = ${status}
              ORDER BY l.created_at DESC LIMIT ${limit} OFFSET ${offset}`
        : sql`SELECT l.* FROM leads l
              ORDER BY l.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      const countQuery = status
        ? sql`SELECT count(*) as count FROM leads WHERE status = ${status}`
        : sql`SELECT count(*) as count FROM leads`;

      const results = await db.execute(leadsQuery);
      const countResult = await db.execute(countQuery);
      const total = Number((countResult as unknown as Array<{ count: string }>)[0]?.count ?? 0);

      return Response.json({
        data: results,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    if (agencyId) {
      const agencyRows = await db.execute(
        sql`SELECT id FROM agencies WHERE id = ${agencyId} AND user_id = ${user.id} AND deleted_at IS NULL`
      );
      const agency = (agencyRows as unknown as Array<Record<string, unknown>>)[0];
      if (!agency) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }

      try {
        // Aggregate assignments ordered by status progression (most-progressed
        // first) so the client always reads the true claim state even if a
        // duplicate assignment row exists.
        const leadsQuery = status
          ? sql`SELECT l.*, json_agg(json_build_object(
                  'id', la.id, 'agencyId', la.agency_id, 'status', la.status
                ) ORDER BY (CASE la.status
                    WHEN 'won' THEN 5 WHEN 'responded' THEN 4 WHEN 'claimed' THEN 3
                    WHEN 'lost' THEN 2 WHEN 'viewed' THEN 1 ELSE 0 END) DESC,
                  la.created_at ASC) as assignments
                FROM leads l
                LEFT JOIN lead_assignments la ON l.id = la.lead_id
                WHERE la.agency_id = ${agencyId} AND l.status = ${status}
                GROUP BY l.id
                ORDER BY l.created_at DESC
                LIMIT ${limit} OFFSET ${offset}`
          : sql`SELECT l.*, json_agg(json_build_object(
                  'id', la.id, 'agencyId', la.agency_id, 'status', la.status
                ) ORDER BY (CASE la.status
                    WHEN 'won' THEN 5 WHEN 'responded' THEN 4 WHEN 'claimed' THEN 3
                    WHEN 'lost' THEN 2 WHEN 'viewed' THEN 1 ELSE 0 END) DESC,
                  la.created_at ASC) as assignments
                FROM leads l
                LEFT JOIN lead_assignments la ON l.id = la.lead_id
                WHERE la.agency_id = ${agencyId}
                GROUP BY l.id
                ORDER BY l.created_at DESC
                LIMIT ${limit} OFFSET ${offset}`;

        const countQuery = status
          ? sql`SELECT count(DISTINCT l.id) as count FROM leads l
                LEFT JOIN lead_assignments la ON l.id = la.lead_id
                WHERE la.agency_id = ${agencyId} AND l.status = ${status}`
          : sql`SELECT count(DISTINCT l.id) as count FROM leads l
                LEFT JOIN lead_assignments la ON l.id = la.lead_id
                WHERE la.agency_id = ${agencyId}`;

        const results = await db.execute(leadsQuery);
        const countResult = await db.execute(countQuery);
        const total = Number((countResult as unknown as Array<{ count: string }>)[0]?.count ?? 0);

        return Response.json({
          data: results,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
      } catch {
        // lead_assignments table may not exist; fall through
      }
    }

    try {
      const combinedQuery = status
        ? sql`SELECT l.*, json_agg(json_build_object('id', la.id, 'agencyId', la.agency_id, 'status', la.status)) FILTER (WHERE la.id IS NOT NULL) as assignments
              FROM leads l
              LEFT JOIN lead_assignments la ON l.id = la.lead_id
              LEFT JOIN agencies a ON la.agency_id = a.id
              WHERE (l.user_id = ${user.id} OR a.user_id = ${user.id})
                AND l.status = ${status}
              GROUP BY l.id
              ORDER BY l.created_at DESC
              LIMIT ${limit} OFFSET ${offset}`
        : sql`SELECT l.*, json_agg(json_build_object('id', la.id, 'agencyId', la.agency_id, 'status', la.status)) FILTER (WHERE la.id IS NOT NULL) as assignments
              FROM leads l
              LEFT JOIN lead_assignments la ON l.id = la.lead_id
              LEFT JOIN agencies a ON la.agency_id = a.id
              WHERE (l.user_id = ${user.id} OR a.user_id = ${user.id})
              GROUP BY l.id
              ORDER BY l.created_at DESC
              LIMIT ${limit} OFFSET ${offset}`;

      const combinedCountQuery = status
        ? sql`SELECT count(DISTINCT l.id) as count FROM leads l
              LEFT JOIN lead_assignments la ON l.id = la.lead_id
              LEFT JOIN agencies a ON la.agency_id = a.id
              WHERE (l.user_id = ${user.id} OR a.user_id = ${user.id})
                AND l.status = ${status}`
        : sql`SELECT count(DISTINCT l.id) as count FROM leads l
              LEFT JOIN lead_assignments la ON l.id = la.lead_id
              LEFT JOIN agencies a ON la.agency_id = a.id
              WHERE (l.user_id = ${user.id} OR a.user_id = ${user.id})`;

      const results = await db.execute(combinedQuery);
      const countResult = await db.execute(combinedCountQuery);
      const total = Number((countResult as unknown as Array<{ count: string }>)[0]?.count ?? 0);

      return Response.json({
        data: results,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch {
      const leadsQuery = status
        ? sql`SELECT l.* FROM leads l
              WHERE l.user_id = ${user.id} AND l.status = ${status}
              ORDER BY l.created_at DESC
              LIMIT ${limit} OFFSET ${offset}`
        : sql`SELECT l.* FROM leads l
              WHERE l.user_id = ${user.id}
              ORDER BY l.created_at DESC
              LIMIT ${limit} OFFSET ${offset}`;

      const countQuery = status
        ? sql`SELECT count(*) as count FROM leads WHERE user_id = ${user.id} AND status = ${status}`
        : sql`SELECT count(*) as count FROM leads WHERE user_id = ${user.id}`;

      const results = await db.execute(leadsQuery);
      const countResult = await db.execute(countQuery);
      const total = Number((countResult as unknown as Array<{ count: string }>)[0]?.count ?? 0);

      return Response.json({
        data: results,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }
  } catch (error) {
    console.error("GET /api/leads error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, { windowMs: 60_000, maxRequests: 5 }, "lead-create");
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const { user } = await authenticateRequest(request);

    const body = await request.json();
    const parsed = createLeadSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    if (!hasDb()) {
      return Response.json({ error: "Database not available" }, { status: 503 });
    }

    const db = getDb();
    const data = parsed.data;

    const rows = await db.execute(sql`
      INSERT INTO leads (
        user_id, company_name, contact_name, contact_email, contact_phone,
        project_description, budget, timeline, service_ids,
        industry_id, country_id, city_id, status
      ) VALUES (
        ${user?.id ?? null},
        ${data.companyName},
        ${data.contactName},
        ${data.contactEmail},
        ${data.contactPhone ?? null},
        ${data.projectDescription},
        ${data.budget ?? null},
        ${data.timeline ?? null},
        ${data.serviceIds ? JSON.stringify(data.serviceIds) : null}::jsonb,
        ${data.industryId ?? null},
        ${data.countryId ?? null},
        ${data.cityId ?? null},
        'new'
      ) RETURNING *
    `);

    const lead = (rows as unknown as Array<Record<string, unknown>>)[0];

    if (!lead) {
      return Response.json({ error: "Failed to create lead" }, { status: 500 });
    }

    const leadId = lead.id as string;

    if (data.agencyIds?.length) {
      for (const agencyId of data.agencyIds) {
        try {
          await db.execute(
            sql`INSERT INTO lead_assignments (lead_id, agency_id, status) VALUES (${leadId}, ${agencyId}, 'sent') ON CONFLICT DO NOTHING`
          );
          await db.execute(
            sql`UPDATE agencies SET total_leads = COALESCE(total_leads, 0) + 1 WHERE id = ${agencyId}`
          );
        } catch { /* skip invalid agency */ }
      }
    } else {
      // Auto-assign to relevant agencies
      try {
        const parsedServiceIds = data.serviceIds && data.serviceIds.length > 0 ? data.serviceIds : null;
        await autoAssignLead(leadId, parsedServiceIds, data.industryId ?? null);
      } catch (err) {
        console.error("[LEADS] Auto-assignment error:", err);
      }
    }

    return Response.json({ data: lead }, { status: 201 });
  } catch (error) {
    console.error("POST /api/leads error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
