import { Metadata } from "next";
import { PageHero } from "@/components/marketing/page-hero";

export const metadata: Metadata = {
  title: "Privacy Policy | Partners + Capital",
  description: "Privacy policy for Partners + Capital, LLC.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <PageHero title="Privacy Policy" />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="prose prose-sm max-w-none text-[#5f5e5a]">
          <p className="text-xs text-[#888780] mb-8">
            Effective Date: May 14, 2026
          </p>

          <p>
            Partners + Capital, LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects your
            privacy and is committed to protecting the personal information you share with us.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your
            information when you visit our website or use our services.
          </p>

          <h2 className="text-lg font-semibold text-[#1a1a18] mt-10 mb-4">Information We Collect</h2>
          <p>We may collect the following types of information:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Personal Information:</strong> Name, email address, phone number, and other
              contact details you provide through forms on our website.
            </li>
            <li>
              <strong>Account Information:</strong> Login credentials and profile information for
              investor portal users.
            </li>
            <li>
              <strong>Financial Information:</strong> Investment data, portfolio information, and
              related financial documents accessible through our investor portal.
            </li>
            <li>
              <strong>Usage Data:</strong> Information about how you interact with our website,
              including IP address, browser type, pages visited, and time spent on pages.
            </li>
          </ul>

          <h2 className="text-lg font-semibold text-[#1a1a18] mt-10 mb-4">How We Use Your Information</h2>
          <p>We use collected information to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Provide, operate, and maintain our services and investor portal</li>
            <li>Process access requests and communicate with prospective clients</li>
            <li>Send transactional communications related to your account and investments</li>
            <li>Send SMS messages if you have opted in (see SMS/Text Messaging below)</li>
            <li>Improve and personalize your experience</li>
            <li>Comply with legal obligations and protect our rights</li>
          </ul>

          <h2 className="text-lg font-semibold text-[#1a1a18] mt-10 mb-4">SMS/Text Messaging</h2>
          <p>
            If you opt in to receive SMS/text messages from Partners + Capital, LLC, the following
            terms apply:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              We may send you text messages regarding your account, investment updates,
              verification codes, and other service-related communications.
            </li>
            <li>
              <strong>Message frequency varies.</strong> You may receive up to 5 messages per month.
            </li>
            <li>
              <strong>Message and data rates may apply.</strong> Please contact your wireless
              carrier for details about your messaging plan.
            </li>
            <li>
              <strong>We do not share your mobile number or any personal information collected
              through our SMS program with third parties or affiliates for marketing or
              promotional purposes.</strong>
            </li>
            <li>
              To opt out of SMS messages, reply <strong>STOP</strong> to any message. After
              opting out, you will receive one final confirmation message.
            </li>
            <li>
              For help, reply <strong>HELP</strong> to any message or email us at{" "}
              <a href="mailto:theteam@partnersandcapital.com" className="text-[#185fa5] hover:underline">
                theteam@partnersandcapital.com
              </a>.
            </li>
            <li>
              Carriers are not liable for delayed or undelivered messages.
            </li>
          </ul>

          <h2 className="text-lg font-semibold text-[#1a1a18] mt-10 mb-4">Cookies and Tracking</h2>
          <p>
            We use cookies and similar tracking technologies to enhance your browsing experience,
            analyze site traffic, and understand where our visitors are coming from. You can
            control cookie preferences through your browser settings.
          </p>

          <h2 className="text-lg font-semibold text-[#1a1a18] mt-10 mb-4">Data Sharing and Disclosure</h2>
          <p>
            We do not sell your personal information. We may share your information with:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Service Providers:</strong> Third-party vendors who assist us in operating
              our website and services (e.g., email delivery, hosting, analytics).
            </li>
            <li>
              <strong>Legal Requirements:</strong> When required by law, regulation, or legal
              process.
            </li>
            <li>
              <strong>Business Transfers:</strong> In connection with a merger, acquisition, or
              sale of assets.
            </li>
          </ul>

          <h2 className="text-lg font-semibold text-[#1a1a18] mt-10 mb-4">Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your personal information,
            including encryption of sensitive data, secure authentication, and access controls.
            However, no method of electronic storage or transmission is 100% secure.
          </p>

          <h2 className="text-lg font-semibold text-[#1a1a18] mt-10 mb-4">Data Retention</h2>
          <p>
            We retain your personal information for as long as necessary to fulfill the purposes
            outlined in this policy, unless a longer retention period is required by law.
          </p>

          <h2 className="text-lg font-semibold text-[#1a1a18] mt-10 mb-4">Your Rights</h2>
          <p>
            Depending on your jurisdiction, you may have the right to access, correct, delete, or
            restrict the processing of your personal information. To exercise these rights, please
            contact us at{" "}
            <a href="mailto:theteam@partnersandcapital.com" className="text-[#185fa5] hover:underline">
              theteam@partnersandcapital.com
            </a>.
          </p>

          <h2 className="text-lg font-semibold text-[#1a1a18] mt-10 mb-4">Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted on this
            page with an updated effective date. Your continued use of our services after changes
            are posted constitutes acceptance of the revised policy.
          </p>

          <h2 className="text-lg font-semibold text-[#1a1a18] mt-10 mb-4">Contact Us</h2>
          <p>
            If you have questions or concerns about this Privacy Policy, please contact us:
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
