import fs from "fs";
import path from "path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "src/content");
const DEFAULT_AUTHOR = "Swapnil (swapp1990)";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  lastModified?: string;
  author: string;
  tags: string[];
  faq?: { q: string; a: string }[];
  noindex: boolean;
}

function toPost(slug: string, data: { [key: string]: unknown } & Record<string, any>): BlogPost {
  return {
    slug,
    title: data.title || slug,
    description: data.description || "",
    date: data.date || "",
    lastModified: data.lastModified,
    author: data.author || DEFAULT_AUTHOR,
    tags: data.tags || [],
    faq: data.faq,
    noindex: Boolean(data.noindex),
  };
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));

  const posts = files.map((filename) => {
    const slug = filename.replace(/\.mdx$/, "");
    const filePath = path.join(CONTENT_DIR, filename);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const { data } = matter(fileContent);
    return toPost(slug, data);
  });

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getPost(slug: string): BlogPost | null {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const { data } = matter(fileContent);
  return toPost(slug, data);
}

export function getIndexablePosts(): BlogPost[] {
  return getAllPosts().filter((post) => !post.noindex);
}

export function hasIndexablePosts(): boolean {
  return getIndexablePosts().length > 0;
}
