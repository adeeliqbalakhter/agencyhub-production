import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Agencies",
  description:
    "Compare marketing agencies side by side. Evaluate ratings, pricing, services, and more to find the best fit for your business.",
  openGraph: {
    title: "Compare Agencies | AgencyHub",
    description:
      "Compare marketing agencies side by side. Evaluate ratings, pricing, services, and more to find the best fit for your business.",
  },
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
