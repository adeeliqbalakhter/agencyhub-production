import { createUploadthing, type FileRouter } from "uploadthing/next";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { cookies } from "next/headers";

const f = createUploadthing();

async function auth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}

export const ourFileRouter = {
  agencyLogo: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const user = await auth();
      if (!user) throw new Error("Unauthorized");
      return { userId: user.sub, userEmail: user.email };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      };
    }),

  agencyCover: f({
    image: { maxFileSize: "8MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const user = await auth();
      if (!user) throw new Error("Unauthorized");
      return { userId: user.sub, userEmail: user.email };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      };
    }),

  portfolioImage: f({
    image: { maxFileSize: "8MB", maxFileCount: 5 },
  })
    .middleware(async () => {
      const user = await auth();
      if (!user) throw new Error("Unauthorized");
      return { userId: user.sub, userEmail: user.email };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      };
    }),

  avatar: f({
    image: { maxFileSize: "2MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const user = await auth();
      if (!user) throw new Error("Unauthorized");
      return { userId: user.sub, userEmail: user.email };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      };
    }),

  general: f({
    image: { maxFileSize: "8MB", maxFileCount: 1 },
    pdf: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const user = await auth();
      if (!user) throw new Error("Unauthorized");
      return { userId: user.sub, userEmail: user.email };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
