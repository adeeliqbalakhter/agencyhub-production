import Link from "next/link";
import {
  Search,
  Star,
  Users,
  TrendingUp,
  Shield,
  ArrowRight,
  Globe,
  Award,
  Zap,
  CheckCircle,
} from "lucide-react";

const popularServices = [
  { name: "SEO", slug: "seo-agencies", icon: TrendingUp },
  { name: "PPC", slug: "ppc-agencies", icon: Zap },
  { name: "Social Media", slug: "social-media-agencies", icon: Users },
  { name: "Web Design", slug: "web-design-agencies", icon: Globe },
  { name: "Content Marketing", slug: "content-marketing-agencies", icon: Award },
  { name: "Branding", slug: "branding-agencies", icon: Star },
];

const stats = [
  { label: "Agencies Listed", value: "10,000+" },
  { label: "Countries", value: "150+" },
  { label: "Verified Reviews", value: "50,000+" },
  { label: "Businesses Matched", value: "25,000+" },
];

const howItWorks = [
  {
    step: "1",
    title: "Tell Us What You Need",
    description:
      "Share your project requirements, budget, and timeline. We'll match you with agencies that fit.",
  },
  {
    step: "2",
    title: "Compare Top Agencies",
    description:
      "Browse detailed profiles, verified reviews, case studies, and portfolios from top-rated agencies.",
  },
  {
    step: "3",
    title: "Get Free Quotes",
    description:
      "Receive proposals from qualified agencies. Compare pricing, timelines, and approaches — all for free.",
  },
];

export default function HomePage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "AgencyHub",
      url: "https://www.agencyhub.com",
      description:
        "Find the perfect marketing agency for your business. Compare top-rated agencies worldwide with verified reviews and free quotes.",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://www.agencyhub.com/agencies?search={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "AgencyHub",
      url: "https://www.agencyhub.com",
      logo: "https://www.agencyhub.com/logo.png",
      description:
        "AgencyHub is the leading marketing agency directory. Browse verified agencies, read reviews, and get free quotes.",
      sameAs: [
        "https://twitter.com/agencyhub",
        "https://linkedin.com/company/agencyhub",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@agencyhub.com",
        contactType: "customer support",
        availableLanguage: ["English"],
      },
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {/* Hero Section */}
      <section className="relative bg-navy overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy-light to-navy opacity-90" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Find the Perfect
              <span className="text-brand-light"> Marketing Agency</span>
              <br />
              for Your Business
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              Compare top-rated agencies worldwide. Read verified reviews,
              explore portfolios, and get free quotes from the best in SEO, PPC,
              design, and more.
            </p>

            {/* Search Bar */}
            <div className="mt-10 max-w-2xl mx-auto">
              <form action="/agencies" method="get" className="relative">
                <div className="flex bg-white rounded-xl shadow-xl overflow-hidden">
                  <div className="flex-1 flex items-center px-4">
                    <Search className="w-5 h-5 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      name="q"
                      placeholder="Search agencies by service, location, or name..."
                      className="w-full px-3 py-4 text-gray-800 placeholder-gray-400 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-brand text-white px-6 md:px-8 font-medium hover:bg-brand-dark transition-colors"
                  >
                    Search
                  </button>
                </div>
              </form>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {popularServices.slice(0, 4).map((service) => (
                  <Link
                    key={service.slug}
                    href={`/${service.slug}`}
                    className="text-sm text-gray-400 hover:text-white px-3 py-1 rounded-full border border-gray-600 hover:border-gray-400 transition-colors"
                  >
                    {service.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-navy">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Services */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-navy">
              Browse by Service
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              Find specialized agencies for every marketing need
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {popularServices.map((service) => {
              const Icon = service.icon;
              return (
                <Link
                  key={service.slug}
                  href={`/${service.slug}`}
                  className="group bg-white rounded-xl p-6 text-center border border-gray-200 hover:border-brand hover:shadow-lg transition-all"
                >
                  <div className="w-12 h-12 mx-auto bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors">
                    <Icon className="w-6 h-6 text-brand group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="mt-4 font-semibold text-gray-800 group-hover:text-brand transition-colors">
                    {service.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">View agencies</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-navy">
              How It Works
            </h2>
            <p className="mt-3 text-lg text-gray-600">
              Finding your ideal agency is simple
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 mx-auto bg-brand text-white rounded-2xl flex items-center justify-center text-xl font-bold">
                  {item.step}
                </div>
                <h3 className="mt-5 text-xl font-semibold text-navy">
                  {item.title}
                </h3>
                <p className="mt-3 text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/get-quotes"
              className="inline-flex items-center gap-2 bg-brand text-white px-8 py-3 rounded-xl font-medium hover:bg-brand-dark transition-colors"
            >
              Get Free Quotes <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Why AgencyHub */}
      <section className="py-16 md:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-navy">
              Why Choose AgencyHub
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Shield,
                title: "Verified Reviews",
                desc: "Every review is verified. No fake ratings, no paid placements in organic results.",
              },
              {
                icon: Globe,
                title: "Global Coverage",
                desc: "Agencies from 150+ countries. Find local experts or top talent anywhere in the world.",
              },
              {
                icon: CheckCircle,
                title: "Free to Use",
                desc: "Browse agencies, read reviews, and get quotes — completely free for businesses.",
              },
              {
                icon: Zap,
                title: "Fast Matching",
                desc: "Get matched with qualified agencies within 24 hours of submitting your project.",
              },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white rounded-xl p-6 border border-gray-200"
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-brand" />
                  </div>
                  <h3 className="mt-4 font-semibold text-navy">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-navy">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Are You a Marketing Agency?
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            Join thousands of agencies growing their business on AgencyHub. Get
            discovered by companies actively looking for your services.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 bg-brand text-white px-8 py-3 rounded-xl font-medium hover:bg-brand-dark transition-colors"
            >
              List Your Agency — It&apos;s Free
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 border border-gray-500 text-white px-8 py-3 rounded-xl font-medium hover:bg-navy-light transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
