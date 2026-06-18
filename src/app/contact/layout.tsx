import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with AgencyHub. We're here to help you find the right marketing agency for your business.",
  openGraph: {
    title: "Contact Us | AgencyHub",
    description:
      "Get in touch with AgencyHub. We're here to help you find the right marketing agency for your business.",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
