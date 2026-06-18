"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Star,
  MapPin,
  Building2,
  DollarSign,
  Calendar,
  X,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

interface Agency {
  id: string;
  name: string;
  slug: string;
  rating: number;
  reviews: number;
  location: string;
  size: string;
  hourlyRate: string;
  minProject: number | null;
  founded: string;
  services: string[];
  industries: string[];
  verified: boolean;
  featured: boolean;
}

function mapApiAgency(raw: Record<string, unknown>): Agency {
  const cityName = raw.city
    ? (raw.city as { name?: string }).name
    : null;
  const countryName = raw.country
    ? (raw.country as { name?: string }).name
    : null;
  const locationParts = [cityName, countryName].filter(Boolean);

  const services = Array.isArray(raw.services)
    ? (raw.services as { name?: string }[]).map((s) => s.name ?? "")
    : [];
  const industries = Array.isArray(raw.industries)
    ? (raw.industries as { name?: string }[]).map((i) => i.name ?? "")
    : [];

  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    slug: String(raw.slug ?? ""),
    rating: Number(raw.averageRating ?? raw.average_rating ?? 0),
    reviews: Number(raw.totalReviews ?? raw.total_reviews ?? 0),
    location: locationParts.length > 0 ? locationParts.join(", ") : "-",
    size: String(raw.companySize ?? raw.company_size ?? "-"),
    hourlyRate: String(raw.hourlyRate ?? raw.hourly_rate ?? "-"),
    minProject:
      raw.minProjectSize != null
        ? Number(raw.minProjectSize)
        : raw.min_project_size != null
          ? Number(raw.min_project_size)
          : null,
    founded: String(raw.foundedYear ?? raw.founded_year ?? "-"),
    services,
    industries,
    verified: Boolean(raw.isVerified ?? raw.is_verified ?? false),
    featured: Boolean(raw.isFeatured ?? raw.is_featured ?? false),
  };
}

const comparisonFields = [
  { key: "rating", label: "Rating", icon: Star },
  { key: "reviews", label: "Reviews", icon: Star },
  { key: "location", label: "Location", icon: MapPin },
  { key: "size", label: "Company Size", icon: Building2 },
  { key: "hourlyRate", label: "Hourly Rate", icon: DollarSign },
  { key: "minProject", label: "Min Project Size", icon: DollarSign },
  { key: "founded", label: "Founded", icon: Calendar },
] as const;

