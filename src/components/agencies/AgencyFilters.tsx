"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  MapPin,
  Briefcase,
  Users,
  DollarSign,
} from "lucide-react";

const SERVICE_OPTIONS = [
  "SEO",
  "PPC",
  "Social Media Marketing",
  "Web Design",
  "Content Marketing",
  "Branding",
  "Email Marketing",
  "Video Production",
  "PR & Communications",
  "UX/UI Design",
];

const LOCATION_OPTIONS = [
  "New York, USA",
  "London, UK",
  "San Francisco, USA",
  "Toronto, Canada",
  "Berlin, Germany",
  "Sydney, Australia",
  "Dubai, UAE",
  "Singapore",
  "Amsterdam, Netherlands",
  "Remote",
];

const COMPANY_SIZE_OPTIONS = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "500+ employees",
];

const BUDGET_OPTIONS = [
  "Under $5,000",
  "$5,000 - $10,000",
  "$10,000 - $25,000",
  "$25,000 - $50,000",
  "$50,000 - $100,000",
  "$100,000+",
];

function FilterSelect({
  label,
  icon: Icon,
  options,
  value,
  onChange,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-navy mb-2">
        <Icon className="w-4 h-4 text-gray-500" />
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm text-gray-700 hover:border-brand focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none transition-colors cursor-pointer"
        >
          <option value="">All {label}s</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

export function AgencySearchBar({
  initialQuery,
}: {
  initialQuery: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const params = new URLSearchParams(searchParams.toString());
      if (query) {
        params.set("q", query);
      } else {
        params.delete("q");
      }
      router.push(`/agencies?${params.toString()}`);
    },
    [query, router, searchParams]
  );

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="flex-1 flex items-center px-4">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agencies by name, service, or location..."
            className="w-full px-3 py-4 text-gray-800 placeholder-gray-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                const params = new URLSearchParams(searchParams.toString());
                params.delete("q");
                router.push(`/agencies?${params.toString()}`);
              }}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className="bg-brand text-white px-6 md:px-8 font-medium hover:bg-brand-dark transition-colors"
        >
          Search
        </button>
      </div>
    </form>
  );
}

export function AgencySidebar({
  initialFilters,
}: {
  initialFilters: {
    service: string;
    location: string;
    size: string;
    budget: string;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [filters, setFilters] = useState(initialFilters);

  const applyFilter = useCallback(
    (key: string, value: string) => {
      const next = { ...filters, [key]: value };
      setFilters(next);
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/agencies?${params.toString()}`);
    },
    [filters, router, searchParams]
  );

  const clearAll = useCallback(() => {
    setFilters({ service: "", location: "", size: "", budget: "" });
    const params = new URLSearchParams(searchParams.toString());
    params.delete("service");
    params.delete("location");
    params.delete("size");
    params.delete("budget");
    router.push(`/agencies?${params.toString()}`);
  }, [router, searchParams]);

  const activeCount = Object.values(filters).filter(Boolean).length;

  const filterContent = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-navy">Filters</h3>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-brand hover:text-brand-dark transition-colors"
          >
            Clear all ({activeCount})
          </button>
        )}
      </div>

      <FilterSelect
        label="Service"
        icon={Briefcase}
        options={SERVICE_OPTIONS}
        value={filters.service}
        onChange={(v) => applyFilter("service", v)}
      />
      <FilterSelect
        label="Location"
        icon={MapPin}
        options={LOCATION_OPTIONS}
        value={filters.location}
        onChange={(v) => applyFilter("location", v)}
      />
      <FilterSelect
        label="Company Size"
        icon={Users}
        options={COMPANY_SIZE_OPTIONS}
        value={filters.size}
        onChange={(v) => applyFilter("size", v)}
      />
      <FilterSelect
        label="Budget"
        icon={DollarSign}
        options={BUDGET_OPTIONS}
        value={filters.budget}
        onChange={(v) => applyFilter("budget", v)}
      />
    </div>
  );

  return (
    <>
      {/* Mobile filter toggle */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium text-navy hover:border-brand transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeCount > 0 && (
            <span className="bg-brand text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-full max-w-sm bg-white shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-navy">Filters</h2>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4">{filterContent}</div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-8 bg-white border border-gray-200 rounded-xl p-6">
          {filterContent}
        </div>
      </aside>
    </>
  );
}
