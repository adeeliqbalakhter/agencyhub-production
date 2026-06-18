import Link from "next/link";
import { Globe, Shield, Users, Target, Award, Heart } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "AgencyHub is the world's largest marketing agency directory. We help businesses find and hire the perfect marketing agency for their needs.",
  alternates: {
    canonical: "/about",
  },
};

const values = [
  {
    icon: Shield,
    title: "Transparency",
    description:
      "Verified reviews, honest ratings, and no pay-to-play in organic rankings. What you see is what you get.",
  },
  {
    icon: Globe,
    title: "Global First",
    description:
      "Built for the world, not just one market. We represent agencies from 150+ countries and growing.",
  },
  {
    icon: Users,
    title: "Community Driven",
    description:
      "Real reviews from real clients. Our community helps businesses make confident hiring decisions.",
  },
  {
    icon: Target,
    title: "Quality Focused",
    description:
      "We verify every agency profile and moderate all reviews to maintain the highest quality standards.",
  },
  {
    icon: Award,
    title: "Merit Based",
    description:
      "Rankings are based on reviews, quality, and client satisfaction — not advertising spend.",
  },
  {
    icon: Heart,
    title: "Accessible",
    description:
      "Free for businesses to browse, compare, and get quotes. Affordable plans for agencies of all sizes.",
  },
];

const milestones = [
  { year: "2024", event: "AgencyHub founded with a mission to democratize agency discovery" },
  { year: "2024", event: "Launched with 500+ verified agencies across 50 countries" },
  { year: "2025", event: "Reached 5,000+ agencies and 25,000+ verified reviews" },
  { year: "2025", event: "Expanded to 150+ countries with multi-language support" },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-navy py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            Making Agency Hiring
            <br />
            <span className="text-brand-light">Simple and Transparent</span>
          </h1>
          <p className="mt-6 text-lg text-gray-300 max-w-2xl mx-auto">
            AgencyHub is the world&apos;s largest marketing agency directory,
            helping businesses find the perfect agency partner through verified
            reviews, detailed profiles, and free quotes.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-navy">Our Mission</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              We believe finding the right marketing agency shouldn&apos;t be a
              gamble. Our platform provides the transparency, data, and tools
              businesses need to make confident hiring decisions — and helps great
              agencies get discovered by the clients who need them most.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-navy text-center mb-12">
            Our Values
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <div
                  key={value.title}
                  className="bg-white rounded-xl p-6 border border-gray-200"
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-brand" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-navy">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-gray-600">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-navy text-center mb-12">
            Our Journey
          </h2>
          <div className="space-y-6">
            {milestones.map((m, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 bg-brand rounded-full" />
                  {i < milestones.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
                  )}
                </div>
                <div className="pb-6">
                  <span className="text-sm font-semibold text-brand">
                    {m.year}
                  </span>
                  <p className="mt-1 text-gray-700">{m.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-navy">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to Find Your Perfect Agency?
          </h2>
          <p className="mt-4 text-gray-300">
            Browse thousands of verified agencies or list your own — it&apos;s free
            to get started.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/agencies"
              className="bg-brand text-white px-8 py-3 rounded-xl font-medium hover:bg-brand-dark transition-colors"
            >
              Browse Agencies
            </Link>
            <Link
              href="/auth/signup"
              className="border border-gray-500 text-white px-8 py-3 rounded-xl font-medium hover:bg-navy-light transition-colors"
            >
              List Your Agency
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
