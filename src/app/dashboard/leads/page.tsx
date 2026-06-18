"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Sparkles,
  TrendingUp,
  Coins,
  Send,
  Trophy,
  XCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  Loader2,
  Inbox,
  MessageSquare,
  Lock,
  CreditCard,
  Unlock,
  FileText,
  CheckCircle,
} from "lucide-react";
import { showToast } from "@/components/ui/toast";

type AssignmentStatus = "sent" | "claimed" | "responded" | "won" | "lost";

interface Assignment {
  id: string;
  agencyId: string;
  status: AssignmentStatus;
}

interface Lead {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  budget: string;
  timeline: string;
  description: string;
  date: string;
  assignmentId: string | null;
  assignmentStatus: AssignmentStatus;
}

interface CreditBalance {
  available: number;
  monthlyCredits: number;
  consumed: number;
  granted: number;
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

const statusConfig: Record<AssignmentStatus, { label: string; classes: string }> = {
  sent: { label: "New", classes: "bg-blue-50 text-brand" },
  claimed: { label: "Claimed", classes: "bg-yellow-50 text-yellow-700" },
  responded: { label: "Responded", classes: "bg-green-50 text-green-700" },
  won: { label: "Won", classes: "bg-emerald-50 text-emerald-700" },
  lost: { label: "Lost", classes: "bg-red-50 text-red-600" },
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | AssignmentStatus>("all");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [proposalLeadId, setProposalLeadId] = useState<string | null>(null);
  const [proposalMsg, setProposalMsg] = useState("");
  const [proposalBudget, setProposalBudget] = useState("");
  const [proposalTimeline, setProposalTimeline] = useState("");
  const [submittingProposal, setSubmittingProposal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);

      // Fetch agency info
      const agencyRes = await fetch("/api/agencies/mine");
      if (!agencyRes.ok) throw new Error("Could not load agency");
      const agencyJson = await agencyRes.json();
      const agency = agencyJson.data?.agency;
      if (!agency) throw new Error("No agency found");
      setAgencyId(agency.id);

      // Fetch credits and leads in parallel
      const [creditsRes, leadsRes] = await Promise.all([
        fetch("/api/credits"),
        fetch(`/api/leads?agencyId=${agency.id}&limit=50`),
      ]);

      if (creditsRes.ok) {
        const creditsJson = await creditsRes.json();
        setCredits(creditsJson.data ?? null);
      }

      if (!leadsRes.ok) throw new Error("Failed to fetch leads");
      const leadsJson = await leadsRes.json();
      const apiLeads = leadsJson.data ?? [];

      const mapped: Lead[] = apiLeads.map((l: Record<string, unknown>) => {
        let assignments: Assignment[] = [];
        try {
          const raw = l.assignments;
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (Array.isArray(parsed)) {
            assignments = parsed.filter((a: Record<string, unknown>) => a && a.id);
          }
        } catch { /* ignore */ }
        const myAssignment = assignments.find((a) => a.agencyId === agency.id) ?? assignments[0];
        return {
          id: l.id as string,
          company: (l.company_name as string) || "Unknown",
          contact: (l.contact_name as string) || "Unknown",
          email: (l.contact_email as string) || "",
          phone: (l.contact_phone as string) || "",
          budget: (l.budget as string) || "",
          timeline: (l.timeline as string) || "",
          description: (l.project_description as string) || "",
          date: l.created_at ? timeAgo(l.created_at as string) : "",
          assignmentId: myAssignment?.id ?? null,
          assignmentStatus: (myAssignment?.status as AssignmentStatus) ?? "sent",
        };
      });

      setLeads(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }

  async function claimLead(lead: Lead) {
    if (!lead.assignmentId) return;
    setClaimingId(lead.id);
    try {
      const res = await fetch("/api/leads/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, assignmentId: lead.assignmentId }),
      });
      const json = await res.json();
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === lead.id ? { ...l, assignmentStatus: "claimed" } : l
          )
        );
        if (credits) {
          setCredits({ ...credits, available: json.data?.creditsRemaining ?? credits.available - 1, consumed: credits.consumed + 1 });
        }
        showToast("success", "Lead Claimed", "You can now view full details and send a proposal.");
      } else {
        showToast("error", "Claim Failed", json.error || "Failed to claim lead");
      }
    } catch {
      showToast("error", "Network Error", "Could not connect to server. Please try again.");
    } finally {
      setClaimingId(null);
    }
  }

  async function updateStatus(leadId: string, status: AssignmentStatus) {
    setUpdatingId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, assignmentStatus: status } : l))
        );
      }
    } catch {
      // silently fail
    } finally {
      setUpdatingId(null);
    }
  }

  async function submitProposal(lead: Lead) {
    if (!lead.assignmentId || !proposalMsg.trim()) return;
    setSubmittingProposal(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/proposal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: lead.assignmentId,
          message: proposalMsg.trim(),
          estimatedBudget: proposalBudget.trim() || undefined,
          estimatedTimeline: proposalTimeline.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) =>
            l.id === lead.id ? { ...l, assignmentStatus: "responded" } : l
          )
        );
        setProposalLeadId(null);
        setProposalMsg("");
        setProposalBudget("");
        setProposalTimeline("");
        showToast("success", "Proposal Sent", "Your proposal has been sent and the client will be notified via email.");
      } else {
        showToast("error", "Submission Failed", json.error || "Failed to submit proposal");
      }
    } catch {
      showToast("error", "Network Error", "Could not connect to server. Please try again.");
    } finally {
      setSubmittingProposal(false);
    }
  }

  const isClaimed = (s: AssignmentStatus) => s !== "sent";

  const filteredLeads = leads.filter((l) => {
    if (filter === "all") return true;
    return l.assignmentStatus === filter;
  });

  const statusCounts = leads.reduce(
    (acc, l) => {
      acc[l.assignmentStatus] = (acc[l.assignmentStatus] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const stats = [
    { label: "Total Leads", value: String(leads.length), icon: Users, color: "text-brand", bg: "bg-blue-50" },
    { label: "Unclaimed", value: String(statusCounts["sent"] || 0), icon: Sparkles, color: "text-yellow-600", bg: "bg-yellow-50" },
    { label: "Claimed", value: String((statusCounts["claimed"] || 0) + (statusCounts["responded"] || 0)), icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Won", value: String(statusCounts["won"] || 0), icon: Coins, color: "text-orange-500", bg: "bg-orange-50" },
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
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-brand text-white hover:bg-brand-dark transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy">Leads</h1>
        <p className="mt-1 text-gray-500">
          Claim leads to view full details and start engaging.
        </p>
      </div>

      {/* Credit Balance Banner */}
      {credits && (
        <div className="mb-6 bg-gradient-to-r from-brand/5 to-blue-50 rounded-xl border border-brand/20 p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand/10 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-brand" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Available Credits</p>
                <p className="text-2xl font-bold text-navy">
                  {credits.monthlyCredits === -1 ? "Unlimited" : credits.available}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-gray-500">Plan</p>
                <p className="font-semibold text-navy">
                  {credits.monthlyCredits === -1 ? "∞" : credits.monthlyCredits}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-500">Bonus</p>
                <p className="font-semibold text-green-600">+{credits.granted}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500">Used</p>
                <p className="font-semibold text-red-600">{credits.consumed}</p>
              </div>
            </div>
          </div>
        </div>
      )}

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
        {(["all", "sent", "claimed", "responded", "won", "lost"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? "bg-brand text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
            }`}
          >
            {f === "all" ? "All" : statusConfig[f as AssignmentStatus].label}
          </button>
        ))}
      </div>

      {/* Lead Cards */}
      <div className="space-y-4">
        {filteredLeads.map((lead) => {
          const isExpanded = expandedLead === lead.id;
          const claimed = isClaimed(lead.assignmentStatus);
          const isClaiming = claimingId === lead.id;
          const isUpdating = updatingId === lead.id;

          return (
            <div
              key={lead.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Lead Header */}
              <div
                className="p-5 cursor-pointer"
                onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      claimed ? "bg-green-50" : "bg-gray-100"
                    }`}>
                      {claimed ? (
                        <Unlock className="w-5 h-5 text-green-600" />
                      ) : (
                        <Lock className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-navy">
                          {lead.company}
                        </p>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusConfig[lead.assignmentStatus].classes}`}
                        >
                          {statusConfig[lead.assignmentStatus].label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
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
                        {!claimed && (
                          <span className="text-orange-500 font-medium flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Claim to view details
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-gray-400">{lead.date}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-5 bg-gray-50/50">
                  {claimed ? (
                    <>
                      {/* Full details for claimed leads */}
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-semibold text-navy mb-2">
                            Project Description
                          </h4>
                          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                            {lead.description || "No description provided."}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-navy mb-2">
                            Contact Information
                          </h4>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              {lead.contact}
                            </p>
                            {lead.email && (
                              <a
                                href={`mailto:${lead.email}`}
                                className="text-sm text-brand flex items-center gap-2 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Mail className="w-4 h-4 text-gray-400" />
                                {lead.email}
                              </a>
                            )}
                            {lead.phone && (
                              <a
                                href={`tel:${lead.phone}`}
                                className="text-sm text-brand flex items-center gap-2 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone className="w-4 h-4 text-gray-400" />
                                {lead.phone}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions for claimed leads */}
                      <div className="flex items-center gap-2 mt-5 pt-4 border-t border-gray-200 flex-wrap">
                        {(lead.assignmentStatus === "claimed" || lead.assignmentStatus === "responded") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setProposalLeadId(proposalLeadId === lead.id ? null : lead.id);
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-brand text-white hover:bg-brand-dark transition-colors"
                          >
                            <Send className="w-4 h-4" />
                            {lead.assignmentStatus === "responded" ? "Send Another Proposal" : "Send Proposal"}
                          </button>
                        )}
                        <a
                          href={`/dashboard/messages?leadId=${lead.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Messages
                        </a>
                        {lead.assignmentStatus !== "won" && lead.assignmentStatus !== "lost" && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); updateStatus(lead.id, "won"); }}
                              disabled={isUpdating}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-green-200 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
                            >
                              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                              Won
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); updateStatus(lead.id, "lost"); }}
                              disabled={isUpdating}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                              Lost
                            </button>
                          </>
                        )}
                      </div>

                      {/* Proposal Form */}
                      {proposalLeadId === lead.id && (
                        <div className="mt-4 rounded-xl border border-gray-200 overflow-hidden shadow-sm" onClick={(e) => e.stopPropagation()}>
                          <div className="bg-gradient-to-r from-brand to-blue-600 px-5 py-3">
                            <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              Submit Your Proposal
                            </h4>
                            <p className="text-blue-100 text-xs mt-0.5">Win this project by showcasing your expertise</p>
                          </div>
                          <div className="bg-white p-5 space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-navy mb-1.5">
                                Your Proposal
                              </label>
                              <textarea
                                value={proposalMsg}
                                onChange={(e) => setProposalMsg(e.target.value)}
                                placeholder="Introduce yourself, describe your relevant experience, explain your approach to this project, and highlight what makes your agency the right choice..."
                                rows={5}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-navy placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none leading-relaxed"
                              />
                              <div className="flex items-center justify-between mt-1.5">
                                <p className="text-xs text-gray-400">{proposalMsg.length}/5,000 characters</p>
                                {proposalMsg.length > 0 && proposalMsg.length < 10 && (
                                  <p className="text-xs text-amber-500">Minimum 10 characters required</p>
                                )}
                              </div>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-navy mb-1.5">
                                  Estimated Budget
                                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                                </label>
                                <div className="relative">
                                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                  <input
                                    type="text"
                                    value={proposalBudget}
                                    onChange={(e) => setProposalBudget(e.target.value)}
                                    placeholder="e.g. 2,000 - 5,000"
                                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-navy focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-navy mb-1.5">
                                  Estimated Timeline
                                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                                </label>
                                <div className="relative">
                                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                  <input
                                    type="text"
                                    value={proposalTimeline}
                                    onChange={(e) => setProposalTimeline(e.target.value)}
                                    placeholder="e.g. 2-4 weeks"
                                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-navy focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Client will be notified via email
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setProposalLeadId(null);
                                    setProposalMsg("");
                                    setProposalBudget("");
                                    setProposalTimeline("");
                                  }}
                                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => submitProposal(lead)}
                                  disabled={submittingProposal || proposalMsg.trim().length < 10}
                                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                                >
                                  {submittingProposal ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Send className="w-4 h-4" />
                                  )}
                                  {submittingProposal ? "Sending..." : "Send Proposal"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Locked view for unclaimed leads */}
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-semibold text-navy mb-2">
                            Project Description
                          </h4>
                          <div className="relative">
                            <p className="text-sm text-gray-400 leading-relaxed line-clamp-2 select-none" style={{ filter: "blur(4px)" }}>
                              {lead.description || "Project description will be visible after claiming this lead with your credits."}
                            </p>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs text-gray-500 bg-white/80 px-3 py-1 rounded-full border border-gray-200 flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Claim to view
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-navy mb-2">
                            Contact Information
                          </h4>
                          <div className="relative">
                            <div className="space-y-2 select-none" style={{ filter: "blur(4px)" }}>
                              <p className="text-sm text-gray-400 flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-300" />
                                Contact Name Hidden
                              </p>
                              <p className="text-sm text-gray-400 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-300" />
                                email@hidden.com
                              </p>
                              <p className="text-sm text-gray-400 flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-300" />
                                +1 (xxx) xxx-xxxx
                              </p>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs text-gray-500 bg-white/80 px-3 py-1 rounded-full border border-gray-200 flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Claim to view
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Claim CTA */}
                      <div className="mt-5 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <p className="text-sm text-gray-600">
                            Use <span className="font-semibold">1 credit</span> to unlock full lead details and contact information.
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              claimLead(lead);
                            }}
                            disabled={isClaiming || (credits !== null && credits.available < 1 && credits.monthlyCredits !== -1)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-brand text-white hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isClaiming ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CreditCard className="w-4 h-4" />
                            )}
                            {isClaiming ? "Claiming..." : "Claim Lead (1 Credit)"}
                          </button>
                        </div>
                        {credits !== null && credits.available < 1 && credits.monthlyCredits !== -1 && (
                          <p className="text-xs text-red-600 mt-2">
                            You have no credits remaining. Contact support or upgrade your plan for more credits.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredLeads.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No leads found for this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
