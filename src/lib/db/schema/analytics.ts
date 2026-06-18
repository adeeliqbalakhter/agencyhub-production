import { pgTable, uuid, varchar, text, timestamp, integer, date, jsonb, index } from "drizzle-orm/pg-core";
import { agencies } from "./agencies";

export const agencyAnalyticsDaily = pgTable("agency_analytics_daily", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  profileViews: integer("profile_views").default(0),
  searchImpressions: integer("search_impressions").default(0),
  websiteClicks: integer("website_clicks").default(0),
  phoneClicks: integer("phone_clicks").default(0),
  emailClicks: integer("email_clicks").default(0),
  leadRequests: integer("lead_requests").default(0),
}, (table) => [
  index("analytics_agency_date_idx").on(table.agencyId, table.date),
]);

export const searchLogs = pgTable("search_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  query: text("query"),
  filters: jsonb("filters"),
  resultsCount: integer("results_count"),
  userId: uuid("user_id"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id"),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("audit_logs_entity_idx").on(table.entityType, table.entityId),
  index("audit_logs_user_idx").on(table.userId),
]);
