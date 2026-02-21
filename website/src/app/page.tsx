import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AppStoreBadge from "@/components/AppStoreBadge";

const FAQ_ITEMS = [
  {
    q: "Is Vacation Photos free?",
    a: "Yes, Vacation Photos is completely free to download and use. There are no subscriptions, ads, or hidden fees.",
  },
  {
    q: "How does trip detection work?",
    a: "Vacation Photos uses your photos' location data and timestamps to automatically detect when you were away from home. Photos taken more than 50 miles from your home location are grouped into trips by destination and date.",
  },
  {
    q: "Does Vacation Photos upload my photos anywhere?",
    a: "No. All photo processing happens entirely on your device. Your photos, location data, and personal information never leave your iPhone.",
  },
  {
    q: "What permissions does the app need?",
    a: "Vacation Photos needs access to your photo library to scan and organize your vacation photos, and a one-time location check to determine your home location. Both permissions can be revoked anytime in Settings.",
  },
  {
    q: "Can I share trip albums with family?",
    a: "Yes! Once your photos are organized by trip, you can share entire trip albums with family and friends directly from the app.",
  },
  {
    q: "Does it work with photos from any camera?",
    a: "Vacation Photos works with any photos in your iPhone camera roll that have location metadata — whether taken with your iPhone, imported from a DSLR, or saved from messaging apps.",
  },
  {
    q: "How is this different from Apple Photos?",
    a: "Apple Photos organizes by date and broad location, but doesn't group photos into trips. Vacation Photos specifically detects vacation trips and groups all photos from each trip together, making it easy to relive and share specific vacations.",
  },
];

const FEATURES = [
  {
    icon: "🗺️",
    title: "Auto Trip Detection",
    desc: "Automatically finds photos taken away from home and groups them by trip destination.",
  },
  {
    icon: "📍",
    title: "Location Sorting",
    desc: "Photos organized by city and country so you can find that perfect Paris sunset instantly.",
  },
  {
    icon: "📅",
    title: "Timeline View",
    desc: "See your trips arranged chronologically — from your first weekend getaway to your latest adventure.",
  },
  {
    icon: "📤",
    title: "Easy Sharing",
    desc: "Share entire trip albums with family and friends. No more scrolling through thousands of photos.",
  },
  {
    icon: "🔒",
    title: "100% Private",
    desc: "All processing happens on your device. Your photos never leave your iPhone.",
  },
  {
    icon: "💰",
    title: "Completely Free",
    desc: "No subscriptions, no ads, no in-app purchases. Just a simple, useful photo organizer.",
  },
];

