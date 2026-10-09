export const SITE_URL = "https://vacationphotos.swapp1990.org";
export const APP_STORE_URL = "https://apps.apple.com/app/id6756803475";
export const FOUNDER_URL = "https://swapp1990.org/";
export const FOUNDER_BYLINE = "Swapnil (swapp1990)";
export const FOUNDER_BIO =
  "Senior Software Engineer @ Phoenix Bioinformatics · SF Bay Area. I keep the world's reference plant-biology database running by day — and ship AI products, games, and agent tooling at night.";

export const HOME_DESCRIPTION =
  "Vacation Photos sorts your iPhone camera roll into trips by date and place, on your device. Free on the App Store, no account needed. Share a trip with a link.";

export const OG_IMAGE = {
  url: "/images/og-image.png",
  width: 1200,
  height: 630,
} as const;

export function pageUrl(path: string): string {
  if (path === "/") return `${SITE_URL}/`;
  return `${SITE_URL}${path}`;
}

export const HOME_CANONICAL = `${SITE_URL}/`;
