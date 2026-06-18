import { pgTable, uuid, varchar, text, timestamp, boolean, integer, decimal, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const agencyStatusEnum = pgEnum("agency_status", ["draft", "pending", "active", "suspended", "archived"]);
export const companySizeEnum = pgEnum("company_size", ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"]);

export const agencies = pgTable("agencies", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  tagline: varchar("tagline", { length: 500 }),
  description: text("description"),
  logo: text("logo"),
  coverImage: text("cover_image"),
  website: varchar("website", { length: 500 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  foundedYear: integer("founded_year"),
  companySize: companySizeEnum("company_size"),
  hourlyRate: varchar("hourly_rate", { length: 50 }),
  minProjectSize: integer("min_project_size"),
  status: agencyStatusEnum("status").default("draft").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  isPremium: boolean("is_premium").default(false).notNull(),

  // Location
  countryId: uuid("country_id").references(() => countries.id),
  cityId: uuid("city_id").references(() => cities.id),
  address: text("address"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),

  // Social
  linkedinUrl: varchar("linkedin_url", { length: 500 }),
  twitterUrl: varchar("twitter_url", { length: 500 }),
  facebookUrl: varchar("facebook_url", { length: 500 }),
  instagramUrl: varchar("instagram_url", { length: 500 }),

  // SEO
  metaTitle: varchar("meta_title", { length: 70 }),
  metaDescription: varchar("meta_description", { length: 160 }),

  // Stats (denormalized for performance)
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0"),
  totalReviews: integer("total_reviews").default(0),
  totalLeads: integer("total_leads").default(0),
  profileViews: integer("profile_views").default(0),

  // Flexible fields
  portfolioItems: jsonb("portfolio_items"),
  teamMembers: jsonb("team_members"),
  awards: jsonb("awards"),
  certifications: jsonb("certifications"),

  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
}, (table) => [
  index("agencies_slug_idx").on(table.slug),
  index("agencies_status_idx").on(table.status),
  index("agencies_country_idx").on(table.countryId),
  index("agencies_city_idx").on(table.cityId),
  index("agencies_rating_idx").on(table.averageRating),
  index("agencies_featured_idx").on(table.isFeatured),
]);

export const countries = pgTable("countries", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  code: varchar("code", { length: 3 }).notNull().unique(),
  continent: varchar("continent", { length: 50 }),
  agencyCount: integer("agency_count").default(0),
});

export const cities = pgTable("cities", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  countryId: uuid("country_id").notNull().references(() => countries.id),
  stateProvince: varchar("state_province", { length: 255 }),
  agencyCount: integer("agency_count").default(0),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
});

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  parentId: uuid("parent_id"),
  agencyCount: integer("agency_count").default(0),
  sortOrder: integer("sort_order").default(0),
});

export const industries = pgTable("industries", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  agencyCount: integer("agency_count").default(0),
  sortOrder: integer("sort_order").default(0),
});

export const agencyServices = pgTable("agency_services", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
});

export const agencyIndustries = pgTable("agency_industries", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: "cascade" }),
  industryId: uuid("industry_id").notNull().references(() => industries.id, { onDelete: "cascade" }),
});
