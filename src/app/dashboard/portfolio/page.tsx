"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Image as ImageIcon,
  Loader2,
  Briefcase,
  Calendar,
  DollarSign,
  Globe,
  Building2,
} from "lucide-react";

type PortfolioItem = {
  id: string;
  agency_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  project_url: string | null;
  client_name: string | null;
  client_logo: string | null;
  project_schedule: string | null;
  project_size: string | null;
  challenge: string | null;
  approach: string | null;
  results: string | null;
  services_provided: string | null;
  sort_order: number;
  created_at: string;
};

type FormData = {
  title: string;
  clientName: string;
  imageUrl: string;
  clientLogo: string;
  projectUrl: string;
  projectSchedule: string;
  projectSize: string;
  servicesProvided: string;
  challenge: string;
  approach: string;
  results: string;
};

const EMPTY_FORM: FormData = {
  title: "",
  clientName: "",
  imageUrl: "",
  clientLogo: "",
  projectUrl: "",
  projectSchedule: "",
  projectSize: "",
  servicesProvided: "",
  challenge: "",
  approach: "",
  results: "",
};

const PROJECT_SIZE_OPTIONS = [
  "Less than $10,000",
  "$10,000 - $50,000",
  "$50,000 - $100,000",
  "$100,000 - $500,000",
  "$500,000+",
];

