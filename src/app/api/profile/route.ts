import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guards";
import { updateProfileSchema } from "@/lib/validations/auth";
import { createAuditLog, getClientIp } from "@/lib/services/audit";
import { success, error, serverError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const rows = await db.execute(sql`
      SELECT u.id, u.name, u.email, u.role, u.image, u.email_verified, u.created_at,
             up.bio, up.phone, up.company_name, up.job_title, up.website, up.avatar_url, up.timezone, up.language
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE u.id = ${user.id}
    `);

    return success((rows as unknown as Array<Record<string, unknown>>)[0] || null);
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) return error("Validation failed", 400, parsed.error.format());

    const data = parsed.data;

    if (data.name) {
      await db.execute(sql`UPDATE users SET name = ${data.name}, updated_at = NOW() WHERE id = ${user.id}`);
    }

    // Upsert profile
    await db.execute(sql`
      INSERT INTO user_profiles (user_id, bio, phone, company_name, job_title, website, avatar_url, timezone, language, updated_at)
      VALUES (
        ${user.id},
        ${data.bio ?? null}, ${data.phone ?? null}, ${data.companyName ?? null},
        ${data.jobTitle ?? null}, ${data.website ?? null}, ${data.avatarUrl ?? null},
        ${data.timezone ?? null}, ${data.language ?? null}, NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        bio = COALESCE(EXCLUDED.bio, user_profiles.bio),
        phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
        company_name = COALESCE(EXCLUDED.company_name, user_profiles.company_name),
        job_title = COALESCE(EXCLUDED.job_title, user_profiles.job_title),
        website = COALESCE(EXCLUDED.website, user_profiles.website),
        avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
        timezone = COALESCE(EXCLUDED.timezone, user_profiles.timezone),
        language = COALESCE(EXCLUDED.language, user_profiles.language),
        updated_at = NOW()
    `);

    await createAuditLog({
      userId: user.id,
      action: "profile_updated",
      entityType: "user_profile",
      entityId: user.id,
      newValues: data as Record<string, unknown>,
      ipAddress: getClientIp(request),
    });

    const rows = await db.execute(sql`
      SELECT u.id, u.name, u.email, u.role, u.image,
             up.bio, up.phone, up.company_name, up.job_title, up.website, up.avatar_url, up.timezone, up.language
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE u.id = ${user.id}
    `);

    return success((rows as unknown as Array<Record<string, unknown>>)[0]);
  } catch (err) {
    return serverError(err);
  }
}
