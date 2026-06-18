import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guards";
import { z } from "zod";
import { created, error, serverError } from "@/lib/api/response";

const reportSchema = z.object({
  reason: z.enum(["spam", "inappropriate", "fake", "offensive", "other"]),
  details: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    const { id } = await params;
    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const body = await request.json();
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) return error("Validation failed", 400, parsed.error.format());

    // Check for duplicate report
    const existing = await db.execute(sql`
      SELECT id FROM review_reports WHERE review_id = ${id} AND reporter_id = ${user.id} AND status = 'pending'
    `);
    if ((existing as unknown as Array<unknown>).length > 0) {
      return error("You have already reported this review", 409);
    }

    const rows = await db.execute(sql`
      INSERT INTO review_reports (review_id, reporter_id, reason, details)
      VALUES (${id}, ${user.id}, ${parsed.data.reason}, ${parsed.data.details ?? null})
      RETURNING *
    `);

    return created((rows as unknown as Array<Record<string, unknown>>)[0]);
  } catch (err) {
    return serverError(err);
  }
}
