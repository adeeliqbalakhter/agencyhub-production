import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "AgencyHub terms of service — rules and guidelines for using our platform.",
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-navy mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: January 1, 2025</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-navy">1. Acceptance of Terms</h2>
          <p className="text-gray-600 mt-2">
            By accessing and using AgencyHub, you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use our platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">2. User Accounts</h2>
          <p className="text-gray-600 mt-2">
            You are responsible for maintaining the security of your account credentials.
            You must provide accurate and complete information when creating an account.
            One person or entity may not maintain multiple accounts.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">3. Agency Listings</h2>
          <p className="text-gray-600 mt-2">
            Agencies must provide truthful and accurate information in their profiles.
            Misleading claims about services, experience, or capabilities are prohibited.
            We reserve the right to remove or suspend listings that violate these guidelines.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">4. Reviews</h2>
          <p className="text-gray-600 mt-2">
            Reviews must be based on genuine business relationships.
            Fake, incentivized, or defamatory reviews are prohibited.
            We moderate all reviews and reserve the right to remove those that violate our guidelines.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">5. Lead Generation</h2>
          <p className="text-gray-600 mt-2">
            Businesses submitting project requests consent to being contacted by matched agencies.
            Agencies agree to respond to leads professionally and in a timely manner.
            Lead credits are non-refundable once a lead has been viewed.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">6. Payments & Subscriptions</h2>
          <p className="text-gray-600 mt-2">
            Paid subscriptions are billed according to the selected plan and billing cycle.
            Refunds are available within 14 days of purchase under our money-back guarantee.
            We reserve the right to modify pricing with 30 days advance notice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">7. Prohibited Conduct</h2>
          <ul className="list-disc pl-5 text-gray-600 mt-2 space-y-1">
            <li>Scraping or automated data collection without permission</li>
            <li>Spamming agencies or users through our platform</li>
            <li>Attempting to manipulate search rankings or reviews</li>
            <li>Using the platform for illegal purposes</li>
            <li>Impersonating other users or agencies</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">8. Limitation of Liability</h2>
          <p className="text-gray-600 mt-2">
            AgencyHub is a directory and matchmaking platform. We do not guarantee the quality
            of services provided by listed agencies. Contracts and agreements between businesses
            and agencies are solely between those parties.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">9. Contact</h2>
          <p className="text-gray-600 mt-2">
            For questions about these Terms, contact us at legal@agencyhub.com.
          </p>
        </section>
      </div>
    </div>
  );
}
