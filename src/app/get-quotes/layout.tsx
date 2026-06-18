import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Free Quotes from Top Marketing Agencies",
  description:
    "Tell us about your project and receive free, no-obligation quotes from vetted marketing agencies. Compare proposals and find the perfect agency match.",
};

export default function GetQuotesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
