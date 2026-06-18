import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { runMigrations } from "@/lib/db/migrate";
import { requireRole } from "@/lib/auth/guards";
import { success, error, serverError } from "@/lib/api/response";

async function needsMigration(): Promise<boolean> {
  if (!hasDb()) return true;
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1 FROM otp_tokens LIMIT 1`);
    await db.execute(sql`SELECT 1 FROM signup_otps LIMIT 1`);
    await db.execute(sql`SELECT budget_rating FROM reviews LIMIT 1`);
    await db.execute(sql`SELECT challenge FROM agency_portfolio LIMIT 1`);
    return false;
  } catch {
    return true;
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const migrationSecret = process.env.MIGRATION_SECRET;
    const hasSecretBypass = migrationSecret && authHeader === `Bearer ${migrationSecret}`;
    const migrate = await needsMigration();

    if (!hasSecretBypass && !migrate) {
      const authResult = await requireRole(request, "super_admin");
      if ("error" in authResult) return authResult.error;
    }

    const result = await runMigrations();
    return success(result);
  } catch (err) {
    return serverError(err);
  }
}
