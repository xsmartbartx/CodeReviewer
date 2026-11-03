import { LegalPage } from "@/components/legal";
import { operator } from "@/lib/site";

export const metadata = { title: "Privacy Policy" };
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  const { company, supportEmail } = operator();
  return (
    <LegalPage title="Privacy Policy" updated="November 3, 2026">
      <p>
        This policy explains what {company} collects when you use CodeReviewer, why, and what control you have. The
        short version: we process your code only to produce a review and we do not store it.
      </p>

      <h2>What we collect</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Why</th>
            <th>Kept</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>GitHub profile: user ID, login, name, avatar, public email</td>
            <td>Sign-in and showing who you are</td>
            <td>Until you ask us to delete it</td>
          </tr>
          <tr>
            <td>Installation details: account name, repository names, visibility</td>
            <td>Knowing which repositories to review</td>
            <td>While installed, then with review history</td>
          </tr>
          <tr>
            <td>
              Review metadata: pull request number, title, author, commit SHAs, finding counts, summary, token usage
            </td>
            <td>Dashboard, usage limits, support</td>
            <td>Up to 24 months</td>
          </tr>
          <tr>
            <td>Billing: Stripe customer and subscription IDs, plan status</td>
            <td>Charging for paid plans</td>
            <td>As required for tax and accounting</td>
          </tr>
          <tr>
            <td>Session cookie (a random token stored only as a hash)</td>
            <td>Keeping you signed in</td>
            <td>30 days</td>
          </tr>
        </tbody>
      </table>
      <p>We do not use advertising or third-party tracking cookies.</p>

      <h2>Source code</h2>
      <p>
        When a review runs, we fetch the changed files&apos; diffs and your configuration file from GitHub, send them to
        the model provider to generate the review, and post the result back to GitHub. Diffs are held in memory for the
        duration of the review and are not written to our database or logs.
      </p>

      <h2>Processors</h2>
      <ul>
        <li>
          <strong>GitHub</strong>: source of repository data and destination of reviews.
        </li>
        <li>
          <strong>Anthropic</strong>: generates reviews. By default, Anthropic does not train models on API inputs and
          outputs.
        </li>
        <li>
          <strong>Stripe</strong>: payment processing. We never see full card numbers.
        </li>
        <li>
          <strong>Our hosting and database providers</strong>: run the Service and store the data listed above.
        </li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can access, correct, export, or delete your personal data, and object to processing, by emailing{" "}
        <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. Uninstalling the GitHub App stops all further access to
        your repositories. If you are in the EEA or UK you may also complain to your data protection authority.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit. Webhooks are signature-verified, session tokens are hashed, and access to
        production systems is restricted.
      </p>

      <h2>Changes</h2>
      <p>We will post updates here and notify account owners by email of material changes.</p>
    </LegalPage>
  );
}
