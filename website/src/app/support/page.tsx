import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Get help with Vacation Photos. Report bugs, request features, or ask questions.",
  alternates: {
    canonical: "https://vacationphotos.swapp1990.org/support",
  },
};

export default function SupportPage() {
  return (
    <>
      <Header />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Support</h1>
          <p className="text-lg text-[var(--color-text-muted)] mb-12">
            Need help with Vacation Photos? We&apos;re here for you.
          </p>

          <div className="space-y-8">
            <div className="bg-[var(--color-bg-card)] rounded-xl p-6 border border-[var(--color-border)]">
              <h2 className="text-xl font-semibold mb-3">Report a Bug</h2>
              <p className="text-[var(--color-text-muted)] mb-4">
                Found something that doesn&apos;t work right? Open an issue on
                GitHub and we&apos;ll look into it.
              </p>
              <a
                href="https://github.com/swapp1990/vacation-photos/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[var(--color-primary-light)] transition-colors"
              >
                Open an Issue on GitHub
              </a>
            </div>

            <div className="bg-[var(--color-bg-card)] rounded-xl p-6 border border-[var(--color-border)]">
              <h2 className="text-xl font-semibold mb-3">
                Request a Feature
              </h2>
              <p className="text-[var(--color-text-muted)] mb-4">
                Have an idea to make Vacation Photos better? We&apos;d love to
                hear it.
              </p>
              <a
                href="https://github.com/swapp1990/vacation-photos/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-[var(--color-bg)] text-white px-5 py-2.5 rounded-lg font-medium border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors"
              >
                Suggest a Feature
              </a>
            </div>

            <div className="bg-[var(--color-bg-card)] rounded-xl p-6 border border-[var(--color-border)]">
              <h2 className="text-xl font-semibold mb-3">
                Frequently Asked Questions
              </h2>
              <ul className="space-y-4 text-[var(--color-text-muted)]">
                <li>
                  <strong className="text-[var(--color-text)]">
                    My photos aren&apos;t showing up.
                  </strong>
                  <br />
                  Make sure you&apos;ve granted photo library access in Settings
                  &gt; Privacy &gt; Photos &gt; Vacation Photos. The app only
                  shows photos taken 50+ miles from your home location.
                </li>
                <li>
                  <strong className="text-[var(--color-text)]">
                    How do I change my home location?
                  </strong>
                  <br />
                  Open the app, go to Settings, and tap &ldquo;Reset Home
                  Location.&rdquo; The app will use your current GPS location as
                  the new home.
                </li>
                <li>
                  <strong className="text-[var(--color-text)]">
                    Does the app work offline?
                  </strong>
                  <br />
                  Yes! All processing happens on your device. No internet
                  connection is needed after the initial download.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
