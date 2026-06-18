"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Globe,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Upload,
  Save,
  Search,
  Loader2,
  Image as ImageIcon,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type LocationItem = { id: string; name: string; slug: string; code?: string };
type ServiceItem = { id: string; name: string; slug: string };
type IndustryItem = { id: string; name: string; slug: string };

const SOCIAL_PLATFORMS = [
  { key: "linkedinUrl", label: "LinkedIn", placeholder: "https://linkedin.com/company/..." },
  { key: "twitterUrl", label: "Twitter / X", placeholder: "https://x.com/..." },
  { key: "facebookUrl", label: "Facebook", placeholder: "https://facebook.com/..." },
  { key: "instagramUrl", label: "Instagram", placeholder: "https://instagram.com/..." },
] as const;

type SocialLink = { platform: string; url: string };

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [submittingForReview, setSubmittingForReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [existingAgencyId, setExistingAgencyId] = useState<string | null>(null);
  const [agencyStatus, setAgencyStatus] = useState<string | null>(null);
  const [agencySlug, setAgencySlug] = useState<string | null>(null);

  const [countries, setCountries] = useState<LocationItem[]>([]);
  const [citiesList, setCitiesList] = useState<LocationItem[]>([]);
  const [serviceOptions, setServiceOptions] = useState<ServiceItem[]>([]);
  const [industryOptions, setIndustryOptions] = useState<IndustryItem[]>([]);

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedIndustryIds, setSelectedIndustryIds] = useState<string[]>([]);

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([
    { platform: "linkedinUrl", url: "" },
  ]);

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [form, setForm] = useState({
    name: "",
    tagline: "",
    description: "",
    website: "",
    email: "",
    phone: "",
    countryId: "",
    cityId: "",
    address: "",
    foundedYear: "",
    companySize: "",
    hourlyRate: "",
    minProjectSize: "",
    metaTitle: "",
    metaDescription: "",
  });

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(me => {
      if (!me?.data?.id) {
        setLoading(false);
        return;
      }
      const userId = me.data.id;
      setCurrentUser({ id: userId, email: me.data.email, role: me.data.role });
      return loadProfile(userId);
    }).catch(() => setLoading(false));
  }, []);

  const loadProfile = useCallback((_userId: string) => {
    Promise.all([
      fetch("/api/locations").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
      fetch("/api/industries").then((r) => r.json()),
      fetch("/api/agencies/mine").then((r) => r.json()),
    ])
      .then(([loc, svc, ind, mineRes]) => {
        setCountries(loc.data || []);
        setServiceOptions(svc.data || []);
        setIndustryOptions(ind.data || []);

        const agency = mineRes.data?.agency ?? null;

        if (agency) {
          setExistingAgencyId(agency.id);
          setAgencyStatus(agency.status || null);
          setAgencySlug(agency.slug || null);

          setForm({
            name: agency.name || "",
            tagline: agency.tagline || "",
            description: agency.description || "",
            website: agency.website || "",
            email: agency.email || "",
            phone: agency.phone || "",
            countryId: agency.country_id || "",
            cityId: agency.city_id || "",
            address: agency.address || "",
            foundedYear: agency.founded_year?.toString() || "",
            companySize: agency.company_size || "",
            hourlyRate: agency.hourly_rate || "",
            minProjectSize: agency.min_project_size?.toString() || "",
            metaTitle: agency.meta_title || "",
            metaDescription: agency.meta_description || "",
          });

          if (agency.serviceIds?.length) setSelectedServiceIds(agency.serviceIds);
          if (agency.industryIds?.length) setSelectedIndustryIds(agency.industryIds);

          if (agency.logo) setLogoPreview(agency.logo);
          if (agency.cover_image) setCoverPreview(agency.cover_image);

          // Map social_links jsonb to socialLinks state
          if (agency.social_links && typeof agency.social_links === "object") {
            const keyMap: Record<string, string> = {
              linkedin: "linkedinUrl",
              twitter: "twitterUrl",
              facebook: "facebookUrl",
              instagram: "instagramUrl",
            };
            const mapped: SocialLink[] = Object.entries(
              agency.social_links as Record<string, string>
            )
              .filter(([key]) => key in keyMap)
              .map(([key, url]) => ({ platform: keyMap[key], url: url || "" }));
            if (mapped.length > 0) {
              setSocialLinks(mapped);
            }
          }

          // Load cities for the saved country
          if (agency.country_id) {
            fetch(`/api/locations?countryId=${agency.country_id}`)
              .then((r) => r.json())
              .then((data) => setCitiesList(data.data || []))
              .catch(() => {});
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadCities = useCallback((countryId: string) => {
    if (!countryId) {
      setCitiesList([]);
      return;
    }
    fetch(`/api/locations?countryId=${countryId}`)
      .then((r) => r.json())
      .then((data) => setCitiesList(data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (form.countryId) loadCities(form.countryId);
  }, [form.countryId, loadCities]);

  const autoSeo = useCallback(() => {
    const title = form.tagline
      ? `${form.name} - ${form.tagline}`.slice(0, 70)
      : form.name.slice(0, 70);
    const desc = form.description
      ? form.description.slice(0, 160)
      : `${form.name} is a professional agency. ${form.tagline || ""}`.slice(0, 160);
    setForm((prev) => ({
      ...prev,
      metaTitle: prev.metaTitle || title,
      metaDescription: prev.metaDescription || desc,
    }));
  }, [form.name, form.tagline, form.description]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "countryId") {
      setForm((prev) => ({ ...prev, cityId: "" }));
    }
  };

  const handleImageUpload = async (
    file: File,
    type: "logo" | "cover"
  ) => {
    const setter = type === "logo" ? setUploadingLogo : setUploadingCover;
    const previewSetter = type === "logo" ? setLogoPreview : setCoverPreview;
    setter(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", type);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok && json.data?.url) {
        previewSetter(json.data.url);
      } else {
        setMessage({ type: "error", text: json.error || "Upload failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Upload failed" });
    } finally {
      setter(false);
    }
  };

  const addSocialLink = () => {
    const used = socialLinks.map((s) => s.platform);
    const available = SOCIAL_PLATFORMS.find((p) => !used.includes(p.key));
    if (available) {
      setSocialLinks([...socialLinks, { platform: available.key, url: "" }]);
    }
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const updateSocialLink = (index: number, field: "platform" | "url", value: string) => {
    setSocialLinks(
      socialLinks.map((link, i) => (i === index ? { ...link, [field]: value } : link))
    );
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setMessage({ type: "error", text: "Agency name is required." });
      return;
    }

    autoSeo();
    setSaving(true);
    setMessage(null);

    const socialData: Record<string, string> = {};
    socialLinks.forEach((link) => {
      if (link.url.trim()) socialData[link.platform] = link.url.trim();
    });

    const payload: Record<string, unknown> = {
      ...form,
      foundedYear: form.foundedYear ? Number(form.foundedYear) : undefined,
      minProjectSize: form.minProjectSize ? Number(form.minProjectSize.replace(/[^0-9]/g, "")) : undefined,
      ...socialData,
      serviceIds: selectedServiceIds,
      industryIds: selectedIndustryIds,
      countryId: form.countryId || undefined,
      cityId: form.cityId || undefined,
    };

    if (logoPreview) payload.logo = logoPreview;
    if (coverPreview) payload.coverImage = coverPreview;

    Object.keys(payload).forEach((k) => {
      if (payload[k] === "" || payload[k] === undefined) delete payload[k];
    });

    try {
      let res;
      if (existingAgencyId) {
        res = await fetch(`/api/agencies/${existingAgencyId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/agencies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: existingAgencyId ? "Agency updated successfully!" : "Agency created successfully!" });
        if (json.data?.id) setExistingAgencyId(json.data.id);
        if (json.data?.status) setAgencyStatus(json.data.status);
        if (json.data?.slug) setAgencySlug(json.data.slug);
      } else {
        setMessage({ type: "error", text: json.error || "Something went wrong" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!existingAgencyId) return;
    setSubmittingForReview(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/agencies/${existingAgencyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending" }),
      });
      const json = await res.json();
      if (res.ok) {
        setAgencyStatus("pending");
        setMessage({ type: "success", text: "Your agency has been submitted for review!" });
      } else {
        setMessage({ type: "error", text: json.error || "Failed to submit for review." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setSubmittingForReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Agency Profile</h1>
          <p className="mt-1 text-gray-500">
            {existingAgencyId ? "Update your agency listing." : "Create your agency listing in the directory."}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : existingAgencyId ? "Save Changes" : "Create Agency"}
        </button>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-2 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {existingAgencyId && agencyStatus && (
        <div
          className={`mb-6 p-4 rounded-lg text-sm ${
            agencyStatus === "draft"
              ? "bg-yellow-50 text-yellow-800 border border-yellow-200"
              : agencyStatus === "pending"
              ? "bg-blue-50 text-blue-800 border border-blue-200"
              : agencyStatus === "active"
              ? "bg-green-50 text-green-800 border border-green-200"
              : agencyStatus === "suspended"
              ? "bg-red-50 text-red-800 border border-red-200"
              : agencyStatus === "rejected"
              ? "bg-orange-50 text-orange-800 border border-orange-200"
              : "bg-gray-50 text-gray-700 border border-gray-200"
          }`}
        >
          {agencyStatus === "draft" && (
            <div className="flex items-center justify-between">
              <p>Your agency profile is saved as a draft. Submit it for review when ready.</p>
              <button
                onClick={handleSubmitForReview}
                disabled={submittingForReview}
                className="ml-4 flex-shrink-0 flex items-center gap-2 bg-brand text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60"
              >
                {submittingForReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {submittingForReview ? "Submitting..." : "Submit for Review"}
              </button>
            </div>
          )}
          {agencyStatus === "pending" && (
            <p>Your agency is pending admin approval.</p>
          )}
          {agencyStatus === "active" && (
            <p>
              Your agency is live and visible to the public.{" "}
              {agencySlug && (
                <a href={`/agencies/${agencySlug}`} className="underline font-medium">
                  View public profile
                </a>
              )}
            </p>
          )}
          {agencyStatus === "suspended" && (
            <div>
              <p className="font-semibold">Your agency listing has been suspended and removed from public listings. Please contact support at support@agencyhub.com to resolve this and get your agency listed again.</p>
              <a
                href="mailto:support@agencyhub.com"
                className="mt-3 inline-flex items-center gap-2 bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Contact Support
              </a>
            </div>
          )}
          {agencyStatus === "rejected" && (
            <p>Your agency was not approved. Please update and resubmit.</p>
          )}
          {agencySlug && agencyStatus !== "active" && (
            <p className="mt-1">
              <a href={`/agencies/${agencySlug}`} className="underline font-medium">
                Preview your profile
              </a>
            </p>
          )}
        </div>
      )}

      {/* Cover Image */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
        <div
          className="h-48 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-center border-b border-gray-100 relative group cursor-pointer overflow-hidden"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleImageUpload(file, "cover");
            };
            input.click();
          }}
        >
          {coverPreview ? (
            <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center">
              <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Cover Image (1200 x 400 recommended)</p>
              <button className="mt-2 text-xs text-brand font-medium flex items-center gap-1 mx-auto">
                {uploadingCover ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                Upload Cover Image
              </button>
            </div>
          )}
        </div>
        <div className="px-6 py-4 flex items-center gap-4">
          <div
            className="w-20 h-20 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center -mt-14 relative z-10 bg-white cursor-pointer overflow-hidden"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleImageUpload(file, "logo");
              };
              input.click();
            }}
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <div className="text-center">
                {uploadingLogo ? (
                  <Loader2 className="w-5 h-5 text-gray-400 mx-auto animate-spin" />
                ) : (
                  <Upload className="w-5 h-5 text-gray-400 mx-auto" />
                )}
                <span className="text-[10px] text-gray-400">Logo</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-navy">{form.name || "Your Agency"}</p>
            <p className="text-xs text-gray-500">{form.tagline || "Your tagline"}</p>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy mb-5 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-brand" />
          Basic Information
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Agency Name *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors"
              placeholder="Your agency name"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tagline</label>
            <input
              name="tagline"
              value={form.tagline}
              onChange={handleChange}
              onBlur={autoSeo}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors"
              placeholder="Short tagline that describes your agency"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              onBlur={autoSeo}
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors resize-y"
              placeholder="Describe your agency, services, expertise, and what makes you unique. Be detailed — this helps potential clients find you."
            />
            <p className="mt-1 text-xs text-gray-400">{form.description.length} characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Globe className="w-3.5 h-3.5 inline mr-1" />
              Website
            </label>
            <input
              name="website"
              value={form.website}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors"
              placeholder="https://yourwebsite.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Mail className="w-3.5 h-3.5 inline mr-1" />
              Email
            </label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors"
              placeholder="contact@agency.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Phone className="w-3.5 h-3.5 inline mr-1" />
              Phone
            </label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors"
              placeholder="+1 (555) 000-0000"
            />
          </div>
        </div>
      </section>

      {/* Location */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy mb-5 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-brand" />
          Location
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
            <select
              name="countryId"
              value={form.countryId}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors bg-white"
            >
              <option value="">Select a country</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
            <select
              name="cityId"
              value={form.cityId}
              onChange={handleChange}
              disabled={!form.countryId}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors bg-white disabled:opacity-50"
            >
              <option value="">{form.countryId ? "Select a city" : "Select a country first"}</option>
              {citiesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors"
              placeholder="Street address"
            />
          </div>
        </div>
      </section>

      {/* Company Details */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy mb-5 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-brand" />
          Company Details
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Founded Year</label>
            <input
              name="foundedYear"
              type="number"
              value={form.foundedYear}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors"
              placeholder="2020"
              min="1900"
              max={new Date().getFullYear()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Users className="w-3.5 h-3.5 inline mr-1" />
              Company Size
            </label>
            <select
              name="companySize"
              value={form.companySize}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors bg-white"
            >
              <option value="">Select size</option>
              <option value="1-10">1-10</option>
              <option value="11-50">11-50</option>
              <option value="51-200">51-200</option>
              <option value="201-500">201-500</option>
              <option value="501-1000">501-1000</option>
              <option value="1000+">1000+</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <DollarSign className="w-3.5 h-3.5 inline mr-1" />
              Hourly Rate
            </label>
            <select
              name="hourlyRate"
              value={form.hourlyRate}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors bg-white"
            >
              <option value="">Select rate</option>
              <option>Under $25</option>
              <option>$25 - $49</option>
              <option>$50 - $99</option>
              <option>$100 - $149</option>
              <option>$150 - $199</option>
              <option>$200+</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Min. Project Size</label>
            <select
              name="minProjectSize"
              value={form.minProjectSize}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors bg-white"
            >
              <option value="">Select minimum</option>
              <option value="1000">$1,000</option>
              <option value="5000">$5,000</option>
              <option value="10000">$10,000</option>
              <option value="25000">$25,000</option>
              <option value="50000">$50,000+</option>
            </select>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy mb-5">Services</h2>
        {serviceOptions.length === 0 ? (
          <p className="text-sm text-gray-500">No services available. Please run the setup first.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {serviceOptions.map((svc) => {
              const selected = selectedServiceIds.includes(svc.id);
              return (
                <label
                  key={svc.id}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                    selected
                      ? "border-brand bg-blue-50 text-brand"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() =>
                      setSelectedServiceIds((prev) =>
                        selected ? prev.filter((id) => id !== svc.id) : [...prev, svc.id]
                      )
                    }
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      selected ? "bg-brand border-brand" : "border-gray-300"
                    }`}
                  >
                    {selected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {svc.name}
                </label>
              );
            })}
          </div>
        )}
      </section>

      {/* Industries */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy mb-5">Industries</h2>
        {industryOptions.length === 0 ? (
          <p className="text-sm text-gray-500">No industries available. Please run the setup first.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {industryOptions.map((ind) => {
              const selected = selectedIndustryIds.includes(ind.id);
              return (
                <label
                  key={ind.id}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                    selected
                      ? "border-brand bg-blue-50 text-brand"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() =>
                      setSelectedIndustryIds((prev) =>
                        selected ? prev.filter((id) => id !== ind.id) : [...prev, ind.id]
                      )
                    }
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      selected ? "bg-brand border-brand" : "border-gray-300"
                    }`}
                  >
                    {selected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {ind.name}
                </label>
              );
            })}
          </div>
        )}
      </section>

      {/* Social Links */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-navy">Social Links</h2>
          {socialLinks.length < SOCIAL_PLATFORMS.length && (
            <button
              onClick={addSocialLink}
              className="text-sm text-brand font-medium flex items-center gap-1 hover:text-brand-dark"
            >
              <Plus className="w-4 h-4" />
              Add Link
            </button>
          )}
        </div>
        <div className="space-y-4">
          {socialLinks.map((link, index) => {
            const platformInfo = SOCIAL_PLATFORMS.find((p) => p.key === link.platform);
            const usedPlatforms = socialLinks.map((s) => s.platform);
            return (
              <div key={index} className="flex gap-3 items-start">
                <select
                  value={link.platform}
                  onChange={(e) => updateSocialLink(index, "platform", e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white min-w-[140px]"
                >
                  {SOCIAL_PLATFORMS.map((p) => (
                    <option
                      key={p.key}
                      value={p.key}
                      disabled={usedPlatforms.includes(p.key) && p.key !== link.platform}
                    >
                      {p.label}
                    </option>
                  ))}
                </select>
                <input
                  value={link.url}
                  onChange={(e) => updateSocialLink(index, "url", e.target.value)}
                  placeholder={platformInfo?.placeholder || "https://..."}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors"
                />
                <button
                  onClick={() => removeSocialLink(index)}
                  className="p-2.5 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* SEO Preview */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-navy mb-5 flex items-center gap-2">
          <Search className="w-5 h-5 text-brand" />
          SEO Settings
        </h2>
        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Meta Title ({(form.metaTitle || "").length}/70)
            </label>
            <input
              name="metaTitle"
              value={form.metaTitle}
              onChange={handleChange}
              maxLength={70}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors"
              placeholder="Auto-generated from name + tagline"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Meta Description ({(form.metaDescription || "").length}/160)
            </label>
            <textarea
              name="metaDescription"
              value={form.metaDescription}
              onChange={handleChange}
              maxLength={160}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-colors resize-none"
              placeholder="Auto-generated from description"
            />
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
          <p className="text-xs text-green-700 mb-1">
            www.agencyhub.com &rsaquo; agencies &rsaquo; {form.name ? form.name.toLowerCase().replace(/\s+/g, "-") : "your-agency"}
          </p>
          <p className="text-lg text-blue-800 hover:underline cursor-pointer font-medium">
            {form.metaTitle || form.name || "Agency Name"}
          </p>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {form.metaDescription || form.description || "Your agency description will appear here."}
          </p>
        </div>
      </section>

      {/* Bottom Save */}
      <div className="flex justify-end pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-brand text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : existingAgencyId ? "Save Changes" : "Create Agency"}
        </button>
      </div>
    </div>
  );
}
