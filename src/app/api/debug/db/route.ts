import { hasDb, getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL_set: !!process.env.DATABASE_URL,
      POSTGRES_URL_set: !!process.env.POSTGRES_URL,
      POSTGRES_URL_NON_POOLING_set: !!process.env.POSTGRES_URL_NON_POOLING,
      NODE_ENV: process.env.NODE_ENV,
    },
    hasDb: hasDb(),
  };

  if (!hasDb()) {
    return Response.json(
      { error: "Database not connected", checks },
      { status: 500 }
    );
  }

  try {
    const db = getDb();

    // Test 1: Simple query
    const versionResult = await db.execute(sql`SELECT version()`);
    checks.dbVersion = (versionResult as unknown as Array<{ version: string }>)[0]?.version;

    // Test 2: Check if signup_otps table exists
    const tableCheck = await db.execute(
      sql`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'signup_otps') as exists`
    );
    checks.signupOtpsTableExists = (tableCheck as unknown as Array<{ exists: boolean }>)[0]?.exists;

    // Test 3: List all tables
    const tablesResult = await db.execute(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
    );
    checks.tables = (tablesResult as unknown as Array<{ table_name: string }>).map((r) => r.table_name);

    // Test 4: Try creating signup_otps table
    if (!checks.signupOtpsTableExists) {
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS signup_otps (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) NOT NULL,
            code VARCHAR(6) NOT NULL,
            name VARCHAR(255) NOT NULL,
            password_hash TEXT NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'user',
            expires_at TIMESTAMPTZ NOT NULL,
            used_at TIMESTAMPTZ,
            attempts INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        checks.signupOtpsTableCreated = true;
      } catch (createErr) {
        checks.signupOtpsTableCreated = false;
        checks.signupOtpsCreateError = createErr instanceof Error ? createErr.message : String(createErr);
      }
    }

    return Response.json({ status: "ok", checks });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return Response.json(
      { error: "DB test failed", message, stack, checks },
      { status: 500 }
    );
  }
}
