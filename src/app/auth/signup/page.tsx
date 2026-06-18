"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Building2,
  Briefcase,
  Star,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

type AccountType = "business" | "agency";
type Step = 1 | 2;

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
  general?: string;
}

export default function SignUpPage() {
  const [step, setStep] = useState<Step>(1);
  const [accountType, setAccountType] = useState<AccountType>("business");
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP state
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function update(field: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!form.email.trim()) {
      next.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = "Enter a valid email address";
    }
    if (!form.password) {
      next.password = "Password is required";
    } else {
      const missing: string[] = [];
      if (form.password.length < 8) missing.push("at least 8 characters");
      if (!/[A-Z]/.test(form.password)) missing.push("one uppercase letter");
      if (!/[a-z]/.test(form.password)) missing.push("one lowercase letter");
      if (!/[0-9]/.test(form.password)) missing.push("one number");
      if (!/[^A-Za-z0-9]/.test(form.password)) missing.push("one special character");
      if (missing.length > 0) {
        next.password = `Password must contain: ${missing.join(", ")}`;
      }
    }
    if (!form.confirmPassword) {
      next.confirmPassword = "Please confirm your password";
    } else if (form.password !== form.confirmPassword) {
      next.confirmPassword = "Passwords do not match";
    }
    if (!form.acceptTerms) {
      next.acceptTerms = "You must accept the terms and conditions";
    }
    return next;
  }

  // Step 1: Send OTP
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/send-signup-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: accountType === "agency" ? "agency_owner" : "client",
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        const errorMessage = result.error || "Failed to send verification code";
        if (result.details) {
          const fieldErrors: FormErrors = {};
          for (const [field, value] of Object.entries(result.details)) {
            const errs = (value as { _errors?: string[] })?._errors;
            if (errs && errs.length > 0) {
              if (["name", "email", "password", "confirmPassword"].includes(field)) {
                fieldErrors[field as keyof FormErrors] = errs[0];
              }
            }
          }
          if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
            return;
          }
        }
        setErrors({ email: errorMessage });
        return;
      }
      // Move to step 2
      setStep(2);
      setOtp(["", "", "", "", "", ""]);
      setOtpError("");
      setResendCooldown(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch {
      setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Step 2: Verify OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) return;
    setIsVerifying(true);
    setOtpError("");
    try {
      const res = await fetch("/api/auth/verify-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, code }),
      });
      const result = await res.json();
      if (!res.ok) {
        setOtpError(result.error || "Invalid code. Please try again.");
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        return;
      }
      // Success — redirect based on role
      const userRole = result.data?.user?.role;
      window.location.href = userRole === "client" ? "/client" : "/dashboard";
    } catch {
      setOtpError("Something went wrong. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  }

  // Resend OTP
  async function handleResend() {
    if (resendCooldown > 0) return;
    setOtpError("");
    try {
      const res = await fetch("/api/auth/send-signup-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: accountType === "agency" ? "agency_owner" : "client",
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setOtpError(result.error || "Failed to resend code.");
        return;
      }
      setResendCooldown(60);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch {
      setOtpError("Failed to resend code. Please try again.");
    }
  }

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // OTP input handlers
  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    if (value.length > 1) {
      const digits = value.slice(0, 6).split("");
      digits.forEach((d, i) => {
        if (i + index < 6) newOtp[i + index] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  const passwordStrength = (() => {
    const p = form.password;
    if (!p) return { label: "", width: "w-0", color: "" };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[a-z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { label: "Weak", width: "w-1/5", color: "bg-danger" };
    if (score === 2)
      return { label: "Fair", width: "w-2/5", color: "bg-warning" };
    if (score === 3)
      return { label: "Fair", width: "w-3/5", color: "bg-warning" };
    if (score === 4)
      return { label: "Good", width: "w-4/5", color: "bg-brand" };
    return { label: "Strong", width: "w-full", color: "bg-success" };
  })();

  return (
    <div className="min-h-[calc(100vh-160px)] flex">
      {/* Left: Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-md space-y-7">
          {step === 1 && (
            <>
              <div>
                <h1 className="text-3xl font-bold text-navy">Create your account</h1>
                <p className="mt-2 text-gray-500">
                  Join thousands of businesses and agencies on AgencyHub
                </p>
              </div>

              {/* Account type toggle */}
              <div className="flex rounded-lg bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setAccountType("business")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition ${
                    accountType === "business"
                      ? "bg-white text-navy shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Building2 className="h-4 w-4" />
                  I&apos;m a Business
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType("agency")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition ${
                    accountType === "agency"
                      ? "bg-white text-navy shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Briefcase className="h-4 w-4" />
                  I&apos;m an Agency
                </button>
              </div>

              {/* Google Sign Up */}
              <button
                type="button"
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign up with Google
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-gray-400">
                    or sign up with email
                  </span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
                {/* General error */}
                {errors.general && (
                  <div className="flex items-center gap-2 rounded-lg bg-danger/5 border border-danger/20 px-4 py-3">
                    <AlertCircle className="h-4 w-4 shrink-0 text-danger" />
                    <p className="text-sm text-danger">{errors.general}</p>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-navy"
                  >
                    Full name
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      placeholder="John Doe"
                      className={`block w-full rounded-lg border ${
                        errors.name
                          ? "border-danger focus:ring-danger"
                          : "border-gray-200 focus:ring-brand"
                      } bg-white py-3 pl-10 pr-4 text-sm text-navy placeholder:text-gray-400 shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2`}
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-1 text-sm text-danger">{errors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-navy"
                  >
                    Email address
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="you@company.com"
                      className={`block w-full rounded-lg border ${
                        errors.email
                          ? "border-danger focus:ring-danger"
                          : "border-gray-200 focus:ring-brand"
                      } bg-white py-3 pl-10 pr-4 text-sm text-navy placeholder:text-gray-400 shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2`}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-danger">{errors.email}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-navy"
                  >
                    Password
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      placeholder="Create a strong password"
                      className={`block w-full rounded-lg border ${
                        errors.password
                          ? "border-danger focus:ring-danger"
                          : "border-gray-200 focus:ring-brand"
                      } bg-white py-3 pl-10 pr-11 text-sm text-navy placeholder:text-gray-400 shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-2">
                      <div className="h-1.5 w-full rounded-full bg-gray-100">
                        <div
                          className={`h-1.5 rounded-full transition-all ${passwordStrength.width} ${passwordStrength.color}`}
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Password strength:{" "}
                        <span className="font-medium">{passwordStrength.label}</span>
                      </p>
                    </div>
                  )}
                  {errors.password && (
                    <p className="mt-1 text-sm text-danger">{errors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-navy"
                  >
                    Confirm password
                  </label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      value={form.confirmPassword}
                      onChange={(e) => update("confirmPassword", e.target.value)}
                      placeholder="Repeat your password"
                      className={`block w-full rounded-lg border ${
                        errors.confirmPassword
                          ? "border-danger focus:ring-danger"
                          : "border-gray-200 focus:ring-brand"
                      } bg-white py-3 pl-10 pr-11 text-sm text-navy placeholder:text-gray-400 shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-danger">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* Terms */}
                <div>
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={form.acceptTerms}
                      onChange={(e) => update("acceptTerms", e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    <span className="text-sm text-gray-600">
                      I agree to the{" "}
                      <Link
                        href="/terms"
                        className="font-medium text-brand hover:text-brand-dark"
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy"
                        className="font-medium text-brand hover:text-brand-dark"
                      >
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                  {errors.acceptTerms && (
                    <p className="mt-1 text-sm text-danger">{errors.acceptTerms}</p>
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
                      Create{" "}
                      {accountType === "agency" ? "agency" : "business"} account
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500">
                Already have an account?{" "}
                <Link
                  href="/auth/signin"
                  className="font-semibold text-brand hover:text-brand-dark transition"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
                    <Mail className="h-8 w-8 text-brand" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-navy">
                  Check your email
                </h1>
                <p className="mt-2 text-gray-500">
                  We sent a 6-digit verification code to
                </p>
                <p className="mt-1 font-medium text-navy">{form.email}</p>
                <p className="mt-2 text-xs text-gray-400">
                  Check your inbox and spam folder. The code expires in 10
                  minutes.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                {/* OTP inputs */}
                <div>
                  <label className="block text-sm font-medium text-navy text-center mb-3">
                    Enter verification code
                  </label>
                  <div className="flex justify-center gap-3">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => {
                          inputRefs.current[i] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasted = e.clipboardData
                            .getData("text")
                            .replace(/\D/g, "");
                          if (pasted) handleOtpChange(i, pasted);
                        }}
                        className="h-14 w-12 rounded-lg border border-gray-200 bg-white text-center text-xl font-semibold text-navy shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    ))}
                  </div>
                </div>

                {otpError && (
                  <div className="flex items-center gap-2 rounded-lg bg-danger/5 border border-danger/20 px-4 py-3">
                    <AlertCircle className="h-4 w-4 shrink-0 text-danger" />
                    <p className="text-sm text-danger">{otpError}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isVerifying || otp.join("").length !== 6}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isVerifying ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      Verify & Create Account
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Resend */}
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Didn&apos;t receive the code?{" "}
                  {resendCooldown > 0 ? (
                    <span className="text-gray-400">
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="inline-flex items-center gap-1 font-semibold text-brand hover:text-brand-dark transition"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Resend Code
                    </button>
                  )}
                </p>
              </div>

              {/* Back button */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setOtp(["", "", "", "", "", ""]);
                    setOtpError("");
                  }}
                  className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-navy transition"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to signup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Marketing panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:flex-1 items-center justify-center bg-navy px-12">
        <div className="max-w-md space-y-8 text-white">
          <h2 className="text-3xl font-bold leading-tight">
            {accountType === "agency"
              ? "Grow your agency with AgencyHub"
              : "Find the perfect agency for your business"}
          </h2>
          <p className="text-lg text-gray-300">
            {accountType === "agency"
              ? "List your agency, showcase your work, and connect with businesses actively looking for your services."
              : "Access the largest directory of vetted marketing agencies. Compare reviews, portfolios, and get free quotes."}
          </p>

          <div className="space-y-4">
            {(accountType === "agency"
              ? [
                  "Get discovered by thousands of businesses",
                  "Showcase your portfolio and case studies",
                  "Receive qualified project leads directly",
                  "Build credibility with verified reviews",
                ]
              : [
                  "Browse 10,000+ vetted agencies worldwide",
                  "Read 50,000+ verified client reviews",
                  "Get free quotes with no obligation",
                  "Compare pricing, timelines, and expertise",
                ]
            ).map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 shrink-0 text-success" />
                <span className="text-gray-300">{item}</span>
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
              {accountType === "agency"
                ? '"Since listing on AgencyHub, we\'ve received 40+ qualified leads per month. It\'s been a game-changer for our growth."'
                : '"We found three amazing agencies within a week. The reviews and comparison tools made the decision so much easier."'}
            </p>
            <p className="mt-3 text-sm font-medium">
              {accountType === "agency" ? (
                <>
                  Mark R.{" "}
                  <span className="text-gray-400">
                    — Founder, Digital Edge Agency
                  </span>
                </>
              ) : (
                <>
                  Lisa T.{" "}
                  <span className="text-gray-400">
                    — CMO, GrowthStack Inc.
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
