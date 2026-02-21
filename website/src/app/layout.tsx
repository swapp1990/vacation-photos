import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const GA_MEASUREMENT_ID = "G-7RQX87Q7M9";

const SITE_URL = "https://vacationphotos.swapp1990.org";
const APP_NAME = "Vacation Photos";
const APP_DESCRIPTION =
  "Organize your vacation photos by trip automatically. Import from your camera roll, auto-sort by destination and date, and share beautiful trip albums — all on your iPhone.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${APP_NAME} — Organize Your Vacation Photos by Trip`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} — Organize Your Vacation Photos by Trip`,
    description: APP_DESCRIPTION,
    images: [{ url: "/images/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — Organize Your Vacation Photos by Trip`,
    description: APP_DESCRIPTION,
    images: ["/images/og-image.png"],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
        <link rel="icon" href="/images/app-icon.png" />
      </head>
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
