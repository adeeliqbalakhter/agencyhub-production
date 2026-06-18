import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { serverError } from "@/lib/api/response";

export async function GET() {
  try {
    if (!hasDb()) {
      return Response.json({ data: [] });
    }

    const db = getDb();

    const rows = await db.execute(
      sql`SELECT id, name, slug FROM services ORDER BY name ASC`
    );

    return Response.json({ data: rows });
  } catch (error: unknown) {
    // If the table doesn't exist yet, return empty data instead of an error
    const message = error instanceof Error ? error.message : "";
    if (message.includes("does not exist") || message.includes("relation")) {
      return Response.json({ data: [] });
    }
    return serverError(error);
  }
}
