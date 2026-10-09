import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: { absolute: "Page not found" },
  description: "This page does not exist on Vacation Photos.",
  robots: { index: false, follow: true },
  alternates: { canonical: null },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-6">Page not found</h1>
          <p className="text-[var(--color-text-muted)] mb-8">
            This page does not exist on Vacation Photos.
          </p>
          <nav className="flex items-center justify-center gap-6 text-[var(--color-primary-light)]">
            <Link href="/" className="hover:underline">
              Home
            </Link>
            <Link href="/blog" className="hover:underline">
              Blog
            </Link>
            <Link href="/support" className="hover:underline">
              Support
            </Link>
          </nav>
        </div>
      </main>
      <Footer />
    </>
  );
}
