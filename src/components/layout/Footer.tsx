import Link from "next/link";

const footerLinks = {
  forBusinesses: {
    title: "For Businesses",
    links: [
      { name: "Find Agencies", href: "/agencies" },
      { name: "Get Quotes", href: "/get-quotes" },
      { name: "Compare Agencies", href: "/compare" },
      { name: "How It Works", href: "/how-it-works" },
      { name: "Agency Reviews", href: "/reviews" },
    ],
  },
  forAgencies: {
    title: "For Agencies",
    links: [
      { name: "List Your Agency", href: "/auth/signup" },
      { name: "Pricing", href: "/pricing" },
      { name: "Agency Dashboard", href: "/dashboard" },
      { name: "Success Stories", href: "/success-stories" },
    ],
  },
  services: {
    title: "Popular Services",
    links: [
      { name: "SEO Agencies", href: "/seo-agencies" },
      { name: "PPC Agencies", href: "/ppc-agencies" },
      { name: "Social Media Agencies", href: "/social-media-agencies" },
      { name: "Web Design Agencies", href: "/web-design-agencies" },
      { name: "Content Marketing", href: "/content-marketing-agencies" },
      { name: "Digital Marketing", href: "/digital-marketing-agencies" },
    ],
  },
  company: {
    title: "Company",
    links: [
      { name: "About Us", href: "/about" },
      { name: "Blog", href: "/blog" },
      { name: "Contact", href: "/contact" },
      { name: "Careers", href: "/careers" },
      { name: "Privacy Policy", href: "/privacy" },
      { name: "Terms of Service", href: "/terms" },
    ],
  },
};

export function Footer() {
  return (
    <footer className="bg-navy text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h3 className="text-white font-semibold text-sm mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-700 mt-10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">AH</span>
            </div>
            <span className="text-white font-bold">AgencyHub</span>
          </div>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} AgencyHub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
