import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Breadcrumbs from "@/components/Breadcrumbs";
import { OG_IMAGE, pageUrl } from "@/lib/site";

const DESCRIPTION =
  "How the Vacation Photos app and website handle your data: what stays on your iPhone, what is uploaded when you share a trip, and the analytics this website uses.";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: DESCRIPTION,
  alternates: {
    canonical: pageUrl("/privacy"),
  },
  openGraph: {
    images: [{ url: OG_IMAGE.url, width: OG_IMAGE.width, height: OG_IMAGE.height }],
  },
  twitter: {
    images: [OG_IMAGE.url],
  },
};

const linkClass =
  "text-[var(--color-primary-light)] hover:underline";

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="pt-24 pb-16 px-4">
        <article className="max-w-3xl mx-auto prose prose-invert">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Privacy Policy", href: "/privacy" },
            ]}
          />
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Privacy Policy
          </h1>
          <p className="text-[var(--color-text-muted)] mb-8">
            Effective date: 2026-10-09
          </p>

          <section className="space-y-6">
            <p className="text-[var(--color-text-muted)] leading-relaxed">
              This policy explains what the Vacation Photos iPhone app and the
              Vacation Photos website do with your data. We keep it short and
              plain.
            </p>

            <div>
              <h2 className="text-2xl font-semibold mb-3">
                What stays on your device
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-[var(--color-text-muted)]">
                <li>
                  The app reads your photo library to find photos taken away
                  from home and group them into trips.
                </li>
                <li>
                  It uses the date and location stored in each photo. This
                  sorting happens on your iPhone.
                </li>
                <li>
                  Your home location, your trip list, your edits and your
                  display name are stored only on your iPhone.
                </li>
                <li>
                  The app finds faces in photos on your iPhone to choose good
                  cover photos. Your photos are not sent anywhere for this.
                </li>
                <li>
                  If you share a trip, the app shows your contacts so you can
                  pick who to send it to. Your contacts are read on your iPhone
                  and are never uploaded.
                </li>
                <li>
                  When you pick a contact, the app opens WhatsApp or Messages
                  with that person&apos;s number and the share message. What
                  happens next is handled by WhatsApp or Apple.
                </li>
                <li>There are no accounts or sign-ins.</li>
                <li>
                  Deleting the app removes the data stored on your iPhone. It
                  does not remove trips you have already shared (see
                  &quot;Deleting shared trips&quot;).
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">
                Place names and searches
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-[var(--color-text-muted)]">
                <li>
                  To turn a photo&apos;s location into a place name (like
                  &quot;Lisbon, Portugal&quot;), the app uses Apple&apos;s
                  location service. This sends the photo&apos;s coordinates to
                  Apple.
                </li>
                <li>
                  If you tap &quot;use current location&quot; to set your home,
                  the app reads your current location once and asks Apple for
                  its place name.
                </li>
                <li>
                  If you type a place name to search (for example, to set your
                  home or fix a trip&apos;s location), the text you type is sent
                  to OpenStreetMap&apos;s Nominatim service to find matching
                  places.
                </li>
                <li>
                  We do not store these searches or coordinates on our own
                  servers.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">
                What is uploaded, and only when you choose to share a trip
              </h2>
              <p className="text-[var(--color-text-muted)] leading-relaxed mb-4">
                Nothing from your photo library is uploaded unless you tap Share
                on a trip. Sharing needs an iCloud account.
              </p>
              <p className="text-[var(--color-text-muted)] leading-relaxed mb-4">
                When you share a trip, the app uploads the following to our
                app&apos;s storage in Apple iCloud:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[var(--color-text-muted)] mb-4">
                <li>
                  Up to 50 photos from that trip. The app makes them smaller
                  (2048 pixels wide) and saves them as new JPEG files.
                </li>
                <li>
                  The trip&apos;s place name (city, region, country), its start
                  and end dates, and the number of photos.
                </li>
                <li>
                  The display name you type for sharing (for example
                  &quot;Sam&quot;).
                </li>
              </ul>
              <p className="text-[var(--color-text-muted)] leading-relaxed mb-4">
                The app does not upload the exact GPS coordinates of your photos
                as separate data. The shared photos are new copies made by the
                app.
              </p>
              <p className="text-[var(--color-text-muted)] leading-relaxed mb-3">
                <strong className="text-[var(--color-text)]">
                  Who can see a shared trip:
                </strong>
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[var(--color-text-muted)]">
                <li>
                  Anyone who has the share link can see the trip. Treat the link
                  like the photos themselves: anyone you forward it to can open
                  it.
                </li>
                <li>
                  The link itself contains the trip&apos;s place name.
                </li>
                <li>
                  People who open your link can view the photos and save them to
                  their own phone.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">Analytics</h2>
              <p className="text-[var(--color-text-muted)] leading-relaxed mb-3">
                <strong className="text-[var(--color-text)]">
                  In the app (version 1.1.7):
                </strong>
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[var(--color-text-muted)] mb-4">
                <li>We do not run our own analytics in the app.</li>
                <li>
                  The app does not use advertising identifiers and does not
                  track you across other companies&apos; apps or websites.
                </li>
                <li>
                  The app uses Google&apos;s ML Kit to detect faces on your
                  device. Google says ML Kit does not send your photos or the
                  results to Google. It does send Google technical data about
                  how ML Kit performs, such as:
                  <ul className="list-disc pl-5 space-y-2 mt-2">
                    <li>device model and operating system version</li>
                    <li>app version</li>
                    <li>a random identifier for your app installation</li>
                    <li>timing and error codes</li>
                  </ul>
                  Google uses this to maintain ML Kit.
                </li>
              </ul>
              <p className="text-[var(--color-text-muted)] leading-relaxed mb-3">
                <strong className="text-[var(--color-text)]">
                  On this website and our other Vacation Photos web pages,
                </strong>{" "}
                we use two analytics tools:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[var(--color-text-muted)] mb-4">
                <li>
                  <strong className="text-[var(--color-text)]">
                    Google Analytics 4
                  </strong>{" "}
                  (by Google). It uses cookies. It collects information such as
                  the pages you view, your browser and device type, an
                  approximate location based on your IP address, and how you
                  arrived. We look at summary reports from it, such as total
                  page views, top pages and traffic sources.
                </li>
                <li>
                  <strong className="text-[var(--color-text)]">
                    SwapAnalytics
                  </strong>, our own analytics service. The first time you visit, it
                  saves a random ID in your browser&apos;s local storage. This
                  is not a cookie. Each time you open a page, it sends us a
                  record containing:
                  <ul className="list-disc pl-5 space-y-2 mt-2">
                    <li>
                      the page address, including anything after &quot;?&quot;
                      in the link
                    </li>
                    <li>the page you came from</li>
                    <li>any campaign (UTM) tags in the link</li>
                    <li>the random ID</li>
                    <li>whether the page was on our live site</li>
                  </ul>
                  Our server adds the time it was received. The record itself
                  does not include your name, email address, IP address or
                  browser details (see the server logs below, which do). These
                  SwapAnalytics page-view records are deleted automatically 90
                  days after they are received.
                </li>
              </ul>
              <p className="text-[var(--color-text-muted)] leading-relaxed mb-4">
                Like any website, the servers that run this website and our
                analytics service receive your IP address and browser details
                when you connect. They keep server logs for security and
                troubleshooting. Each log line contains your full IP address,
                the time, the page or address requested (including anything
                after &quot;?&quot;), the page you came from, and your
                browser&apos;s user-agent text. These logs are kept for about
                two weeks and then deleted.
              </p>
              <p className="text-[var(--color-text-muted)] leading-relaxed mb-4">
                We also keep daily summary totals imported from Google Analytics
                and Google Search Console (for example, total page views per
                day). These totals do not identify individual visitors and are
                kept without an expiry date.
              </p>
              <p className="text-[var(--color-text-muted)] leading-relaxed mb-4">
                You can block or clear cookies and local storage in your browser
                settings. Clearing local storage also resets the SwapAnalytics
                random ID. You can also use Google&apos;s opt-out browser add-on
                for Google Analytics.
              </p>
              <p className="text-[var(--color-text-muted)] leading-relaxed">
                We do not sell your data. We do not show ads, and we do not use
                your data for advertising.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">
                Third parties and service providers
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-[var(--color-text-muted)]">
                <li>
                  <strong className="text-[var(--color-text)]">Apple:</strong>{" "}
                  stores shared trips (iCloud) and turns coordinates into place
                  names. Apple&apos;s privacy policy applies.
                </li>
                <li>
                  <strong className="text-[var(--color-text)]">
                    OpenStreetMap Foundation (Nominatim):
                  </strong>{" "}
                  receives place names you type into search. The OpenStreetMap
                  Foundation&apos;s privacy policy applies.
                </li>
                <li>
                  <strong className="text-[var(--color-text)]">Google:</strong>{" "}
                  receives ML Kit technical data from the app, and Google
                  Analytics data from our website. Google&apos;s privacy policy
                  applies.
                </li>
                <li>
                  <strong className="text-[var(--color-text)]">
                    WhatsApp / Apple Messages:
                  </strong>{" "}
                  receive the message you choose to send.
                </li>
                <li>
                  <strong className="text-[var(--color-text)]">
                    Hosting providers:
                  </strong>{" "}
                  our website and our analytics service run on a server we rent
                  from DigitalOcean. Our SwapAnalytics records are stored in a
                  managed MongoDB Atlas database. We do not give our analytics
                  records to other companies for their own use.
                </li>
                <li>
                  <strong className="text-[var(--color-text)]">GitHub:</strong>{" "}
                  our support page links to GitHub Issues, and anything you post
                  there is public. Please do not post share links or personal
                  details there. Email us instead (see &quot;Contact&quot;).
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">
                Deleting shared trips
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-[var(--color-text-muted)]">
                <li>
                  The app does not yet have a button to delete a shared trip.
                  Shared trips stay stored until we delete them.
                </li>
                <li>
                  To have a trip you shared deleted, email{" "}
                  <a href="mailto:swapp19902@gmail.com" className={linkClass}>
                    swapp19902@gmail.com
                  </a>{" "}
                  with the share link (or the trip&apos;s place name and dates,
                  and the name you shared it under). We will delete the trip and
                  its photos from our iCloud storage within 14 days.
                </li>
                <li>
                  We cannot remove photos that someone has already saved to
                  their own phone.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">Children</h2>
              <p className="text-[var(--color-text-muted)] leading-relaxed">
                The app is not directed at children under 13, and we do not
                knowingly collect their personal information.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">Changes</h2>
              <p className="text-[var(--color-text-muted)] leading-relaxed">
                If this policy changes, we will update this page and the
                effective date.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-3">Contact</h2>
              <p className="text-[var(--color-text-muted)] leading-relaxed mb-4">
                For privacy questions and deletion requests, email{" "}
                <a href="mailto:swapp19902@gmail.com" className={linkClass}>
                  swapp19902@gmail.com
                </a>.
              </p>
              <p className="text-[var(--color-text-muted)] leading-relaxed">
                For general help, you can also use our support page at{" "}
                <Link href="/support" className={linkClass}>
                  https://vacationphotos.swapp1990.org/support
                </Link>. Posts there are public.
              </p>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
