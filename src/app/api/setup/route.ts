import { hasDb, getDb } from "@/lib/db";
import { countries, cities, services, industries } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { success, error, serverError } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/guards";

const COUNTRIES = [
  { name: "Afghanistan", code: "AF", continent: "Asia" },
  { name: "Albania", code: "AL", continent: "Europe" },
  { name: "Algeria", code: "DZ", continent: "Africa" },
  { name: "Argentina", code: "AR", continent: "South America" },
  { name: "Australia", code: "AU", continent: "Oceania" },
  { name: "Austria", code: "AT", continent: "Europe" },
  { name: "Bangladesh", code: "BD", continent: "Asia" },
  { name: "Belgium", code: "BE", continent: "Europe" },
  { name: "Brazil", code: "BR", continent: "South America" },
  { name: "Bulgaria", code: "BG", continent: "Europe" },
  { name: "Cambodia", code: "KH", continent: "Asia" },
  { name: "Canada", code: "CA", continent: "North America" },
  { name: "Chile", code: "CL", continent: "South America" },
  { name: "China", code: "CN", continent: "Asia" },
  { name: "Colombia", code: "CO", continent: "South America" },
  { name: "Costa Rica", code: "CR", continent: "North America" },
  { name: "Croatia", code: "HR", continent: "Europe" },
  { name: "Czech Republic", code: "CZ", continent: "Europe" },
  { name: "Denmark", code: "DK", continent: "Europe" },
  { name: "Dominican Republic", code: "DO", continent: "North America" },
  { name: "Ecuador", code: "EC", continent: "South America" },
  { name: "Egypt", code: "EG", continent: "Africa" },
  { name: "Estonia", code: "EE", continent: "Europe" },
  { name: "Ethiopia", code: "ET", continent: "Africa" },
  { name: "Finland", code: "FI", continent: "Europe" },
  { name: "France", code: "FR", continent: "Europe" },
  { name: "Germany", code: "DE", continent: "Europe" },
  { name: "Ghana", code: "GH", continent: "Africa" },
  { name: "Greece", code: "GR", continent: "Europe" },
  { name: "Guatemala", code: "GT", continent: "North America" },
  { name: "Hong Kong", code: "HK", continent: "Asia" },
  { name: "Hungary", code: "HU", continent: "Europe" },
  { name: "Iceland", code: "IS", continent: "Europe" },
  { name: "India", code: "IN", continent: "Asia" },
  { name: "Indonesia", code: "ID", continent: "Asia" },
  { name: "Iran", code: "IR", continent: "Asia" },
  { name: "Iraq", code: "IQ", continent: "Asia" },
  { name: "Ireland", code: "IE", continent: "Europe" },
  { name: "Israel", code: "IL", continent: "Asia" },
  { name: "Italy", code: "IT", continent: "Europe" },
  { name: "Jamaica", code: "JM", continent: "North America" },
  { name: "Japan", code: "JP", continent: "Asia" },
  { name: "Jordan", code: "JO", continent: "Asia" },
  { name: "Kazakhstan", code: "KZ", continent: "Asia" },
  { name: "Kenya", code: "KE", continent: "Africa" },
  { name: "Kuwait", code: "KW", continent: "Asia" },
  { name: "Latvia", code: "LV", continent: "Europe" },
  { name: "Lebanon", code: "LB", continent: "Asia" },
  { name: "Lithuania", code: "LT", continent: "Europe" },
  { name: "Luxembourg", code: "LU", continent: "Europe" },
  { name: "Malaysia", code: "MY", continent: "Asia" },
  { name: "Mexico", code: "MX", continent: "North America" },
  { name: "Morocco", code: "MA", continent: "Africa" },
  { name: "Myanmar", code: "MM", continent: "Asia" },
  { name: "Nepal", code: "NP", continent: "Asia" },
  { name: "Netherlands", code: "NL", continent: "Europe" },
  { name: "New Zealand", code: "NZ", continent: "Oceania" },
  { name: "Nigeria", code: "NG", continent: "Africa" },
  { name: "Norway", code: "NO", continent: "Europe" },
  { name: "Oman", code: "OM", continent: "Asia" },
  { name: "Pakistan", code: "PK", continent: "Asia" },
  { name: "Panama", code: "PA", continent: "North America" },
  { name: "Peru", code: "PE", continent: "South America" },
  { name: "Philippines", code: "PH", continent: "Asia" },
  { name: "Poland", code: "PL", continent: "Europe" },
  { name: "Portugal", code: "PT", continent: "Europe" },
  { name: "Qatar", code: "QA", continent: "Asia" },
  { name: "Romania", code: "RO", continent: "Europe" },
  { name: "Russia", code: "RU", continent: "Europe" },
  { name: "Saudi Arabia", code: "SA", continent: "Asia" },
  { name: "Serbia", code: "RS", continent: "Europe" },
  { name: "Singapore", code: "SG", continent: "Asia" },
  { name: "Slovakia", code: "SK", continent: "Europe" },
  { name: "Slovenia", code: "SI", continent: "Europe" },
  { name: "South Africa", code: "ZA", continent: "Africa" },
  { name: "South Korea", code: "KR", continent: "Asia" },
  { name: "Spain", code: "ES", continent: "Europe" },
  { name: "Sri Lanka", code: "LK", continent: "Asia" },
  { name: "Sweden", code: "SE", continent: "Europe" },
  { name: "Switzerland", code: "CH", continent: "Europe" },
  { name: "Taiwan", code: "TW", continent: "Asia" },
  { name: "Tanzania", code: "TZ", continent: "Africa" },
  { name: "Thailand", code: "TH", continent: "Asia" },
  { name: "Tunisia", code: "TN", continent: "Africa" },
  { name: "Turkey", code: "TR", continent: "Europe" },
  { name: "Ukraine", code: "UA", continent: "Europe" },
  { name: "United Arab Emirates", code: "AE", continent: "Asia" },
  { name: "United Kingdom", code: "GB", continent: "Europe" },
  { name: "United States", code: "US", continent: "North America" },
  { name: "Uruguay", code: "UY", continent: "South America" },
  { name: "Venezuela", code: "VE", continent: "South America" },
  { name: "Vietnam", code: "VN", continent: "Asia" },
];

