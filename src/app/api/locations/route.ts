import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { countries, cities } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    if (!hasDb()) {
      return Response.json({ data: [] });
    }

    const db = getDb();
    const { searchParams } = request.nextUrl;
    const countryId = searchParams.get("countryId");

    if (countryId) {
      const cityList = await db
        .select()
        .from(cities)
        .where(eq(cities.countryId, countryId))
        .orderBy(asc(cities.name));
      return Response.json({ data: cityList });
    }

    const countryList = await db
      .select()
      .from(countries)
      .orderBy(asc(countries.name));
    return Response.json({ data: countryList });
  } catch (error) {
    console.error("GET /api/locations error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
