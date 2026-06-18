"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Search,
  FileText,
  User,
  TrendingUp,
  Zap,
  Users,
  Globe,
  Megaphone,
  Palette,
  BarChart3,
  Mail,
  PenTool,
  Send,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  FolderOpen,
} from "lucide-react";

const SERVICES = [
  { id: "seo", label: "SEO", icon: TrendingUp },
  { id: "ppc", label: "PPC / Paid Ads", icon: Zap },
  { id: "social", label: "Social Media Marketing", icon: Users },
  { id: "web-design", label: "Web Design & Development", icon: Globe },
  { id: "content", label: "Content Marketing", icon: PenTool },
  { id: "branding", label: "Branding & Strategy", icon: Palette },
  { id: "email", label: "Email Marketing", icon: Mail },
  { id: "pr", label: "Public Relations", icon: Megaphone },
  { id: "analytics", label: "Analytics & Data", icon: BarChart3 },
  { id: "video", label: "Video Production", icon: FileText },
];

const BUDGETS = [
  "Under $5,000",
  "$5,000 - $10,000",
  "$10,000 - $25,000",
  "$25,000 - $50,000",
  "$50,000 - $100,000",
  "$100,000+",
];

const TIMELINES = [
  "ASAP",
  "Within 1 month",
  "1 - 3 months",
  "3 - 6 months",
  "6+ months",
  "Ongoing / Retainer",
];

const INDUSTRIES = [
  "Technology / SaaS",
  "E-commerce / Retail",
  "Healthcare",
  "Finance / Banking",
  "Real Estate",
  "Education",
  "Travel / Hospitality",
  "Food & Beverage",
  "Manufacturing",
  "Non-Profit",
  "Other",
];

const STEPS = [
  { label: "Services", icon: Search },
  { label: "Project Details", icon: FileText },
  { label: "Contact Info", icon: User },
];

interface FormData {
  services: string[];
  description: string;
  budget: string;
  timeline: string;
  industry: string;
  name: string;
  email: string;
  phone: string;
  company: string;
}

interface FormErrors {
  services?: string;
  description?: string;
  budget?: string;
  timeline?: string;
  industry?: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
}

