import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/guards";
import { success, error } from "@/lib/api/response";

/**
 * Upload endpoint
 * NOTE: For production file uploads, use UploadThing at /api/uploadthing
 * which provides faster, optimized file storage with CDN delivery.
 *
 * This endpoint accepts base64-encoded files for quick prototyping
 * or when UploadThing is not configured. Max file size: 1MB.
 */
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export async function POST(request: NextRequest) {
  try {
    const { user } = await authenticateRequest(request);
    if (!user) return error("Unauthorized", 401);

    const body = await request.json();
    const { file, fileName } = body;
    if (!file || !fileName) return error("Missing file or fileName", 400);

    if (!file.match(/^data:([a-zA-Z0-9]+\/[-+a-zA-Z0-9]+)?;base64,/))
      return error("Invalid base64 format", 400);

    const base64Data = file.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");

    if (buffer.length > MAX_FILE_SIZE)
      return error(`File too large. Max ${MAX_FILE_SIZE / 1024}KB allowed.`, 413);

    return success({
      url: file,
      fileName,
      size: buffer.length,
      note: "For production uploads, use UploadThing: /api/uploadthing",
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error("[UPLOAD] Error:", err);
    return error("Upload processing failed", 500);
  }
}

export async function GET() {
  return success({
    message: "File upload endpoint",
    uploadthing: "/api/uploadthing",
    endpoints: ["agencyLogo", "agencyCover", "portfolioImage", "avatar", "general"],
    docs: "Use FileUpload component for UploadThing integration",
  });
}
