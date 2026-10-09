import { pageUrl } from "@/lib/site";

export type Crumb = {
  name: string;
  href: string;
};

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: pageUrl(item.href),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <nav
        aria-label="Breadcrumb"
        className="text-sm text-[var(--color-text-muted)] mb-6"
      >
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <span key={`${item.href}-${item.name}`}>
              {i > 0 && <span> › </span>}
              {isLast ? (
                <span className="text-[var(--color-text)]">{item.name}</span>
              ) : (
                <a href={item.href} className="hover:text-white transition-colors">
                  {item.name}
                </a>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
}
