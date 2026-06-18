import { z } from "zod";

// ─── Agency Schemas ──────────────────────────────────────────────

export const createAgencySchema = z.object({
  name: z.string().min(2).max(255),
  tagline: z.string().max(500).optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
  coverImage: z.string().optional(),
  website: z.string().max(500).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(50).optional(),
  foundedYear: z.coerce
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear())
    .optional(),
  companySize: z
    .enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"])
    .optional(),
  hourlyRate: z.string().max(50).optional(),
  minProjectSize: z.coerce.number().int().min(0).optional(),

  // Location
  countryId: z.string().uuid().optional(),
  cityId: z.string().uuid().optional(),
  address: z.string().optional(),
  latitude: z.coerce
    .number()
    .min(-90)
    .max(90)
    .transform(String)
    .optional(),
  longitude: z.coerce
    .number()
    .min(-180)
    .max(180)
    .transform(String)
    .optional(),

  // Social
  linkedinUrl: z.string().max(500).optional(),
  twitterUrl: z.string().max(500).optional(),
  facebookUrl: z.string().max(500).optional(),
  instagramUrl: z.string().max(500).optional(),

  // SEO
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),

  // Relations
  serviceIds: z.array(z.string().uuid()).optional(),
  industryIds: z.array(z.string().uuid()).optional(),
});

export type CreateAgencyInput = z.infer<typeof createAgencySchema>;

export const updateAgencySchema = createAgencySchema.partial();

export type UpdateAgencyInput = z.infer<typeof updateAgencySchema>;

// ─── Review Schemas ──────────────────────────────────────────────

export const createReviewSchema = z.object({
  agencyId: z.string().uuid(),
  // Step 1: Ratings
  budgetRating: z.number().min(1).max(5),
  qualityRating: z.number().min(1).max(5),
  scheduleRating: z.number().min(1).max(5),
  collaborationRating: z.number().min(1).max(5),
  // Step 2: Review details
  objective: z.string().min(20).max(2000),
  enjoyed: z.string().min(20).max(2000),
  improvements: z.string().max(2000).optional(),
  serviceProvided: z.string().max(255).optional(),
  wouldRecommend: z.boolean(),
  // Step 3: Personal info (guest fields, handled separately for logged-in users)
  reviewerName: z.string().min(2).max(100).optional(),
  reviewerEmail: z.string().email().max(255).optional(),
  reviewerJobTitle: z.string().min(2).max(100).optional(),
  companyName: z.string().max(255).optional(),
  companyIndustry: z.string().max(100).optional(),
  companySize: z.string().max(50).optional(),
  // Spam control
  website: z.string().optional(),
  formLoadedAt: z.number().optional(),
}).passthrough();

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

// ─── Lead Schemas (Get-Quotes Form) ─────────────────────────────

export const createLeadSchema = z.object({
  companyName: z.string().min(1).max(255),
  contactName: z.string().min(1).max(255),
  contactEmail: z.string().email().max(255),
  contactPhone: z.string().max(50).optional(),
  projectDescription: z.string().min(10),
  budget: z.string().max(100).optional(),
  timeline: z.string().max(100).optional(),
  serviceIds: z.array(z.string().uuid()).optional(),
  industryId: z.string().uuid().optional(),
  countryId: z.string().uuid().optional(),
  cityId: z.string().uuid().optional(),
  agencyIds: z.array(z.string().uuid()).optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

// ─── Search Params Schema ────────────────────────────────────────

export const searchParamsSchema = z.object({
  query: z.string().optional(),
  services: z
    .string()
    .transform((v) => v.split(",").filter(Boolean))
    .optional(),
  industries: z
    .string()
    .transform((v) => v.split(",").filter(Boolean))
    .optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  companySize: z
    .enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"])
    .optional(),
  minBudget: z.coerce.number().min(0).optional(),
  maxBudget: z.coerce.number().min(0).optional(),
  sortBy: z.enum(["rating", "reviews", "name", "newest"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;
