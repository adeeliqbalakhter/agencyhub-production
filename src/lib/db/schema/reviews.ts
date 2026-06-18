import { pgTable, uuid, varchar, text, timestamp, boolean, integer, decimal, pgEnum, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { agencies } from "./agencies";

export const reviewStatusEnum = pgEnum("review_status", ["pending", "approved", "rejected", "flagged"]);

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  overallRating: decimal("overall_rating", { precision: 3, scale: 2 }).notNull(),
  qualityRating: decimal("quality_rating", { precision: 3, scale: 2 }),
  communicationRating: decimal("communication_rating", { precision: 3, scale: 2 }),
  valueRating: decimal("value_rating", { precision: 3, scale: 2 }),
  timelinessRating: decimal("timeliness_rating", { precision: 3, scale: 2 }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  projectType: varchar("project_type", { length: 255 }),
  projectBudget: varchar("project_budget", { length: 100 }),
  projectDuration: varchar("project_duration", { length: 100 }),
  companyName: varchar("company_name", { length: 255 }),
  companySize: varchar("company_size", { length: 50 }),
  isVerified: boolean("is_verified").default(false).notNull(),
  status: reviewStatusEnum("status").default("pending").notNull(),
  helpfulCount: integer("helpful_count").default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
}, (table) => [
  index("reviews_agency_idx").on(table.agencyId),
  index("reviews_status_idx").on(table.status),
  index("reviews_rating_idx").on(table.overallRating),
]);

export const reviewResponses = pgTable("review_responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  reviewId: uuid("review_id").notNull().references(() => reviews.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const reviewVotes = pgTable("review_votes", {
  id: uuid("id").defaultRandom().primaryKey(),
  reviewId: uuid("review_id").notNull().references(() => reviews.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  isHelpful: boolean("is_helpful").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});
