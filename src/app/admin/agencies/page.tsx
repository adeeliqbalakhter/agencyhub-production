"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  Star,
  Trash2,
  Award,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

type AgencyStatus = "active" | "draft" | "pending" | "rejected" | "suspended";

interface Agency {
  id: string;
  name: string;
  slug: string;
  email: string;
  status: AgencyStatus;
  is_verified: boolean;
  is_featured: boolean;
  is_premium: boolean;
  average_rating: number | null;
  total_reviews: number;
  created_at: string;
  owner_name: string | null;
  owner_email: string | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusTabs = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
  { label: "Rejected", value: "rejected" },
];

const ITEMS_PER_PAGE = 10;

export default function AdminAgenciesPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAgencies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", String(ITEMS_PER_PAGE));
      if (statusFilter) params.set("status", statusFilter);
      if (searchQuery) params.set("query", searchQuery);

      const res = await fetch(`/api/admin/agencies?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load agencies (${res.status})`);
      }
      const json = await res.json();
      setAgencies(json.data ?? []);
      setPagination(json.pagination ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agencies");
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, searchQuery]);

  useEffect(() => {
    fetchAgencies();
  }, [fetchAgencies]);

  const handleAction = async (agencyId: string, action: "approve" | "reject" | "suspend" | "delete" | "verify" | "feature") => {
    try {
      setActionLoading(agencyId);
      if (action === "delete") {
        if (!confirm("Are you sure you want to delete this agency?")) {
          setActionLoading(null);
          return;
        }
        const res = await fetch(`/api/agencies/${agencyId}`, { method: "DELETE" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to delete agency");
        }
      } else {
        const res = await fetch(`/api/admin/agencies/${agencyId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Failed to ${action} agency`);
        }
      }
      setOpenDropdown(null);
      await fetchAgencies();
    } catch (err) {
      alert(err instanceof Error ? err.message : `Failed to ${action} agency`);
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = pagination?.totalPages ?? 1;
  const total = pagination?.total ?? 0;

  const statusBadge = (status: AgencyStatus) => {
    const styles: Record<string, string> = {
      active: "bg-emerald-50 text-emerald-700",
      draft: "bg-gray-100 text-gray-600",
      pending: "bg-amber-50 text-amber-700",
      suspended: "bg-red-50 text-red-700",
      rejected: "bg-gray-100 text-gray-700",
    };
    const labels: Record<string, string> = {
      active: "Active",
      draft: "Draft",
      pending: "Pending",
      suspended: "Suspended",
      rejected: "Rejected",
    };
    return (
      <span
        className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${styles[status] ?? "bg-gray-100 text-gray-700"}`}
      >
        {labels[status] ?? status}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Agencies Management</h1>
        <p className="mt-1 text-gray-500">
          Review, approve, and manage all agencies on the platform.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Status Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  statusFilter === tab.value
                    ? "bg-white text-navy shadow-sm"
                    : "text-gray-500 hover:text-navy"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-sm ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search agencies..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={fetchAgencies}
            className="inline-flex items-center gap-1 text-sm font-medium text-red-700 hover:text-red-800"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3 font-medium text-gray-500">
                      Agency
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500 hidden md:table-cell">
                      Owner
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">
                      Status
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500 hidden lg:table-cell">
                      Rating
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500 hidden lg:table-cell">
                      Reviews
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500 hidden xl:table-cell">
                      Created
                    </th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {agencies.map((agency) => (
                    <tr key={agency.id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-gray-500">
                              {agency.name
                                .split(" ")
                                .map((w) => w[0])
                                .slice(0, 2)
                                .join("")}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-navy">{agency.name}</p>
                              {agency.is_verified && (
                                <Shield className="w-3.5 h-3.5 text-brand" />
                              )}
                              {agency.is_featured && (
                                <Award className="w-3.5 h-3.5 text-amber-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <p className="text-navy">{agency.owner_name ?? "N/A"}</p>
                        <p className="text-xs text-gray-400">{agency.owner_email ?? ""}</p>
                      </td>
                      <td className="px-5 py-3.5">{statusBadge(agency.status)}</td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        {agency.average_rating && agency.average_rating > 0 ? (
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            <span className="text-navy">{Number(agency.average_rating).toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-navy hidden lg:table-cell">
                        {agency.total_reviews ?? 0}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 hidden xl:table-cell">
                        {new Date(agency.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={() =>
                              setOpenDropdown(
                                openDropdown === agency.id ? null : agency.id
                              )
                            }
                            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4 text-gray-500" />
                          </button>
                          {openDropdown === agency.id && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                              {agency.slug && (
                                <a
                                  href={`/agencies/${agency.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Profile
                                </a>
                              )}
                              {(agency.status === "pending" || agency.status === "draft") && (
                                <>
                                  <button
                                    disabled={actionLoading === agency.id}
                                    onClick={() => handleAction(agency.id, "approve")}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {actionLoading === agency.id ? "Processing..." : "Approve"}
                                  </button>
                                  <button
                                    disabled={actionLoading === agency.id}
                                    onClick={() => handleAction(agency.id, "reject")}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    {actionLoading === agency.id ? "Processing..." : "Reject"}
                                  </button>
                                </>
                              )}
                              {agency.status === "active" && (
                                <button
                                  disabled={actionLoading === agency.id}
                                  onClick={() => handleAction(agency.id, "suspend")}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                                >
                                  <XCircle className="w-4 h-4" />
                                  {actionLoading === agency.id ? "Processing..." : "Suspend"}
                                </button>
                              )}
                              {(agency.status === "suspended" || agency.status === "rejected") && (
                                <button
                                  disabled={actionLoading === agency.id}
                                  onClick={() => handleAction(agency.id, "approve")}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  {actionLoading === agency.id ? "Processing..." : "Reactivate"}
                                </button>
                              )}
                              {!agency.is_featured && agency.status === "active" && (
                                <button
                                  disabled={actionLoading === agency.id}
                                  onClick={() => handleAction(agency.id, "feature")}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                                >
                                  <Award className="w-4 h-4" />
                                  Feature
                                </button>
                              )}
                              {!agency.is_verified && agency.status === "active" && (
                                <button
                                  disabled={actionLoading === agency.id}
                                  onClick={() => handleAction(agency.id, "verify")}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-brand hover:bg-blue-50 disabled:opacity-50"
                                >
                                  <Shield className="w-4 h-4" />
                                  Verify
                                </button>
                              )}
                              <div className="border-t border-gray-100 my-1" />
                              <button
                                disabled={actionLoading === agency.id}
                                onClick={() => handleAction(agency.id, "delete")}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                {actionLoading === agency.id ? "Processing..." : "Delete"}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {agencies.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                        No agencies found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing{" "}
                <span className="font-medium text-navy">
                  {total === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium text-navy">
                  {Math.min(currentPage * ITEMS_PER_PAGE, total)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-navy">{total}</span>{" "}
                agencies
              </p>
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === i + 1
                        ? "bg-brand text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
