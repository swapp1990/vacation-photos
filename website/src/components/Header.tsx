import Link from "next/link";

export default function Header() {
  return (
    <header className="fixed top-0 w-full z-50 bg-[var(--color-bg)]/80 backdrop-blur-md border-b border-[var(--color-border)]">
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/images/app-icon.png"
            alt="Vacation Photos"
            className="w-9 h-9 rounded-lg"
          />
          <span className="font-semibold text-lg">Vacation Photos</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/blog"
            className="text-[var(--color-text-muted)] hover:text-white transition-colors text-sm"
          >
            Blog
          </Link>
          <Link
            href="/support"
            className="text-[var(--color-text-muted)] hover:text-white transition-colors text-sm"
          >
            Support
          </Link>
          <a
            href="https://apps.apple.com/app/id6756803475"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-black text-sm font-medium px-4 py-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            Download
          </a>
        </div>
      </nav>
    </header>
  );
}
