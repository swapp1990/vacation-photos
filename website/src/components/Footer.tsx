import Link from "next/link";
import Picture from "@/components/Picture";
import { APP_STORE_URL, FOUNDER_BIO, FOUNDER_URL } from "@/lib/site";

const SISTER_SITES = [
  { href: "https://swapp1990.org/", label: "swapp1990.org" },
  { href: "https://writer.swapp1990.org/", label: "WriteForYou" },
  { href: "https://designforyou.swapp1990.org/", label: "DesignForYou" },
  { href: "https://actforyou.swapp1990.org/", label: "Let Me Act" },
  { href: "https://readforyou.swapp1990.org/", label: "ReadForYou" },
  { href: "https://molty.swapp1990.org/", label: "Molty" },
  { href: "https://snapforyou.swapp1990.org/", label: "SnapForYou" },
  { href: "https://jobalerts.swapp1990.org/", label: "JobsForYou" },
  { href: "https://leetcode.swapp1990.org/", label: "Problem Recall" },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] py-12 mt-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Picture
                src="/images/opt/app-icon-64.webp"
                srcSet="/images/opt/app-icon-64.webp 64w, /images/opt/app-icon-128.webp 128w"
                sizes="32px"
                width={32}
                height={32}
                alt="Vacation Photos"
                className="rounded-lg"
                loading="lazy"
              />
              <span className="font-semibold">Vacation Photos</span>
            </div>
            <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">
              Automatically organize your vacation photos by trip, date, and
              location. Free on the App Store.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-[var(--color-text-muted)]">
              App
            </h3>
            <ul className="space-y-2">
              <li>
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-text-muted)] hover:text-white transition-colors text-sm"
                >
                  Download on App Store
                </a>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-[var(--color-text-muted)] hover:text-white transition-colors text-sm"
                >
                  Blog
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-[var(--color-text-muted)]">
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-[var(--color-text-muted)] hover:text-white transition-colors text-sm"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/support"
                  className="text-[var(--color-text-muted)] hover:text-white transition-colors text-sm"
                >
                  Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <aside
          className="founder mt-10 pt-6 border-t border-[var(--color-border)] text-sm text-[var(--color-text-muted)] space-y-2"
          aria-label="About the maker"
        >
          <p>
            <strong className="text-[var(--color-text)]">
              Made by{" "}
              <a
                href={FOUNDER_URL}
                className="hover:text-white transition-colors"
              >
                Swapnil (swapp1990)
              </a>
            </strong>
          </p>
          <p>{FOUNDER_BIO}</p>
        </aside>

        <nav
          className="sister-sites mt-6 text-sm text-[var(--color-text-muted)] flex flex-wrap items-center gap-x-3 gap-y-2"
          aria-label="More from Swapnil"
        >
          <span>More from Swapnil:</span>
          {SISTER_SITES.map((site) => (
            <a
              key={site.href}
              href={site.href}
              className="hover:text-white transition-colors"
            >
              {site.label}
            </a>
          ))}
        </nav>

        <div className="mt-10 pt-6 border-t border-[var(--color-border)] text-center text-[var(--color-text-muted)] text-sm">
          © 2026 Swapnil Sawant · Vacation Photos
        </div>
      </div>
    </footer>
  );
}
