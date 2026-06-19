import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Support multiple env var names for PostgreSQL connection
// Priority: NON_POOLING first (direct connection, most reliable for serverless)
// → DATABASE_URL → POSTGRES_URL (pooler, less reliable)
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

export function hasDb(): boolean {
  return _db !== null;
}

export function getDb() {
  if (!_db) throw new Error("DATABASE_URL is not set");
  return _db;
}

export const db = _db as NonNullable<typeof _db>;

export type Database = NonNullable<typeof _db>;
