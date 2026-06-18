import type { Metadata } from "next";
import Link from "next/link";
import { Star, MapPin, ExternalLink, Building2 } from "lucide-react";
import {
  AgencySearchBar,
  AgencySidebar,
} from "@/components/agencies/AgencyFilters";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Top Marketing Agencies - Browse & Compare",
  description:
    "Explore top-rated marketing agencies worldwide. Filter by service, location, budget, and company size. Read verified reviews and get free quotes.",
  keywords: [
    "marketing agencies directory",
    "top marketing agencies",
    "find marketing agency",
    "SEO agencies",
    "PPC agencies",
    "digital marketing agencies",
    "agency reviews",
    "agency comparison",
  ],
  openGraph: {
    title: "Top Marketing Agencies - Browse & Compare | AgencyHub",
    description:
      "Explore top-rated marketing agencies worldwide. Filter by service, location, budget, and company size.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Top Marketing Agencies - Browse & Compare | AgencyHub",
    description:
      "Explore top-rated marketing agencies worldwide. Filter by service, location, budget, and company size.",
  },
  alternates: {
    canonical: "/agencies",
  },
};

interface Agency {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  average_rating: number | null;
  total_reviews: number | null;
  company_size: string | null;
  min_project_size: string | null;
  logo: string | null;
  services: string[];
  location: string;
}

const LOGO_COLORS = [
  "bg-blue-600",
  "bg-amber-500",
  "bg-purple-600",
  "bg-emerald-600",
  "bg-rose-600",
  "bg-cyan-600",
  "bg-indigo-600",
  "bg-green-600",
  "bg-orange-600",
  "bg-teal-600",
];

function getLogoColor(index: number): string {
  return LOGO_COLORS[index % LOGO_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

async function fetchAgencies(): Promise<Agency[]> {
  if (!hasDb()) return [];
  const db = getDb();
  try {
    const rows = await db.execute(
      sql`SELECT a.*,
          COALESCE(
            (SELECT string_agg(s.name, ', ')
             FROM agency_services asv
             JOIN services s ON s.id = asv.service_id
             WHERE asv.agency_id = a.id),
            ''
          ) as service_names,
          COALESCE(c.name, '') as country_name,
          COALESCE(ci.name, '') as city_name
        FROM agencies a
        LEFT JOIN countries c ON a.country_id = c.id
        LEFT JOIN cities ci ON a.city_id = ci.id
        WHERE a.status = 'active' AND a.deleted_at IS NULL
        ORDER BY a.average_rating DESC NULLS LAST`
    );

    return (rows as unknown as Array<Record<string, unknown>>).map((row) => {
      const serviceNames = (row.service_names as string) || "";
      const cityName = (row.city_name as string) || "";
      const countryName = (row.country_name as string) || "";
      const locationParts = [cityName, countryName].filter(Boolean);

      return {
        id: row.id as string,
        name: (row.name as string) || "",
        slug: (row.slug as string) || "",
        tagline: (row.tagline as string) || null,
        average_rating: row.average_rating ? Number(row.average_rating) : null,
        total_reviews: row.total_reviews ? Number(row.total_reviews) : null,
        company_size: (row.company_size as string) || null,
        min_project_size: row.min_project_size ? String(row.min_project_size) : null,
        logo: (row.logo as string) || null,
        services: serviceNames ? serviceNames.split(", ") : [],
        location: locationParts.length > 0 ? locationParts.join(", ") : "Remote",
      };
    });
  } catch (error) {
    console.error("Error fetching agencies:", error);
    return [];
  }
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = rating >= star;
        const halfFilled = !filled && rating >= star - 0.5;
        return (
          <Star
            key={star}
            className={`w-4 h-4 ${
              filled
                ? "text-amber-400 fill-amber-400"
                : halfFilled
                  ? "text-amber-400 fill-amber-400/50"
                  : "text-gray-300"
            }`}
          />
        );
      })}
    </div>
  );
}

