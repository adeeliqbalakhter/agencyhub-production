"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Search, Star, ArrowRight, CheckCircle2 } from "lucide-react";

interface OnboardingModalProps {
  userId: string;
  role: string;
  name: string;
}

const agencyOwnerSteps = [
  { icon: Building2, label: "Set up your agency profile" },
  { icon: Star, label: "Add your services" },
  { icon: CheckCircle2, label: "Submit for review" },
];

const clientSteps = [
  { icon: Search, label: "Browse agencies" },
  { icon: Building2, label: "Request quotes" },
  { icon: Star, label: "Leave reviews" },
];

export default function OnboardingModal({ userId, role, name }: OnboardingModalProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const key = `onboarding_completed_${userId}`;
    if (!localStorage.getItem(key)) {
      setOpen(true);
    }
  }, [userId]);

  if (!open) return null;

  const steps = role === "agency_owner" ? agencyOwnerSteps : clientSteps;

  function handleGetStarted() {
    const key = `onboarding_completed_${userId}`;
    localStorage.setItem(key, "true");
    setOpen(false);
    if (role === "agency_owner") {
      router.push("/dashboard/profile");
    } else {
      router.push("/agencies");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-navy px-6 py-8 text-center">
          <h2 className="text-2xl font-bold text-white">
            Welcome to AgencyHub!
          </h2>
          <p className="text-blue-200 mt-2 text-sm">
            {name ? `Hi ${name}, let's` : "Let's"} get you started
          </p>
        </div>

        {/* Steps */}
        <div className="px-6 py-6 space-y-4">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Steps to complete
          </p>
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 border border-gray-100"
              >
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-brand" />
                </div>
                <span className="text-sm font-medium text-navy">
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action */}
        <div className="px-6 pb-6">
          <button
            onClick={handleGetStarted}
            className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
