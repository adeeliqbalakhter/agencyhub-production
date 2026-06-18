import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us - AgencyHub",
  description:
    "Get in touch with AgencyHub for questions about finding or listing marketing agencies. We're here to help you connect with the best agencies worldwide.",
  openGraph: {
    title: "Contact Us - AgencyHub",
    description:
      "Get in touch with AgencyHub for support, partnerships, or questions about marketing agency listings.",
  },
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
