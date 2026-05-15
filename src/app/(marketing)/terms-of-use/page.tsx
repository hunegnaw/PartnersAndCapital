import { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/marketing/page-hero";

export const metadata: Metadata = {
  title: "Terms of Use | Partners + Capital",
  description: "Terms of use for Partners + Capital, LLC.",
};

export default function TermsOfUsePage() {
  return (
    <>
      <PageHero title="Terms of Use" />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="prose prose-sm max-w-none text-[#5f5e5a]">
          <p className="text-xs text-[#888780] mb-8">
            Effective Date: May 14, 2026
          </p>

          <p>
            Welcome to the Partners + Capital, LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
            website and investor portal. By accessing or using our website and services, you agree
            to be bound by these Terms of Use. If you do not agree, please do not use our services.
          </p>

          <h2 className="text-lg font-semibold text-[#1a1a18] mt-10 mb-4">Acceptance of Terms</h2>
          <p>
            By accessing this website or submitting information through our forms, you acknowledge
            that you have read, understood, and agree to be bound by these Terms of Use and our{" "}
            <Link href="/privacy-policy" className="text-[#185fa5] hover:underline">
              Privacy Policy
            </Link>
            .
          </p>

          <h2 className="text-lg font-semibold text-[#1a1a18] mt-10 mb-4">Use of Services</h2>
          <p>
            Our website and investor portal are intended for use by accredited investors, their
            authorized representatives, and prospective clients. You agree to use our services
            only for lawful purposes and in accordance with these Terms.
          </p>

          <h2 className="text-lg font-semibold text-[#1a1a18] mt-10 mb-4">SMS/Text Messaging Program</h2>
          <p>
            By opting in to our SMS/text messaging program, you consent to receive text messages
            from Partners + Capital, LLC at the mobile phone number you provide. These messages
            may include:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Account verification and security codes</li>
            <li>Investment updates and notifications</li>
            <li>Service-related communications</li>
          </ul>

          <p className="mt-4">
            <strong>Message frequency varies.</strong> You may receive up to 5 messages per month.
          </p>
          <p>
            <strong>Message and data rates may apply.</strong> Please check with your mobile carrier
            for details about your text messaging plan.
          </p>

          <h3 className="text-base font-semibold text-[#1a1a18] mt-6 mb-3">Opt-Out</h3>
          <p>
            You can opt out of receiving text messages at any time by replying <strong>STOP</strong> to
            any message you receive from us. After opting out, you will receive one final confirmation
            message. Opting out of SMS does not affect other communications from us.
          </p>

          <h3 className="text-base font-semibold text-[#1a1a18] mt-6 mb-3">Help</h3>
          <p>
            For assistance, reply <strong>HELP</strong> to any message or contact us at{" "}
            <a href="mailto:theteam@partnersandcapital.com" className="text-[#185fa5] hover:underline">
              theteam@partnersandcapital.com
            </a>
            .
          </p>

          <h3 className="text-base font-semibold text-[#1a1a18] mt-6 mb-3">Supported Carriers</h3>
          <p>
            Our SMS program is supported by most major U.S. carriers. Carriers are not liable for
            delayed or undelivered messages. Service availability may vary by carrier and location.
          </p>

          <h2 className="text-lg font-semibold text-[#1a1a18] mt-10 mb-4">Accounts and Security</h2>
          <p>
            If you are provided access to the investor portal, you are responsible for maintaining
            the confidentiality of your account credentials and for all activities that occur under
            your account. You agree to notify us immediately of any unauthorized use of your account.
          </p>

          <h2 className="text-lg font-semibold text-[#1a1a18] mt-10 mb-4">Intellectual Property</h2>
          <p>
            All content on this website, including text, graphics, logos, images, and software, is
            the property of Partners + Capital, LLC or its content suppliers and is protected by
            United States and international intellectual property laws. You may not reproduce,
            distribute, modify, or create derivative works from any content without our prior
            written consent.
          </p>

          <h2 className="text-lg font-semibold text-[#1a1a18] mt-10 mb-4">Investment Disclaimer</h2>
          <p>
            The information provided on this website and through our investor portal is for
            informational purposes only and does not constitute investment advice, a solicitation,
            or an offer to buy or sell any securities. All investments carry risk, including the
            potential loss of principal. Past performance does not guarantee future results.
          </p>

          <h2 className="text-lg font-semibold text-[#1a1a18] mt-10 mb-4">Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by applicable law, Partners + Capital, LLC shall not be
            liable for any indirect, incidental, special, consequential, or punitive damages,
            including loss of profits, data, or other intangible losses, arising out of or in
            connection with your use of our services.
          </p>

          <h2 className="text-lg font-semibold text-[#1a1a18] mt-10 mb-4">Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Partners + Capital, LLC, its officers,
            directors, employees, and agents from any claims, damages, losses, or expenses arising
            from your use of our services or violation of these Terms.
          </p>

          <h2 className="text-lg font-semibold text-[#1a1a18] mt-10 mb-4">Governing Law</h2>
          <p>
            These Terms of Use shall be governed by and construed in accordance with the laws of
            the State of Maryland, without regard to its conflict of law principles. Any disputes
            arising under these Terms shall be subject to the exclusive jurisdiction of the courts
            located in the State of Maryland.
          </p>

          <h2 className="text-lg font-semibold text-[#1a1a18] mt-10 mb-4">Changes to These Terms</h2>
          <p>
            We reserve the right to modify these Terms of Use at any time. Changes will be posted
            on this page with an updated effective date. Your continued use of our services after
            changes are posted constitutes acceptance of the revised terms.
          </p>

          <h2 className="text-lg font-semibold text-[#1a1a18] mt-10 mb-4">Contact Us</h2>
          <p>
            If you have questions about these Terms of Use, please contact us:
          </p>
          <p className="mt-2">
            <strong>Partners + Capital, LLC</strong>
            <br />
            Email:{" "}
            <a href="mailto:theteam@partnersandcapital.com" className="text-[#185fa5] hover:underline">
              theteam@partnersandcapital.com
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
