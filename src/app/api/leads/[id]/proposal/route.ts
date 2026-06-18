import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { success, error, serverError } from "@/lib/api/response";
import { sendEmail } from "@/lib/services/email";
import { z } from "zod";

const proposalSchema = z.object({
  assignmentId: z.string().uuid(),
  message: z.string().min(10).max(5000),
  estimatedBudget: z.string().optional(),
  estimatedTimeline: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    const { id: leadId } = await params;
    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const body = await request.json();
    const parsed = proposalSchema.safeParse(body);
    if (!parsed.success) return error("Validation failed", 400, parsed.error.format());

    const { assignmentId, message, estimatedBudget, estimatedTimeline } = parsed.data;

    // Verify assignment belongs to user's agency and is claimed
    const rows = await db.execute(sql`
      SELECT la.id, la.status, la.agency_id, a.name as agency_name, a.user_id as agency_owner_id
      FROM lead_assignments la
      JOIN agencies a ON a.id = la.agency_id
      WHERE la.id = ${assignmentId} AND la.lead_id = ${leadId}
    `);
    const assignment = (rows as unknown as Array<Record<string, unknown>>)[0];
    if (!assignment) return error("Assignment not found", 404);
    if (assignment.agency_owner_id !== user.id) return error("Access denied", 403);

    if (assignment.status === "sent") {
      try {
        const creditCheck = await db.execute(sql`
          SELECT id FROM lead_credit_transactions
          WHERE agency_id = ${assignment.agency_id} AND type = 'consume'
            AND description LIKE ${"%" + leadId + "%"}
          LIMIT 1
        `);
        const hasClaimed = (creditCheck as unknown as Array<Record<string, unknown>>).length > 0;
        if (!hasClaimed) {
          return error("You must claim this lead first", 400);
        }
      } catch {
        return error("You must claim this lead first", 400);
      }
      try {
        await db.execute(sql`
          UPDATE lead_assignments SET status = 'claimed' WHERE id = ${assignmentId}
        `);
      } catch { /* ignore */ }
    }

    // Ensure proposals table exists
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS lead_proposals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          lead_id UUID NOT NULL,
          assignment_id UUID NOT NULL,
          agency_id UUID NOT NULL,
          message TEXT NOT NULL,
          estimated_budget VARCHAR(255),
          estimated_timeline VARCHAR(255),
          status VARCHAR(30) DEFAULT 'pending' NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
    } catch { /* exists */ }

    // Insert proposal
    let proposalRows;
    try {
      proposalRows = await db.execute(sql`
        INSERT INTO lead_proposals (lead_id, assignment_id, agency_id, message, estimated_budget, estimated_timeline)
        VALUES (${leadId}, ${assignmentId}, ${assignment.agency_id}, ${message}, ${estimatedBudget ?? null}, ${estimatedTimeline ?? null})
        RETURNING *
      `);
    } catch (err) {
      console.error("[PROPOSAL] Insert error:", err);
      return error("Failed to save proposal", 500);
    }

    // Update assignment status to responded
    try {
      await db.execute(sql`
        UPDATE lead_assignments SET status = 'responded' WHERE id = ${assignmentId}
      `);
    } catch { /* ignore */ }

    // Also add proposal as a message in the conversation
    try {
      const msgContent = `📋 **Proposal from ${assignment.agency_name}**\n\n${message}${estimatedBudget ? `\n\n💰 Estimated Budget: ${estimatedBudget}` : ""}${estimatedTimeline ? `\n⏱️ Estimated Timeline: ${estimatedTimeline}` : ""}`;
      await db.execute(sql`
        INSERT INTO messages (lead_assignment_id, sender_id, content)
        VALUES (${assignmentId}, ${user.id}, ${msgContent})
      `);
    } catch { /* ignore */ }

    // Send email notification to client
    const leadRows = await db.execute(sql`
      SELECT contact_email, contact_name, company_name, user_id FROM leads WHERE id = ${leadId}
    `);
    const lead = (leadRows as unknown as Array<Record<string, unknown>>)[0];

    if (lead?.contact_email) {
      const clientName = (lead.contact_name as string) || "there";
      const agencyName = assignment.agency_name as string;
      const projectName = (lead.company_name as string) || "your project";

      try {
        await sendEmail({
          to: lead.contact_email as string,
          subject: `New proposal from ${agencyName} for ${projectName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1e3a5f; padding: 24px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 20px;">AgencyHub</h1>
              </div>
              <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
                <p style="font-size: 16px; color: #1e3a5f;">Hi ${clientName},</p>
                <p style="color: #4b5563;"><strong>${agencyName}</strong> has submitted a proposal for <strong>${projectName}</strong>.</p>
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="color: #374151; white-space: pre-line; margin: 0;">${message}</p>
                  ${estimatedBudget ? `<p style="color: #6b7280; margin: 8px 0 0;"><strong>Budget:</strong> ${estimatedBudget}</p>` : ""}
                  ${estimatedTimeline ? `<p style="color: #6b7280; margin: 4px 0 0;"><strong>Timeline:</strong> ${estimatedTimeline}</p>` : ""}
                </div>
                ${!lead.user_id ? `
                  <p style="color: #4b5563;">Create a free account to chat with ${agencyName} and manage all your proposals:</p>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://listingproject.vercel.app"}/auth/signup" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Create Account & View Proposal</a>
                ` : `
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://listingproject.vercel.app"}/client" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View Proposal</a>
                `}
                <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">This email was sent by AgencyHub on behalf of ${agencyName}.</p>
              </div>
            </div>
          `,
        });
      } catch (err) {
        console.error("[PROPOSAL] Email send error:", err);
      }
    }

    return success({
      proposal: (proposalRows as unknown as Array<Record<string, unknown>>)[0],
      message: "Proposal submitted successfully",
    });
  } catch (err) {
    return serverError(err);
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    const { id: leadId } = await params;
    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    // Verify access: lead owner (by user_id or email) or assigned agency owner
    const leadRows = await db.execute(sql`SELECT user_id, contact_email FROM leads WHERE id = ${leadId}`);
    const lead = (leadRows as unknown as Array<Record<string, unknown>>)[0];
    if (!lead) return error("Lead not found", 404);

    const isOwner = lead.user_id === user.id || lead.contact_email === user.email;
    if (!isOwner) {
      const agencyCheck = await db.execute(sql`
        SELECT la.id FROM lead_assignments la
        JOIN agencies a ON a.id = la.agency_id
        WHERE la.lead_id = ${leadId} AND a.user_id = ${user.id}
        LIMIT 1
      `);
      if ((agencyCheck as unknown as Array<unknown>).length === 0) {
        return error("Access denied", 403);
      }
    }

    try {
      const rows = await db.execute(sql`
        SELECT lp.*, a.name as agency_name, a.logo as agency_logo
        FROM lead_proposals lp
        JOIN agencies a ON a.id = lp.agency_id
        WHERE lp.lead_id = ${leadId}
        ORDER BY lp.created_at DESC
      `);
      return success(rows);
    } catch {
      return success([]);
    }
  } catch (err) {
    return serverError(err);
  }
}
