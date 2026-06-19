import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Support multiple env var names for PostgreSQL connection
// Priority: NON_POOLING first (direct connection, most reliable for serverless)
const connectionString =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL;

const client = connectionString
  ? postgres(connectionString, {
      prepare: false,
      ssl: { rejectUnauthorized: false },
    })
  : null;

const _db = client ? drizzle(client, { schema }) : null;

// Auto-migration: runs once on first DB access, creates tables if needed
let migrationsPromise: Promise<unknown> | null = null;

async function ensureMigrations() {
  if (!hasDb()) return;
  if (migrationsPromise) {
    await migrationsPromise;
    return;
  }

  const { runMigrations } = await import("./migrate");
  migrationsPromise = runMigrations().catch((err: unknown) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[DB] Auto-migration failed:", err);
    }
  });
  await migrationsPromise;
}

export function hasDb(): boolean {
  return _db !== null;
}

export function getDb() {
  if (!_db) throw new Error("DATABASE_URL is not set");
  return _db;
}

export async function getDbWithMigrations() {
  if (!_db) throw new Error("DATABASE_URL is not set");
  await ensureMigrations();
  return _db;
}

export const db = _db as NonNullable<typeof _db>;

export type Database = NonNullable<typeof _db>;
