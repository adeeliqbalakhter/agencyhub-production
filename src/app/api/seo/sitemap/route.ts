import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { serverError } from "@/lib/api/response";

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://example.com";
    const staticPages = [
      { url: "/", priority: "1.0", changefreq: "daily" },
      { url: "/agencies", priority: "0.9", changefreq: "daily" },
      { url: "/search", priority: "0.8", changefreq: "daily" },
      { url: "/get-quotes", priority: "0.7", changefreq: "weekly" },
      { url: "/auth/signin", priority: "0.3", changefreq: "monthly" },
      { url: "/auth/signup", priority: "0.3", changefreq: "monthly" },
    ];

    const dynamicPages: Array<{ url: string; priority: string; changefreq: string; lastmod?: string }> = [];

    if (hasDb()) {
      const db = getDb();

      const agencies = await db.execute(sql`
        SELECT slug, updated_at FROM agencies WHERE status = 'active' AND deleted_at IS NULL ORDER BY updated_at DESC
      `);
      for (const a of agencies as unknown as Array<{ slug: string; updated_at: string }>) {
        dynamicPages.push({
          url: `/agencies/${a.slug}`,
          priority: "0.8",
          changefreq: "weekly",
          lastmod: new Date(a.updated_at).toISOString().split("T")[0],
        });
      }

      const services = await db.execute(sql`SELECT slug FROM services ORDER BY name`);
      for (const s of services as unknown as Array<{ slug: string }>) {
        dynamicPages.push({ url: `/services/${s.slug}`, priority: "0.6", changefreq: "weekly" });
      }

      const industries = await db.execute(sql`SELECT slug FROM industries ORDER BY name`);
      for (const i of industries as unknown as Array<{ slug: string }>) {
        dynamicPages.push({ url: `/industries/${i.slug}`, priority: "0.6", changefreq: "weekly" });
      }
    }

    const allPages: Array<{ url: string; priority: string; changefreq: string; lastmod?: string }> = [...staticPages, ...dynamicPages];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (p) => `  <url>
    <loc>${baseUrl}${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>${p.lastmod ? `\n    <lastmod>${p.lastmod}</lastmod>` : ""}
  </url>`
  )
  .join("\n")}
</urlset>`;

    return new Response(xml, {
      headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    return serverError(err);
  }
}
