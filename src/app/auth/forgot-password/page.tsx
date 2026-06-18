"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Password validation (same rules as signup)                        */
/* ------------------------------------------------------------------ */

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Number", test: (p: string) => /\d/.test(p) },
  {
    label: "Special character",
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
];

function validatePassword(password: string): string | null {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) return rule.label + " is required";
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Request Reset form                                                */
/* ------------------------------------------------------------------ */

function RequestResetForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Something went wrong. Please try again.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-7 w-7 text-success" />
          </div>
          <h1 className="text-3xl font-bold text-navy">Check your email</h1>
          <p className="text-gray-500">
            If an account exists for <span className="font-medium text-navy">{email}</span>, we
            sent a password reset link. It will expire in 1 hour.
          </p>
        </div>

        <Link
          href="/auth/signin"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-navy">Forgot password?</h1>
        <p className="mt-2 text-gray-500">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Email */}
        <div>
          <label htmlFor="reset-email" className="block text-sm font-medium text-navy">
            Email address
          </label>
          <div className="relative mt-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Mail className="h-4 w-4 text-gray-400" />
            </div>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              placeholder="you@company.com"
              className={`block w-full rounded-lg border ${
                error
                  ? "border-danger focus:ring-danger"
                  : "border-gray-200 focus:ring-brand"
              } bg-white py-3 pl-10 pr-4 text-sm text-navy placeholder:text-gray-400 shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2`}
            />
          </div>
          {error && (
            <p className="mt-1 flex items-center gap-1 text-sm text-danger">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              Send reset link
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Remember your password?{" "}
        <Link
          href="/auth/signin"
          className="font-semibold text-brand hover:text-brand-dark transition"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reset Password form (token present)                               */
/* ------------------------------------------------------------------ */

function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirm?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function validate() {
    const next: { password?: string; confirm?: string } = {};
    if (!password) {
      next.password = "Password is required";
    } else {
      const pwErr = validatePassword(password);
      if (pwErr) next.password = pwErr;
    }
    if (!confirmPassword) {
      next.confirm = "Please confirm your password";
    } else if (password !== confirmPassword) {
      next.confirm = "Passwords do not match";
    }
    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const v = validate();
    setFieldErrors(v);
    if (Object.keys(v).length > 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Something went wrong. Please try again.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-7 w-7 text-success" />
          </div>
          <h1 className="text-3xl font-bold text-navy">Password reset!</h1>
          <p className="text-gray-500">
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
        </div>

        <Link
          href="/auth/signin"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
        >
          Sign in
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-navy">Reset your password</h1>
        <p className="mt-2 text-gray-500">Enter your new password below.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* New Password */}
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-navy">
            New password
          </label>
          <div className="relative mt-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-4 w-4 text-gray-400" />
            </div>
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password)
                  setFieldErrors((p) => ({ ...p, password: undefined }));
              }}
              placeholder="Enter new password"
              className={`block w-full rounded-lg border ${
                fieldErrors.password
                  ? "border-danger focus:ring-danger"
                  : "border-gray-200 focus:ring-brand"
              } bg-white py-3 pl-10 pr-11 text-sm text-navy placeholder:text-gray-400 shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="mt-1 text-sm text-danger">{fieldErrors.password}</p>
          )}

          {/* Password strength indicators */}
          {password.length > 0 && (
            <div className="mt-2 space-y-1">
              {PASSWORD_RULES.map((rule) => (
                <div
                  key={rule.label}
                  className={`flex items-center gap-1.5 text-xs ${
                    rule.test(password) ? "text-success" : "text-gray-400"
                  }`}
                >
                  <CheckCircle className="h-3 w-3" />
                  {rule.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-navy">
            Confirm password
          </label>
          <div className="relative mt-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-4 w-4 text-gray-400" />
            </div>
            <input
              id="confirm-password"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirm)
                  setFieldErrors((p) => ({ ...p, confirm: undefined }));
              }}
              placeholder="Re-enter new password"
              className={`block w-full rounded-lg border ${
                fieldErrors.confirm
                  ? "border-danger focus:ring-danger"
                  : "border-gray-200 focus:ring-brand"
              } bg-white py-3 pl-10 pr-11 text-sm text-navy placeholder:text-gray-400 shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.confirm && (
            <p className="mt-1 text-sm text-danger">{fieldErrors.confirm}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              Reset password
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        <Link
          href="/auth/signin"
          className="inline-flex items-center gap-1 font-semibold text-brand hover:text-brand-dark transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inner component that reads search params                          */
/* ------------------------------------------------------------------ */

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  return (
    <div className="min-h-[calc(100vh-160px)] flex items-center justify-center px-6 py-12 lg:px-12">
      {token ? <ResetPasswordForm token={token} /> : <RequestResetForm />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Default export wrapped in Suspense (required for useSearchParams) */
/* ------------------------------------------------------------------ */

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-160px)] flex items-center justify-center">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
