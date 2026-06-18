import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

const client = connectionString
  ? postgres(connectionString, {
      prepare: false,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max_lifetime: 60 * 30, // 30 minutes
      connect_timeout: 10,
      idle_timeout: 20,
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
