import Link from "next/link";
import Picture from "@/components/Picture";
import { APP_STORE_URL } from "@/lib/site";

export default function Header() {
  return (
    <header className="vp-header fixed top-0 w-full z-50 bg-[var(--color-bg)]/80 border-b border-[var(--color-border)]">
      <nav className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Picture
            src="/images/opt/app-icon-64.webp"
            srcSet="/images/opt/app-icon-64.webp 64w, /images/opt/app-icon-128.webp 128w"
            sizes="36px"
            width={36}
            height={36}
            alt="Vacation Photos"
            className="rounded-lg"
            loading="lazy"
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
            href={APP_STORE_URL}
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
