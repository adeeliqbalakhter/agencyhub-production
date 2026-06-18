"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FolderOpen,
  Building2,
  MessageSquare,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Inbox,
  Plus,
  DollarSign,
  Calendar,
  Star,
  Pencil,
  Save,
  X,
  CheckCircle,
  XCircle,
  Eye,
  Users,
  FileText,
  ArrowRight,
  Briefcase,
  Shield,
} from "lucide-react";
import { showToast } from "@/components/ui/toast";

interface Agency {
  assignmentId: string;
  agencyId: string;
  agencyName: string;
  agencyLogo: string | null;
  agencySlug: string | null;
  assignmentStatus: string;
  respondedAt: string | null;
}

interface Proposal {
  id: string;
  agency_name: string;
  agency_logo: string | null;
  message: string;
  estimated_budget: string | null;
  estimated_timeline: string | null;
  status: string;
  created_at: string;
}

interface Project {
  id: string;
  company_name: string;
  project_description: string;
  budget: string | null;
  timeline: string | null;
  status: string;
  created_at: string;
  agencies: Agency[];
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "Matching", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  sent: { label: "Sent to Agencies", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
  viewed: { label: "In Progress", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  responded: { label: "Proposals Received", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  won: { label: "Completed", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  lost: { label: "Closed", color: "text-gray-500", bg: "bg-gray-50 border-gray-200" },
};

export default function ClientProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: "", budget: "", timeline: "" });
  const [saving, setSaving] = useState(false);
  const [proposals, setProposals] = useState<Record<string, Proposal[]>>({});
  const [loadingProposals, setLoadingProposals] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/client/projects");
        if (res.ok) {
          const json = await res.json();
          setProjects(json.data ?? []);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  async function fetchProposals(projectId: string) {
    if (proposals[projectId]) return;
    setLoadingProposals(projectId);
    try {
      const res = await fetch(`/api/leads/${projectId}/proposal`);
      if (res.ok) {
        const json = await res.json();
        setProposals((prev) => ({ ...prev, [projectId]: json.data ?? [] }));
      }
    } catch { /* ignore */ }
    finally { setLoadingProposals(null); }
  }

  function handleExpand(projectId: string) {
    const isExpanding = expandedId !== projectId;
    setExpandedId(isExpanding ? projectId : null);
    if (isExpanding) {
      fetchProposals(projectId);
      if (!activeTab[projectId]) {
        setActiveTab((prev) => ({ ...prev, [projectId]: "agencies" }));
      }
    }
  }

  function startEditing(project: Project) {
    setEditingId(project.id);
    setEditForm({
      description: project.project_description,
      budget: project.budget || "",
      timeline: project.timeline || "",
    });
  }

  async function saveEdit(projectId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectDescription: editForm.description,
          budget: editForm.budget || undefined,
          timeline: editForm.timeline || undefined,
        }),
      });
      if (res.ok) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? { ...p, project_description: editForm.description, budget: editForm.budget, timeline: editForm.timeline }
              : p
          )
        );
        setEditingId(null);
        showToast("success", "Saved", "Project brief updated.");
      }
    } catch { /* ignore */ }
    finally { setSaving(false); }
  }

  async function handleAcceptProposal(projectId: string, proposal: Proposal, agency: Agency | undefined) {
    if (!agency) return;
    setAcceptingId(proposal.id);
    try {
      const res = await fetch(`/api/leads/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "won", winnerAgencyId: agency.agencyId }),
      });
      if (res.ok) {
        showToast("success", "Proposal Accepted", `You selected ${proposal.agency_name}!`);
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? { ...p, status: "won", agencies: p.agencies.map((a) =>
                  a.agencyId === agency.agencyId
                    ? { ...a, assignmentStatus: "won" }
                    : { ...a, assignmentStatus: a.assignmentStatus === "responded" ? "lost" : a.assignmentStatus }
                ) }
              : p
          )
        );
      }
    } catch {
      showToast("error", "Error", "Could not accept proposal.");
    }
    finally { setAcceptingId(null); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
      </div>
    );
  }

  const totalAgencies = projects.reduce((sum, p) => sum + p.agencies.filter((a) => a.assignmentStatus !== "sent").length, 0);
  const totalProposals = projects.reduce((sum, p) => sum + p.agencies.filter((a) => a.assignmentStatus === "responded" || a.assignmentStatus === "won").length, 0);
  const completedCount = projects.filter((p) => p.agencies.some((a) => a.assignmentStatus === "won")).length;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy tracking-tight">My Projects</h1>
          <p className="mt-1 text-sm text-gray-500">Track briefs, compare proposals, and hire agencies.</p>
        </div>
        <Link
          href="/get-quotes"
          className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-dark transition-all shadow-sm hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Projects", value: projects.length, icon: Briefcase, color: "text-brand", bg: "bg-blue-50" },
          { label: "Interested Agencies", value: totalAgencies, icon: Building2, color: "text-green-600", bg: "bg-green-50" },
          { label: "Proposals", value: totalProposals, icon: FileText, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Completed", value: completedCount, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition-shadow">
              <div className={`w-9 h-9 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-navy">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-8 h-8 text-brand" />
          </div>
          <h3 className="text-lg font-semibold text-navy mb-2">No projects yet</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">Submit your first brief and get matched with top marketing agencies in minutes.</p>
          <Link
            href="/get-quotes"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-dark transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Get Free Quotes
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const isExpanded = expandedId === project.id;
            const status = statusLabels[project.status] || statusLabels.new;
            const claimedAgencies = project.agencies.filter((a) => a.assignmentStatus === "claimed" || a.assignmentStatus === "responded" || a.assignmentStatus === "won");
            const respondedAgencies = project.agencies.filter((a) => a.assignmentStatus === "responded" || a.assignmentStatus === "won");
            const currentTab = activeTab[project.id] || "agencies";
            const projectProposals = proposals[project.id] || [];

            return (
              <div key={project.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-200 transition-all">
                {/* Project Header */}
                <div
                  className="p-5 lg:p-6 cursor-pointer hover:bg-gray-50/30 transition-colors"
                  onClick={() => handleExpand(project.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                        <h3 className="font-semibold text-navy text-base">{project.company_name}</h3>
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-1 mb-2">{project.project_description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        {project.budget && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            {project.budget}
                          </span>
                        )}
                        {project.timeline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {project.timeline}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {timeAgo(project.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Stacked agency avatars */}
                      {claimedAgencies.length > 0 && (
                        <div className="flex -space-x-2">
                          {claimedAgencies.slice(0, 4).map((a) => (
                            <div
                              key={a.assignmentId}
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-white flex items-center justify-center shadow-sm"
                              title={a.agencyName}
                            >
                              {a.agencyLogo ? (
                                <Image src={a.agencyLogo} alt="" width={32} height={32} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-bold text-brand">
                                  {a.agencyName?.charAt(0) || "A"}
                                </span>
                              )}
                            </div>
                          ))}
                          {claimedAgencies.length > 4 && (
                            <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center shadow-sm">
                              <span className="text-[10px] font-bold text-gray-500">+{claimedAgencies.length - 4}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {respondedAgencies.length > 0 && (
                        <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                          {respondedAgencies.length} proposal{respondedAgencies.length > 1 ? "s" : ""}
                        </span>
                      )}
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {/* Tab Navigation */}
                    <div className="flex border-b border-gray-100 bg-gray-50/50">
                      {[
                        { key: "agencies", label: "Agencies", icon: Building2, count: claimedAgencies.length },
                        { key: "proposals", label: "Proposals", icon: FileText, count: respondedAgencies.length },
                        { key: "brief", label: "Project Brief", icon: Eye, count: 0 },
                      ].map((tab) => {
                        const TabIcon = tab.icon;
                        return (
                          <button
                            key={tab.key}
                            onClick={() => setActiveTab((prev) => ({ ...prev, [project.id]: tab.key }))}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                              currentTab === tab.key
                                ? "border-brand text-brand bg-white"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/50"
                            }`}
                          >
                            <TabIcon className="w-4 h-4" />
                            {tab.label}
                            {tab.count > 0 && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                currentTab === tab.key ? "bg-brand/10 text-brand" : "bg-gray-200 text-gray-600"
                              }`}>
                                {tab.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="p-5 lg:p-6">
                      {/* TAB: Agencies */}
                      {currentTab === "agencies" && (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-navy">
                              {project.agencies.length === 0 ? "Finding Agencies..." : `${project.agencies.length} Matched Agencies`}
                            </h4>
                          </div>

                          {project.agencies.length === 0 ? (
                            <div className="text-center py-8">
                              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <Users className="w-6 h-6 text-brand" />
                              </div>
                              <p className="text-sm text-gray-500">We&apos;re matching your project with top agencies.</p>
                              <p className="text-xs text-gray-400 mt-1">You&apos;ll be notified when agencies respond.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {project.agencies.map((agency) => {
                                const isInterested = agency.assignmentStatus !== "sent";
                                const hasProposal = agency.assignmentStatus === "responded" || agency.assignmentStatus === "won";
                                const isWinner = agency.assignmentStatus === "won";
                                const isLost = agency.assignmentStatus === "lost";
                                return (
                                  <div
                                    key={agency.assignmentId}
                                    className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
                                      isWinner
                                        ? "border-emerald-200 bg-emerald-50/50"
                                        : isLost
                                        ? "border-gray-100 bg-gray-50/50 opacity-60"
                                        : isInterested
                                        ? "border-blue-100 bg-blue-50/30 hover:border-blue-200"
                                        : "border-gray-100 bg-white hover:border-gray-200"
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                        isWinner ? "bg-emerald-100" : isInterested ? "bg-blue-100" : "bg-gray-100"
                                      }`}>
                                        {agency.agencyLogo ? (
                                          <Image src={agency.agencyLogo} alt="" width={44} height={44} className="w-11 h-11 rounded-xl object-cover" />
                                        ) : (
                                          <Building2 className={`w-5 h-5 ${isWinner ? "text-emerald-600" : isInterested ? "text-brand" : "text-gray-400"}`} />
                                        )}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm font-semibold text-navy">{agency.agencyName}</p>
                                          {isWinner && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                              <CheckCircle className="w-3 h-3" />
                                              SELECTED
                                            </span>
                                          )}
                                        </div>
                                        <p className={`text-xs font-medium mt-0.5 ${
                                          isWinner ? "text-emerald-600"
                                          : hasProposal ? "text-green-600"
                                          : isInterested ? "text-brand"
                                          : isLost ? "text-gray-400"
                                          : "text-gray-400"
                                        }`}>
                                          {isWinner ? "Selected Partner"
                                           : hasProposal ? "Proposal Submitted"
                                           : isInterested ? "Interested"
                                           : isLost ? "Not Selected"
                                           : "Awaiting Response"}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {(isInterested && !isLost) && (
                                        <Link
                                          href={`/client/messages?assignmentId=${agency.assignmentId}`}
                                          className="flex items-center gap-1.5 px-3.5 py-2 bg-brand text-white text-xs font-semibold rounded-lg hover:bg-brand-dark transition-all shadow-sm"
                                        >
                                          <MessageSquare className="w-3.5 h-3.5" />
                                          Chat
                                        </Link>
                                      )}
                                      {agency.agencySlug && (
                                        <Link
                                          href={`/agencies/${agency.agencySlug}`}
                                          className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                          Profile
                                        </Link>
                                      )}
                                      {!isInterested && (
                                        <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg">
                                          <Clock className="w-3.5 h-3.5" />
                                          Pending
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* TAB: Proposals */}
                      {currentTab === "proposals" && (
                        <div>
                          {loadingProposals === project.id ? (
                            <div className="flex items-center justify-center py-12">
                              <Loader2 className="w-6 h-6 text-brand animate-spin" />
                            </div>
                          ) : projectProposals.length === 0 ? (
                            <div className="text-center py-12">
                              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <FileText className="w-7 h-7 text-gray-300" />
                              </div>
                              <p className="text-sm font-medium text-gray-600 mb-1">No proposals yet</p>
                              <p className="text-xs text-gray-400">Agencies are reviewing your project brief.</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {projectProposals.map((proposal) => {
                                const matchedAgency = project.agencies.find(
                                  (a) => a.agencyName === proposal.agency_name
                                );
                                const isAccepted = matchedAgency?.assignmentStatus === "won";
                                const isProcessing = acceptingId === proposal.id;

                                return (
                                  <div
                                    key={proposal.id}
                                    className={`rounded-xl border overflow-hidden transition-all ${
                                      isAccepted
                                        ? "border-emerald-200 bg-emerald-50/30"
                                        : "border-gray-200 bg-white hover:border-gray-300"
                                    }`}
                                  >
                                    {/* Proposal Header */}
                                    <div className="flex items-center justify-between p-4 pb-3">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                          isAccepted ? "bg-emerald-100" : "bg-blue-50"
                                        }`}>
                                          {proposal.agency_logo ? (
                                            <Image src={proposal.agency_logo} alt="" width={40} height={40} className="w-10 h-10 rounded-xl object-cover" />
                                          ) : (
                                            <Building2 className={`w-5 h-5 ${isAccepted ? "text-emerald-600" : "text-brand"}`} />
                                          )}
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-navy">{proposal.agency_name}</p>
                                            {isAccepted && (
                                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                                <CheckCircle className="w-3 h-3" />
                                                ACCEPTED
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-gray-400">{timeAgo(proposal.created_at)}</p>
                                        </div>
                                      </div>
                                      {(proposal.estimated_budget || proposal.estimated_timeline) && (
                                        <div className="flex items-center gap-3">
                                          {proposal.estimated_budget && (
                                            <span className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                                              <DollarSign className="w-3 h-3 text-green-500" />
                                              {proposal.estimated_budget}
                                            </span>
                                          )}
                                          {proposal.estimated_timeline && (
                                            <span className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100">
                                              <Calendar className="w-3 h-3 text-blue-500" />
                                              {proposal.estimated_timeline}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Proposal Body */}
                                    <div className="px-4 pb-4">
                                      <div className="bg-gray-50/70 rounded-lg p-4 border border-gray-100">
                                        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{proposal.message}</p>
                                      </div>
                                    </div>

                                    {/* Proposal Actions */}
                                    {!isAccepted && project.status !== "won" && (
                                      <div className="px-4 pb-4 flex items-center justify-between">
                                        <Link
                                          href={`/client/messages?assignmentId=${matchedAgency?.assignmentId || ""}`}
                                          className="flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-dark transition-colors"
                                        >
                                          <MessageSquare className="w-3.5 h-3.5" />
                                          Chat with Agency
                                          <ArrowRight className="w-3 h-3" />
                                        </Link>
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => handleAcceptProposal(project.id, proposal, matchedAgency)}
                                            disabled={isProcessing}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm"
                                          >
                                            {isProcessing ? (
                                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                              <CheckCircle className="w-3.5 h-3.5" />
                                            )}
                                            Accept Proposal
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* TAB: Brief */}
                      {currentTab === "brief" && (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-navy">Project Brief</h4>
                            {editingId === project.id ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => saveEdit(project.id)}
                                  disabled={saving}
                                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-brand rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors"
                                >
                                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditing(project)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                                Edit Brief
                              </button>
                            )}
                          </div>

                          {editingId === project.id ? (
                            <div className="space-y-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Description</label>
                                <textarea
                                  value={editForm.description}
                                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                                  rows={5}
                                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none resize-none"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Budget</label>
                                  <input
                                    type="text"
                                    value={editForm.budget}
                                    onChange={(e) => setEditForm((p) => ({ ...p, budget: e.target.value }))}
                                    placeholder="e.g. $5,000 - $10,000"
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Timeline</label>
                                  <input
                                    type="text"
                                    value={editForm.timeline}
                                    onChange={(e) => setEditForm((p) => ({ ...p, timeline: e.target.value }))}
                                    placeholder="e.g. 2-4 weeks"
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-100">
                                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{project.project_description}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-100">
                                  <p className="text-xs font-medium text-gray-400 mb-1">Budget</p>
                                  <p className="text-sm font-semibold text-navy flex items-center gap-1.5">
                                    <DollarSign className="w-4 h-4 text-green-500" />
                                    {project.budget || "Not specified"}
                                  </p>
                                </div>
                                <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-100">
                                  <p className="text-xs font-medium text-gray-400 mb-1">Timeline</p>
                                  <p className="text-sm font-semibold text-navy flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-blue-500" />
                                    {project.timeline || "Not specified"}
                                  </p>
                                </div>
                              </div>
                              <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-100">
                                <p className="text-xs font-medium text-gray-400 mb-1">Status</p>
                                <div className="flex items-center gap-2">
                                  <Shield className={`w-4 h-4 ${status.color}`} />
                                  <p className={`text-sm font-semibold ${status.color}`}>{status.label}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
