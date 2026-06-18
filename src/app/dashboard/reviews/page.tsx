"use client";

import { useState, useEffect } from "react";
import {
  Star,
  MessageSquare,
  Clock,
  TrendingUp,
  Send,
  X,
  Loader2,
  Inbox,
} from "lucide-react";

interface ReviewResponse {
  id: string;
  content: string;
  created_at: string;
}

interface ReviewData {
  id: string;
  user_name: string | null;
  overall_rating: number;
  content: string;
  created_at: string;
  review_responses: ReviewResponse[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type FilterTab = "all" | "pending" | "responded";

export default function ReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [reviews, setReviews] = useState<ReviewData[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch user's agency
        const agencyRes = await fetch("/api/agencies/mine");
        if (!agencyRes.ok) {
          setError("Failed to load agency information.");
          setLoading(false);
          return;
        }
        const agencyJson = await agencyRes.json();
        const agencyData = agencyJson.data?.agency;

        if (!agencyData) {
          setError("No agency found. Please create an agency first.");
          setLoading(false);
          return;
        }

        const agencyId = agencyData.id;

        // Fetch reviews for this agency
        const reviewsRes = await fetch(
          `/api/reviews?agencyId=${agencyId}`
        );
        if (!reviewsRes.ok) {
          setError("Failed to load reviews.");
          setLoading(false);
          return;
        }

        const reviewsJson = await reviewsRes.json();
        const reviewsData: ReviewData[] = (reviewsJson.data ?? []).map(
          (r: Record<string, unknown>) => ({
            id: r.id as string,
            user_name: (r.user_name as string) || null,
            overall_rating: r.overall_rating ? Number(r.overall_rating) : 0,
            content: (r.content as string) || "",
            created_at: (r.created_at as string) || "",
            review_responses: Array.isArray(r.review_responses)
              ? (r.review_responses as ReviewResponse[])
              : [],
          })
        );

        setReviews(reviewsData);
      } catch {
        setError("An unexpected error occurred while loading reviews.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getStatus = (review: ReviewData): "pending" | "responded" =>
    review.review_responses.length > 0 ? "responded" : "pending";

  const filteredReviews = reviews.filter((r) => {
    if (activeTab === "all") return true;
    return getStatus(r) === activeTab;
  });

  const handleSubmitResponse = (reviewId: string) => {
    // Optimistically update local state
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              review_responses: [
                ...r.review_responses,
                {
                  id: `temp-${Date.now()}`,
                  content: responseText,
                  created_at: new Date().toISOString(),
                },
              ],
            }
          : r
      )
    );
    setRespondingTo(null);
    setResponseText("");
  };

  // Compute stats from real data
  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? (
          reviews.reduce((sum, r) => sum + r.overall_rating, 0) / totalReviews
        ).toFixed(1)
      : "0";
  const pendingCount = reviews.filter((r) => getStatus(r) === "pending").length;
  const respondedCount = reviews.filter(
    (r) => getStatus(r) === "responded"
  ).length;
  const responseRate =
    totalReviews > 0
      ? `${Math.round((respondedCount / totalReviews) * 100)}%`
      : "0%";

  const stats = [
    {
      label: "Total Reviews",
      value: String(totalReviews),
      icon: Star,
      color: "text-yellow-500",
      bg: "bg-yellow-50",
    },
    {
      label: "Average Rating",
      value: averageRating,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Pending Responses",
      value: String(pendingCount),
      icon: Clock,
      color: "text-orange-500",
      bg: "bg-orange-50",
    },
    {
      label: "Response Rate",
      value: responseRate,
      icon: MessageSquare,
      color: "text-brand",
      bg: "bg-blue-50",
    },
  ];

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: reviews.length },
    {
      key: "pending",
      label: "Pending",
      count: pendingCount,
    },
    {
      key: "responded",
      label: "Responded",
      count: respondedCount,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Inbox className="w-10 h-10 text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Reviews</h1>
        <p className="mt-1 text-gray-500">
          Manage and respond to client reviews.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center`}
                >
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-navy">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-navy shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            <span
              className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key
                  ? "bg-brand/10 text-brand"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((review) => {
          const status = getStatus(review);
          const latestResponse =
            review.review_responses.length > 0
              ? review.review_responses[review.review_responses.length - 1]
              : null;

          return (
            <div
              key={review.id}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600 flex-shrink-0">
                    {getInitials(review.user_name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-navy">
                        {review.user_name || "Anonymous"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < review.overall_rating
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">
                        {review.created_at ? formatDate(review.created_at) : ""}
                      </span>
                    </div>
                  </div>
                </div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
                    status === "pending"
                      ? "bg-orange-50 text-orange-600"
                      : "bg-green-50 text-green-600"
                  }`}
                >
                  {status === "pending" ? "Needs Response" : "Responded"}
                </span>
              </div>

              <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                {review.content}
              </p>

              {/* Existing Response */}
              {latestResponse && (
                <div className="mt-4 bg-gray-50 rounded-lg p-4 border-l-4 border-brand">
                  <p className="text-xs font-medium text-navy mb-1">
                    Your Response
                  </p>
                  <p className="text-sm text-gray-600">
                    {latestResponse.content}
                  </p>
                </div>
              )}

              {/* Respond Button / Inline Form */}
              {status === "pending" && respondingTo !== review.id && (
                <button
                  onClick={() => setRespondingTo(review.id)}
                  className="mt-4 flex items-center gap-1.5 text-sm text-brand font-medium hover:text-brand-dark transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Respond
                </button>
              )}

              {respondingTo === review.id && (
                <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-navy">
                      Write your response
                    </p>
                    <button
                      onClick={() => {
                        setRespondingTo(null);
                        setResponseText("");
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Thank the reviewer and address their feedback..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors resize-none"
                  />
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() => handleSubmitResponse(review.id)}
                      disabled={!responseText.trim()}
                      className="flex items-center gap-1.5 bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Submit Response
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredReviews.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              No reviews found for this filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
