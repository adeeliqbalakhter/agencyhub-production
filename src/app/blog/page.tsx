import Link from "next/link";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog - Marketing Agency Insights & Industry News",
  description:
    "Expert insights on hiring marketing agencies, industry trends, case studies, and tips for growing your business with the right agency partner.",
  alternates: {
    canonical: "/blog",
  },
};

const featuredPost = {
  slug: "how-to-choose-the-right-marketing-agency",
  title: "How to Choose the Right Marketing Agency in 2025: The Complete Guide",
  excerpt:
    "Hiring a marketing agency is one of the most important decisions for your business. Learn the key factors to consider, red flags to watch for, and how to evaluate proposals effectively.",
  category: "Guides",
  author: { name: "AgencyHub Team", avatar: null },
  date: "2025-01-15",
  readingTime: 12,
  image: null,
};

const posts = [
  {
    slug: "seo-agency-vs-in-house",
    title: "SEO Agency vs In-House: Which Is Right for Your Business?",
    excerpt:
      "Compare the costs, benefits, and trade-offs of hiring an SEO agency versus building an in-house team.",
    category: "SEO",
    date: "2025-01-12",
    readingTime: 8,
  },
  {
    slug: "top-digital-marketing-trends",
    title: "Top 10 Digital Marketing Trends Shaping 2025",
    excerpt:
      "From AI-powered personalization to zero-click content, discover the trends every marketer needs to know.",
    category: "Trends",
    date: "2025-01-10",
    readingTime: 10,
  },
  {
    slug: "marketing-agency-pricing-guide",
    title: "Marketing Agency Pricing: What to Expect in 2025",
    excerpt:
      "Understand common pricing models, typical rates by service type, and how to budget for agency work.",
    category: "Guides",
    date: "2025-01-08",
    readingTime: 9,
  },
  {
    slug: "ppc-campaign-optimization",
    title: "7 PPC Campaign Optimization Strategies That Actually Work",
    excerpt:
      "Learn proven strategies to improve your PPC campaign performance, reduce costs, and maximize ROI.",
    category: "PPC",
    date: "2025-01-05",
    readingTime: 7,
  },
  {
    slug: "social-media-agency-benefits",
    title: "5 Reasons to Hire a Social Media Agency in 2025",
    excerpt:
      "Discover why more businesses are outsourcing social media management and what to look for in an agency.",
    category: "Social Media",
    date: "2025-01-03",
    readingTime: 6,
  },
  {
    slug: "web-design-agency-portfolio-review",
    title: "How to Evaluate a Web Design Agency's Portfolio",
    excerpt:
      "A step-by-step guide to reviewing web design portfolios so you can make confident hiring decisions.",
    category: "Web Design",
    date: "2025-01-01",
    readingTime: 5,
  },
];

const categories = [
  "All",
  "Guides",
  "SEO",
  "PPC",
  "Social Media",
  "Web Design",
  "Trends",
  "Case Studies",
];

export default function BlogPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <section className="bg-navy py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-white">Blog</h1>
          <p className="mt-3 text-lg text-gray-300">
            Expert insights on finding, hiring, and working with marketing
            agencies
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Categories */}
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                cat === "All"
                  ? "bg-brand text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-brand hover:text-brand"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Featured Post */}
        <Link
          href={`/blog/${featuredPost.slug}`}
          className="block bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow mb-12"
        >
          <div className="md:flex">
            <div className="md:w-1/2 bg-gradient-to-br from-brand to-navy h-48 md:h-auto" />
            <div className="md:w-1/2 p-8">
              <span className="inline-block bg-blue-50 text-brand text-xs font-semibold px-3 py-1 rounded-full">
                {featuredPost.category}
              </span>
              <h2 className="mt-4 text-2xl font-bold text-navy leading-tight">
                {featuredPost.title}
              </h2>
              <p className="mt-3 text-gray-600">{featuredPost.excerpt}</p>
              <div className="mt-6 flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(featuredPost.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {featuredPost.readingTime} min read
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200" />
              <div className="p-6">
                <span className="inline-block bg-blue-50 text-brand text-xs font-semibold px-3 py-1 rounded-full">
                  {post.category}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-navy group-hover:text-brand transition-colors leading-snug">
                  {post.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                  {post.excerpt}
                </p>
                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(post.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {post.readingTime} min
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Load More */}
        <div className="mt-12 text-center">
          <button className="inline-flex items-center gap-2 text-brand font-medium hover:text-brand-dark transition-colors">
            Load More Articles <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