export default function Home() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  const appSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Vacation Photos",
    operatingSystem: "iOS",
    applicationCategory: "PhotographyApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5.0",
      ratingCount: "15",
    },
    url: "https://apps.apple.com/app/id6756803475",
    description:
      "Organize your vacation photos by trip automatically. Import from your camera roll, auto-sort by destination and date, and share trip albums.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Header />

      <main className="pt-16">
        {/* Hero */}
        <section className="py-20 md:py-32 px-4">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Your vacation photos,{" "}
                <span className="text-[var(--color-primary-light)]">
                  organized by trip
                </span>
              </h1>
              <p className="text-lg md:text-xl text-[var(--color-text-muted)] mb-8 max-w-lg">
                Stop scrolling through thousands of photos to find that one
                beach sunset. Vacation Photos auto-sorts your camera roll by
                trip, so every memory is right where you expect it.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
                <AppStoreBadge />
                <span className="text-[var(--color-text-muted)] text-sm">
                  Free on iPhone &middot; No account needed
                </span>
              </div>
              <div className="mt-6 flex items-center gap-2 justify-center md:justify-start">
                <div className="flex text-[var(--color-accent)]">
                  {"★★★★★".split("").map((s, i) => (
                    <span key={i}>{s}</span>
                  ))}
                </div>
                <span className="text-[var(--color-text-muted)] text-sm">
                  5.0 on the App Store
                </span>
              </div>
            </div>
            <div className="flex-1 flex justify-center">
              <img
                src="/images/screenshot-main.png"
                alt="Vacation Photos app showing trips organized by destination"
                className="w-[280px] md:w-[320px] rounded-3xl shadow-2xl shadow-black/40"
              />
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="py-16 px-4 bg-[var(--color-bg-card)]">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Your camera roll is a mess after every trip
            </h2>
            <p className="text-lg text-[var(--color-text-muted)] leading-relaxed">
              You come home from vacation with hundreds of photos mixed in with
              screenshots, work photos, and random saves. Finding that perfect
              shot from day three in Rome? Good luck scrolling through 10,000
              photos. Apple Photos sorts by date, but it doesn&apos;t know which
              photos are from which trip.
            </p>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
              Three steps. That&apos;s it.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Import",
                  desc: "Open the app and it scans your camera roll automatically. No manual selecting.",
                  img: "/images/screenshot-main.png",
                },
                {
                  step: "2",
                  title: "Auto-organize",
                  desc: "Photos are grouped into trips by location and date. Every vacation gets its own album.",
                  img: "/images/screenshot-trip.png",
                },
                {
                  step: "3",
                  title: "Browse & share",
                  desc: "Tap any trip to relive the memories. Share full trip albums with family in one tap.",
                  img: "/images/screenshot-photo.png",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">
                    {item.step}
                  </div>
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-[200px] rounded-2xl mx-auto mb-4 shadow-lg shadow-black/30"
                  />
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-[var(--color-text-muted)] text-sm">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-4 bg-[var(--color-bg-card)]">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
              Everything you need, nothing you don&apos;t
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="bg-[var(--color-bg)] rounded-xl p-6 border border-[var(--color-border)]"
                >
                  <div className="text-3xl mb-3">{f.icon}</div>
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Loved by travelers
            </h2>
            <div className="flex items-center justify-center gap-2 mb-12">
              <div className="flex text-[var(--color-accent)] text-2xl">
                {"★★★★★".split("").map((s, i) => (
                  <span key={i}>{s}</span>
                ))}
              </div>
              <span className="text-lg text-[var(--color-text-muted)]">
                5.0 rating on the App Store
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <blockquote className="bg-[var(--color-bg-card)] rounded-xl p-6 border border-[var(--color-border)] text-left">
                <p className="text-[var(--color-text-muted)] mb-3 italic">
                  &ldquo;Finally an app that just organizes my vacation photos
                  without trying to do a million other things. Simple and
                  works.&rdquo;
                </p>
                <cite className="text-sm text-[var(--color-text-muted)] not-italic">
                  — App Store Review
                </cite>
              </blockquote>
              <blockquote className="bg-[var(--color-bg-card)] rounded-xl p-6 border border-[var(--color-border)] text-left">
                <p className="text-[var(--color-text-muted)] mb-3 italic">
                  &ldquo;Used it after our Europe trip and had all 2,000 photos
                  sorted by city in seconds. Sharing albums with family was so
                  easy.&rdquo;
                </p>
                <cite className="text-sm text-[var(--color-text-muted)] not-italic">
                  — App Store Review
                </cite>
              </blockquote>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 px-4 bg-[var(--color-bg-card)]">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Frequently asked questions
            </h2>
            <div className="space-y-6">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.q}
                  className="group bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] overflow-hidden"
                >
                  <summary className="cursor-pointer px-6 py-4 text-lg font-medium flex items-center justify-between list-none">
                    {item.q}
                    <span className="text-[var(--color-text-muted)] group-open:rotate-45 transition-transform text-2xl">
                      +
                    </span>
                  </summary>
                  <div className="px-6 pb-4 text-[var(--color-text-muted)] leading-relaxed">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start organizing your vacation photos
          </h2>
          <p className="text-lg text-[var(--color-text-muted)] mb-8">
            Free. Private. No account required.
          </p>
          <AppStoreBadge />
        </section>
      </main>

      <Footer />
    </>
  );
}
