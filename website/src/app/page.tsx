import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AppStoreBadge from "@/components/AppStoreBadge";
import Picture from "@/components/Picture";
import {
  APP_STORE_URL,
  HOME_CANONICAL,
  HOME_DESCRIPTION,
  OG_IMAGE,
  SITE_URL,
} from "@/lib/site";

const FAQ_ITEMS = [
  {
    q: "Is Vacation Photos free?",
    a: "Yes. Vacation Photos is free on the App Store. The current version has no ads, no in-app purchases and no account.",
  },
  {
    q: "How does trip detection work?",
    a: "The app reads the location and date of each photo. Photos taken more than 50 miles from your home location are grouped into trips by place and date.",
  },
  {
    q: "Does Vacation Photos upload my photos?",
    a: "Not to organize them: trip detection and sorting run on your iPhone. Photos are uploaded only if you choose to share a trip. The photos in that trip are resized and stored in Apple iCloud so the people you send the link to can see them.",
  },
  {
    q: "What permissions does the app need?",
    a: "Access to your photo library to find your trip photos, and a one-time location check to set your home location. You can turn either off in Settings at any time.",
  },
  {
    q: "Can I share a trip with family?",
    a: "Yes. Share a trip with a link, and the people you send it to can view it without installing the app.",
  },
  {
    q: "Does it work with photos from any camera?",
    a: "It works with any photo in your iPhone library that has location data, whether it was taken on the iPhone or imported from another camera.",
  },
  {
    q: "Which devices does it run on?",
    a: "iPhone with iOS 15.1 or later. The App Store also lists it as compatible with iPad and iPod touch.",
  },
  {
    q: "Who makes Vacation Photos?",
    a: "Swapnil Sawant (swapp1990), a Senior Software Engineer at Phoenix Bioinformatics in the SF Bay Area. More at swapp1990.org.",
  },
];

const FEATURES = [
  {
    icon: "🗺️",
    title: "Automatic trip detection",
    desc: "Finds photos taken 50+ miles from home and groups them into trips by place and date.",
  },
  {
    icon: "📍",
    title: "Organized by place",
    desc: "Each trip is labelled by where it happened, so you can jump straight to it.",
  },
  {
    icon: "📅",
    title: "Trips in order",
    desc: "Your trips are listed by date, so you can find a trip by when it happened.",
  },
  {
    icon: "📤",
    title: "Share with a link",
    desc: "Send a trip to family and friends with a link. They can view it without installing the app.",
  },
  {
    icon: "🔒",
    title: "Sorted on your iPhone",
    desc: "Trip detection runs on your device. Photos are only uploaded, to Apple iCloud, when you choose to share a trip.",
  },
  {
    icon: "💰",
    title: "Free",
    desc: "Free on the App Store. No ads, no in-app purchases, no account needed.",
  },
];

const STEPS = [
  {
    step: "1",
    title: "Import",
    desc: "Open the app and allow photo access. It scans your library for you.",
    src: "/images/opt/screenshot-main-200.webp",
    srcSet:
      "/images/opt/screenshot-main-200.webp 200w, /images/opt/screenshot-main-400.webp 400w",
  },
  {
    step: "2",
    title: "Auto-organize",
    desc: "Photos are grouped into trips by location and date. Every vacation gets its own album.",
    src: "/images/opt/screenshot-trip-200.webp",
    srcSet:
      "/images/opt/screenshot-trip-200.webp 200w, /images/opt/screenshot-trip-400.webp 400w",
  },
  {
    step: "3",
    title: "Browse & share",
    desc: "Tap a trip to look back through it, or share it with a link.",
    src: "/images/opt/screenshot-photo-200.webp",
    srcSet:
      "/images/opt/screenshot-photo-200.webp 200w, /images/opt/screenshot-photo-400.webp 400w",
  },
];

