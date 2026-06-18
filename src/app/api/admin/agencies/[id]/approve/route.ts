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

    const validActions = ["approve", "reject", "suspend", "verify", "feature"];
    if (!validActions.includes(action)) {
      return error(`Action must be one of: ${validActions.join(", ")}`, 400);
    }

    const rows = await db.execute(
      sql`SELECT id, slug, status, is_verified, is_featured FROM agencies WHERE id = ${id} AND deleted_at IS NULL`
    );
    const agency = (rows as unknown as Array<Record<string, unknown>>)[0];
    if (!agency) return error("Agency not found", 404);

    let newStatus = agency.status as string;
    let isVerified = agency.is_verified as boolean;
    let isFeatured = agency.is_featured as boolean;

    if (action === "approve") {
      newStatus = "active";
      isVerified = true;
    } else if (action === "reject") {
      newStatus = "rejected";
    } else if (action === "suspend") {
      newStatus = "suspended";
    } else if (action === "verify") {
      isVerified = true;
    } else if (action === "feature") {
      isFeatured = true;
    }

    await db.execute(sql`
      UPDATE agencies SET
        status = ${newStatus},
        is_verified = ${isVerified},
        is_featured = ${isFeatured},
        updated_at = NOW()
      WHERE id = ${id}
    `);

    await createAuditLog({
      userId: user.id,
      action: `agency_${action}`,
      entityType: "agency",
      entityId: id,
      oldValues: { status: agency.status, is_verified: agency.is_verified, is_featured: agency.is_featured },
      newValues: { status: newStatus, is_verified: isVerified, is_featured: isFeatured },
      ipAddress: getClientIp(request),
    });

    try {
      const slug = agency.slug as string;
      if (slug) {
        revalidatePath(`/agencies/${slug}`);
      }
      revalidatePath('/agencies');
    } catch {}

    return success({ message: `Agency ${action} successful`, status: newStatus });
  } catch (err) {
    return serverError(err);
  }
}
