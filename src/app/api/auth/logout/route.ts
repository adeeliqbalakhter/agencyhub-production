import { NextRequest, NextResponse } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { hashToken } from "@/lib/auth/tokens";
import { authenticateRequest } from "@/lib/auth/guards";
import { error, serverError } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  try {
    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const { user } = await authenticateRequest(request);

    const body = await request.json().catch(() => ({}));
    const refreshToken = (body as Record<string, string>).refreshToken;

    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await db.execute(
        sql`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ${tokenHash}`
      );
    }

    if (user) {
      const allDevices = (body as Record<string, boolean>).allDevices;
      if (allDevices) {
        await db.execute(
          sql`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ${user.id} AND revoked_at IS NULL`
        );
      }
    }

    const response = NextResponse.json({ data: { message: "Logged out successfully" } });

    const secureCookie = process.env.NODE_ENV === "production";
    response.cookies.set("access_token", "", {
      httpOnly: true,
      secure: secureCookie,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    response.cookies.set("refresh_token", "", {
      httpOnly: true,
      secure: secureCookie,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (err) {
    return serverError(err);
  }
}
