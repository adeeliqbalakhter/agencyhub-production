import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// ── Constants ────────────────────────────────────────────────

const PUBLIC_PATHS = new Set([
  "/",
  "/agencies",
  "/services",
  "/blog",
  "/about",
  "/contact",
  "/pricing",
  "/how-it-works",
  "/compare",
  "/get-quotes",
  "/privacy",
  "/terms",
  "/robots.txt",
  "/sitemap.xml",
  "/og-image.png",
  "/favicon.ico",
]);

const PUBLIC_PATH_PATTERNS = [
  /^\/auth\//,
  /^\/api\/auth\//,
  /^\/agencies\//,     // /agencies/[slug]
  /^\/_next\//,
];

const ADMIN_ROLES = new Set(["super_admin", "admin"]);

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET or AUTH_SECRET environment variable is required");
  }
  return new TextEncoder().encode(secret);
}

// ── Path helpers ─────────────────────────────────────────────

function isPublicPath(path: string): boolean {
  if (PUBLIC_PATHS.has(path)) return true;
  return PUBLIC_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

function isProtectedPath(path: string): boolean {
  return path.startsWith("/dashboard/") ||
         path.startsWith("/admin/") ||
         path.startsWith("/client/");
}

function isAdminPath(path: string): boolean {
  return path.startsWith("/admin/");
}

// ── Token verification ───────────────────────────────────────

interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  emailVerified: boolean;
  type: string;
}

async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      clockTolerance: 60,
    });
    if (payload.type !== "access") return null;
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

// ── CSRF validation ──────────────────────────────────────────

const CSRF_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isCsrfProtectedMethod(method: string): boolean {
  return CSRF_METHODS.has(method.toUpperCase());
}

function isCsrfProtectedPath(path: string): boolean {
  return path.startsWith("/api/") && !path.startsWith("/api/auth/");
}

/**
 * Validates CSRF token for state-changing API requests.
 * The client sends the full `random.hash` token in the x-csrf-token header.
 * The server stores just the `hash` part in the csrf_token cookie.
 * We verify the header's hash portion matches the cookie value.
 */
function validateCsrf(request: NextRequest): boolean {
  const headerToken = request.headers.get("x-csrf-token");
  const cookieToken = request.cookies.get("csrf_token")?.value;

  if (!headerToken || !cookieToken) return false;

  // Token format: "random.hash"
  const parts = headerToken.split(".");
  if (parts.length !== 2) return false;

  const [, hash] = parts;
  return hash === cookieToken;
}

// ── Main middleware ──────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const method = request.method;

  // ── CSRF protection for state-changing API routes ──────────
  if (isCsrfProtectedMethod(method) && isCsrfProtectedPath(pathname)) {
    if (!validateCsrf(request)) {
      return NextResponse.json(
        { error: "CSRF token missing or invalid" },
        { status: 403 }
      );
    }
  }

  // ── Auth route protection ──────────────────────────────────

  // Public paths need no auth
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Not a protected path — allow
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // Protected path: check for access_token cookie
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    const redirectUrl = new URL("/auth/signin", request.url);
    redirectUrl.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(redirectUrl);
  }

  // Verify token and check role for admin routes
  if (isAdminPath(pathname)) {
    const payload = await verifyAccessToken(accessToken);
    if (!payload || !ADMIN_ROLES.has(payload.role)) {
      // Redirect non-admin users to dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

// ── Matcher config ───────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - static files (favicon.ico, robots.txt, etc.)
     */
    "/((?!_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|css|js)).*)",
  ],
};