export default function ComparePage() {
  const [selected, setSelected] = useState<Agency[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [availableAgencies, setAvailableAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load agencies on mount
  useEffect(() => {
    async function fetchAgencies() {
      try {
        setLoading(true);
        const res = await fetch("/api/search?limit=20");
        if (!res.ok) throw new Error("Failed to fetch agencies");
        const json = await res.json();
        const agencies = (json.data ?? []).map((a: Record<string, unknown>) =>
          mapApiAgency(a)
        );
        setAvailableAgencies(agencies);
      } catch (err) {
        console.error("Error loading agencies:", err);
        setAvailableAgencies([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAgencies();
  }, []);

  // Search agencies with debounce
  const searchAgencies = useCallback(async (term: string) => {
    if (!term.trim()) {
      // Reset to default list
      try {
        setSearching(true);
        const res = await fetch("/api/search?limit=20");
        if (!res.ok) throw new Error("Failed to fetch agencies");
        const json = await res.json();
        const agencies = (json.data ?? []).map((a: Record<string, unknown>) =>
          mapApiAgency(a)
        );
        setAvailableAgencies(agencies);
      } catch (err) {
        console.error("Error loading agencies:", err);
      } finally {
        setSearching(false);
      }
      return;
    }

    try {
      setSearching(true);
      const res = await fetch(
        `/api/search?query=${encodeURIComponent(term)}&limit=20`
      );
      if (!res.ok) throw new Error("Search failed");
      const json = await res.json();
      const agencies = (json.data ?? []).map((a: Record<string, unknown>) =>
        mapApiAgency(a)
      );
      setAvailableAgencies(agencies);
    } catch (err) {
      console.error("Error searching agencies:", err);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search on query change
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchAgencies(searchQuery);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchAgencies]);

  const filtered = availableAgencies.filter(
    (a) => !selected.find((s) => s.id === a.id)
  );

  const addAgency = (agency: Agency) => {
    if (selected.length < 4) {
      setSelected([...selected, agency]);
      setShowPicker(false);
      setSearchQuery("");
    }
  };

  const removeAgency = (id: string) => {
    setSelected(selected.filter((a) => a.id !== id));
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <section className="bg-navy py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white">Compare Agencies</h1>
          <p className="mt-2 text-gray-300">
            Select up to 4 agencies to compare side by side
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Selection Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex flex-wrap items-center gap-3">
            {selected.map((agency) => (
              <div
                key={agency.id}
                className="flex items-center gap-2 bg-blue-50 text-brand px-3 py-2 rounded-lg"
              >
                <span className="text-sm font-medium">{agency.name}</span>
                <button
                  onClick={() => removeAgency(agency.id)}
                  className="text-brand/60 hover:text-brand"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {selected.length < 4 && (
              <div className="relative">
                <button
                  onClick={() => setShowPicker(!showPicker)}
                  className="flex items-center gap-2 border-2 border-dashed border-gray-300 text-gray-500 px-4 py-2 rounded-lg hover:border-brand hover:text-brand transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Agency
                </button>
                {showPicker && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-20">
                    <div className="p-3 border-b border-gray-100">
                      <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search agencies..."
                          className="bg-transparent text-sm focus:outline-none w-full"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-2">
                      {loading || searching ? (
                        <div className="flex items-center justify-center py-4 gap-2">
                          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                          <p className="text-sm text-gray-400">Loading agencies...</p>
                        </div>
                      ) : filtered.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">
                          No agencies found
                        </p>
                      ) : (
                        filtered.map((agency) => (
                          <button
                            key={agency.id}
                            onClick={() => addAgency(agency)}
                            className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <p className="text-sm font-medium text-navy">
                              {agency.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {agency.location} · {agency.rating} stars
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Comparison Table */}
        {selected.length >= 2 ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 w-48">
                    Feature
                  </th>
                  {selected.map((agency) => (
                    <th key={agency.id} className="px-6 py-4 text-center min-w-[200px]">
                      <Link
                        href={`/agencies/${agency.slug}`}
                        className="text-navy font-semibold hover:text-brand transition-colors"
                      >
                        {agency.name}
                      </Link>
                      {agency.verified && (
                        <span className="block text-xs text-brand mt-1">
                          Verified
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comparisonFields.map((field) => {
                  const Icon = field.icon;
                  return (
                    <tr key={field.key} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Icon className="w-4 h-4 text-gray-400" />
                          {field.label}
                        </div>
                      </td>
                      {selected.map((agency) => {
                        const value = agency[field.key as keyof Agency];
                        const isEmpty =
                          value === null ||
                          value === undefined ||
                          value === "" ||
                          value === "-" ||
                          value === 0;
                        return (
                          <td
                            key={agency.id}
                            className="px-6 py-4 text-center text-sm text-navy"
                          >
                            {field.key === "rating" ? (
                              <div className="flex items-center justify-center gap-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                <span className="font-medium">
                                  {isEmpty ? "N/A" : value}
                                </span>
                              </div>
                            ) : field.key === "minProject" ? (
                              isEmpty
                                ? "N/A"
                                : `$${(value as number).toLocaleString()}`
                            ) : isEmpty ? (
                              <span className="text-gray-400">N/A</span>
                            ) : (
                              String(value)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Services Row */}
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">Services</td>
                  {selected.map((agency) => (
                    <td key={agency.id} className="px-6 py-4">
                      <div className="flex flex-wrap justify-center gap-1">
                        {agency.services.map((s) => (
                          <span
                            key={s}
                            className="text-xs bg-blue-50 text-brand px-2 py-0.5 rounded-full"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Industries Row */}
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">Industries</td>
                  {selected.map((agency) => (
                    <td key={agency.id} className="px-6 py-4">
                      <div className="flex flex-wrap justify-center gap-1">
                        {agency.industries.map((ind) => (
                          <span
                            key={ind}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                          >
                            {ind}
                          </span>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Feature Checks */}
                {["Verified", "Featured"].map((feat) => (
                  <tr key={feat} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">{feat}</td>
                    {selected.map((agency) => {
                      const has =
                        feat === "Verified" ? agency.verified : agency.featured;
                      return (
                        <td key={agency.id} className="px-6 py-4 text-center">
                          {has ? (
                            <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-300 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* CTA */}
            <div className="px-6 py-5 bg-gray-50 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-gray-600">
                  Need help deciding? Get personalized recommendations.
                </p>
                <Link
                  href="/get-quotes"
                  className="bg-brand text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
                >
                  Get Free Quotes
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-navy">
              Select at least 2 agencies to compare
            </h3>
            <p className="mt-2 text-gray-500 max-w-md mx-auto">
              Use the &quot;Add Agency&quot; button above to select agencies, then
              compare their ratings, pricing, services, and more side by side.
            </p>
            <Link
              href="/agencies"
              className="mt-6 inline-block text-brand font-medium hover:text-brand-dark transition-colors"
            >
              Browse Agencies →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
