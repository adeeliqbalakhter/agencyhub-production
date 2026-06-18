import { NextRequest } from "next/server";
import { verifyAccessToken, type TokenPayload } from "./tokens";
import { hasPermission, type Role, type Resource, type Action, isAdmin } from "./rbac";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  emailVerified: boolean;
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return request.cookies.get("access_token")?.value || null;
}

export async function authenticateRequest(
  request: NextRequest
): Promise<{ user: AuthenticatedUser | null; error: string | null }> {
  const token = getTokenFromRequest(request);
  if (!token) {
    return { user: null, error: "Authentication required" };
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    return { user: null, error: "Invalid or expired token" };
  }

  return {
    user: {
      id: payload.sub,
      email: payload.email,
      role: payload.role as Role,
      emailVerified: payload.emailVerified,
    },
    error: null,
  };
}

export async function requireAuth(
  request: NextRequest
): Promise<{ user: AuthenticatedUser; error?: never } | { user?: never; error: Response }> {
  const { user, error } = await authenticateRequest(request);
  if (!user) {
    return { error: Response.json({ error: error || "Unauthorized" }, { status: 401 }) };
  }
  if (!user.emailVerified) {
    return { error: Response.json({ error: "Email not verified", code: "EMAIL_NOT_VERIFIED" }, { status: 403 }) };
  }
  return { user };
}

export async function requireRole(
  request: NextRequest,
  ...roles: Role[]
): Promise<{ user: AuthenticatedUser; error?: never } | { user?: never; error: Response }> {
  const result = await requireAuth(request);
  if ("error" in result) return result;

  if (!roles.includes(result.user.role)) {
    return { error: Response.json({ error: "Insufficient permissions" }, { status: 403 }) };
  }
  return { user: result.user };
}

export async function requirePermission(
  request: NextRequest,
  resource: Resource,
  action: Action
): Promise<{ user: AuthenticatedUser; error?: never } | { user?: never; error: Response }> {
  const result = await requireAuth(request);
  if ("error" in result) return result;

  if (!hasPermission(result.user.role, resource, action)) {
    return { error: Response.json({ error: "Insufficient permissions" }, { status: 403 }) };
  }
  return { user: result.user };
}

export async function requireAgencyAccess(
  request: NextRequest,
  agencyId: string
): Promise<{ user: AuthenticatedUser; error?: never } | { user?: never; error: Response }> {
  const result = await requireAuth(request);
  if ("error" in result) return result;

  const { user } = result;
  if (isAdmin(user.role)) return { user };

  if (!hasDb()) {
    return { error: Response.json({ error: "Database not available" }, { status: 503 }) };
  }
  const db = getDb();

  if (user.role === "agency_owner") {
    const rows = await db.execute(
      sql`SELECT id FROM agencies WHERE id = ${agencyId} AND user_id = ${user.id} AND deleted_at IS NULL`
    );
    if ((rows as unknown as Array<unknown>).length > 0) return { user };
  }

  if (user.role === "agency_team_member") {
    const rows = await db.execute(
      sql`SELECT id FROM agency_team_members WHERE agency_id = ${agencyId} AND user_id = ${user.id} AND status = 'active'`
    );
    if ((rows as unknown as Array<unknown>).length > 0) return { user };
  }

  return { error: Response.json({ error: "Access denied to this agency" }, { status: 403 }) };
}
