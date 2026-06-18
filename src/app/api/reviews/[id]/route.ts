import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guards";
import { isAdmin } from "@/lib/auth/rbac";
import { success, error, notFound, serverError } from "@/lib/api/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const rows = await db.execute(sql`
      SELECT r.*, u.name as user_name, a.name as agency_name
      FROM reviews r
      LEFT JOIN users u ON u.id = r.user_id
      LEFT JOIN agencies a ON a.id = r.agency_id
      WHERE r.id = ${id} AND r.deleted_at IS NULL
    `);
    const review = (rows as unknown as Array<Record<string, unknown>>)[0];
    if (!review) return notFound("Review not found");

    const responses = await db.execute(sql`
      SELECT rr.*, u.name as user_name
      FROM review_responses rr
      JOIN users u ON u.id = rr.user_id
      WHERE rr.review_id = ${id}
      ORDER BY rr.created_at ASC
    `);

    return success({ ...review, responses });
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    const { id } = await params;
    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const rows = await db.execute(sql`SELECT user_id FROM reviews WHERE id = ${id} AND deleted_at IS NULL`);
    const review = (rows as unknown as Array<Record<string, unknown>>)[0];
    if (!review) return notFound("Review not found");

    if (!isAdmin(user.role) && review.user_id !== user.id) {
      return error("Cannot edit this review", 403);
    }

    const body = await request.json();
    const { title, content } = body as { title?: string; content?: string };

    if (title) await db.execute(sql`UPDATE reviews SET title = ${title}, updated_at = NOW() WHERE id = ${id}`);
    if (content) await db.execute(sql`UPDATE reviews SET content = ${content}, updated_at = NOW() WHERE id = ${id}`);

    return success({ message: "Review updated" });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    const { id } = await params;
    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const rows = await db.execute(sql`SELECT user_id FROM reviews WHERE id = ${id} AND deleted_at IS NULL`);
    const review = (rows as unknown as Array<Record<string, unknown>>)[0];
    if (!review) return notFound("Review not found");

    if (!isAdmin(user.role) && review.user_id !== user.id) {
      return error("Cannot delete this review", 403);
    }

    await db.execute(sql`UPDATE reviews SET deleted_at = NOW() WHERE id = ${id}`);
    return success({ message: "Review deleted" });
  } catch (err) {
    return serverError(err);
  }
}
