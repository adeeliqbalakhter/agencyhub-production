import { NextResponse } from "next/server";
import { hasDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
    environment: process.env.NODE_ENV || "development",
    database: hasDb() ? "connected" : "not_configured",
  };

  const statusCode = hasDb() ? 200 : 200; // Still 200 if DB not configured (setup mode)

  return NextResponse.json(checks, { status: statusCode });
}
