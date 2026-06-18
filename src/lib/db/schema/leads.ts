import { pgTable, uuid, varchar, text, timestamp, integer, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { agencies } from "./agencies";

export const leadStatusEnum = pgEnum("lead_status", ["new", "sent", "viewed", "responded", "won", "lost", "expired"]);

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 50 }),
  projectDescription: text("project_description").notNull(),
  budget: varchar("budget", { length: 100 }),
  timeline: varchar("timeline", { length: 100 }),
  serviceIds: jsonb("service_ids"),
  industryId: uuid("industry_id"),
  countryId: uuid("country_id"),
  cityId: uuid("city_id"),
  status: leadStatusEnum("status").default("new").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => [
  index("leads_status_idx").on(table.status),
  index("leads_created_idx").on(table.createdAt),
]);

export const leadAssignments = pgTable("lead_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 50 }).default("sent").notNull(),
  creditsUsed: integer("credits_used").default(1),
  viewedAt: timestamp("viewed_at", { mode: "date" }),
  respondedAt: timestamp("responded_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadAssignmentId: uuid("lead_assignment_id").notNull().references(() => leadAssignments.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: integer("is_read").default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});
