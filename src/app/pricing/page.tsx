import Link from "next/link";
import { Check, X, Star, Zap, Crown, Building2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Choose the perfect plan for your agency. Free to list, with premium options for more visibility, leads, and features.",
  alternates: {
    canonical: "/pricing",
  },
};

const plans = [
  {
    name: "Free",
    icon: Star,
    price: { monthly: 0, yearly: 0 },
    description: "Get started and build your presence",
    features: [
      { name: "Basic agency profile", included: true },
      { name: "Up to 5 portfolio items", included: true },
      { name: "Receive & respond to reviews", included: true },
      { name: "1 lead credit/month", included: true },
      { name: "Basic analytics", included: true },
      { name: "Search ranking boost", included: false },
      { name: "Featured placement", included: false },
      { name: "Custom branding", included: false },
      { name: "API access", included: false },
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Premium",
    icon: Zap,
    price: { monthly: 49, yearly: 470 },
    description: "Stand out and attract more clients",
    features: [
      { name: "Enhanced profile with badges", included: true },
      { name: "Up to 20 portfolio items", included: true },
      { name: "Priority in search results", included: true },
      { name: "10 lead credits/month", included: true },
      { name: "Advanced analytics dashboard", included: true },
      { name: "Review response tools", included: true },
      { name: "Featured placement", included: false },
      { name: "Custom branding", included: false },
      { name: "API access", included: false },
    ],
    cta: "Start Premium",
    popular: true,
  },
  {
    name: "Pro",
    icon: Crown,
    price: { monthly: 149, yearly: 1430 },
    description: "Maximize visibility and lead generation",
    features: [
      { name: "Featured listing placement", included: true },
      { name: "Unlimited portfolio items", included: true },
      { name: "Top search ranking boost", included: true },
      { name: "30 lead credits/month", included: true },
      { name: "Full analytics dashboard", included: true },
      { name: "Custom profile branding", included: true },
      { name: "API access", included: true },
      { name: "Priority support", included: true },
      { name: "Competitor insights", included: true },
    ],
    cta: "Start Pro",
    popular: false,
  },
  {
    name: "Enterprise",
    icon: Building2,
    price: { monthly: 499, yearly: 4790 },
    description: "For large agencies & multi-location firms",
    features: [
      { name: "Everything in Pro", included: true },
      { name: "Dedicated account manager", included: true },
      { name: "Custom integrations", included: true },
      { name: "Unlimited lead credits", included: true },
      { name: "White-label reporting", included: true },
      { name: "Multi-location support", included: true },
      { name: "SLA guarantee", included: true },
      { name: "Custom onboarding", included: true },
      { name: "Bulk team management", included: true },
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Can I start for free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! Create your agency profile completely free. The Free plan includes a basic profile, portfolio showcase, reviews, and 1 lead credit per month.",
      },
    },
    {
      "@type": "Question",
      name: "What are lead credits?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Lead credits allow you to respond to business inquiries. When a potential client submits a project request matching your services, you use 1 credit to view their contact details and respond.",
      },
    },
    {
      "@type": "Question",
      name: "Can I cancel anytime?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Absolutely. All paid plans are month-to-month with no long-term commitment. Cancel anytime from your dashboard and you'll keep access until the end of your billing period.",
      },
    },
    {
      "@type": "Question",
      name: "Do you offer refunds?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We offer a 14-day money-back guarantee on all paid plans. If you're not satisfied, contact us within 14 days for a full refund.",
      },
    },
    {
      "@type": "Question",
      name: "What payment methods do you accept?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We accept all major credit cards, debit cards, and PayPal through our secure payment processor, Stripe.",
      },
    },
  ],
};

export default function PricingPage() {
  return (
    <div className="bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      {/* Header */}
      <section className="bg-navy py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
            Start free and upgrade as you grow. No hidden fees, no long-term
            contracts.
          </p>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col ${
                  plan.popular
                    ? "border-brand shadow-xl scale-105 z-10"
                    : "border-gray-200"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-xs font-bold px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      plan.popular ? "bg-brand text-white" : "bg-blue-50"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        plan.popular ? "text-white" : "text-brand"
                      }`}
                    />
                  </div>
                  <h3 className="text-xl font-bold text-navy">{plan.name}</h3>
                </div>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-navy">
                    ${plan.price.monthly}
                  </span>
                  <span className="text-gray-500">/month</span>
                  {plan.price.yearly > 0 && (
                    <p className="text-sm text-gray-400 mt-1">
                      ${plan.price.yearly}/year (save{" "}
                      {Math.round(
                        (1 - plan.price.yearly / (plan.price.monthly * 12)) *
                          100
                      )}
                      %)
                    </p>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature.name} className="flex items-start gap-2">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />
                      )}
                      <span
                        className={`text-sm ${
                          feature.included ? "text-gray-700" : "text-gray-400"
                        }`}
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.name === "Enterprise" ? "/contact" : "/auth/signup"}
                  className={`block text-center py-3 rounded-xl font-medium transition-colors ${
                    plan.popular
                      ? "bg-brand text-white hover:bg-brand-dark"
                      : "bg-gray-100 text-navy hover:bg-gray-200"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-navy text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "Can I start for free?",
                a: "Yes! Create your agency profile completely free. The Free plan includes a basic profile, portfolio showcase, reviews, and 1 lead credit per month.",
              },
              {
                q: "What are lead credits?",
                a: "Lead credits allow you to respond to business inquiries. When a potential client submits a project request matching your services, you use 1 credit to view their contact details and respond.",
              },
              {
                q: "Can I cancel anytime?",
                a: "Absolutely. All paid plans are month-to-month with no long-term commitment. Cancel anytime from your dashboard and you'll keep access until the end of your billing period.",
              },
              {
                q: "Do you offer refunds?",
                a: "We offer a 14-day money-back guarantee on all paid plans. If you're not satisfied, contact us within 14 days for a full refund.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards, debit cards, and PayPal through our secure payment processor, Stripe.",
              },
            ].map((faq) => (
              <div key={faq.q} className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-navy">{faq.q}</h3>
                <p className="mt-2 text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