export default function PortfolioPage() {
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  const fetchPortfolio = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/agencies/${id}/portfolio`);
      const json = await res.json();
      if (res.ok) {
        setItems(json.data || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetch("/api/agencies/mine")
      .then((r) => r.json())
      .then((json) => {
        const agency = json.data?.agency;
        if (agency?.id) {
          setAgencyId(agency.id);
          return fetchPortfolio(agency.id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchPortfolio]);

  const openAdd = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (item: PortfolioItem) => {
    setEditingItem(item);
    setForm({
      title: item.title || "",
      clientName: item.client_name || "",
      imageUrl: item.image_url || "",
      clientLogo: item.client_logo || "",
      projectUrl: item.project_url || "",
      projectSchedule: item.project_schedule || "",
      projectSize: item.project_size || "",
      servicesProvided: item.services_provided || "",
      challenge: item.challenge || "",
      approach: item.approach || "",
      results: item.results || "",
    });
    setModalOpen(true);
  };

  const handleDelete = async (item: PortfolioItem) => {
    if (!agencyId) return;
    if (!window.confirm(`Delete "${item.title}"? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/agencies/${agencyId}/portfolio?itemId=${item.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setMessage({ type: "success", text: "Portfolio item deleted." });
      } else {
        const json = await res.json();
        setMessage({ type: "error", text: json.error || "Failed to delete." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    }
  };

  const handleSave = async () => {
    if (!agencyId) return;
    if (!form.title.trim()) {
      setMessage({ type: "error", text: "Title is required." });
      return;
    }
    if (!form.challenge.trim() || !form.approach.trim() || !form.results.trim()) {
      setMessage({ type: "error", text: "Challenge, Approach, and Results are required." });
      return;
    }

    setSaving(true);
    setMessage(null);

    const payload: Record<string, unknown> = { ...form };

    // Remove empty strings
    Object.keys(payload).forEach((k) => {
      if (payload[k] === "") delete payload[k];
    });

    // For update, must keep title even if unchanged
    payload.title = form.title;

    try {
      let res;
      if (editingItem) {
        payload.itemId = editingItem.id;
        res = await fetch(`/api/agencies/${agencyId}/portfolio`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/agencies/${agencyId}/portfolio`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: editingItem ? "Portfolio item updated!" : "Portfolio item created!" });
        setModalOpen(false);
        await fetchPortfolio(agencyId);
      } else {
        setMessage({ type: "error", text: json.error || "Something went wrong." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const getServiceTags = (servicesProvided: string | null) => {
    if (!servicesProvided) return [];
    return servicesProvided.split(",").map((s) => s.trim()).filter(Boolean);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!agencyId) {
    return (
      <div className="max-w-4xl">
        <div className="text-center py-20">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-navy mb-2">No Agency Found</h2>
          <p className="text-gray-500">Please create your agency profile first before managing your portfolio.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Portfolio</h1>
          <p className="mt-1 text-gray-500">Showcase your best work to attract clients.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Portfolio Item
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-2 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Briefcase className="w-16 h-16 text-gray-200 mx-auto mb-6" />
          <h2 className="text-xl font-semibold text-navy mb-2">No portfolio items yet</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Showcase your best work to attract clients. Add case studies with challenges, approaches, and results.
          </p>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Your First Portfolio Item
          </button>
        </div>
      ) : (
        /* Portfolio Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const tags = getServiceTags(item.services_provided);
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Image */}
                <div className="h-[200px] bg-gray-50 flex items-center justify-center overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">No image</p>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold text-navy text-sm leading-snug line-clamp-2 mb-1">
                    {item.title}
                  </h3>
                  {item.client_name && (
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      Client: {item.client_name}
                    </p>
                  )}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="inline-block bg-blue-50 text-brand text-[11px] font-medium px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {tags.length > 2 && (
                        <span className="text-[11px] text-gray-400 px-1 py-0.5">
                          +{tags.length - 2} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
                  <button
                    onClick={() => openEdit(item)}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-brand transition-colors px-2 py-1.5 rounded-md hover:bg-gray-50"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-red-600 transition-colors px-2 py-1.5 rounded-md hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => !saving && setModalOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 z-10">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-navy">
                {editingItem ? "Edit Portfolio Item" : "Add Portfolio Item"}
              </h2>
              <button
                onClick={() => !saving && setModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Project Info */}
              <section>
                <h3 className="text-sm font-semibold text-navy mb-4 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-brand" />
                  Project Info
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
                    <input
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors"
                      placeholder="e.g., 53% Sales Boost With Smarter Marketing"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Building2 className="w-3.5 h-3.5 inline mr-1" />
                      Client Name
                    </label>
                    <input
                      name="clientName"
                      value={form.clientName}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors"
                      placeholder="e.g., ECS"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Globe className="w-3.5 h-3.5 inline mr-1" />
                      Project URL
                    </label>
                    <input
                      name="projectUrl"
                      value={form.projectUrl}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors"
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <ImageIcon className="w-3.5 h-3.5 inline mr-1" />
                      Project Image URL
                    </label>
                    <input
                      name="imageUrl"
                      value={form.imageUrl}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Client Logo URL
                    </label>
                    <input
                      name="clientLogo"
                      value={form.clientLogo}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <Calendar className="w-3.5 h-3.5 inline mr-1" />
                      Project Schedule
                    </label>
                    <input
                      name="projectSchedule"
                      value={form.projectSchedule}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors"
                      placeholder="e.g., May 2024 - Nov 2024"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      <DollarSign className="w-3.5 h-3.5 inline mr-1" />
                      Project Size
                    </label>
                    <select
                      name="projectSize"
                      value={form.projectSize}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors bg-white"
                    >
                      <option value="">Select project size</option>
                      {PROJECT_SIZE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Services Provided
                    </label>
                    <input
                      name="servicesProvided"
                      value={form.servicesProvided}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors"
                      placeholder="e.g., Search Engine Optimization, Web Development"
                    />
                    <p className="mt-1 text-xs text-gray-400">Comma-separated list of services</p>
                  </div>
                </div>
              </section>

              {/* Project Details */}
              <section>
                <h3 className="text-sm font-semibold text-navy mb-4 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-brand" />
                  Project Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Challenge *</label>
                    <textarea
                      name="challenge"
                      value={form.challenge}
                      onChange={handleChange}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors resize-y"
                      placeholder="Describe the problem or challenge the client faced..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Our Approach *</label>
                    <textarea
                      name="approach"
                      value={form.approach}
                      onChange={handleChange}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors resize-y"
                      placeholder="Describe your approach to solving the challenge..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Results *</label>
                    <textarea
                      name="results"
                      value={form.results}
                      onChange={handleChange}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors resize-y"
                      placeholder="Describe the outcomes and measurable results..."
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => !saving && setModalOpen(false)}
                disabled={saving}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
