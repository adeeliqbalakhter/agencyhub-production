import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Free Quotes from Top Marketing Agencies - AgencyHub",
  description:
    "Submit your project requirements and get free quotes from top-rated marketing agencies. Compare pricing, services, and expertise from SEO, PPC, social media, and web design agencies.",
  openGraph: {
    title: "Get Free Quotes from Marketing Agencies",
    description:
      "Tell us about your project and receive proposals from qualified marketing agencies. Free, fast, and easy.",
  },
  alternates: {
    canonical: "/get-quotes",
  },
};

export default function GetQuotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
