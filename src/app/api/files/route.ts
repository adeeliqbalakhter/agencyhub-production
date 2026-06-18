import { NextRequest } from "next/server";
import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guards";
import { isAdmin } from "@/lib/auth/rbac";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/services/rate-limit";
import { success, created, error, serverError } from "@/lib/api/response";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(request, RATE_LIMITS.upload, "upload");
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return error("No file provided", 400);

    if (file.size > MAX_FILE_SIZE) return error("File exceeds 5MB limit", 400);
    if (!ALLOWED_TYPES.includes(file.type)) return error("File type not allowed", 400);

    const entityType = formData.get("entityType") as string | null;
    const entityId = formData.get("entityId") as string | null;

    const ext = file.name.split(".").pop() || "bin";
    const filename = `${randomUUID()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");

    const rows = await db.execute(sql`
      INSERT INTO files (user_id, filename, original_name, mime_type, size, data, entity_type, entity_id)
      VALUES (${user.id}, ${filename}, ${file.name}, ${file.type}, ${file.size}, ${base64Data}, ${entityType}, ${entityId})
      RETURNING id, filename, original_name, mime_type, size, created_at
    `);
    return created((rows as unknown as Array<Record<string, unknown>>)[0]);
  } catch (err) {
    return serverError(err);
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const { searchParams } = request.nextUrl;
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const fileId = searchParams.get("id");

    if (fileId) {
      const rows = await db.execute(sql`
        SELECT id, filename, original_name, mime_type, size, data, created_at
        FROM files WHERE id = ${fileId} AND (user_id = ${user.id} OR ${isAdmin(user.role)})
      `);
      const file = (rows as unknown as Array<Record<string, unknown>>)[0];
      if (!file) return error("File not found", 404);
      return success(file);
    }

    let rows;
    if (entityType && entityId) {
      rows = await db.execute(sql`
        SELECT id, filename, original_name, mime_type, size, created_at
        FROM files
        WHERE entity_type = ${entityType} AND entity_id = ${entityId}
        ORDER BY created_at DESC
      `);
    } else if (isAdmin(user.role)) {
      rows = await db.execute(sql`
        SELECT id, filename, original_name, mime_type, size, user_id, entity_type, entity_id, created_at
        FROM files ORDER BY created_at DESC LIMIT 100
      `);
    } else {
      rows = await db.execute(sql`
        SELECT id, filename, original_name, mime_type, size, created_at
        FROM files WHERE user_id = ${user.id}
        ORDER BY created_at DESC LIMIT 100
      `);
    }

    return success(rows);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ("error" in authResult) return authResult.error;
    const { user } = authResult;

    if (!hasDb()) return error("Database not available", 503);
    const db = getDb();

    const { searchParams } = request.nextUrl;
    const fileId = searchParams.get("id");
    if (!fileId) return error("File ID required", 400);

    const rows = await db.execute(sql`SELECT user_id FROM files WHERE id = ${fileId}`);
    const file = (rows as unknown as Array<Record<string, unknown>>)[0];
    if (!file) return error("File not found", 404);

    if (!isAdmin(user.role) && file.user_id !== user.id) {
      return error("Access denied", 403);
    }

    await db.execute(sql`DELETE FROM files WHERE id = ${fileId}`);
    return success({ message: "File deleted" });
  } catch (err) {
    return serverError(err);
  }
}
