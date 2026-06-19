import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

import { success, error, serverError } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    if (!hasDb()) {
      return Response.json({ data: [] });
    }

    const db = getDb();

    const plans = await db.execute(
      sql`SELECT * FROM plans WHERE is_active = true ORDER BY sort_order ASC`
    );

    return Response.json({ data: plans });
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("GET /api/plans error:", error);
    }
    const msg = error instanceof Error ? error.message : "Unknown error";
    // Return empty array if table doesn't exist
    if (msg.includes("does not exist") || msg.includes("relation")) {
      return Response.json({ data: [] });
    }
    return Response.json(
      { error: "Internal server error", details: msg },
      { status: 500 }
    );
  }
}
