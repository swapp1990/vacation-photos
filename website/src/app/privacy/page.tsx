import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Vacation Photos privacy policy. All data stays on your device — no uploads, no tracking, no accounts.",
  alternates: {
    canonical: "https://vacationphotos.swapp1990.org/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="pt-24 pb-16 px-4">
        <article className="max-w-3xl mx-auto prose prose-invert">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Privacy Policy
          </h1>
          <p className="text-[var(--color-text-muted)] mb-8">
            Last Updated: December 21, 2024
          </p>

          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-3">Overview</h2>
              <p className="text-[var(--color-text-muted)] leading-relaxed">
                Vacation Photos (&ldquo;the App&rdquo;) is designed to help you
                view and organize your vacation memories. Your privacy is
                important to us. This policy explains what data the App accesses
                and how it is used.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">Data We Access</h2>
              <h3 className="text-xl font-medium mb-2 mt-4">Photo Library</h3>
              <ul className="list-disc pl-5 space-y-2 text-[var(--color-text-muted)]">
                <li>
                  The App accesses your device&apos;s photo library to identify
                  and display photos taken away from your home location.
                </li>
                <li>Photos are processed entirely on your device.</li>
                <li>
                  We do not upload, copy, or transmit your photos to any server.
                </li>
              </ul>

              <h3 className="text-xl font-medium mb-2 mt-4">Location</h3>
              <ul className="list-disc pl-5 space-y-2 text-[var(--color-text-muted)]">
                <li>
                  The App requests your current location once to determine your
                  &ldquo;home&rdquo; location.
                </li>
                <li>
                  This is used to calculate which photos were taken more than 50
                  miles from home.
                </li>
                <li>
                  Your location is stored only on your device and is never
                  transmitted externally.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">Data Storage</h2>
              <ul className="list-disc pl-5 space-y-2 text-[var(--color-text-muted)]">
                <li>
                  All data (cached photo metadata, home location) is stored
                  locally on your device.
                </li>
                <li>No data is sent to external servers.</li>
                <li>No accounts or sign-ins are required.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">Data Sharing</h2>
              <ul className="list-disc pl-5 space-y-2 text-[var(--color-text-muted)]">
                <li>We do not collect any personal information.</li>
                <li>We do not share any data with third parties.</li>
                <li>We do not use any analytics or tracking services.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">Your Rights</h2>
              <ul className="list-disc pl-5 space-y-2 text-[var(--color-text-muted)]">
                <li>
                  You can revoke photo or location permissions at any time in
                  your device Settings.
                </li>
                <li>Deleting the App removes all locally stored data.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">
                Children&apos;s Privacy
              </h2>
              <p className="text-[var(--color-text-muted)] leading-relaxed">
                This App does not knowingly collect any information from children
                under 13.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">
                Changes to This Policy
              </h2>
              <p className="text-[var(--color-text-muted)] leading-relaxed">
                We may update this Privacy Policy from time to time. Any changes
                will be reflected on this page with an updated date.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">Contact</h2>
              <p className="text-[var(--color-text-muted)] leading-relaxed">
                If you have questions about this Privacy Policy, please contact
                us at:{" "}
                <a
                  href="https://github.com/swapp1990/vacation-photos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-primary-light)] hover:underline"
                >
                  github.com/swapp1990/vacation-photos
                </a>
              </p>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
