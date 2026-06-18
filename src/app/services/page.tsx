import Link from "next/link";
import {
  TrendingUp,
  Zap,
  Users,
  Globe,
  Award,
  Star,
  Mail,
  Palette,
  Monitor,
  BarChart3,
  Video,
  Megaphone,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketing Services - Find Agencies by Specialty",
  description:
    "Browse marketing agencies by service category. Find specialists in SEO, PPC, social media, web design, content marketing, email, branding, and more.",
  keywords: [
    "marketing services",
    "SEO agencies",
    "PPC agencies",
    "social media marketing",
    "web design agencies",
    "content marketing",
    "email marketing",
    "branding agencies",
    "digital marketing services",
  ],
  openGraph: {
    title: "Marketing Services - Find Agencies by Specialty | AgencyHub",
    description:
      "Browse marketing agencies by service category. Find specialists in SEO, PPC, social media, web design, content marketing, email, branding, and more.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Marketing Services - Find Agencies by Specialty | AgencyHub",
    description:
      "Browse marketing agencies by service category. Find specialists in SEO, PPC, social media, web design, content marketing, email, branding, and more.",
  },
  alternates: {
    canonical: "/services",
  },
};

const services = [
  {
    name: "SEO",
    slug: "seo-agencies",
    icon: TrendingUp,
    description:
      "Improve organic rankings, drive traffic, and increase visibility on search engines.",
    agencyCount: 2450,
  },
  {
    name: "PPC Advertising",
    slug: "ppc-agencies",
    icon: Zap,
    description:
      "Maximize ROI with expert management of Google Ads, Bing Ads, and social ad campaigns.",
    agencyCount: 1890,
  },
  {
    name: "Social Media Marketing",
    slug: "social-media-agencies",
    icon: Users,
    description:
      "Build your brand presence and engage audiences across social platforms.",
    agencyCount: 2120,
  },
  {
    name: "Web Design & Development",
    slug: "web-design-agencies",
    icon: Monitor,
    description:
      "Create stunning, conversion-optimized websites and web applications.",
    agencyCount: 3200,
  },
  {
    name: "Content Marketing",
    slug: "content-marketing-agencies",
    icon: Award,
    description:
      "Attract and engage your audience with compelling content strategies.",
    agencyCount: 1560,
  },
  {
    name: "Email Marketing",
    slug: "email-marketing-agencies",
    icon: Mail,
    description:
      "Drive conversions with targeted email campaigns, automation, and list management.",
    agencyCount: 980,
  },
  {
    name: "Branding",
    slug: "branding-agencies",
    icon: Palette,
    description:
      "Develop your brand strategy, visual identity, and market positioning.",
    agencyCount: 1340,
  },
  {
    name: "Digital Marketing",
    slug: "digital-marketing-agencies",
    icon: Globe,
    description:
      "Full-service digital marketing covering all online channels and strategies.",
    agencyCount: 4100,
  },
  {
    name: "Video Production",
    slug: "video-production-agencies",
    icon: Video,
    description:
      "Create professional video content for ads, social media, and brand storytelling.",
    agencyCount: 870,
  },
  {
    name: "Public Relations",
    slug: "pr-agencies",
    icon: Megaphone,
    description:
      "Manage your public image, media relations, and crisis communications.",
    agencyCount: 720,
  },
  {
    name: "Analytics & Data",
    slug: "analytics-agencies",
    icon: BarChart3,
    description:
      "Turn data into insights with analytics setup, reporting, and optimization.",
    agencyCount: 560,
  },
  {
    name: "Influencer Marketing",
    slug: "influencer-marketing-agencies",
    icon: Star,
    description:
      "Connect with influencers to amplify your brand reach and drive engagement.",
    agencyCount: 640,
  },
];

export default function ServicesPage() {
  return (
    <div>
      <section className="bg-navy py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-white">
            Marketing Agency Services
          </h1>
          <p className="mt-3 text-lg text-gray-300 max-w-2xl">
            Browse agencies by their area of expertise. Find specialists who
            excel in exactly the service you need.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <Link
                key={service.slug}
                href={`/${service.slug}`}
                className="group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-brand/30 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-brand transition-colors">
                    <Icon className="w-6 h-6 text-brand group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-navy group-hover:text-brand transition-colors">
                      {service.name}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {service.description}
                    </p>
                    <p className="mt-3 text-sm font-medium text-brand">
                      {service.agencyCount.toLocaleString()} agencies →
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
