import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guards";
import { z } from "zod";
import { created, error, serverError } from "@/lib/api/response";

const respondSchema = z.object({
  content: z.string().min(10).max(2000),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    const { id } = await params;
    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    // Verify user is agency owner of the reviewed agency
    const reviewRows = await db.execute(sql`
      SELECT r.agency_id, a.user_id as agency_owner_id
      FROM reviews r
      JOIN agencies a ON a.id = r.agency_id
      WHERE r.id = ${id} AND r.deleted_at IS NULL
    `);
    const review = (reviewRows as unknown as Array<Record<string, unknown>>)[0];
    if (!review) return error("Review not found", 404);

    if (review.agency_owner_id !== user.id && user.role !== "super_admin" && user.role !== "admin") {
      // Check team membership
      const team = await db.execute(sql`
        SELECT id FROM agency_team_members
        WHERE agency_id = ${review.agency_id} AND user_id = ${user.id} AND status = 'active'
      `);
      if ((team as unknown as Array<unknown>).length === 0) {
        return error("Only the agency owner or team can respond to reviews", 403);
      }
    }

    const body = await request.json();
    const parsed = respondSchema.safeParse(body);
    if (!parsed.success) return error("Validation failed", 400, parsed.error.format());

    const rows = await db.execute(sql`
      INSERT INTO review_responses (review_id, user_id, content)
      VALUES (${id}, ${user.id}, ${parsed.data.content})
      RETURNING *
    `);

    return created((rows as unknown as Array<Record<string, unknown>>)[0]);
  } catch (err) {
    return serverError(err);
  }
}