export const metadata: Metadata = {
  description: HOME_DESCRIPTION,
  openGraph: {
    url: HOME_CANONICAL,
    description: HOME_DESCRIPTION,
    images: [{ url: OG_IMAGE.url, width: OG_IMAGE.width, height: OG_IMAGE.height }],
  },
  twitter: {
    description: HOME_DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};

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
    operatingSystem: "iOS 15.1 or later",
    applicationCategory: "PhotographyApplication",
    softwareVersion: "1.1.7",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    url: SITE_URL,
    downloadUrl: APP_STORE_URL,
    installUrl: APP_STORE_URL,
    author: {
      "@type": "Person",
      name: "Swapnil Sawant",
      alternateName: "swapp1990",
      url: "https://swapp1990.org/",
    },
    description: HOME_DESCRIPTION,
  };

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Swapnil Sawant",
    alternateName: "swapp1990",
    url: "https://swapp1990.org/",
    jobTitle: "Senior Software Engineer",
    worksFor: {
      "@type": "Organization",
      name: "Phoenix Bioinformatics",
    },
    homeLocation: {
      "@type": "Place",
      name: "SF Bay Area",
    },
    sameAs: [
      "https://swapp1990.org/",
      "https://github.com/swapp1990",
      "https://linkedin.com/in/swapnil-sawant-b038b480",
      "https://x.com/swapp19902",
    ],
  };

  return (
    <>
      <link rel="canonical" href={HOME_CANONICAL} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <Header />

      <main className="pt-16">
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
                Vacation Photos sorts your camera roll into trips by date and
                place, on your iPhone. Share a trip with a link.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
                <AppStoreBadge />
                <span className="text-[var(--color-text-muted)] text-sm">
                  Free on iPhone &middot; No account needed
                </span>
              </div>
              <p className="mt-6 text-[var(--color-text-muted)] text-sm">
                Rated 5.0 on the App Store (1 rating)
              </p>
            </div>
            <div className="flex-1 flex justify-center">
              <Picture
                src="/images/opt/screenshot-main-320.webp"
                srcSet="/images/opt/screenshot-main-320.webp 320w, /images/opt/screenshot-main-640.webp 640w, /images/opt/screenshot-main-960.webp 960w"
                sizes="(min-width: 768px) 320px, 280px"
                width={320}
                height={694}
                alt="Vacation Photos app showing trips organized by destination"
                className="w-[280px] md:w-[320px] h-auto rounded-3xl shadow-2xl shadow-black/40"
                loading="eager"
                fetchPriority="high"
              />
            </div>
          </div>
        </section>

        <section className="vp-cv-2 py-16 px-4 bg-[var(--color-bg-card)]">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Your camera roll is a mess after every trip
            </h2>
            <p className="text-lg text-[var(--color-text-muted)] leading-relaxed">
              After a trip, the photos you care about are mixed in with
              screenshots, receipts and everyday shots. Scrolling back by date
              to find one trip takes a while.
            </p>
          </div>
        </section>

        <section className="vp-cv-3 py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
              Three steps. That&apos;s it.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {STEPS.map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">
                    {item.step}
                  </div>
                  <Picture
                    src={item.src}
                    srcSet={item.srcSet}
                    sizes="200px"
                    width={200}
                    height={433}
                    alt={item.title}
                    className="w-[200px] h-auto rounded-2xl mx-auto mb-4 shadow-lg shadow-black/30"
                    loading="lazy"
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

        <section className="vp-cv-4 py-20 px-4 bg-[var(--color-bg-card)]">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
              Sorts your camera roll into trips by date and place, on your
              iPhone. Free on iOS.
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

        <section id="faq" className="vp-cv-5 py-20 px-4 bg-[var(--color-bg-card)]">
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

        <section className="vp-cv-6 py-20 px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start organizing your vacation photos
          </h2>
          <p className="text-lg text-[var(--color-text-muted)] mb-8">
            Free. No ads. No account required.
          </p>
          <AppStoreBadge />
        </section>
      </main>

      <Footer />
    </>
  );
}
