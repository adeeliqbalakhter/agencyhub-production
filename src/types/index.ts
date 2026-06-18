export interface Agency {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  logo: string | null;
  coverImage: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  foundedYear: number | null;
  companySize: string | null;
  hourlyRate: string | null;
  minProjectSize: number | null;
  isVerified: boolean;
  isFeatured: boolean;
  isPremium: boolean;
  averageRating: number;
  totalReviews: number;
  country: { name: string; slug: string } | null;
  city: { name: string; slug: string } | null;
  services: { id: string; name: string; slug: string }[];
  industries: { id: string; name: string; slug: string }[];
}

export interface Review {
  id: string;
  overallRating: number;
  qualityRating: number | null;
  communicationRating: number | null;
  valueRating: number | null;
  timelinessRating: number | null;
  title: string;
  content: string;
  projectType: string | null;
  projectBudget: string | null;
  companyName: string | null;
  isVerified: boolean;
  helpfulCount: number;
  createdAt: Date;
  user: { name: string; image: string | null };
}

export interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  projectDescription: string;
  budget: string | null;
  timeline: string | null;
  status: string;
  createdAt: Date;
  services: string[];
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featuredImage: string | null;
  category: { name: string; slug: string } | null;
  author: { name: string; image: string | null };
  readingTime: number | null;
  viewCount: number;
  publishedAt: Date | null;
  createdAt: Date;
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  agencyCount: number;
}

export interface SearchFilters {
  query?: string;
  services?: string[];
  industries?: string[];
  country?: string;
  city?: string;
  minRating?: number;
  companySize?: string;
  minBudget?: number;
  maxBudget?: number;
  sortBy?: "rating" | "reviews" | "name" | "newest";
  page?: number;
  limit?: number;
}