function AgencyCard({ agency, index }: { agency: Agency; index: number }) {
  const logoColor = getLogoColor(index);
  const initials = getInitials(agency.name);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 hover:border-brand/40 hover:shadow-md transition-all group">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
        {/* Logo */}
        {agency.logo ? (
          <img
            src={agency.logo}
            alt={`${agency.name} logo`}
            width={80}
            height={80}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div
            className={`${logoColor} w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center shrink-0`}
          >
            <span className="text-white font-bold text-xl sm:text-2xl">
              {initials}
            </span>
          </div>
        )}

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-navy group-hover:text-brand transition-colors truncate">
                {agency.name}
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <StarRating rating={agency.average_rating ?? 0} />
                <span className="text-sm font-medium text-navy">
                  {agency.average_rating?.toFixed(1) ?? "N/A"}
                </span>
                <span className="text-sm text-gray-500">
                  ({agency.total_reviews ?? 0} reviews)
                </span>
              </div>
            </div>

            <Link
              href={`/agencies/${agency.slug}`}
              className="inline-flex items-center gap-1.5 bg-brand text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors shrink-0 self-start"
            >
              View Profile
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {agency.tagline && (
            <p className="mt-2 text-gray-600 text-sm leading-relaxed line-clamp-2">
              {agency.tagline}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {agency.location}
            </span>
            {agency.company_size && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                {agency.company_size}
              </span>
            )}
          </div>

          {agency.services.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {agency.services.map((service) => (
                <span
                  key={service}
                  className="inline-block bg-blue-50 text-brand text-xs font-medium px-2.5 py-1 rounded-full"
                >
                  {service}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function filterAgencies(
  agencies: Agency[],
  filters: {
    q: string;
    service: string;
    location: string;
    size: string;
    budget: string;
  }
): Agency[] {
  return agencies.filter((agency) => {
    if (filters.q) {
      const query = filters.q.toLowerCase();
      const matchesName = agency.name.toLowerCase().includes(query);
      const matchesTagline = (agency.tagline || "").toLowerCase().includes(query);
      const matchesService = agency.services.some((s) =>
        s.toLowerCase().includes(query)
      );
      const matchesLocation = agency.location.toLowerCase().includes(query);
      if (!matchesName && !matchesTagline && !matchesService && !matchesLocation) {
        return false;
      }
    }
    if (filters.service && !agency.services.some((s) => s.toLowerCase() === filters.service.toLowerCase())) {
      return false;
    }
    if (filters.location && agency.location !== filters.location) {
      return false;
    }
    if (filters.size && agency.company_size !== filters.size) {
      return false;
    }
    return true;
  });
}

export default async function AgenciesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const q = typeof params.q === "string" ? params.q : "";
  const service = typeof params.service === "string" ? params.service : "";
  const location = typeof params.location === "string" ? params.location : "";
  const size = typeof params.size === "string" ? params.size : "";
  const budget = typeof params.budget === "string" ? params.budget : "";

  const allAgencies = await fetchAgencies();

  const filteredAgencies = filterAgencies(allAgencies, {
    q,
    service,
    location,
    size,
    budget,
  });

  const activeFilterCount = [service, location, size, budget].filter(Boolean).length;

  const agenciesJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Marketing Agency Directory",
    description:
      "Explore top-rated marketing agencies worldwide. Filter by service, location, budget, and company size. Read verified reviews and get free quotes.",
    url: "https://www.agencyhub.com/agencies",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(agenciesJsonLd) }}
      />
      {/* Page header */}
      <section className="bg-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Find the Best Marketing Agencies
          </h1>
          <p className="mt-3 text-gray-300 text-lg max-w-2xl">
            Browse {allAgencies.length > 0 ? `${allAgencies.length}` : "our"} vetted agencies. Filter by service,
            location, and budget to find your perfect match.
          </p>
          <div className="mt-8 max-w-2xl">
            <AgencySearchBar initialQuery={q} />
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-8">
            {/* Sidebar filters */}
            <AgencySidebar
              initialFilters={{ service, location, size, budget }}
            />

            {/* Results */}
            <div className="flex-1 min-w-0">
              {/* Results header */}
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-navy">
                    {filteredAgencies.length}
                  </span>{" "}
                  {filteredAgencies.length === 1 ? "agency" : "agencies"} found
                  {q && (
                    <>
                      {" "}
                      for{" "}
                      <span className="font-medium text-navy">
                        &ldquo;{q}&rdquo;
                      </span>
                    </>
                  )}
                  {activeFilterCount > 0 && (
                    <span className="text-gray-400">
                      {" "}
                      &middot; {activeFilterCount} filter
                      {activeFilterCount > 1 ? "s" : ""} active
                    </span>
                  )}
                </p>
              </div>

              {/* Agency list */}
              {filteredAgencies.length > 0 ? (
                <div className="space-y-4">
                  {filteredAgencies.map((agency, index) => (
                    <AgencyCard key={agency.id} agency={agency} index={index} />
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                  <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Building2 className="w-7 h-7 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-navy">
                    No agencies found
                  </h3>
                  <p className="mt-2 text-gray-500 max-w-md mx-auto">
                    {allAgencies.length === 0
                      ? "No agencies have been listed yet. Check back soon!"
                      : "Try adjusting your search or filters to find what you're looking for. You can also browse all agencies by clearing your filters."}
                  </p>
                  {allAgencies.length > 0 && (
                    <Link
                      href="/agencies"
                      className="inline-flex items-center gap-2 mt-6 bg-brand text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
                    >
                      View All Agencies
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
