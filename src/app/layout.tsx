import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import SessionProvider from "@/components/providers/SessionProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AgencyHub - Find & Hire the Best Marketing Agencies Worldwide",
    template: "%s | AgencyHub",
  },
  description:
    "Discover top-rated marketing agencies worldwide. Compare reviews, portfolios, and pricing. Get free quotes from SEO, PPC, social media, and web design agencies.",
  keywords: [
    "marketing agencies",
    "digital marketing agency",
    "SEO agency",
    "PPC agency",
    "web design agency",
    "agency directory",
    "find marketing agency",
    "agency reviews",
  ],
  authors: [{ name: "AgencyHub" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "AgencyHub",
    title: "AgencyHub - Find & Hire the Best Marketing Agencies Worldwide",
    description:
      "Discover top-rated marketing agencies worldwide. Compare reviews, portfolios, and pricing.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgencyHub - Find & Hire the Best Marketing Agencies Worldwide",
    description:
      "Discover top-rated marketing agencies worldwide. Compare reviews, portfolios, and pricing.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} h-full`}>
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
