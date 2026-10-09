const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

function noindexBlogPaths() {
  const contentDir = path.join(__dirname, "src/content");
  const excluded = [];
  let hasIndexable = false;
  if (fs.existsSync(contentDir)) {
    for (const file of fs.readdirSync(contentDir).filter((f) => f.endsWith(".mdx"))) {
      const slug = file.replace(/\.mdx$/, "");
      const raw = fs.readFileSync(path.join(contentDir, file), "utf-8");
      const { data } = matter(raw);
      if (data.noindex) {
        excluded.push(`/blog/${slug}`);
      } else {
        hasIndexable = true;
      }
    }
  }
  if (!hasIndexable) excluded.push("/blog");
  return excluded;
}

const excluded = ["/404", "/404.html", "/_not-found", ...noindexBlogPaths()];

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://vacationphotos.swapp1990.org",
  generateRobotsTxt: false,
  generateIndexSitemap: false,
  outDir: "./out",
  exclude: excluded,
  trailingSlash: false,
  transform: async (_config, loc) => {
    if (excluded.includes(loc)) return null;
    return {
      loc: loc === "/" ? "https://vacationphotos.swapp1990.org/" : loc,
      lastmod: new Date().toISOString(),
      changefreq: null,
      priority: null,
    };
  },
};
