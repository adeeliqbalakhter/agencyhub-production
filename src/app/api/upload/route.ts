import { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/tokens";

/**
 * Upload endpoint - redirects to UploadThing
 * All file uploads are now handled by UploadThing at /api/uploadthing
 *
 * UploadThing endpoints available:
 * - agencyLogo    (image, max 4MB, 1 file)
 * - agencyCover   (image, max 8MB, 1 file)
 * - portfolioImage (image, max 8MB, 5 files)
 * - avatar        (image, max 2MB, 1 file)
 * - general       (image 8MB or PDF 4MB, 1 file)
 *
 * Use the FileUpload or MultiFileUpload components from @/components/ui/FileUpload
 */

export async function GET() {
  return Response.json(
    {
      message: "Uploads are handled by UploadThing",
      uploadthing: "/api/uploadthing",
      endpoints: ["agencyLogo", "agencyCover", "portfolioImage", "avatar", "general"],
      docs: "Use the FileUpload component for client-side uploads",
    },
    { status: 200 }
  );
}

/** Legacy upload handler - redirects to UploadThing */
export async function POST(request: NextRequest) {
  try {
    // Check auth
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1];
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await verifyAccessToken(token);
    if (!user) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    // Return info about UploadThing
    return Response.json(
      {
        message: "Direct uploads are now handled by UploadThing",
        info: "Please use the UploadButton or FileUpload component",
        uploadthingEndpoint: "/api/uploadthing",
        availableEndpoints: ["agencyLogo", "agencyCover", "portfolioImage", "avatar", "general"],
      },
      { status: 200 }
    );
  } catch {
    return Response.json({ error: "Upload processing failed" }, { status: 500 });
  }
}
