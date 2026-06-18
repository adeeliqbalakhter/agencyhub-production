"use client";

import { useState, useEffect } from "react";
import {
  Eye,
  Search,
  MousePointerClick,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  BarChart3,
  PieChart,
  Loader2,
  Inbox,
} from "lucide-react";

interface DailyStats {
  date: string;
  profile_views: number;
  search_impressions: number;
  website_clicks: number;
  phone_clicks: number;
  email_clicks: number;
  lead_requests: number;
}

interface LeadByStatus {
  status: string;
  count: number;
}

interface ReviewStats {
  total: number;
  avg_rating: number | null;
  approved: number;
  pending: number;
}

interface AnalyticsData {
  overview: {
    profile_views: number | null;
    total_reviews: number | null;
    total_leads: number | null;
    average_rating: number | null;
  };
  dailyStats: DailyStats[];
  leadsByStatus: LeadByStatus[];
  reviewStats: ReviewStats;
}

const dateRanges = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
] as const;

function sumDaily(stats: DailyStats[], key: keyof Omit<DailyStats, "date">): number {
  return stats.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  // Fetch agency ID on mount
  useEffect(() => {
    async function fetchAgency() {
      try {
        const res = await fetch("/api/agencies/mine");
        if (!res.ok) {
          setError("Failed to load agency data.");
          setLoading(false);
          return;
        }
        const json = await res.json();
        const agencyData = json.data?.agency;
        if (!agencyData) {
          setError("No agency found. Create an agency to view analytics.");
          setLoading(false);
          return;
        }
        setAgencyId(agencyData.id);
      } catch {
        setError("Failed to load agency data.");
        setLoading(false);
      }
    }
    fetchAgency();
  }, []);

  // Fetch analytics when agencyId or range changes
  useEffect(() => {
    if (!agencyId) return;

    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const days = dateRanges.find((d) => d.key === range)?.days ?? 30;
        const res = await fetch(`/api/agencies/${agencyId}/analytics?days=${days}`);
        if (!res.ok) {
          setError("Failed to load analytics.");
          setLoading(false);
          return;
        }
        const json = await res.json();
        setAnalytics(json.data ?? null);
      } catch {
        setError("Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [agencyId, range]);

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
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  const daily = analytics?.dailyStats ?? [];
  const overview = analytics?.overview;
  const leadsByStatus = analytics?.leadsByStatus ?? [];
  const reviewStats = analytics?.reviewStats;

  const totalViews = sumDaily(daily, "profile_views");
  const totalImpressions = sumDaily(daily, "search_impressions");
  const totalWebsiteClicks = sumDaily(daily, "website_clicks");
  const totalLeadRequests = sumDaily(daily, "lead_requests");

  const statCards = [
    {
      label: "Profile Views",
      value: formatNumber(totalViews),
      icon: Eye,
      color: "text-brand",
      bg: "bg-blue-50",
    },
    {
      label: "Search Impressions",
      value: formatNumber(totalImpressions),
      icon: Search,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Website Clicks",
      value: formatNumber(totalWebsiteClicks),
      icon: MousePointerClick,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Lead Requests",
      value: formatNumber(totalLeadRequests),
      icon: Users,
      color: "text-orange-500",
      bg: "bg-orange-50",
    },
  ];

  const totalLeadCount = leadsByStatus.reduce((sum, l) => sum + (Number(l.count) || 0), 0);

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy">Analytics</h1>
          <p className="mt-1 text-gray-500">
            Track your agency&apos;s performance and visibility.
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {dateRanges.map((dr) => (
            <button
              key={dr.key}
              onClick={() => setRange(dr.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                range === dr.key
                  ? "bg-white text-navy shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {dr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => {
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

      {/* Chart Sections */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Views Over Time */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-navy">Views Over Time</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Profile views in the last {range === "7d" ? "7" : range === "30d" ? "30" : "90"} days
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-gray-300" />
          </div>
          {daily.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {daily.map((day) => {
                const views = Number(day.profile_views) || 0;
                const maxViews = Math.max(...daily.map((d) => Number(d.profile_views) || 0), 1);
                const pct = Math.round((views / maxViews) * 100);
                return (
                  <div key={day.date} className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500 w-24 shrink-0 text-xs">
                      {new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                      <div
                        className="bg-brand/70 h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-navy font-medium w-12 text-right text-xs">
                      {formatNumber(views)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 bg-gradient-to-b from-blue-50/50 to-transparent rounded-lg border border-dashed border-gray-200 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400 font-medium">No data yet</p>
                <p className="text-xs text-gray-300 mt-1">
                  Views will appear here as your profile gets traffic
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Daily Impressions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-navy">Daily Impressions</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Search impressions by day
              </p>
            </div>
            <Search className="w-5 h-5 text-gray-300" />
          </div>
          {daily.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {daily.map((day) => {
                const impressions = Number(day.search_impressions) || 0;
                return (
                  <div key={day.date} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 truncate mr-4">
                      {new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <span className="text-navy font-medium whitespace-nowrap">
                      {formatNumber(impressions)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-56 bg-gradient-to-b from-purple-50/50 to-transparent rounded-lg border border-dashed border-gray-200 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400 font-medium">No data yet</p>
              </div>
            </div>
          )}
        </div>

        {/* Lead Status Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-navy">Lead Status Breakdown</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Distribution of leads by status
              </p>
            </div>
            <PieChart className="w-5 h-5 text-gray-300" />
          </div>
          {leadsByStatus.length > 0 ? (
            <div className="space-y-2">
              {leadsByStatus.map((item) => {
                const count = Number(item.count) || 0;
                const pct = totalLeadCount > 0 ? Math.round((count / totalLeadCount) * 100) : 0;
                return (
                  <div key={item.status} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 capitalize">{item.status}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-navy font-medium">{count}</span>
                      <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-56 bg-gradient-to-b from-green-50/50 to-transparent rounded-lg border border-dashed border-gray-200 flex items-center justify-center">
              <div className="text-center">
                <PieChart className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400 font-medium">No leads yet</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Review Stats & Overview Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-navy">Overview</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Aggregate agency stats
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">
                  Metric
                </th>
                <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-50">
                <td className="px-6 py-3.5 text-sm text-gray-600">All-time Profile Views</td>
                <td className="text-right px-6 py-3.5 text-sm text-navy font-medium">
                  {formatNumber(Number(overview?.profile_views) || 0)}
                </td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="px-6 py-3.5 text-sm text-gray-600">Total Leads</td>
                <td className="text-right px-6 py-3.5 text-sm text-navy font-medium">
                  {formatNumber(Number(overview?.total_leads) || 0)}
                </td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="px-6 py-3.5 text-sm text-gray-600">Average Rating</td>
                <td className="text-right px-6 py-3.5 text-sm text-navy font-medium">
                  {overview?.average_rating != null ? Number(overview.average_rating).toFixed(1) : "N/A"}
                </td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="px-6 py-3.5 text-sm text-gray-600">Total Reviews</td>
                <td className="text-right px-6 py-3.5 text-sm text-navy font-medium">
                  {formatNumber(Number(overview?.total_reviews) || 0)}
                </td>
              </tr>
              {reviewStats && (
                <>
                  <tr className="border-b border-gray-50">
                    <td className="px-6 py-3.5 text-sm text-gray-600">Approved Reviews</td>
                    <td className="text-right px-6 py-3.5 text-sm text-navy font-medium">
                      {formatNumber(Number(reviewStats.approved) || 0)}
                    </td>
                  </tr>
                  <tr className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-3.5 text-sm text-gray-600">Pending Reviews</td>
                    <td className="text-right px-6 py-3.5 text-sm text-navy font-medium">
                      {formatNumber(Number(reviewStats.pending) || 0)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
