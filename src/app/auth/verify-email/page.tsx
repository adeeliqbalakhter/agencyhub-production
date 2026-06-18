"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Star,
  Users,
  Shield,
} from "lucide-react";

type PageState = "verifying" | "verified" | "error";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-160px)] flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<PageState>(
    token ? "verifying" : "error"
  );
  const [errorMessage, setErrorMessage] = useState(
    token ? "" : "Invalid verification link. Please sign in to request a new verification email."
  );
  const hasVerified = useRef(false);

  // Auto-verify token on mount
  const verifyToken = useCallback(async () => {
    if (!token || hasVerified.current) return;
    hasVerified.current = true;
    setState("verifying");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await res.json();
      if (!res.ok) {
        setErrorMessage(result.error || "Verification failed. The link may have expired.");
        setState("error");
        return;
      }
      setState("verified");
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setState("error");
    }
  }, [token]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  return (
    <div className="min-h-[calc(100vh-160px)] flex">
      {/* Left: Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-md space-y-8">
          {/* Verifying state */}
          {state === "verifying" && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <span className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-navy">
                  Verifying your email
                </h1>
                <p className="mt-2 text-gray-500">
                  Please wait while we verify your email address...
                </p>
              </div>
            </div>
          )}

          {/* Verified state */}
          {state === "verified" && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-navy">
                  Email verified
                </h1>
                <p className="mt-2 text-gray-500">
                  Your email address has been successfully verified. You can now
                  access all features of your account.
                </p>
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
              >
                Continue to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {/* Error state */}
          {state === "error" && (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
                  <AlertCircle className="h-8 w-8 text-danger" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-navy">
                  Verification failed
                </h1>
                <p className="mt-2 text-gray-500">
                  {errorMessage || "Something went wrong during verification."}
                </p>
              </div>
              <div className="flex flex-col items-center gap-3">
                {token && (
                  <button
                    type="button"
                    onClick={() => {
                      hasVerified.current = false;
                      verifyToken();
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </button>
                )}
                <Link
                  href="/auth/signin"
                  className="text-sm font-semibold text-brand hover:text-brand-dark transition"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Marketing panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:flex-1 items-center justify-center bg-navy px-12">
        <div className="max-w-md space-y-8 text-white">
          <h2 className="text-3xl font-bold leading-tight">
            You&apos;re almost there
          </h2>
          <p className="text-lg text-gray-300">
            Verify your email to unlock the full power of AgencyHub and start
            connecting with top-rated agencies.
          </p>

          <div className="space-y-5">
            {[
              {
                icon: Star,
                title: "50,000+ Verified Reviews",
                desc: "Real feedback from real clients to guide your decision.",
              },
              {
                icon: Users,
                title: "10,000+ Agencies Listed",
                desc: "The largest curated directory of marketing agencies.",
              },
              {
                icon: Shield,
                title: "Secure & Trusted",
                desc: "Your data is protected with enterprise-grade security.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <item.icon className="h-5 w-5 text-brand-light" />
                </div>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-white/5 p-5 border border-white/10">
            <div className="flex items-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="h-4 w-4 fill-warning text-warning"
                />
              ))}
            </div>
            <p className="text-sm text-gray-300 italic">
              &ldquo;AgencyHub saved us weeks of research. We found the perfect
              SEO agency within days and our organic traffic has doubled.&rdquo;
            </p>
            <p className="mt-3 text-sm font-medium">
              Sarah M.{" "}
              <span className="text-gray-400">— VP Marketing, TechCorp</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
