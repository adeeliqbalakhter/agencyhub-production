import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guards";
import { z } from "zod";
import { success, error, serverError } from "@/lib/api/response";

const preferencesSchema = z.object({
  emailNewLead: z.boolean().optional(),
  emailNewReview: z.boolean().optional(),
  emailLeadResponse: z.boolean().optional(),
  emailTeamInvite: z.boolean().optional(),
  emailAgencyApproved: z.boolean().optional(),
  emailWeeklyDigest: z.boolean().optional(),
  inAppNewLead: z.boolean().optional(),
  inAppNewReview: z.boolean().optional(),
  inAppLeadResponse: z.boolean().optional(),
  inAppTeamInvite: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const rows = await db.execute(sql`
      SELECT * FROM notification_preferences WHERE user_id = ${user.id}
    `);
    const prefs = (rows as unknown as Array<Record<string, unknown>>)[0];

    if (!prefs) {
      await db.execute(sql`INSERT INTO notification_preferences (user_id) VALUES (${user.id})`);
      const newRows = await db.execute(sql`SELECT * FROM notification_preferences WHERE user_id = ${user.id}`);
      return success((newRows as unknown as Array<Record<string, unknown>>)[0]);
    }

    return success(prefs);
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
    const parsed = preferencesSchema.safeParse(body);
    if (!parsed.success) return error("Validation failed", 400, parsed.error.format());

    const data = parsed.data;

    await db.execute(sql`
      INSERT INTO notification_preferences (user_id) VALUES (${user.id}) ON CONFLICT (user_id) DO NOTHING
    `);

    if (data.emailNewLead !== undefined) await db.execute(sql`UPDATE notification_preferences SET email_new_lead = ${data.emailNewLead}, updated_at = NOW() WHERE user_id = ${user.id}`);
    if (data.emailNewReview !== undefined) await db.execute(sql`UPDATE notification_preferences SET email_new_review = ${data.emailNewReview}, updated_at = NOW() WHERE user_id = ${user.id}`);
    if (data.emailLeadResponse !== undefined) await db.execute(sql`UPDATE notification_preferences SET email_lead_response = ${data.emailLeadResponse}, updated_at = NOW() WHERE user_id = ${user.id}`);
    if (data.emailTeamInvite !== undefined) await db.execute(sql`UPDATE notification_preferences SET email_team_invite = ${data.emailTeamInvite}, updated_at = NOW() WHERE user_id = ${user.id}`);
    if (data.emailAgencyApproved !== undefined) await db.execute(sql`UPDATE notification_preferences SET email_agency_approved = ${data.emailAgencyApproved}, updated_at = NOW() WHERE user_id = ${user.id}`);
    if (data.emailWeeklyDigest !== undefined) await db.execute(sql`UPDATE notification_preferences SET email_weekly_digest = ${data.emailWeeklyDigest}, updated_at = NOW() WHERE user_id = ${user.id}`);
    if (data.inAppNewLead !== undefined) await db.execute(sql`UPDATE notification_preferences SET in_app_new_lead = ${data.inAppNewLead}, updated_at = NOW() WHERE user_id = ${user.id}`);
    if (data.inAppNewReview !== undefined) await db.execute(sql`UPDATE notification_preferences SET in_app_new_review = ${data.inAppNewReview}, updated_at = NOW() WHERE user_id = ${user.id}`);
    if (data.inAppLeadResponse !== undefined) await db.execute(sql`UPDATE notification_preferences SET in_app_lead_response = ${data.inAppLeadResponse}, updated_at = NOW() WHERE user_id = ${user.id}`);
    if (data.inAppTeamInvite !== undefined) await db.execute(sql`UPDATE notification_preferences SET in_app_team_invite = ${data.inAppTeamInvite}, updated_at = NOW() WHERE user_id = ${user.id}`);

    const rows = await db.execute(sql`SELECT * FROM notification_preferences WHERE user_id = ${user.id}`);
    return success((rows as unknown as Array<Record<string, unknown>>)[0]);
  } catch (err) {
    return serverError(err);
  }
}
