import { pgTable, uuid, varchar, text, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { agencies } from "./agencies";
import { users } from "./users";

export const teamMemberStatusEnum = pgEnum("team_member_status", ["active", "invited", "inactive"]);

export const agencyTeamMembers = pgTable("agency_team_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).notNull().default("member"),
  status: teamMemberStatusEnum("status").default("active").notNull(),
  invitedAt: timestamp("invited_at", { mode: "date" }),
  joinedAt: timestamp("joined_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const agencyPortfolio = pgTable("agency_portfolio", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  projectUrl: varchar("project_url", { length: 500 }),
  category: varchar("category", { length: 100 }),
  clientName: varchar("client_name", { length: 255 }),
  completionDate: timestamp("completion_date", { mode: "date" }),
  isFeatured: boolean("is_featured").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
});
