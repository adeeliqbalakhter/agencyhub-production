import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guards";
import { z } from "zod";
import { success, error, serverError } from "@/lib/api/response";

const voteSchema = z.object({
  isHelpful: z.boolean(),
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
    const parsed = voteSchema.safeParse(body);
    if (!parsed.success) return error("Validation failed", 400, parsed.error.format());

    // Upsert vote
    const existing = await db.execute(sql`
      SELECT id FROM review_votes WHERE review_id = ${id} AND user_id = ${user.id}
    `);

    if ((existing as unknown as Array<unknown>).length > 0) {
      await db.execute(sql`
        UPDATE review_votes SET is_helpful = ${parsed.data.isHelpful} WHERE review_id = ${id} AND user_id = ${user.id}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO review_votes (review_id, user_id, is_helpful) VALUES (${id}, ${user.id}, ${parsed.data.isHelpful})
      `);
    }

    // Update helpful count
    const helpfulResult = await db.execute(sql`
      SELECT count(*) as count FROM review_votes WHERE review_id = ${id} AND is_helpful = true
    `);
    const helpfulCount = Number((helpfulResult as unknown as Array<{ count: string }>)[0]?.count ?? 0);

    await db.execute(sql`UPDATE reviews SET helpful_count = ${helpfulCount} WHERE id = ${id}`);

    return success({ helpfulCount });
  } catch (err) {
    return serverError(err);
  }
}
