"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto px-4">
            <h1 className="text-4xl font-bold text-navy mb-4">Critical Error</h1>
            <p className="text-gray-600 mb-8">
              A critical error occurred. Please refresh the page or try again later.
            </p>
            <button
              onClick={reset}
              className="bg-brand text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-dark transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
