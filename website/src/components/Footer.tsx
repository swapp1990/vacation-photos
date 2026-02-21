import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] py-12 mt-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/app-icon.png"
                alt="Vacation Photos"
                className="w-8 h-8 rounded-lg"
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
                  href="https://apps.apple.com/app/id6756803475"
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
        <div className="mt-10 pt-6 border-t border-[var(--color-border)] text-center text-[var(--color-text-muted)] text-sm">
          &copy; {new Date().getFullYear()} Vacation Photos. All rights
          reserved.
        </div>
      </div>
    </footer>
  );
}
