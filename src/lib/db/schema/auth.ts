import { pgTable, uuid, varchar, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  deviceInfo: text("device_info"),
  ipAddress: varchar("ip_address", { length: 45 }),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const otpTokens = pgTable("otp_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 6 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const loginHistory = pgTable("login_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  deviceType: varchar("device_type", { length: 20 }),
  status: varchar("status", { length: 20 }).notNull(),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  bio: text("bio"),
  phone: varchar("phone", { length: 50 }),
  companyName: varchar("company_name", { length: 255 }),
  jobTitle: varchar("job_title", { length: 255 }),
  website: varchar("website", { length: 500 }),
  avatarUrl: text("avatar_url"),
  timezone: varchar("timezone", { length: 100 }),
  language: varchar("language", { length: 10 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  emailNewLeads: boolean("email_new_leads").default(true),
  emailReviews: boolean("email_reviews").default(true),
  emailMessages: boolean("email_messages").default(true),
  emailMarketing: boolean("email_marketing").default(false),
  pushEnabled: boolean("push_enabled").default(true),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
