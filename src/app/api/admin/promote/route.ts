import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { success, error, serverError } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, secret } = body as { email?: string; secret?: string };

    if (!email || !secret) {
      return error("Email and secret are required", 400);
    }

    const expectedSecret = process.env.ADMIN_SECRET || "setup123";
    if (secret !== expectedSecret) {
      return error("Invalid secret", 403);
    }

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const rows = await db.execute(
      sql`SELECT id, email, role FROM users WHERE email = ${email} AND deleted_at IS NULL`
    );
    const user = (rows as unknown as Array<Record<string, unknown>>)[0];
    if (!user) {
      return error("User not found", 404);
    }

    await db.execute(
      sql`UPDATE users SET role = 'super_admin', updated_at = NOW() WHERE id = ${user.id}`
    );

    return success({ message: "User promoted to super_admin", email });
  } catch (err) {
    return serverError(err);
  }
}
