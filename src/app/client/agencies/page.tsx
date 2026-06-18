"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  Building2,
  Star,
  MapPin,
  Loader2,
  Inbox,
  ExternalLink,
  MessageSquare,
} from "lucide-react";

interface Agency {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  city: string | null;
  country: string | null;
  average_rating: number | null;
  total_reviews: number | null;
  status: string;
}

export default function ClientAgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchAgencies();
  }, [page]);

  async function fetchAgencies() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "12" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/agencies?${params}`);
      if (res.ok) {
        const json = await res.json();
        setAgencies(json.data ?? []);
        setTotalPages(json.pagination?.totalPages ?? 1);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchAgencies();
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Find Agencies</h1>
        <p className="mt-1 text-gray-500">Browse and discover top marketing agencies for your projects.</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agencies by name..."
            className="w-full pl-10 pr-24 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-brand text-white text-xs font-medium rounded-lg hover:bg-brand-dark"
          >
            Search
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
        </div>
      ) : agencies.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No agencies found. Try a different search.</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agencies.map((agency) => (
              <div key={agency.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                      {agency.logo ? (
                        <Image src={agency.logo} alt="" width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <Building2 className="w-6 h-6 text-brand" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-navy text-sm truncate">{agency.name}</h3>
                      {(agency.city || agency.country) && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {[agency.city, agency.country].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>

                  {agency.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{agency.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    {Number(agency.average_rating) > 0 ? (
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-medium text-navy">
                          {Number(agency.average_rating).toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({agency.total_reviews})
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No reviews yet</span>
                    )}
                  </div>
                </div>
                <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-end gap-2">
                  <Link
                    href={`/agencies/${agency.slug}`}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
