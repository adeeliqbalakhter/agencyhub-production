import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guards";
import { success, error, serverError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const sessions = await db.execute(sql`
      SELECT id, device_info, ip_address, created_at, expires_at
      FROM refresh_tokens
      WHERE user_id = ${user.id} AND revoked_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC
    `);

    const loginHistory = await db.execute(sql`
      SELECT id, ip_address, user_agent, device_type, status, failure_reason, created_at
      FROM login_history
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 20
    `);

    return success({ sessions, loginHistory });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const { searchParams } = request.nextUrl;
    const sessionId = searchParams.get("id");

    if (sessionId) {
      await db.execute(sql`
        UPDATE refresh_tokens SET revoked_at = NOW()
        WHERE id = ${sessionId} AND user_id = ${user.id}
      `);
    } else {
      await db.execute(sql`
        UPDATE refresh_tokens SET revoked_at = NOW()
        WHERE user_id = ${user.id} AND revoked_at IS NULL
      `);
    }

    return success({ message: "Session(s) revoked" });
  } catch (err) {
    return serverError(err);
  }
}
