import type { Metadata } from "next";
import Script from "next/script";
import { SWAP_ANALYTICS_BEACON_SCRIPT } from "@/lib/swapAnalyticsBeacon";
import { HOME_DESCRIPTION, OG_IMAGE, SITE_URL } from "@/lib/site";
import "./globals.css";

const GA_MEASUREMENT_ID = "G-7RQX87Q7M9";
const APP_NAME = "Vacation Photos";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${APP_NAME} — Organize Your Vacation Photos by Trip`,
    template: `%s | ${APP_NAME}`,
  },
  description: HOME_DESCRIPTION,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/images/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: { url: "/apple-touch-icon.png" },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} — Organize Your Vacation Photos by Trip`,
    description: HOME_DESCRIPTION,
    images: [{ url: OG_IMAGE.url, width: OG_IMAGE.width, height: OG_IMAGE.height }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — Organize Your Vacation Photos by Trip`,
    description: HOME_DESCRIPTION,
    images: [OG_IMAGE.url],
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
          strategy="lazyOnload"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <Script id="swapanalytics-beacon" strategy="afterInteractive">
          {SWAP_ANALYTICS_BEACON_SCRIPT}
        </Script>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link
          rel="icon"
          type="image/png"
          href="/images/icon-192.png"
          sizes="192x192"
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
