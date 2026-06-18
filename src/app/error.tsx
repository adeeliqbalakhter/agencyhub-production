"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <h1 className="text-4xl font-bold text-navy mb-4">Something went wrong</h1>
        <p className="text-gray-600 mb-8">
          We apologize for the inconvenience. Our team has been notified and is working to fix the issue.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="bg-brand text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-dark transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
