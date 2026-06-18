"use client";

import { useState } from "react";
import { Star, Loader2, CheckCircle2, AlertCircle, X, ChevronRight, ChevronLeft, ThumbsUp, ThumbsDown } from "lucide-react";

interface ReviewFormProps {
  agencyId: string;
  agencyName: string;
}

const RATING_CATEGORIES = [
  {
    key: "budget" as const,
    label: "Budget",
    description: "How satisfied are you with the agency's understanding, flexibility and respect of your budget?",
  },
  {
    key: "quality" as const,
    label: "Quality",
    description: "How satisfied are you with the quality of the work delivered?",
  },
  {
    key: "schedule" as const,
    label: "Schedule",
    description: "Were the deliverables received on time? Did you encounter any delay?",
  },
  {
    key: "collaboration" as const,
    label: "Collaboration",
    description: "How effective was the collaboration in terms of communication, support, problem-solving?",
  },
];

const COMPANY_SIZE_OPTIONS = ["1-10", "11-50", "51-200", "201-500", "500+"];

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none cursor-pointer hover:scale-110 transition-transform"
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              star <= display
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-200 fill-gray-200"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function StepIndicator({ current }: { current: number }) {
  const steps = [
    { num: 1, label: "Ratings" },
    { num: 2, label: "Details" },
    { num: 3, label: "About You" },
  ];

  return (
    <div className="flex items-center justify-center gap-2 py-4 px-6 border-b border-gray-100">
      {steps.map((s, idx) => (
        <div key={s.num} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              s.num === current
                ? "bg-brand text-white"
                : s.num < current
                ? "bg-brand/20 text-brand"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {s.num < current ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              s.num
            )}
          </div>
          <span
            className={`text-xs font-medium hidden sm:inline ${
              s.num === current ? "text-navy" : "text-gray-400"
            }`}
          >
            {s.label}
          </span>
          {idx < steps.length - 1 && (
            <div
              className={`w-8 sm:w-12 h-0.5 ${
                s.num < current ? "bg-brand/40" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function ReviewForm({ agencyId, agencyName }: ReviewFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Step 1: Ratings
  const [budgetRating, setBudgetRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [scheduleRating, setScheduleRating] = useState(0);
  const [collaborationRating, setCollaborationRating] = useState(0);

  // Step 2: Review details
  const [objective, setObjective] = useState("");
  const [enjoyed, setEnjoyed] = useState("");
  const [improvements, setImprovements] = useState("");
  const [serviceProvided, setServiceProvided] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);

  // Step 3: Personal info
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyIndustry, setCompanyIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Spam controls
  const [website, setWebsite] = useState("");
  const [formLoadedAt] = useState(() => Date.now());

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ratings: Record<string, { value: number; setter: (v: number) => void }> = {
    budget: { value: budgetRating, setter: setBudgetRating },
    quality: { value: qualityRating, setter: setQualityRating },
    schedule: { value: scheduleRating, setter: setScheduleRating },
    collaboration: { value: collaborationRating, setter: setCollaborationRating },
  };

  const step1Valid =
    budgetRating > 0 && qualityRating > 0 && scheduleRating > 0 && collaborationRating > 0;

  const step2Valid =
    objective.trim().length >= 20 &&
    enjoyed.trim().length >= 20 &&
    wouldRecommend !== null;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reviewerEmail);
  const step3Valid =
    reviewerName.trim().length >= 2 &&
    emailValid &&
    jobTitle.trim().length >= 2 &&
    agreeTerms;

  function resetForm() {
    setStep(1);
    setBudgetRating(0);
    setQualityRating(0);
    setScheduleRating(0);
    setCollaborationRating(0);
    setObjective("");
    setEnjoyed("");
    setImprovements("");
    setServiceProvided("");
    setWouldRecommend(null);
    setReviewerName("");
    setReviewerEmail("");
    setJobTitle("");
    setCompanyName("");
    setCompanyIndustry("");
    setCompanySize("");
    setAgreeTerms(false);
    setWebsite("");
    setSuccess(false);
    setError(null);
    setSubmitting(false);
  }

  function handleClose() {
    setIsOpen(false);
    if (success) resetForm();
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyId,
          budgetRating,
          qualityRating,
          scheduleRating,
          collaborationRating,
          objective: objective.trim(),
          enjoyed: enjoyed.trim(),
          improvements: improvements.trim() || undefined,
          serviceProvided: serviceProvided.trim() || undefined,
          wouldRecommend,
          reviewerName: reviewerName.trim(),
          reviewerEmail: reviewerEmail.trim(),
          reviewerJobTitle: jobTitle.trim(),
          companyName: companyName.trim() || undefined,
          companyIndustry: companyIndustry.trim() || undefined,
          companySize: companySize || undefined,
          website,
          formLoadedAt,
        }),
      });

      if (res.status === 409) {
        setError("A review from this email already exists for this agency.");
        return;
      }
      if (res.status === 429) {
        setError("Too many reviews submitted. Please try again later.");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white placeholder-gray-400";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <>
      {/* Trigger card */}
      <div className="mt-8 border-t border-gray-100 pt-8">
        <div className="bg-gradient-to-r from-brand/5 to-blue-50 rounded-xl border border-brand/10 p-6 text-center">
          <h3 className="text-lg font-bold text-navy">Share Your Experience</h3>
          <p className="mt-1 text-sm text-gray-600">
            Help others choose the right agency by sharing your feedback.
          </p>
          <button
            onClick={() => setIsOpen(true)}
            className="mt-4 bg-brand text-white px-8 py-3 rounded-xl font-medium hover:bg-brand-dark transition-colors"
          >
            Write a Review
          </button>
        </div>
      </div>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Success state */}
            {success ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-navy">Thank you!</h3>
                <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
                  Your review has been submitted and is pending approval by our team.
                  Once approved, it will be visible on this agency&apos;s profile.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-6 bg-brand text-white px-8 py-3 rounded-xl font-medium hover:bg-brand-dark transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                {/* Step indicator */}
                <StepIndicator current={step} />

                {/* Honeypot - hidden from real users */}
                <div style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
                  <label htmlFor="review-website">Website</label>
                  <input
                    id="review-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <div className="p-6 sm:p-8">
                  {/* ============ STEP 1: Ratings ============ */}
                  {step === 1 && (
                    <div>
                      <h2 className="text-xl font-bold text-navy">
                        Voice your opinion about {agencyName}!
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Review and help others to choose the right agency.
                      </p>

                      <div className="mt-6 space-y-6">
                        {RATING_CATEGORIES.map((cat) => (
                          <div key={cat.key}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold text-gray-800">
                                {cat.label} <span className="text-red-500">*</span>
                              </span>
                              {ratings[cat.key].value > 0 && (
                                <span className="text-xs text-gray-400">
                                  {ratings[cat.key].value}/5
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mb-2">{cat.description}</p>
                            <StarRating
                              value={ratings[cat.key].value}
                              onChange={ratings[cat.key].setter}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="mt-8 flex justify-end">
                        <button
                          type="button"
                          disabled={!step1Valid}
                          onClick={() => setStep(2)}
                          className="inline-flex items-center gap-2 bg-brand text-white px-6 py-2.5 rounded-xl font-medium hover:bg-brand-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ============ STEP 2: Details ============ */}
                  {step === 2 && (
                    <div>
                      <h2 className="text-xl font-bold text-navy">
                        Tell us about the work delivered.
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Review and help others to choose the right agency.
                      </p>

                      <div className="mt-6 space-y-5">
                        {/* Objective */}
                        <div>
                          <label htmlFor="review-objective" className={labelClass}>
                            What was the objective behind your collaboration?{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            id="review-objective"
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            placeholder="Describe the goals of your project..."
                            className={`${inputClass} resize-none`}
                          />
                          <p className={`mt-1 text-xs ${objective.trim().length >= 20 ? "text-gray-400" : "text-amber-500"}`}>
                            {objective.trim().length}/20 min characters
                          </p>
                        </div>

                        {/* Enjoyed */}
                        <div>
                          <label htmlFor="review-enjoyed" className={labelClass}>
                            What did you enjoy the most during your collaboration?{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            id="review-enjoyed"
                            value={enjoyed}
                            onChange={(e) => setEnjoyed(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            placeholder="What stood out positively..."
                            className={`${inputClass} resize-none`}
                          />
                          <p className={`mt-1 text-xs ${enjoyed.trim().length >= 20 ? "text-gray-400" : "text-amber-500"}`}>
                            {enjoyed.trim().length}/20 min characters
                          </p>
                        </div>

                        {/* Improvements */}
                        <div>
                          <label htmlFor="review-improvements" className={labelClass}>
                            Are there any areas for improvements?
                          </label>
                          <textarea
                            id="review-improvements"
                            value={improvements}
                            onChange={(e) => setImprovements(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            placeholder="Optional: suggest areas of improvement..."
                            className={`${inputClass} resize-none`}
                          />
                        </div>

                        {/* Service provided */}
                        <div>
                          <label htmlFor="review-service" className={labelClass}>
                            Which service did the agency provide you with?
                          </label>
                          <input
                            id="review-service"
                            type="text"
                            value={serviceProvided}
                            onChange={(e) => setServiceProvided(e.target.value)}
                            maxLength={255}
                            placeholder="e.g. Web Development, Branding..."
                            className={inputClass}
                          />
                        </div>

                        {/* Would recommend */}
                        <div>
                          <label className={labelClass}>
                            Would you recommend this agency?{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <div className="flex gap-3 mt-1">
                            <button
                              type="button"
                              onClick={() => setWouldRecommend(true)}
                              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                                wouldRecommend === true
                                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                                  : "border-gray-200 text-gray-600 hover:border-gray-300"
                              }`}
                            >
                              <ThumbsUp className="w-4 h-4" /> Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setWouldRecommend(false)}
                              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                                wouldRecommend === false
                                  ? "bg-red-50 border-red-300 text-red-700"
                                  : "border-gray-200 text-gray-600 hover:border-gray-300"
                              }`}
                            >
                              <ThumbsDown className="w-4 h-4" /> No
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 flex justify-between">
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
                        >
                          <ChevronLeft className="w-4 h-4" /> Back
                        </button>
                        <button
                          type="button"
                          disabled={!step2Valid}
                          onClick={() => setStep(3)}
                          className="inline-flex items-center gap-2 bg-brand text-white px-6 py-2.5 rounded-xl font-medium hover:bg-brand-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ============ STEP 3: Personal Info ============ */}
                  {step === 3 && (
                    <div>
                      <h2 className="text-xl font-bold text-navy">Personal information</h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Tell us more about you. We only use this information to confirm your
                        review&apos;s authenticity.
                      </p>

                      <div className="mt-6 space-y-5">
                        {/* Name & Email */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="review-name" className={labelClass}>
                              Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              id="review-name"
                              type="text"
                              value={reviewerName}
                              onChange={(e) => setReviewerName(e.target.value)}
                              placeholder="eg John Doe"
                              maxLength={100}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label htmlFor="review-email" className={labelClass}>
                              Email <span className="text-red-500">*</span>
                            </label>
                            <input
                              id="review-email"
                              type="email"
                              value={reviewerEmail}
                              onChange={(e) => setReviewerEmail(e.target.value)}
                              placeholder="eg john.doe@example.com"
                              maxLength={255}
                              className={inputClass}
                            />
                            <p className="mt-1 text-xs text-gray-400">Not displayed publicly</p>
                          </div>
                        </div>

                        {/* Job Title */}
                        <div>
                          <label htmlFor="review-jobtitle" className={labelClass}>
                            Job Title <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="review-jobtitle"
                            type="text"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            placeholder="eg marketing director"
                            maxLength={100}
                            className={inputClass}
                          />
                        </div>

                        {/* Company Name & Industry */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="review-company" className={labelClass}>
                              Company Name
                            </label>
                            <input
                              id="review-company"
                              type="text"
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              placeholder="eg Apple Inc."
                              maxLength={255}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label htmlFor="review-industry" className={labelClass}>
                              Company Industry
                            </label>
                            <input
                              id="review-industry"
                              type="text"
                              value={companyIndustry}
                              onChange={(e) => setCompanyIndustry(e.target.value)}
                              placeholder="eg Technology"
                              maxLength={100}
                              className={inputClass}
                            />
                          </div>
                        </div>

                        {/* Company Size */}
                        <div>
                          <label htmlFor="review-companysize" className={labelClass}>
                            Company Size
                          </label>
                          <select
                            id="review-companysize"
                            value={companySize}
                            onChange={(e) => setCompanySize(e.target.value)}
                            className={inputClass}
                          >
                            <option value="">Select company size</option>
                            {COMPANY_SIZE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt} employees
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Terms */}
                        <div className="flex items-start gap-3">
                          <input
                            id="review-terms"
                            type="checkbox"
                            checked={agreeTerms}
                            onChange={(e) => setAgreeTerms(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand/20"
                          />
                          <label htmlFor="review-terms" className="text-sm text-gray-600">
                            I agree to the{" "}
                            <span className="text-brand underline cursor-pointer">
                              terms of service
                            </span>{" "}
                            and{" "}
                            <span className="text-brand underline cursor-pointer">
                              privacy policy
                            </span>
                            .
                          </label>
                        </div>
                      </div>

                      {/* Error */}
                      {error && (
                        <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      )}

                      <div className="mt-8 flex justify-between">
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
                        >
                          <ChevronLeft className="w-4 h-4" /> Back
                        </button>
                        <button
                          type="button"
                          disabled={!step3Valid || submitting}
                          onClick={handleSubmit}
                          className="inline-flex items-center justify-center gap-2 bg-brand text-white px-6 py-2.5 rounded-xl font-medium hover:bg-brand-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                            </>
                          ) : (
                            "Submit Review"
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
