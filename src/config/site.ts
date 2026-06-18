export const siteConfig = {
  name: "AgencyHub",
  description: "Find and hire the best marketing agencies worldwide. Compare reviews, portfolios, and pricing from top-rated agencies across SEO, PPC, social media, web design, and more.",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ogImage: "/og-image.png",
  links: {
    twitter: "https://twitter.com/agencyhub",
    linkedin: "https://linkedin.com/company/agencyhub",
  },
  creator: "AgencyHub",
  keywords: [
    "marketing agencies",
    "digital marketing agency",
    "SEO agency",
    "PPC agency",
    "web design agency",
    "social media agency",
    "agency directory",
    "find marketing agency",
    "agency reviews",
    "hire marketing agency",
  ],
} as const;

export const plans = {
  free: {
    name: "Free",
    price: { monthly: 0, yearly: 0 },
    features: [
      "Basic agency profile",
      "Up to 5 portfolio items",
      "Receive reviews",
      "1 lead credit/month",
      "Basic analytics",
    ],
  },
  premium: {
    name: "Premium",
    price: { monthly: 49, yearly: 470 },
    features: [
      "Enhanced profile with badges",
      "Up to 20 portfolio items",
      "Priority in search results",
      "10 lead credits/month",
      "Advanced analytics",
      "Review response tools",
    ],
  },
  pro: {
    name: "Pro",
    price: { monthly: 149, yearly: 1430 },
    features: [
      "Featured listing placement",
      "Unlimited portfolio items",
      "Top search ranking boost",
      "30 lead credits/month",
      "Full analytics dashboard",
      "Custom profile branding",
      "API access",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: { monthly: 499, yearly: 4790 },
    features: [
      "Everything in Pro",
      "Dedicated account manager",
      "Custom integrations",
      "Unlimited lead credits",
      "White-label reporting",
      "Multi-location support",
      "SLA guarantee",
    ],
  },
} as const;