export default function GetQuotesPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    services: [],
    description: "",
    budget: "",
    timeline: "",
    industry: "",
    name: "",
    email: "",
    phone: "",
    company: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loggedInUser, setLoggedInUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const json = await res.json();
          const u = json.data;
          if (u?.name && u?.email) {
            setLoggedInUser({ name: u.name, email: u.email });
            setForm((prev) => ({
              ...prev,
              name: prev.name || u.name,
              email: prev.email || u.email,
              company: prev.company || u.company || u.name,
            }));
          }
        }
      } catch { /* not logged in */ }
    }
    checkAuth();
  }, []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((p) => ({ ...p, [key]: undefined }));
    }
  }

  function toggleService(id: string) {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(id)
        ? prev.services.filter((s) => s !== id)
        : [...prev.services, id],
    }));
    if (errors.services) setErrors((p) => ({ ...p, services: undefined }));
  }

  function validateStep(s: number): FormErrors {
    const next: FormErrors = {};
    if (s === 0) {
      if (form.services.length === 0)
        next.services = "Select at least one service";
    }
    if (s === 1) {
      if (!form.description.trim())
        next.description = "Please describe your project";
      if (!form.budget) next.budget = "Select a budget range";
      if (!form.timeline) next.timeline = "Select a timeline";
      if (!form.industry) next.industry = "Select your industry";
    }
    if (s === 2) {
      if (!form.name.trim()) next.name = "Name is required";
      if (!form.email.trim()) {
        next.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        next.email = "Enter a valid email address";
      }
      if (!form.company.trim()) next.company = "Company name is required";
    }
    return next;
  }

  const totalSteps = loggedInUser ? 2 : 3;

  function handleNext() {
    const v = validateStep(step);
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    if (step < totalSteps - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleBack() {
    if (step > 0) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const [submitError, setSubmitError] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [signupForm, setSignupForm] = useState({ password: "", showPassword: false });
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);
  const [signupError, setSignupError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validateStep(step);
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    setIsSubmitting(true);
    setSubmitError("");

    // Build a rich project description that includes selected services and industry
    const selectedServiceLabels = form.services
      .map((id) => SERVICES.find((s) => s.id === id)?.label)
      .filter(Boolean);
    const descriptionParts = [form.description];
    if (selectedServiceLabels.length > 0) {
      descriptionParts.push(
        `\nServices needed: ${selectedServiceLabels.join(", ")}`
      );
    }
    if (form.industry) {
      descriptionParts.push(`\nIndustry: ${form.industry}`);
    }

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.company || (loggedInUser ? loggedInUser.name : ""),
          contactName: form.name || (loggedInUser ? loggedInUser.name : ""),
          contactEmail: form.email || (loggedInUser ? loggedInUser.email : ""),
          contactPhone: form.phone || undefined,
          projectDescription: descriptionParts.join(""),
          budget: form.budget || undefined,
          timeline: form.timeline || undefined,
        }),
      });

      const resData = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          resData?.error ?? `Request failed (${res.status})`
        );
      }

      if (resData?.data?.id) setLeadId(resData.data.id);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleClientSignup(e: React.FormEvent) {
    e.preventDefault();
    if (signupForm.password.length < 8) {
      setSignupError("Password must be at least 8 characters");
      return;
    }
    setSignupLoading(true);
    setSignupError("");
    try {
      const res = await fetch("/api/auth/register-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: signupForm.password,
          leadId: leadId || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setSignupDone(true);
      } else {
        setSignupError(json.error || "Registration failed");
      }
    } catch {
      setSignupError("Network error. Please try again.");
    } finally {
      setSignupLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="text-center mb-10">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-3xl font-bold text-navy">
            Your request has been submitted!
          </h1>
          <p className="mt-4 text-lg text-gray-500">
            We&apos;re matching you with the best agencies for your project.
            Agencies will start responding soon.
          </p>
        </div>

        {/* Signup prompt — only for non-logged-in users */}
        {loggedInUser ? (
          <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6 sm:p-8 mb-8 text-center">
            <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-navy">Project submitted!</h2>
            <p className="text-sm text-gray-600 mt-1 mb-4">
              Track progress and chat with agencies from your dashboard.
            </p>
            <Link
              href="/client"
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              Go to My Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : !signupDone ? (
          <div className="rounded-xl border-2 border-brand/20 bg-gradient-to-br from-brand/5 to-blue-50 p-6 sm:p-8 mb-8">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 bg-brand/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-brand" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-navy">Create your free account</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Track your project, chat with agencies, and compare proposals — all in one place.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MessageSquare className="w-4 h-4 text-brand" />
                Chat with agencies
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FolderOpen className="w-4 h-4 text-brand" />
                Track your projects
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Search className="w-4 h-4 text-brand" />
                Discover more agencies
              </div>
            </div>

            <form onSubmit={handleClientSignup}>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 bg-gray-100 rounded-lg px-4 py-2.5 text-sm text-gray-500">
                  {form.email}
                </div>
              </div>
              <div className="relative mb-3">
                <input
                  type={signupForm.showPassword ? "text" : "password"}
                  value={signupForm.password}
                  onChange={(e) => setSignupForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Create a password (min 8 characters)"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-navy pr-10 focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSignupForm((p) => ({ ...p, showPassword: !p.showPassword }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {signupForm.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {signupError && (
                <p className="text-sm text-danger mb-3">{signupError}</p>
              )}
              <button
                type="submit"
                disabled={signupLoading}
                className="w-full rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {signupLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Create Account & Track Project"
                )}
              </button>
            </form>
            <div className="flex items-center justify-center gap-4 mt-3">
              <p className="text-xs text-gray-400">
                Already have an account? <Link href="/auth/signin" className="text-brand hover:underline">Sign in</Link>
              </p>
              <span className="text-xs text-gray-300">|</span>
              <button
                type="button"
                onClick={() => { setSignupDone(true); setSignupError("skipped"); }}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Skip for now
              </button>
            </div>
          </div>
        ) : signupError === "skipped" ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 sm:p-8 mb-8 text-center">
            <Mail className="w-10 h-10 text-brand mx-auto mb-3" />
            <h2 className="text-lg font-bold text-navy">We&apos;ll email you!</h2>
            <p className="text-sm text-gray-600 mt-1">
              Agencies will contact you at <span className="font-semibold">{form.email}</span> with their proposals.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6 sm:p-8 mb-8 text-center">
            <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-navy">Account created!</h2>
            <p className="text-sm text-gray-600 mt-1 mb-4">
              You can now track your project and chat with agencies.
            </p>
            <Link
              href="/client"
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              Go to My Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/agencies"
            className="rounded-lg border border-gray-200 px-6 py-3 text-sm font-semibold text-navy shadow-sm transition hover:bg-gray-50"
          >
            Browse Agencies
          </Link>
          <Link
            href="/"
            className="rounded-lg bg-white border border-gray-200 px-6 py-3 text-sm font-semibold text-navy shadow-sm transition hover:bg-gray-50"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-navy sm:text-4xl">
          Get Free Quotes
        </h1>
        <p className="mt-3 text-lg text-gray-500">
          Tell us about your project and receive proposals from top agencies
        </p>
      </div>

      {/* Progress */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          {(loggedInUser ? STEPS.slice(0, 2) : STEPS).map((s, i) => (
            <div key={s.label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition ${
                    i < step
                      ? "bg-success text-white"
                      : i === step
                      ? "bg-brand text-white"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {i < step ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <s.icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={`hidden text-xs font-medium sm:block ${
                    i <= step ? "text-navy" : "text-gray-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < totalSteps - 1 && (
                <div className="mx-2 h-0.5 flex-1 sm:mx-4">
                  <div
                    className={`h-full rounded-full transition-colors ${
                      i < step ? "bg-success" : "bg-gray-200"
                    }`}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form card */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          {/* Step 1: Services */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-bold text-navy">
                What services do you need?
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Select all that apply. You can choose multiple services.
              </p>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SERVICES.map((service) => {
                  const selected = form.services.includes(service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => toggleService(service.id)}
                      className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3.5 text-left text-sm font-medium transition ${
                        selected
                          ? "border-brand bg-brand/5 text-brand"
                          : "border-gray-200 text-navy hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <service.icon className="h-5 w-5 shrink-0" />
                      {service.label}
                      {selected && (
                        <CheckCircle className="ml-auto h-4 w-4 text-brand" />
                      )}
                    </button>
                  );
                })}
              </div>
              {errors.services && (
                <p className="mt-3 text-sm text-danger">{errors.services}</p>
              )}
            </div>
          )}

          {/* Step 2: Project details */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-navy">
                Tell us about your project
              </h2>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-navy"
                >
                  Project description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Describe your goals, target audience, and what you hope to achieve..."
                  className={`mt-1 block w-full rounded-lg border ${
                    errors.description
                      ? "border-danger focus:ring-danger"
                      : "border-gray-200 focus:ring-brand"
                  } bg-white px-4 py-3 text-sm text-navy placeholder:text-gray-400 shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2`}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-danger">
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Budget */}
              <div>
                <label
                  htmlFor="budget"
                  className="block text-sm font-medium text-navy"
                >
                  Budget range
                </label>
                <select
                  id="budget"
                  value={form.budget}
                  onChange={(e) => updateField("budget", e.target.value)}
                  className={`mt-1 block w-full rounded-lg border ${
                    errors.budget
                      ? "border-danger focus:ring-danger"
                      : "border-gray-200 focus:ring-brand"
                  } bg-white px-4 py-3 text-sm text-navy shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2`}
                >
                  <option value="">Select a budget range</option>
                  {BUDGETS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                {errors.budget && (
                  <p className="mt-1 text-sm text-danger">{errors.budget}</p>
                )}
              </div>

              {/* Timeline */}
              <div>
                <label
                  htmlFor="timeline"
                  className="block text-sm font-medium text-navy"
                >
                  Timeline
                </label>
                <select
                  id="timeline"
                  value={form.timeline}
                  onChange={(e) => updateField("timeline", e.target.value)}
                  className={`mt-1 block w-full rounded-lg border ${
                    errors.timeline
                      ? "border-danger focus:ring-danger"
                      : "border-gray-200 focus:ring-brand"
                  } bg-white px-4 py-3 text-sm text-navy shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2`}
                >
                  <option value="">When do you want to start?</option>
                  {TIMELINES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {errors.timeline && (
                  <p className="mt-1 text-sm text-danger">{errors.timeline}</p>
                )}
              </div>

              {/* Industry */}
              <div>
                <label
                  htmlFor="industry"
                  className="block text-sm font-medium text-navy"
                >
                  Industry
                </label>
                <select
                  id="industry"
                  value={form.industry}
                  onChange={(e) => updateField("industry", e.target.value)}
                  className={`mt-1 block w-full rounded-lg border ${
                    errors.industry
                      ? "border-danger focus:ring-danger"
                      : "border-gray-200 focus:ring-brand"
                  } bg-white px-4 py-3 text-sm text-navy shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2`}
                >
                  <option value="">Select your industry</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
                {errors.industry && (
                  <p className="mt-1 text-sm text-danger">{errors.industry}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Contact info (skipped for logged-in users) */}
          {step === 2 && !loggedInUser && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-navy">
                How can agencies reach you?
              </h2>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Name */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-navy"
                  >
                    Full name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="John Doe"
                    className={`mt-1 block w-full rounded-lg border ${
                      errors.name
                        ? "border-danger focus:ring-danger"
                        : "border-gray-200 focus:ring-brand"
                    } bg-white px-4 py-3 text-sm text-navy placeholder:text-gray-400 shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-danger">{errors.name}</p>
                  )}
                </div>

                {/* Company */}
                <div>
                  <label
                    htmlFor="company"
                    className="block text-sm font-medium text-navy"
                  >
                    Company name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="company"
                    type="text"
                    autoComplete="organization"
                    value={form.company}
                    onChange={(e) => updateField("company", e.target.value)}
                    placeholder="Acme Inc."
                    className={`mt-1 block w-full rounded-lg border ${
                      errors.company
                        ? "border-danger focus:ring-danger"
                        : "border-gray-200 focus:ring-brand"
                    } bg-white px-4 py-3 text-sm text-navy placeholder:text-gray-400 shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2`}
                  />
                  {errors.company && (
                    <p className="mt-1 text-sm text-danger">{errors.company}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="contact-email"
                  className="block text-sm font-medium text-navy"
                >
                  Email address <span className="text-danger">*</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="you@company.com"
                  className={`mt-1 block w-full rounded-lg border ${
                    errors.email
                      ? "border-danger focus:ring-danger"
                      : "border-gray-200 focus:ring-brand"
                  } bg-white px-4 py-3 text-sm text-navy placeholder:text-gray-400 shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-danger">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-navy"
                >
                  Phone number{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-navy placeholder:text-gray-400 shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>
          )}

          {/* Submission error */}
          {submitError && (
            <div className="mt-6 rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
              {submitError}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
            {step > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-medium text-navy shadow-sm transition hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </button>
            ) : (
              <div />
            )}

            {step < totalSteps - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    Submit Request
                    <Send className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Trust indicators */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-center text-sm text-gray-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-success" />
            100% Free
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-success" />
            No obligation
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-success" />
            Quotes within 48 hours
          </span>
        </div>
      </form>
    </div>
  );
}
