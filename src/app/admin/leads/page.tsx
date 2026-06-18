"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Building2,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  Inbox,
  Users,
  Sparkles,
  TrendingUp,
  Coins,
  CreditCard,
  Plus,
  X,
} from "lucide-react";

type LeadStatus = "new" | "sent" | "viewed" | "responded" | "won" | "lost" | "expired";

interface ApiLead {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  project_description: string;
  budget: string | null;
  timeline: string | null;
  status: string;
  created_at: string;
  service_ids: string[] | null;
}

interface Assignment {
  id: string;
  agency_id: string;
  agency_name: string;
  status: string;
  credits_used: number;
  viewed_at: string | null;
  responded_at: string | null;
  created_at: string;
}

interface Agency {
  id: string;
  name: string;
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  new: { label: "New", classes: "bg-blue-50 text-brand" },
  sent: { label: "Sent", classes: "bg-indigo-50 text-indigo-700" },
  viewed: { label: "Viewed", classes: "bg-yellow-50 text-yellow-700" },
  responded: { label: "Responded", classes: "bg-green-50 text-green-700" },
  won: { label: "Won", classes: "bg-emerald-50 text-emerald-700" },
  lost: { label: "Lost", classes: "bg-red-50 text-red-600" },
  expired: { label: "Expired", classes: "bg-gray-100 text-gray-500" },
};

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

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<ApiLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | LeadStatus>("all");
  const [assignments, setAssignments] = useState<Record<string, Assignment[]>>({});
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 0 });

  // Credit top-up modal
  const [creditModal, setCreditModal] = useState<{ agencyId: string; agencyName: string } | null>(null);
  const [creditAmount, setCreditAmount] = useState("5");
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditMessage, setCreditMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    try {
      setLoading(true);
      const res = await fetch("/api/leads?limit=50");
      if (!res.ok) return;
      const json = await res.json();
      setLeads(json.data ?? []);
      if (json.pagination) {
        setPagination({
          total: json.pagination.total ?? 0,
          page: json.pagination.page ?? 1,
          totalPages: json.pagination.totalPages ?? 0,
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function fetchAssignments(leadId: string) {
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      if (!res.ok) return;
      const json = await res.json();
      const assgn = (json.data?.assignments ?? []) as Assignment[];
      setAssignments((prev) => ({ ...prev, [leadId]: assgn }));
    } catch {
      // ignore
    }
  }

  function toggleExpand(leadId: string) {
    if (expandedLead === leadId) {
      setExpandedLead(null);
    } else {
      setExpandedLead(leadId);
      if (!assignments[leadId]) {
        fetchAssignments(leadId);
      }
    }
  }

  async function handleCreditTopUp() {
    if (!creditModal) return;
    setCreditLoading(true);
    setCreditMessage(null);
    try {
      const res = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyId: creditModal.agencyId,
          amount: Number(creditAmount),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setCreditMessage(`Added ${creditAmount} credits to ${creditModal.agencyName}`);
        setTimeout(() => {
          setCreditModal(null);
          setCreditMessage(null);
        }, 2000);
      } else {
        setCreditMessage(json.error || "Failed to add credits");
      }
    } catch {
      setCreditMessage("Network error");
    } finally {
      setCreditLoading(false);
    }
  }

  const filteredLeads = leads.filter((l) => {
    if (filter === "all") return true;
    return l.status === filter;
  });

  const statusCounts = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stats = [
    { label: "Total Leads", value: String(pagination.total || leads.length), icon: Users, color: "text-brand", bg: "bg-blue-50" },
    { label: "New", value: String(statusCounts["new"] || 0), icon: Sparkles, color: "text-green-600", bg: "bg-green-50" },
    { label: "Responded", value: String(statusCounts["responded"] || 0), icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Won", value: String(statusCounts["won"] || 0), icon: Coins, color: "text-orange-500", bg: "bg-orange-50" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Leads Management</h1>
        <p className="mt-1 text-gray-500">
          View all platform leads, assignments, and manage agency credits.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-navy">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(["all", "new", "sent", "viewed", "responded", "won", "lost"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? "bg-brand text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
            }`}
          >
            {f === "all" ? "All" : (statusConfig[f]?.label || f)}
            {f !== "all" && statusCounts[f] ? ` (${statusCounts[f]})` : ""}
          </button>
        ))}
      </div>

      {/* Leads */}
      <div className="space-y-4">
        {filteredLeads.map((lead) => {
          const isExpanded = expandedLead === lead.id;
          const leadAssignments = assignments[lead.id] || [];
          const sc = statusConfig[lead.status] || statusConfig.new;
          return (
            <div key={lead.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-5 cursor-pointer" onClick={() => toggleExpand(lead.id)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-navy">{lead.company_name || "Unknown"}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.classes}`}>
                          {sc.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {lead.contact_name}
                        </span>
                        {lead.budget && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {lead.budget}
                          </span>
                        )}
                        {lead.timeline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {lead.timeline}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-gray-400">{lead.created_at ? timeAgo(lead.created_at) : ""}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-5 bg-gray-50/50">
                  <div className="grid sm:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="text-sm font-semibold text-navy mb-2">Project Description</h4>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                        {lead.project_description || "No description."}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-navy mb-2">Contact Info</h4>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" /> {lead.contact_name}
                        </p>
                        {lead.contact_email && (
                          <a href={`mailto:${lead.contact_email}`} className="text-sm text-brand flex items-center gap-2 hover:underline">
                            <Mail className="w-4 h-4 text-gray-400" /> {lead.contact_email}
                          </a>
                        )}
                        {lead.contact_phone && (
                          <a href={`tel:${lead.contact_phone}`} className="text-sm text-brand flex items-center gap-2 hover:underline">
                            <Phone className="w-4 h-4 text-gray-400" /> {lead.contact_phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Assignments */}
                  <div>
                    <h4 className="text-sm font-semibold text-navy mb-3">
                      Assigned Agencies ({leadAssignments.length})
                    </h4>
                    {leadAssignments.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No agencies assigned to this lead yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {leadAssignments.map((a) => (
                          <div key={a.id} className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-brand" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-navy">{a.agency_name || "Unknown Agency"}</p>
                                <p className="text-xs text-gray-400">
                                  Assigned {a.created_at ? timeAgo(a.created_at) : ""}
                                  {a.responded_at ? " · Responded" : ""}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                statusConfig[a.status]?.classes || "bg-gray-100 text-gray-500"
                              }`}>
                                {statusConfig[a.status]?.label || a.status}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCreditModal({ agencyId: a.agency_id, agencyName: a.agency_name || "Agency" });
                                  setCreditAmount("5");
                                  setCreditMessage(null);
                                }}
                                className="flex items-center gap-1 text-xs text-brand hover:underline ml-2"
                              >
                                <CreditCard className="w-3 h-3" />
                                Top Up
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredLeads.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No leads found.</p>
          </div>
        )}
      </div>

      {/* Credit Top-Up Modal */}
      {creditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCreditModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-navy">Add Credits</h3>
              <button onClick={() => setCreditModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Add lead credits to <span className="font-semibold">{creditModal.agencyName}</span>
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Number of Credits</label>
            <input
              type="number"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              min="1"
              max="1000"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none mb-4"
            />
            {creditMessage && (
              <p className={`text-sm mb-4 ${creditMessage.includes("Added") ? "text-green-600" : "text-red-600"}`}>
                {creditMessage}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setCreditModal(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreditTopUp}
                disabled={creditLoading || !creditAmount || Number(creditAmount) < 1}
                className="flex-1 flex items-center justify-center gap-2 bg-brand text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-dark disabled:opacity-50"
              >
                {creditLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Credits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
