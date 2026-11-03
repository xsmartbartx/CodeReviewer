import Link from "next/link";
import { LegalPage } from "@/components/legal";
import { operator } from "@/lib/site";

export const metadata = { title: "Terms of Service" };
export const dynamic = "force-dynamic";

export default function TermsPage() {
  const { company, supportEmail } = operator();
  return (
    <LegalPage title="Terms of Service" updated="November 3, 2026">
      <p>
        These terms govern your use of CodeReviewer (the &quot;Service&quot;), operated by {company} (&quot;we&quot;,
        &quot;us&quot;). By installing the GitHub App or signing in, you agree to them on behalf of yourself and the
        account or organization you install it on.
      </p>

      <h2>1. The Service</h2>
      <p>
        The Service reviews pull requests in GitHub repositories you authorize and posts comments, reviews, and check
        results to those pull requests. Reviews are generated automatically by a large language model. They can be wrong
        or incomplete and do not replace human review, testing, or security assessment.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You sign in with GitHub. You must have authority to install the GitHub App on the accounts and repositories you
        choose, and you are responsible for activity under your installation.
      </p>

      <h2>3. Plans, payment, and cancellation</h2>
      <ul>
        <li>Paid plans are billed monthly in advance through Stripe and renew automatically until cancelled.</li>
        <li>
          You can change or cancel your plan from the billing page. Cancellation takes effect at the end of the current
          period.
        </li>
        <li>Quotas reset on the first day of each calendar month (UTC). Unused reviews do not roll over.</li>
        <li>Fees are non-refundable except where required by law. Prices may change with 30 days&apos; notice.</li>
        <li>Taxes are your responsibility unless we collect them at checkout.</li>
      </ul>

      <h2>4. Your content</h2>
      <p>
        You keep all rights to your code. You grant us a limited licence to access and process the repository content
        needed to provide each review, as described in the <Link href="/privacy">Privacy Policy</Link>. We do not claim
        ownership of review output generated for you.
      </p>

      <h2>5. Acceptable use</h2>
      <p>
        Do not use the Service to break the law, to infringe others&apos; rights, to probe or disrupt our systems, to
        resell it without permission, or in violation of GitHub&apos;s or Anthropic&apos;s usage policies.
      </p>

      <h2>6. Availability and changes</h2>
      <p>
        We aim for high availability but do not guarantee uninterrupted service. We may change features, and will give
        reasonable notice of changes that materially reduce a paid plan.
      </p>

      <h2>7. Disclaimer and limitation of liability</h2>
      <p>
        The Service is provided &quot;as is&quot; without warranties of any kind. To the extent permitted by law, we are
        not liable for indirect, incidental, or consequential damages, or for defects in code that was or was not
        flagged. Our total liability is limited to the amount you paid us in the 12 months before the claim.
      </p>

      <h2>8. Termination</h2>
      <p>
        You can stop using the Service at any time by uninstalling the GitHub App. We may suspend accounts that violate
        these terms or fail to pay.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
      </p>
    </LegalPage>
  );
}
