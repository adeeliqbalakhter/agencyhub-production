import { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/guards";
import { success, error } from "@/lib/api/response";

/**
 * Upload endpoint
 * NOTE: For production file uploads, integrate UploadThing or Cloudflare R2.
 * This endpoint accepts base64-encoded files for quick prototyping.
 * Max file size: 1MB (base64 overhead makes it ~1.37MB in DB).
 */
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAccessToken(request);
    if (!authResult) {
      return error("Unauthorized", 401);
    }

    const body = await request.json();
    const { file, fileName, fileType } = body;

    if (!file || !fileName) {
      return error("Missing file or fileName", 400);
    }

    // Validate base64
    if (!file.match(/^data:([a-zA-Z0-9]+\/[-+a-zA-Z0-9]+)?;base64,/)) {
      return error("Invalid base64 format", 400);
    }

    // Extract base64 data
    const base64Data = file.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");

    if (buffer.length > MAX_FILE_SIZE) {
      return error(`File too large. Max ${MAX_FILE_SIZE / 1024}KB allowed.`, 413);
    }

    // Return the data URL for now - in production, store in R2/S3/UploadThing
    // and return the CDN URL instead
    return success({
      url: file, // Returns the base64 data URL
      fileName,
      fileType: fileType || "application/octet-stream",
      size: buffer.length,
      note: "For production, integrate UploadThing (recommended) or R2 for file storage",
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[UPLOAD] Error:", err);
    }
    return error("Upload processing failed", 500);
  }
}

export async function GET() {
  return success({
    message: "File upload endpoint",
    note: "For production, integrate UploadThing (recommended) or Cloudflare R2",
    maxFileSize: "1MB (base64)",
    docs: "See README for UploadThing integration guide",
  });
}
