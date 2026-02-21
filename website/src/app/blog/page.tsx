import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Tips and guides for organizing vacation photos, travel photography, and making the most of your trip memories.",
  alternates: {
    canonical: "https://vacationphotos.swapp1990.org/blog",
  },
};

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <>
      <Header />
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Blog</h1>
          <p className="text-lg text-[var(--color-text-muted)] mb-12">
            Tips for organizing your travel photos and making the most of your
            vacation memories.
          </p>

          {posts.length === 0 ? (
            <div className="bg-[var(--color-bg-card)] rounded-xl p-8 border border-[var(--color-border)] text-center">
              <p className="text-[var(--color-text-muted)] text-lg">
                Blog posts coming soon! We&apos;re working on guides to help you
                organize your vacation photos.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="block bg-[var(--color-bg-card)] rounded-xl p-6 border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors"
                >
                  <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
                  <p className="text-[var(--color-text-muted)] text-sm mb-3">
                    {post.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
                    <span>{post.author}</span>
                    <span>&middot;</span>
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                    {post.tags.length > 0 && (
                      <>
                        <span>&middot;</span>
                        <span>{post.tags.join(", ")}</span>
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
