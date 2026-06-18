"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Star,
  CheckCircle2,
  XCircle,
  Flag,
  Search,
  Clock,
  MessageSquare,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type ReviewStatus = "pending" | "approved" | "rejected" | "flagged";

interface Review {
  id: number;
  reviewer: string;
  agency: string;
  rating: number;
  budgetRating: number | null;
  qualityRating: number | null;
  scheduleRating: number | null;
  collaborationRating: number | null;
  title: string;
  content: string;
  date: string;
  status: ReviewStatus;
  flagReason?: string;
  wouldRecommend: boolean | null;
  reviewerJobTitle: string | null;
  companyIndustry: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusTabs = [
  { label: "Pending", value: "pending", icon: Clock },
  { label: "Approved", value: "approved", icon: CheckCircle2 },
  { label: "Rejected", value: "rejected", icon: XCircle },
  { label: "Flagged", value: "flagged", icon: Flag },
];

function mapApiReview(raw: Record<string, unknown>): Review {
  const guestName = raw.guest_name as string | null;
  const guestEmail = raw.guest_email as string | null;
  const userName = raw.user_name as string | null;
  const reviewerLabel = userName
    ? userName
    : guestName
      ? `${guestName} (guest${guestEmail ? `, ${guestEmail}` : ""})`
      : "Unknown User";
  return {
    id: raw.id as number,
    reviewer: reviewerLabel,
    agency: (raw.agency_name as string) || "Unknown Agency",
    rating: raw.overall_rating as number,
    budgetRating: (raw.budget_rating as number) ?? null,
    qualityRating: (raw.quality_rating as number) ?? null,
    scheduleRating: (raw.schedule_rating as number) ?? null,
    collaborationRating: (raw.collaboration_rating as number) ?? null,
    title: (raw.title as string) || "",
    content: (raw.content as string) || "",
    date: new Date(raw.created_at as string).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    status: raw.status as ReviewStatus,
    flagReason: undefined,
    wouldRecommend: (raw.would_recommend as boolean) ?? null,
    reviewerJobTitle: (raw.reviewer_job_title as string) ?? null,
    companyIndustry: (raw.reviewer_company_industry as string) ?? null,
  };
}

export default function AdminReviewsPage() {
  const [statusFilter, setStatusFilter] = useState<ReviewStatus>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectionId, setRejectionId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moderating, setModerating] = useState<number | null>(null);

