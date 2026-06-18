import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const jwtSecretValue = process.env.JWT_SECRET || process.env.AUTH_SECRET;
const JWT_SECRET = jwtSecretValue ? new TextEncoder().encode(jwtSecretValue) : null;

const protectedPaths = ["/dashboard", "/admin"];
const adminPaths = ["/admin"];
const authPaths = ["/auth/signin", "/auth/signup"];
const verifyPaths = ["/auth/verify-email", "/auth/verify-otp"];

const adminRoles = ["super_admin", "admin"];

interface ProxyTokenPayload {
  sub?: string;
  role?: string;
  emailVerified?: boolean;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get("access_token")?.value;
  const hasSession = !!accessToken;

  let tokenPayload: ProxyTokenPayload | null = null;
  if (accessToken && JWT_SECRET) {
    try {
      const { payload } = await jwtVerify(accessToken, JWT_SECRET);
      tokenPayload = payload as unknown as ProxyTokenPayload;
    } catch {
      const response = NextResponse.redirect(new URL("/auth/signin", request.url));
      response.cookies.delete("access_token");
      if (protectedPaths.some((p) => pathname.startsWith(p))) {
        return response;
      }
    }
  }

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isAdminPath = adminPaths.some((p) => pathname.startsWith(p));
  const isAuthPath = authPaths.some((p) => pathname.startsWith(p));
  const isVerifyPage = verifyPaths.some((p) => pathname.startsWith(p));

  // Redirect unauthenticated users from protected pages
  if (isProtected && !hasSession) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Enforce email verification for protected areas
  if (isProtected && tokenPayload && !tokenPayload.emailVerified && !isVerifyPage) {
    return NextResponse.redirect(new URL("/auth/verify-email", request.url));
  }

  // Enforce admin role for admin paths
  if (isAdminPath && tokenPayload && !adminRoles.includes(tokenPayload.role || "")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect authenticated users away from auth pages (but allow verify pages)
  if (isAuthPath && hasSession && !isVerifyPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/auth/:path*",
  ],
};
