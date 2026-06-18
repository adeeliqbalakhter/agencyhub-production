"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Users,
  Star,
  TrendingUp,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flag,
  UserPlus,
  Shield,
  BarChart3,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalAgencies: number;
  totalReviews: number;
  totalLeads: number;
  pendingAgencies: number;
  pendingReviews: number;
}

interface RecentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface DashboardData {
  stats: DashboardStats;
  recentUsers: RecentUser[];
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load dashboard (${res.status})`);
      }
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="w-10 h-10 text-red-400" />
        <p className="text-gray-600">{error}</p>
        <button
          onClick={fetchDashboard}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand rounded-lg hover:bg-brand-dark transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { stats, recentUsers } = data;

  const statCards = [
    {
      label: "Total Agencies",
      value: stats.totalAgencies.toLocaleString(),
      change: `${stats.pendingAgencies} pending`,
      icon: Building2,
      color: "bg-blue-50 text-brand",
    },
    {
      label: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      change: "",
      icon: Users,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Total Reviews",
      value: stats.totalReviews.toLocaleString(),
      change: `${stats.pendingReviews} pending`,
      icon: Star,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Total Leads",
      value: stats.totalLeads.toLocaleString(),
      change: "",
      icon: TrendingUp,
      color: "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Admin Dashboard</h1>
          <p className="mt-1 text-gray-500">
            Platform overview and management center.
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Stats Grid */}
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
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-navy">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
              {stat.change && (
                <p className="text-xs text-amber-600 mt-1">{stat.change}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-navy mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/agencies"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-dark transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Review Pending Agencies
            {stats.pendingAgencies > 0 && (
              <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">
                {stats.pendingAgencies}
              </span>
            )}
          </a>
          <a
            href="/admin/reviews"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-navy text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Star className="w-4 h-4" />
            Moderate Reviews
            {stats.pendingReviews > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
                {stats.pendingReviews}
              </span>
            )}
          </a>
          <a
            href="/admin/users"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-navy text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Manage Users
          </a>
          <a
            href="/admin/settings"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-navy text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            Platform Settings
          </a>
        </div>
      </div>

      {/* Recent Users */}
      {recentUsers && recentUsers.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-navy">Recent Users</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {recentUsers.map((user) => {
              const roleIcon =
                user.role === "admin" || user.role === "super_admin"
                  ? Shield
                  : user.role === "agency_owner"
                  ? Building2
                  : UserPlus;
              const RoleIcon = roleIcon;
              return (
                <div
                  key={user.id}
                  className="px-5 py-3.5 flex items-start gap-3"
                >
                  <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <RoleIcon className="w-4 h-4 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-navy">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
