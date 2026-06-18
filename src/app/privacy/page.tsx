import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "AgencyHub privacy policy — how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-navy mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: January 1, 2025</p>

      <div className="prose prose-gray max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-navy">1. Information We Collect</h2>
          <p className="text-gray-600 mt-2">
            We collect information you provide directly, including your name, email address,
            company name, and any other information you submit through forms on our platform.
            We also collect usage data automatically, such as IP addresses, browser type,
            pages visited, and interaction patterns.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">2. How We Use Your Information</h2>
          <ul className="list-disc pl-5 text-gray-600 mt-2 space-y-1">
            <li>To provide and maintain our platform services</li>
            <li>To match businesses with relevant marketing agencies</li>
            <li>To process agency listings and review submissions</li>
            <li>To send relevant notifications and communications</li>
            <li>To improve our platform and user experience</li>
            <li>To prevent fraud and ensure platform security</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">3. Information Sharing</h2>
          <p className="text-gray-600 mt-2">
            We share your project details with agencies you request quotes from.
            Reviews and public profile information are visible to all users.
            We do not sell your personal information to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">4. Data Security</h2>
          <p className="text-gray-600 mt-2">
            We implement industry-standard security measures to protect your data,
            including encryption in transit and at rest, secure authentication,
            and regular security audits.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">5. Your Rights</h2>
          <p className="text-gray-600 mt-2">
            You have the right to access, correct, or delete your personal data.
            You can manage your notification preferences from your account settings.
            To request data deletion, contact us at privacy@agencyhub.com.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">6. Cookies</h2>
          <p className="text-gray-600 mt-2">
            We use essential cookies for authentication and session management.
            Analytics cookies help us understand usage patterns.
            You can manage cookie preferences through your browser settings.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-navy">7. Contact Us</h2>
          <p className="text-gray-600 mt-2">
            For privacy-related questions or requests, email us at
            privacy@agencyhub.com or use our contact form.
          </p>
        </section>
      </div>
    </div>
  );
}
