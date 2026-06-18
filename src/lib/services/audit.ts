import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";

export interface AuditLogEntry {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
}

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  if (!hasDb()) return;
  try {
    const db = getDb();
    await db.execute(sql`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
      VALUES (
        ${entry.userId ?? null},
        ${entry.action},
        ${entry.entityType},
        ${entry.entityId ?? null},
        ${entry.oldValues ? JSON.stringify(entry.oldValues) : null},
        ${entry.newValues ? JSON.stringify(entry.newValues) : null},
        ${entry.ipAddress ?? null}
      )
    `);
  } catch (err) {
    console.error("Failed to create audit log:", err);
  }
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function logLoginAttempt(
  userId: string,
  request: NextRequest,
  status: "success" | "failed",
  failureReason?: string
): Promise<void> {
  if (!hasDb()) return;
  try {
    const db = getDb();
    const ip = getClientIp(request);
    const ua = request.headers.get("user-agent") || "";
    const deviceType = /mobile/i.test(ua) ? "mobile" : /tablet/i.test(ua) ? "tablet" : "desktop";

    await db.execute(sql`
      INSERT INTO login_history (user_id, ip_address, user_agent, device_type, status, failure_reason)
      VALUES (${userId}, ${ip}, ${ua}, ${deviceType}, ${status}, ${failureReason ?? null})
    `);
  } catch (err) {
    console.error("Failed to log login attempt:", err);
  }
}
