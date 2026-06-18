import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/guards";
import { createAuditLog, getClientIp } from "@/lib/services/audit";
import { success, error, serverError } from "@/lib/api/response";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireRole(request, "super_admin", "admin");
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    const { id } = await params;
    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const body = await request.json();
    const action = (body as Record<string, string>).action;

    if (!["approve", "reject", "flag"].includes(action)) {
      return error("Action must be 'approve', 'reject', or 'flag'", 400);
    }

    const statusMap: Record<string, string> = { approve: "approved", reject: "rejected", flag: "flagged" };
    const newStatus = statusMap[action];

    const rows = await db.execute(sql`SELECT id, status, agency_id FROM reviews WHERE id = ${id} AND deleted_at IS NULL`);
    const review = (rows as unknown as Array<Record<string, unknown>>)[0];
    if (!review) return error("Review not found", 404);

    await db.execute(sql`UPDATE reviews SET status = ${newStatus}, updated_at = NOW() WHERE id = ${id}`);

    if (action === "approve") {
      const reviewData = await db.execute(sql`SELECT agency_id, overall_rating FROM reviews WHERE id = ${id}`);
      const r = (reviewData as unknown as Array<Record<string, unknown>>)[0];
      if (r) {
        await db.execute(sql`
          UPDATE agencies SET
            average_rating = (SELECT AVG(overall_rating) FROM reviews WHERE agency_id = ${r.agency_id} AND status = 'approved' AND deleted_at IS NULL),
            total_reviews = (SELECT COUNT(*) FROM reviews WHERE agency_id = ${r.agency_id} AND status = 'approved' AND deleted_at IS NULL),
            updated_at = NOW()
          WHERE id = ${r.agency_id}
        `);
      }
    }

    await createAuditLog({
      userId: user.id,
      action: `review_${action}d`,
      entityType: "review",
      entityId: id,
      oldValues: { status: review.status },
      newValues: { status: newStatus },
      ipAddress: getClientIp(request),
    });

    try {
      const agencyId = review.agency_id as string;
      if (agencyId) {
        const slugRows = await db.execute(sql`SELECT slug FROM agencies WHERE id = ${agencyId}`);
        const slug = (slugRows as unknown as Array<{ slug: string }>)[0]?.slug;
        if (slug) {
          revalidatePath(`/agencies/${slug}`);
        }
      }
      revalidatePath('/agencies');
    } catch {}

    return success({ message: `Review ${action}d`, status: newStatus });
  } catch (err) {
    return serverError(err);
  }
}
