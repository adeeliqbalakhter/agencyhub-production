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

    const rows = await db.execute(sql`
      SELECT u.id, u.name, u.email, u.role, u.email_verified, u.image, u.is_active, u.created_at,
             up.bio, up.phone, up.company_name, up.job_title, up.website, up.avatar_url, up.timezone, up.language
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE u.id = ${user.id} AND u.deleted_at IS NULL
    `);
    const row = (rows as unknown as Array<Record<string, unknown>>)[0];
    if (!row) return error("User not found", 404);

    return success({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      emailVerified: row.email_verified !== null,
      image: row.image,
      isActive: row.is_active,
      createdAt: row.created_at,
      profile: {
        bio: row.bio,
        phone: row.phone,
        companyName: row.company_name,
        jobTitle: row.job_title,
        website: row.website,
        avatarUrl: row.avatar_url,
        timezone: row.timezone,
        language: row.language,
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