const CITIES_BY_COUNTRY: Record<string, string[]> = {
  US: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Francisco", "Austin", "Seattle", "Denver", "Boston", "Miami", "Atlanta", "Minneapolis", "Portland", "Las Vegas", "Nashville"],
  GB: ["London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Liverpool", "Edinburgh", "Bristol", "Sheffield", "Cardiff"],
  CA: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa", "Edmonton", "Winnipeg", "Quebec City"],
  AU: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Canberra"],
  DE: ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne", "Stuttgart", "Düsseldorf"],
  FR: ["Paris", "Lyon", "Marseille", "Toulouse", "Nice", "Bordeaux", "Lille"],
  IN: ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow"],
  BR: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Curitiba", "Belo Horizonte"],
  JP: ["Tokyo", "Osaka", "Yokohama", "Nagoya", "Sapporo", "Kyoto", "Fukuoka"],
  CN: ["Beijing", "Shanghai", "Guangzhou", "Shenzhen", "Chengdu", "Hangzhou"],
  SG: ["Singapore"],
  AE: ["Dubai", "Abu Dhabi", "Sharjah"],
  NL: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht"],
  ES: ["Madrid", "Barcelona", "Valencia", "Seville", "Malaga"],
  IT: ["Rome", "Milan", "Naples", "Turin", "Florence"],
  SE: ["Stockholm", "Gothenburg", "Malmö"],
  NO: ["Oslo", "Bergen", "Trondheim"],
  DK: ["Copenhagen", "Aarhus", "Odense"],
  FI: ["Helsinki", "Espoo", "Tampere"],
  PL: ["Warsaw", "Krakow", "Wroclaw", "Gdansk", "Poznan"],
  IE: ["Dublin", "Cork", "Galway", "Limerick"],
  IL: ["Tel Aviv", "Jerusalem", "Haifa"],
  KR: ["Seoul", "Busan", "Incheon", "Daegu"],
  MX: ["Mexico City", "Guadalajara", "Monterrey", "Puebla", "Cancún"],
  PK: ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta"],
  SA: ["Riyadh", "Jeddah", "Mecca", "Medina", "Dammam"],
  ZA: ["Johannesburg", "Cape Town", "Durban", "Pretoria"],
  NG: ["Lagos", "Abuja", "Kano", "Ibadan"],
  EG: ["Cairo", "Alexandria", "Giza"],
  PH: ["Manila", "Quezon City", "Cebu City", "Davao City"],
  TH: ["Bangkok", "Chiang Mai", "Pattaya", "Phuket"],
  MY: ["Kuala Lumpur", "George Town", "Johor Bahru"],
  ID: ["Jakarta", "Surabaya", "Bandung", "Bali"],
  VN: ["Ho Chi Minh City", "Hanoi", "Da Nang"],
  CO: ["Bogotá", "Medellín", "Cali", "Barranquilla"],
  AR: ["Buenos Aires", "Córdoba", "Rosario", "Mendoza"],
  CL: ["Santiago", "Valparaíso", "Concepción"],
  PT: ["Lisbon", "Porto", "Faro"],
  GR: ["Athens", "Thessaloniki", "Heraklion"],
  TR: ["Istanbul", "Ankara", "Izmir", "Antalya"],
  RU: ["Moscow", "Saint Petersburg", "Novosibirsk", "Yekaterinburg"],
  UA: ["Kyiv", "Lviv", "Odesa", "Kharkiv"],
  RO: ["Bucharest", "Cluj-Napoca", "Timișoara"],
  CZ: ["Prague", "Brno", "Ostrava"],
  HU: ["Budapest", "Debrecen", "Szeged"],
  AT: ["Vienna", "Graz", "Salzburg"],
  CH: ["Zurich", "Geneva", "Basel", "Bern"],
  BE: ["Brussels", "Antwerp", "Ghent"],
  QA: ["Doha"],
  KW: ["Kuwait City"],
  BD: ["Dhaka", "Chittagong", "Sylhet"],
  LK: ["Colombo", "Kandy", "Galle"],
  NP: ["Kathmandu", "Pokhara"],
  KE: ["Nairobi", "Mombasa"],
  GH: ["Accra", "Kumasi"],
  TZ: ["Dar es Salaam", "Dodoma"],
  MA: ["Casablanca", "Marrakech", "Rabat"],
  TN: ["Tunis", "Sfax", "Sousse"],
  ET: ["Addis Ababa"],
  PE: ["Lima", "Cusco", "Arequipa"],
  EC: ["Quito", "Guayaquil"],
  CR: ["San José"],
  PA: ["Panama City"],
  JM: ["Kingston", "Montego Bay"],
  DO: ["Santo Domingo", "Santiago"],
  GT: ["Guatemala City"],
  HK: ["Hong Kong"],
  TW: ["Taipei", "Kaohsiung", "Taichung"],
  KZ: ["Almaty", "Astana"],
  BG: ["Sofia", "Plovdiv"],
  RS: ["Belgrade", "Novi Sad"],
  SK: ["Bratislava", "Košice"],
  SI: ["Ljubljana", "Maribor"],
  LT: ["Vilnius", "Kaunas"],
  LV: ["Riga"],
  EE: ["Tallinn", "Tartu"],
  IS: ["Reykjavik"],
  LU: ["Luxembourg City"],
  UY: ["Montevideo"],
  VE: ["Caracas", "Maracaibo"],
  MM: ["Yangon", "Mandalay"],
  KH: ["Phnom Penh", "Siem Reap"],
  JO: ["Amman"],
  LB: ["Beirut"],
  IQ: ["Baghdad", "Erbil"],
  IR: ["Tehran", "Isfahan", "Shiraz"],
  OM: ["Muscat"],
};

