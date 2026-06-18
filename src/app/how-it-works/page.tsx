import Link from "next/link";
import {
  Search,
  ClipboardList,
  MessageSquare,
  Handshake,
  Shield,
  DollarSign,
  Star,
  ArrowRight,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works - Find and Hire Marketing Agencies",
  description:
    "Learn how AgencyHub helps you find, compare, and hire the best marketing agencies. Free quotes, verified reviews, and smart matching.",
  alternates: {
    canonical: "/how-it-works",
  },
};

const forBusinesses = [
  {
    step: 1,
    icon: ClipboardList,
    title: "Submit Your Project",
    description:
      "Tell us what services you need, your budget, timeline, and goals. It takes less than 2 minutes.",
  },
  {
    step: 2,
    icon: Search,
    title: "Get Matched",
    description:
      "We match you with agencies that specialize in your needs, industry, and budget range.",
  },
  {
    step: 3,
    icon: MessageSquare,
    title: "Receive Proposals",
    description:
      "Qualified agencies send you tailored proposals. Compare approaches, timelines, and pricing.",
  },
  {
    step: 4,
    icon: Handshake,
    title: "Hire with Confidence",
    description:
      "Choose your ideal agency partner backed by verified reviews and detailed profiles.",
  },
];

const forAgencies = [
  {
    step: 1,
    icon: ClipboardList,
    title: "Create Your Profile",
    description:
      "Set up your agency profile with services, portfolio, team info, and pricing. It's free to start.",
  },
  {
    step: 2,
    icon: Star,
    title: "Collect Reviews",
    description:
      "Invite clients to leave verified reviews. Build your reputation and climb the rankings.",
  },
  {
    step: 3,
    icon: MessageSquare,
    title: "Receive Leads",
    description:
      "Get matched with businesses actively looking for your services. Respond to qualified leads.",
  },
  {
    step: 4,
    icon: DollarSign,
    title: "Win New Business",
    description:
      "Convert leads into clients. Track your performance with detailed analytics.",
  },
];

const howToStructuredData = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Find a Marketing Agency on AgencyHub",
  step: [
    {
      "@type": "HowToStep",
      name: "Submit Your Project",
      text: "Tell us what services you need, your budget, timeline, and goals. It takes less than 2 minutes.",
    },
    {
      "@type": "HowToStep",
      name: "Get Matched",
      text: "We match you with agencies that specialize in your needs, industry, and budget range.",
    },
    {
      "@type": "HowToStep",
      name: "Receive Proposals",
      text: "Qualified agencies send you tailored proposals. Compare approaches, timelines, and pricing.",
    },
    {
      "@type": "HowToStep",
      name: "Hire with Confidence",
      text: "Choose your ideal agency partner backed by verified reviews and detailed profiles.",
    },
  ],
};

export default function HowItWorksPage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToStructuredData) }}
      />
      <section className="bg-navy py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            How AgencyHub Works
          </h1>
          <p className="mt-4 text-lg text-gray-300">
            Whether you&apos;re a business looking for an agency or an agency
            looking for clients, we make the connection simple.
          </p>
        </div>
      </section>

      {/* For Businesses */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block bg-blue-50 text-brand text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              For Businesses
            </span>
            <h2 className="text-3xl font-bold text-navy">
              Find Your Perfect Agency
            </h2>
            <p className="mt-3 text-gray-600">
              Get matched with vetted agencies — completely free
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {forBusinesses.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="text-center">
                  <div className="relative">
                    <div className="w-16 h-16 mx-auto bg-brand text-white rounded-2xl flex items-center justify-center">
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-7 h-7 bg-navy text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-navy">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    {item.description}
                  </p>
                </div>
              );
            })}
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

      {/* For Agencies */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block bg-green-50 text-green-700 text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              For Agencies
            </span>
            <h2 className="text-3xl font-bold text-navy">
              Grow Your Agency
            </h2>
            <p className="mt-3 text-gray-600">
              Get discovered and win new clients
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {forAgencies.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="text-center">
                  <div className="relative">
                    <div className="w-16 h-16 mx-auto bg-green-600 text-white rounded-2xl flex items-center justify-center">
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-7 h-7 bg-navy text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-navy">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-green-700 transition-colors"
            >
              List Your Agency — Free <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Shield className="w-12 h-12 text-brand mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-navy">
            Trust & Transparency
          </h2>
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
            Every review is verified, every agency profile is moderated, and
            organic search rankings are never influenced by advertising spend.
            We believe in transparency and merit-based discovery.
          </p>
        </div>
      </section>
    </div>
  );
}