  const fetchReviews = useCallback(async (status: ReviewStatus, page: number, limit: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        status,
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`/api/admin/reviews?${params}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch reviews (${res.status})`);
      }
      const json = await res.json();
      setReviews((json.data || []).map(mapApiReview));
      setPagination(json.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews(statusFilter, pagination.page, pagination.limit);
    // Only re-fetch when filter or page changes, not when pagination object updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, pagination.page, fetchReviews]);

  const handleStatusChange = (status: ReviewStatus) => {
    setStatusFilter(status);
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSearchQuery("");
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleModerate = async (
    reviewId: number,
    action: "approve" | "reject" | "flag",
    reason?: string
  ) => {
    setModerating(reviewId);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(reason ? { reason } : {}) }),
      });
      if (!res.ok) {
        throw new Error(`Moderation failed (${res.status})`);
      }
      setRejectionId(null);
      setRejectionReason("");
      // Re-fetch current view to reflect changes
      await fetchReviews(statusFilter, pagination.page, pagination.limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Moderation action failed");
    } finally {
      setModerating(null);
    }
  };

  // Client-side search filter on already-fetched reviews
  const filtered = reviews.filter((review) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      review.reviewer.toLowerCase().includes(q) ||
      review.agency.toLowerCase().includes(q) ||
      review.content.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Reviews Moderation</h1>
        <p className="mt-1 text-gray-500">
          Review, approve, reject, or flag user reviews.
        </p>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-3 mb-6">
        {statusTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => handleStatusChange(tab.value as ReviewStatus)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                isActive
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {isActive && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/20 text-white">
                  {pagination.total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search reviews by reviewer, agency, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => fetchReviews(statusFilter, pagination.page, pagination.limit)}
            className="ml-auto text-sm font-medium text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-brand animate-spin" />
          <span className="ml-2 text-sm text-gray-500">Loading reviews...</span>
        </div>
      )}

      {/* Review Cards */}
      {!loading && (
        <div className="space-y-4">
          {filtered.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-500">
                          {review.reviewer
                            .split(" ")
                            .map((w) => w[0])
                            .join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-navy">
                          {review.reviewer}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-300">|</span>
                    <p className="text-sm text-gray-500">
                      on{" "}
                      <span className="font-medium text-navy">
                        {review.agency}
                      </span>
                    </p>
                    <span className="text-xs text-gray-300">|</span>
                    <p className="text-xs text-gray-400">{review.date}</p>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? "text-amber-400 fill-amber-400"
                              : "text-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-navy">
                      {review.rating}.0
                    </span>
                  </div>

                  {/* Category Ratings */}
                  {(review.budgetRating || review.qualityRating || review.scheduleRating || review.collaborationRating) && (
                    <div className="flex flex-wrap gap-3 mb-2 text-xs text-gray-500">
                      {review.budgetRating != null && <span>Budget: <span className="font-medium text-navy">{review.budgetRating}</span></span>}
                      {review.qualityRating != null && <span>Quality: <span className="font-medium text-navy">{review.qualityRating}</span></span>}
                      {review.scheduleRating != null && <span>Schedule: <span className="font-medium text-navy">{review.scheduleRating}</span></span>}
                      {review.collaborationRating != null && <span>Collaboration: <span className="font-medium text-navy">{review.collaborationRating}</span></span>}
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {review.wouldRecommend != null && (
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${review.wouldRecommend ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                        {review.wouldRecommend ? "Would recommend" : "Would not recommend"}
                      </span>
                    )}
                    {review.reviewerJobTitle && (
                      <span className="text-xs text-gray-500">{review.reviewerJobTitle}</span>
                    )}
                    {review.companyIndustry && (
                      <span className="text-xs text-gray-400">({review.companyIndustry})</span>
                    )}
                  </div>

                  {/* Content */}
                  <h3 className="font-semibold text-navy text-sm mb-1">
                    {review.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {review.content}
                  </p>

                  {/* Flag reason */}
                  {review.flagReason && (
                    <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
                      <Flag className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-xs text-red-700">
                        <span className="font-medium">Flag reason:</span>{" "}
                        {review.flagReason}
                      </p>
                    </div>
                  )}

                  {/* Rejection reason input */}
                  {rejectionId === review.id && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Rejection reason
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Enter reason for rejection..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          disabled={moderating === review.id}
                          onClick={() =>
                            handleModerate(review.id, "reject", rejectionReason)
                          }
                          className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                        >
                          {moderating === review.id ? "Rejecting..." : "Confirm Rejection"}
                        </button>
                        <button
                          onClick={() => {
                            setRejectionId(null);
                            setRejectionReason("");
                          }}
                          className="text-xs font-medium text-gray-600 bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex sm:flex-col gap-2 flex-shrink-0">
                  {(review.status === "pending" || review.status === "flagged") && (
                    <>
                      <button
                        disabled={moderating === review.id}
                        onClick={() => handleModerate(review.id, "approve")}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {moderating === review.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          setRejectionId(
                            rejectionId === review.id ? null : review.id
                          )
                        }
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                      {review.status !== "flagged" && (
                        <button
                          disabled={moderating === review.id}
                          onClick={() => handleModerate(review.id, "flag")}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Flag className="w-4 h-4" />
                          Flag
                        </button>
                      )}
                    </>
                  )}
                  {review.status === "approved" && (
                    <>
                      <button
                        disabled={moderating === review.id}
                        onClick={() => handleModerate(review.id, "flag")}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Flag className="w-4 h-4" />
                        Flag
                      </button>
                      <button
                        onClick={() =>
                          setRejectionId(
                            rejectionId === review.id ? null : review.id
                          )
                        }
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  )}
                  {review.status === "rejected" && (
                    <button
                      disabled={moderating === review.id}
                      onClick={() => handleModerate(review.id, "approve")}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {moderating === review.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Restore
                    </button>
                  )}
                </div>
              </div>

              {/* Review ID */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-gray-300" />
                <span className="text-xs text-gray-400">
                  Review #{review.id}
                </span>
              </div>
            </div>
          ))}

          {filtered.length === 0 && !loading && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <p className="text-gray-400 text-sm">
                No reviews found matching your criteria.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} reviews
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