const SERVICES_LIST = [
  "SEO", "PPC / Paid Advertising", "Social Media Marketing", "Content Marketing",
  "Email Marketing", "Web Design", "Web Development", "Mobile App Development",
  "Branding", "Video Production", "PR & Communications", "Influencer Marketing",
  "Affiliate Marketing", "Conversion Rate Optimization", "Marketing Automation",
  "Analytics & Data Science", "E-commerce Development", "UI/UX Design",
  "Graphic Design", "Copywriting", "Market Research", "Digital Strategy",
  "Amazon Marketing", "Podcast Production", "AR/VR Development",
  "Blockchain Development", "AI & Machine Learning", "Cybersecurity",
];

const INDUSTRIES_LIST = [
  "E-commerce & Retail", "SaaS & Software", "Healthcare & Medical", "Financial Services",
  "Real Estate", "Education & E-learning", "Travel & Hospitality", "Food & Beverage",
  "Fashion & Apparel", "Technology", "Automotive", "Entertainment & Media",
  "Non-profit & NGO", "Legal Services", "Manufacturing", "Energy & Utilities",
  "Telecommunications", "Government & Public Sector", "Agriculture",
  "Sports & Fitness", "Beauty & Cosmetics", "Construction & Architecture",
  "Logistics & Transportation", "Insurance", "Gaming", "Pharmaceuticals",
  "Cryptocurrency & Web3", "HR & Recruitment", "B2B Services", "Consumer Goods",
];

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[&/]/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: Request) {
  try {
    if (!hasDb()) {
      return error("Database not available", 503);
    }

    const url = new URL(request.url);
    const isInit = url.searchParams.get("init") === "true";

    // Allow unauthenticated access only for first-time setup (no users exist)
    let skipAuth = false;
    if (isInit) {
      const db = getDb();
      const userCount = await db.execute(sql`SELECT count(*) as count FROM users`);
      const count = Number((userCount as unknown as Array<{ count: string }>)[0]?.count ?? 1);
      if (count === 0) {
        skipAuth = true;
      }
    }

    if (!skipAuth) {
      const authResult = await requireRole(request as unknown as import("next/server").NextRequest, "super_admin");
      if ("error" in authResult) return authResult.error;
    }

    const db = getDb();
    const force = url.searchParams.get("force") === "true";

    const results: Record<string, string> = {};

    // Ensure all tables exist
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "services" (
          "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          "name" varchar(255) NOT NULL,
          "slug" varchar(255) NOT NULL UNIQUE,
          "description" text,
          "icon" varchar(50),
          "parent_id" uuid,
          "agency_count" integer DEFAULT 0,
          "sort_order" integer DEFAULT 0
        )
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "industries" (
          "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          "name" varchar(255) NOT NULL,
          "slug" varchar(255) NOT NULL UNIQUE,
          "description" text,
          "icon" varchar(50),
          "agency_count" integer DEFAULT 0,
          "sort_order" integer DEFAULT 0
        )
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "agency_services" (
          "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          "agency_id" uuid NOT NULL REFERENCES "agencies"("id") ON DELETE CASCADE,
          "service_id" uuid NOT NULL REFERENCES "services"("id") ON DELETE CASCADE
        )
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "agency_industries" (
          "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          "agency_id" uuid NOT NULL REFERENCES "agencies"("id") ON DELETE CASCADE,
          "industry_id" uuid NOT NULL REFERENCES "industries"("id") ON DELETE CASCADE
        )
      `);
      results.tables = "ensured";
    } catch (e: unknown) {
      results.tables = `error: ${e instanceof Error ? e.message : String(e)}`;
    }

    // Seed countries
    const existingCountries = await db.select({ id: countries.id }).from(countries).limit(1);
    if (existingCountries.length === 0 || force) {
      try {
        const inserted = await db
          .insert(countries)
          .values(
            COUNTRIES.map((c) => ({
              name: c.name,
              slug: toSlug(c.name),
              code: c.code,
              continent: c.continent,
            }))
          )
          .onConflictDoNothing()
          .returning();
        results.countries = `${inserted.length} inserted`;

        const countryMap = new Map(inserted.length > 0
          ? inserted.map((c) => [c.code, c.id])
          : (await db.select().from(countries)).map((c) => [c.code, c.id])
        );

        const cityValues: { name: string; slug: string; countryId: string; stateProvince: string | null }[] = [];
        for (const [code, cityNames] of Object.entries(CITIES_BY_COUNTRY)) {
          const countryId = countryMap.get(code);
          if (!countryId) continue;
          for (const name of cityNames) {
            cityValues.push({ name, slug: toSlug(name), countryId, stateProvince: null });
          }
        }
        if (cityValues.length > 0) {
          await db.insert(cities).values(cityValues).onConflictDoNothing();
        }
        results.cities = `${cityValues.length} processed`;
      } catch (e: unknown) {
        results.countries = `error: ${e instanceof Error ? e.message : String(e)}`;
      }
    } else {
      results.countries = "already seeded";
    }

    // Seed services using raw SQL (Drizzle ORM schema has parent_id which doesn't exist in DB)
    try {
      const existingSvc = await db.execute(sql`SELECT count(*) as count FROM services`);
      const svcCount = Number((existingSvc as unknown as Array<{ count: string }>)[0]?.count ?? 0);
      if (svcCount < SERVICES_LIST.length) {
        for (let i = 0; i < SERVICES_LIST.length; i++) {
          await db.execute(sql`
            INSERT INTO services (name, slug, sort_order)
            VALUES (${SERVICES_LIST[i]}, ${toSlug(SERVICES_LIST[i])}, ${i})
            ON CONFLICT (slug) DO NOTHING
          `);
        }
        results.services = `${SERVICES_LIST.length} processed (had ${svcCount})`;
      } else {
        results.services = `already seeded (${svcCount})`;
      }
    } catch (e: unknown) {
      results.services = `error: ${e instanceof Error ? e.message : String(e)}`;
    }

    // Seed industries using raw SQL
    try {
      const existingInd = await db.execute(sql`SELECT count(*) as count FROM industries`);
      const indCount = Number((existingInd as unknown as Array<{ count: string }>)[0]?.count ?? 0);
      if (indCount < INDUSTRIES_LIST.length) {
        for (let i = 0; i < INDUSTRIES_LIST.length; i++) {
          await db.execute(sql`
            INSERT INTO industries (name, slug, sort_order)
            VALUES (${INDUSTRIES_LIST[i]}, ${toSlug(INDUSTRIES_LIST[i])}, ${i})
            ON CONFLICT (slug) DO NOTHING
          `);
        }
        results.industries = `${INDUSTRIES_LIST.length} processed (had ${indCount})`;
      } else {
        results.industries = `already seeded (${indCount})`;
      }
    } catch (e: unknown) {
      results.industries = `error: ${e instanceof Error ? e.message : String(e)}`;
    }

    return Response.json({ message: "Setup complete", results });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("POST /api/setup error:", err);
    }
    return serverError(err);
  }
}
