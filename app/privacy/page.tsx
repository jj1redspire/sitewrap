import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <Link href="/" className="text-sm text-[#EA580C] font-semibold hover:underline mb-8 inline-block">
          &larr; Back to SiteWrap
        </Link>

        <h1 className="text-4xl font-extrabold text-[#1C1917] mb-2">Privacy Policy</h1>
        <p className="text-stone-500 text-sm mb-10">Last updated: April 17, 2026</p>

        <div className="prose prose-stone max-w-none space-y-8 text-stone-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-[#1C1917] mb-3">1. Overview</h2>
            <p>
              Ashward Group LLC (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates SiteWrap at sitewrap.co. This
              Privacy Policy explains how we collect, use, and protect information when you use our Service. By using SiteWrap,
              you agree to the practices described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1917] mb-3">2. Information We Collect</h2>
            <p>We collect the following categories of information:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <strong>Account Information:</strong> Name, email address, and password when you create an account.
              </li>
              <li>
                <strong>Project Data:</strong> Project names, addresses, punch list items, change order details, cost information,
                and completion statuses that you enter or generate through the Service.
              </li>
              <li>
                <strong>Voice Recordings and Transcripts:</strong> Audio recordings you capture during site walkthroughs, and the
                text transcripts produced from those recordings. Audio is processed in real time and is not stored permanently.
              </li>
              <li>
                <strong>Photos:</strong> Images you attach to punch list items or change orders.
              </li>
              <li>
                <strong>Signature Data:</strong> Digital signature images and timestamps collected when homeowners or clients
                sign documents through the Service.
              </li>
              <li>
                <strong>Usage Data:</strong> Information about how you interact with the Service, including pages visited,
                features used, and timestamps, collected automatically via server logs and analytics.
              </li>
              <li>
                <strong>Payment Information:</strong> Billing details are handled directly by Stripe and are not stored on our
                servers. We receive only transaction confirmation and a payment method summary (e.g., last four digits).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1917] mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>To provide, operate, and improve the Service</li>
              <li>To process voice recordings into structured punch lists and change orders via AI (see Section 4)</li>
              <li>To generate and store project documents accessible to you and those you share them with</li>
              <li>To send transactional emails related to your account and documents</li>
              <li>To process subscription payments through Stripe</li>
              <li>To respond to support requests and communicate with you about the Service</li>
              <li>To detect and prevent fraud, abuse, or violations of our Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1917] mb-3">4. AI Processing</h2>
            <p>
              SiteWrap uses artificial intelligence to convert voice recordings into structured documents. Specifically:
            </p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <strong>OpenAI Whisper:</strong> Voice audio is sent to OpenAI&rsquo;s Whisper API for transcription. Audio is
                transmitted securely and is subject to{" "}
                <a href="https://openai.com/policies/privacy-policy" className="text-[#EA580C] hover:underline" target="_blank" rel="noopener noreferrer">
                  OpenAI&rsquo;s Privacy Policy
                </a>.
              </li>
              <li>
                <strong>Anthropic Claude:</strong> Transcribed text is sent to Anthropic&rsquo;s Claude API to structure and
                format punch list items and change orders. Text data is subject to{" "}
                <a href="https://www.anthropic.com/legal/privacy" className="text-[#EA580C] hover:underline" target="_blank" rel="noopener noreferrer">
                  Anthropic&rsquo;s Privacy Policy
                </a>.
              </li>
            </ul>
            <p className="mt-3">
              We do not use your project data or voice recordings to train AI models. We transmit only the minimum data
              necessary for AI processing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1917] mb-3">5. Third-Party Services</h2>
            <p>We use the following third-party service providers to operate SiteWrap:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>
                <strong>Supabase:</strong> Database storage and user authentication. Your project data, account information,
                and documents are stored in Supabase-hosted PostgreSQL databases.
              </li>
              <li>
                <strong>Stripe:</strong> Payment processing for subscriptions. We do not store your full payment card details.
              </li>
              <li>
                <strong>OpenAI:</strong> Voice transcription via the Whisper API.
              </li>
              <li>
                <strong>Anthropic:</strong> AI-powered document structuring via the Claude API.
              </li>
              <li>
                <strong>Resend:</strong> Transactional email delivery (account confirmations, document sharing, notifications).
              </li>
            </ul>
            <p className="mt-3">
              Each of these providers operates under their own privacy policies and data processing agreements. We encourage
              you to review their policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1917] mb-3">6. Data Retention</h2>
            <p>
              We retain your account data and project documents for as long as your account is active. If you cancel your
              subscription, your data remains accessible for 30 days, after which it may be permanently deleted. You may
              request deletion of your data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1917] mb-3">7. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your information, including encrypted data transmission
              (TLS), database-level access controls, and row-level security policies that restrict data access to authorized
              account holders. No method of transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1917] mb-3">8. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 mt-3 space-y-2">
              <li>Access the personal information we hold about you</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Request deletion of your account and associated data</li>
              <li>Export your project data in a portable format</li>
              <li>Opt out of non-essential communications</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:joel@ashwardgroup.com" className="text-[#EA580C] hover:underline">
                joel@ashwardgroup.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1917] mb-3">9. Cookies</h2>
            <p>
              SiteWrap uses essential cookies and local storage to maintain your authenticated session. We do not use
              third-party advertising cookies or tracking pixels.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1917] mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated
              policy on this page with a revised effective date. Your continued use of the Service after any changes constitutes
              acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#1C1917] mb-3">11. Contact</h2>
            <p>
              For questions or concerns about this Privacy Policy, contact us at:{" "}
              <a href="mailto:joel@ashwardgroup.com" className="text-[#EA580C] hover:underline">
                joel@ashwardgroup.com
              </a>
            </p>
            <p className="mt-2">
              Ashward Group LLC<br />
              Oregon, United States
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
