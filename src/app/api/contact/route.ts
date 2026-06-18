import { NextRequest } from "next/server";
import { z } from "zod";
import { success, error, serverError } from "@/lib/api/response";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { checkRateLimit, rateLimitResponse } from "@/lib/services/rate-limit";

const contactSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  subject: z.string().min(1).max(255),
  message: z.string().min(10).max(5000),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, { windowMs: 60_000, maxRequests: 5 }, "contact");
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

    const body = await request.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.format());
    }

    if (!hasDb()) {
      return error("Database not available", 503);
    }

    const db = getDb();
    const data = parsed.data;

    // Store in notifications table as a system notification for admins
    await db.execute(sql`
      INSERT INTO notifications (user_id, type, title, message, data)
      SELECT id, 'system', ${'Contact Form: ' + data.subject}, ${data.message},
        ${JSON.stringify({ name: data.name, email: data.email, subject: data.subject })}::jsonb
      FROM users WHERE role IN ('admin', 'super_admin') LIMIT 5
    `);

    return Response.json({ message: "Message sent successfully" }, { status: 201 });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("POST /api/contact error:", err);
    }
    return serverError(err);
  }
}
