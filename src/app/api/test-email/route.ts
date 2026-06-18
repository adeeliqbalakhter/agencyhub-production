import { NextRequest } from "next/server";
import { sendEmail, buildOTPEmail } from "@/lib/services/email";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  const mode = request.nextUrl.searchParams.get("mode") || "test";

  if (!email) {
    return Response.json(
      { error: "Missing required query parameter: email" },
      { status: 400 }
    );
  }

  const resendKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;

  const diagnostics: Record<string, unknown> = {
    resend_key_configured: !!resendKey,
    resend_key_preview: resendKey
      ? resendKey.substring(0, 8) + "********"
      : null,
    email_from_value: emailFrom || "AgencyHub <onboarding@resend.dev> (default)",
    target_email: email,
  };

  if (mode === "otp-debug") {
    const steps: Record<string, unknown> = {};

    // Step 1: Check DB
    steps.db_available = hasDb();
    if (!hasDb()) {
      return Response.json({ ...diagnostics, steps, error: "No database" });
    }
    const db = getDb();

    // Step 2: Find user
    try {
      const userRows = await db.execute(
        sql`SELECT id, name, email, is_active FROM users WHERE email = ${email} AND deleted_at IS NULL`
      );
      const users = userRows as unknown as Array<Record<string, unknown>>;
      steps.user_found = users.length > 0;
      if (users.length > 0) {
        steps.user_id = users[0].id;
        steps.user_name = users[0].name;
        steps.user_is_active = users[0].is_active;
      } else {
        return Response.json({
          ...diagnostics,
          steps,
          error: "User not found in database. The OTP endpoint silently returns success but sends no email.",
        });
      }
    } catch (e) {
      steps.user_lookup_error = e instanceof Error ? e.message : String(e);
      return Response.json({ ...diagnostics, steps });
    }

    // Step 3: Check otp_tokens table
    try {
      const otpRows = await db.execute(
        sql`SELECT id, code, type, expires_at, used_at, created_at FROM otp_tokens WHERE user_id = ${steps.user_id} ORDER BY created_at DESC LIMIT 5`
      );
      const otps = otpRows as unknown as Array<Record<string, unknown>>;
      steps.existing_otps = otps.map((o) => ({
        id: o.id,
        type: o.type,
        used: !!o.used_at,
        expired: new Date(o.expires_at as string) < new Date(),
        created_at: o.created_at,
      }));
    } catch (e) {
      steps.otp_table_error = e instanceof Error ? e.message : String(e);
    }

    // Step 4: Generate and send OTP email
    const testCode = "123456";
    const emailData = buildOTPEmail(
      (steps.user_name as string) || "",
      testCode,
      "email verification"
    );
    steps.email_payload = {
      to: email,
      subject: emailData.subject,
      html_length: emailData.html.length,
    };

    try {
      const sent = await sendEmail({ ...emailData, to: email });
      steps.otp_email_sent = sent;
    } catch (e) {
      steps.otp_email_error = e instanceof Error ? e.message : String(e);
    }

    return Response.json({ ...diagnostics, steps });
  }

  // Default: simple test email
  try {
    const sent = await sendEmail({
      to: email,
      subject: "AgencyHub Test Email",
      html: `<h2>Test Email</h2><p>This is a test email from AgencyHub to verify email delivery is working.</p><p>Sent at: ${new Date().toISOString()}</p>`,
      text: `Test email from AgencyHub. Sent at: ${new Date().toISOString()}`,
    });

    return Response.json({
      ...diagnostics,
      send_success: sent,
      message: sent
        ? "Test email sent successfully. Check your inbox."
        : "Email send returned false. Check Vercel logs for details.",
    });
  } catch (err) {
    return Response.json({
      ...diagnostics,
      send_success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
