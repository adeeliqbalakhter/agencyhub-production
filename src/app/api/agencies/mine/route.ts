import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { success, error, serverError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    if (!hasDb()) {
      return error("Database not available", 503);
    }

    const db = getDb();

    const rows = await db.execute(
      sql`SELECT * FROM agencies WHERE user_id = ${user.id} AND deleted_at IS NULL LIMIT 1`
    );

    const agency = (rows as unknown as Array<Record<string, unknown>>)[0] ?? null;

    if (!agency) {
      return success({ agency: null });
    }

    const agencyId = agency.id as string;

    const serviceRows = await db.execute(
      sql`SELECT service_id FROM agency_services WHERE agency_id = ${agencyId}`
    );
    const serviceIds = (serviceRows as unknown as Array<{ service_id: string }>).map(
      (r) => r.service_id
    );

    const industryRows = await db.execute(
      sql`SELECT industry_id FROM agency_industries WHERE agency_id = ${agencyId}`
    );
    const industryIds = (industryRows as unknown as Array<{ industry_id: string }>).map(
      (r) => r.industry_id
    );

    return success({ agency: { ...agency, serviceIds, industryIds } });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("GET /api/agencies/mine error:", err);
    }
    return serverError(err);
  }
}
