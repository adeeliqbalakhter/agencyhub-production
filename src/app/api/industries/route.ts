import { hasDb, getDb } from "@/lib/db";
import { industries } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

import { success, error, serverError } from "@/lib/api/response";

export async function GET() {
  try {
    if (!hasDb()) {
      return Response.json({ data: [] });
    }

    const db = getDb();
    const list = await db
      .select()
      .from(industries)
      .orderBy(asc(industries.name));
    return Response.json({ data: list });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("GET /api/industries error:", err);
    }
    return serverError(err);
  }
}
