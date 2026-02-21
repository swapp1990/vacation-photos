import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAllPosts, getPost } from "@/lib/blog";

export const dynamicParams = false;

export function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `https://vacationphotos.swapp1990.org/blog/${slug}`,
    },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      modifiedTime: post.lastModified || post.date,
      authors: [post.author],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    return (
      <>
        <Header />
        <main className="pt-24 pb-16 px-4 text-center">
          <h1 className="text-3xl font-bold mb-4">Post not found</h1>
        </main>
        <Footer />
      </>
    );
  }

  // Dynamic import the MDX module
  let MDXContent: React.ComponentType;
  try {
    const mod = await import(`../../../content/${slug}.mdx`);
    MDXContent = mod.default;
  } catch {
    MDXContent = () => (
      <p className="text-[var(--color-text-muted)]">
        Unable to load post content.
      </p>
    );
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.lastModified || post.date,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Vacation Photos",
      url: "https://vacationphotos.swapp1990.org",
    },
  };

  const faqSchema = post.faq
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: post.faq.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      }
    : null;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://vacationphotos.swapp1990.org",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: "https://vacationphotos.swapp1990.org/blog",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `https://vacationphotos.swapp1990.org/blog/${slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Header />
      <main className="pt-24 pb-16 px-4">
        <article className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <nav className="text-sm text-[var(--color-text-muted)] mb-6">
            <a href="/" className="hover:text-white transition-colors">
              Home
            </a>{" "}
            &rsaquo;{" "}
            <a href="/blog" className="hover:text-white transition-colors">
              Blog
            </a>{" "}
            &rsaquo;{" "}
            <span className="text-[var(--color-text)]">{post.title}</span>
          </nav>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{post.title}</h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-text-muted)] mb-8">
            <span>By {post.author}</span>
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
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-[var(--color-bg-card)] px-2 py-0.5 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </>
            )}
          </div>

          {/* Answer Capsule */}
          <div className="bg-[var(--color-bg-card)] border-l-4 border-[var(--color-primary)] rounded-r-xl p-6 mb-10">
            <p className="text-[var(--color-text)] leading-relaxed font-medium">
              {post.description}
            </p>
          </div>

          {/* MDX Content */}
          <div className="prose prose-invert max-w-none [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-medium [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:text-[var(--color-text-muted)] [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:text-[var(--color-text-muted)] [&_ul]:space-y-2 [&_ul]:mb-4 [&_ol]:text-[var(--color-text-muted)] [&_ol]:space-y-2 [&_ol]:mb-4 [&_li]:leading-relaxed [&_a]:text-[var(--color-primary-light)] [&_a]:hover:underline [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--color-border)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[var(--color-text-muted)] [&_code]:bg-[var(--color-bg-card)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-[var(--color-border)] [&_th]:px-4 [&_th]:py-2 [&_th]:bg-[var(--color-bg-card)] [&_th]:text-left [&_td]:border [&_td]:border-[var(--color-border)] [&_td]:px-4 [&_td]:py-2 [&_td]:text-[var(--color-text-muted)]">
            <MDXContent />
          </div>

          {/* FAQ Section */}
          {post.faq && post.faq.length > 0 && (
            <section className="mt-16">
              <h2 className="text-2xl font-semibold mb-6">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {post.faq.map((item) => (
                  <details
                    key={item.q}
                    className="group bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden"
                  >
                    <summary className="cursor-pointer px-6 py-4 font-medium flex items-center justify-between list-none">
                      {item.q}
                      <span className="text-[var(--color-text-muted)] group-open:rotate-45 transition-transform text-xl">
                        +
                      </span>
                    </summary>
                    <div className="px-6 pb-4 text-[var(--color-text-muted)] leading-relaxed">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Author Bio */}
          <div className="mt-16 pt-8 border-t border-[var(--color-border)]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-lg">
                S
              </div>
              <div>
                <p className="font-semibold">{post.author}</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Indie iOS developer building apps to organize your life.
                </p>
              </div>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
