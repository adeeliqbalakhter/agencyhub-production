"use client";

import { useState, useEffect } from "react";
import {
  Eye,
  Users,
  Star,
  TrendingUp,
  ArrowUpRight,
  Loader2,
  Inbox,
} from "lucide-react";

interface AgencyData {
  id: string;
  profile_views: number | null;
  total_leads: number | null;
  average_rating: number | null;
  total_reviews: number | null;
}

interface Lead {
  id: string;
  company_name: string;
  budget: string | null;
  status: string;
  created_at: string;
}

interface Review {
  id: string;
  user_name: string | null;
  overall_rating: number;
  content: string;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [agency, setAgency] = useState<AgencyData | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch user's agency
        const agencyRes = await fetch("/api/agencies/mine");
        if (!agencyRes.ok) {
          setLoading(false);
          return;
        }
        const agencyJson = await agencyRes.json();
        const a = agencyJson.data?.agency;

        if (a) {
          const agencyData: AgencyData = {
            id: a.id,
            profile_views: a.profile_views ? Number(a.profile_views) : null,
            total_leads: a.total_leads ? Number(a.total_leads) : null,
            average_rating: a.average_rating ? Number(a.average_rating) : null,
            total_reviews: a.total_reviews ? Number(a.total_reviews) : null,
          };
          setAgency(agencyData);

          // Fetch recent leads and reviews in parallel
          const [leadsRes, reviewsRes] = await Promise.all([
            fetch("/api/leads?limit=4"),
            fetch(`/api/reviews?agencyId=${agencyData.id}&limit=2`),
          ]);

          if (leadsRes.ok) {
            const leadsJson = await leadsRes.json();
            setRecentLeads(
              (leadsJson.data ?? []).map((l: Record<string, unknown>) => ({
                id: l.id as string,
                company_name: (l.company_name as string) || "Unknown",
                budget: (l.budget as string) || null,
                status: (l.status as string) || "new",
                created_at: (l.created_at as string) || "",
              }))
            );
          }

          if (reviewsRes.ok) {
            const reviewsJson = await reviewsRes.json();
            setRecentReviews(
              (reviewsJson.data ?? []).map((r: Record<string, unknown>) => ({
                id: r.id as string,
                user_name: (r.user_name as string) || null,
                overall_rating: r.overall_rating ? Number(r.overall_rating) : 0,
                content: (r.content as string) || "",
                created_at: (r.created_at as string) || "",
              }))
            );
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  const stats = [
    {
      label: "Profile Views",
      value: agency?.profile_views != null ? String(agency.profile_views) : "0",
      icon: Eye,
    },
    {
      label: "Total Leads",
      value: agency?.total_leads != null ? String(agency.total_leads) : "0",
      icon: Users,
    },
    {
      label: "Average Rating",
      value: agency?.average_rating != null ? agency.average_rating.toFixed(1) : "0",
      icon: Star,
    },
    {
      label: "Total Reviews",
      value: agency?.total_reviews != null ? String(agency.total_reviews) : "0",
      icon: TrendingUp,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Dashboard</h1>
        <p className="mt-1 text-gray-500">
          Welcome back! Here&apos;s an overview of your agency&apos;s performance.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-brand" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-navy">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-navy">Recent Leads</h2>
            <a
              href="/dashboard/leads"
              className="text-sm text-brand hover:text-brand-dark"
            >
              View all
            </a>
          </div>
          {recentLeads.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-navy">{lead.company_name}</p>
                    {lead.budget && (
                      <p className="text-xs text-gray-500">{lead.budget}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                        lead.status === "new"
                          ? "bg-blue-50 text-brand"
                          : lead.status === "viewed"
                          ? "bg-yellow-50 text-yellow-700"
                          : lead.status === "responded"
                          ? "bg-green-50 text-green-700"
                          : lead.status === "won"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-50 text-gray-600"
                      }`}
                    >
                      {lead.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {lead.created_at ? timeAgo(lead.created_at) : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center">
              <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No leads yet</p>
            </div>
          )}
        </div>

        {/* Recent Reviews */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-navy">Recent Reviews</h2>
            <a
              href="/dashboard/reviews"
              className="text-sm text-brand hover:text-brand-dark"
            >
              View all
            </a>
          </div>
          {recentReviews.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {recentReviews.map((review) => (
                <div key={review.id} className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                        {(review.user_name || "?")[0]}
                      </div>
                      <span className="font-medium text-sm text-navy">
                        {review.user_name || "Anonymous"}
                      </span>
                    </div>
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
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{review.content}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {review.created_at ? timeAgo(review.created_at) : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center">
              <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No reviews yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
