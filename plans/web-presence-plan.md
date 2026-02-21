# Web Presence Plan: Vacation Photos

**Date:** Feb 21, 2026
**Status:** IMPLEMENTED (pending DNS + SSL)
**Blocks:** GEO Runbook Phase 0 + Phase 1 (blog content, AI crawler access, schema markup)
**References:** REQ-12 (developer-requirements.md), TemplateGen website-requirements.md, GEO runbook

---

## Why This Is Urgent

Vacation Photos has **zero web presence**. Web Referrer impressions = 0. There's no website to link to from social media, TikTok, Reddit, blog posts, or listicle pitches. Every item in the GEO runbook (blog posts, schema markup, AI crawler access, Product Hunt launch) requires a website to exist first.

Every competitor has at least an App Store page linked from external sites. Picnic has 18K Instagram followers pointing somewhere. We have nothing.

---

## Architecture Decision: Next.js Static Site

**Recommendation: Next.js static export hosted on Molty server**

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| Next.js on Molty | SSR/SSG, blog built-in, schema easy, free hosting, same stack as dashboard | Another app on the server | **Best fit** |
| Astro static site | Fast, blog-native, great SEO | New framework to learn | Good alternative |
| Plain HTML | Simplest | No blog system, manual schema | Too limited |
| Webflow/Carrd | No-code, fast | No custom schema, limited blog, monthly cost | Wrong for GEO |

Next.js gives us SSG (static site generation) for perfect SEO scores, built-in blog via MDX, easy schema markup injection, and the same stack you already use for the keyword-detective dashboard.

---

## Domain Strategy

**Recommendation: `vacationphotos.swapp1990.org`** (immediate, free)
**Future upgrade: `vacationphotos.app` or `myvacationphotos.com`** (when revenue justifies $12-35/year)

| Option | Cost | Setup Time | SEO Value |
|---|---|---|---|
| `vacationphotos.swapp1990.org` | Free | 30 min | Good (unique subdomain, SSL via Certbot) |
| `vacationphotos.app` | ~$20/year | 1-2 hours | Best (branded, memorable, .app = HTTPS-only) |
| `getvacationphotos.com` | ~$12/year | 1-2 hours | Best (classic .com) |

**Start with subdomain.** The GEO runbook content will work on any domain. If AI citations pick up, buy a branded domain and 301-redirect. Google and LLMs handle redirects well.

---

## Infrastructure Setup

**Server:** Molty (64.225.33.214)
**Port:** 8006 (next available — 8001-8005 taken)
**Process manager:** systemd (like all other apps)
**SSL:** Certbot auto-provision
**Deployment:** GitHub Actions → SSH rsync of static export

### Nginx Config
```nginx
server {
    server_name vacationphotos.swapp1990.org;

    location / {
        proxy_pass http://127.0.0.1:8006;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    listen 80;
}
# Certbot will add SSL block automatically
```

### DNS
Add A record: `vacationphotos.swapp1990.org` → `64.225.33.214`
(DigitalOcean DNS panel, same as other subdomains)

---

## Site Structure

```
vacationphotos.swapp1990.org/
├── /                          # Landing page (hero + value prop + App Store link)
├── /blog/                     # Blog index
├── /blog/organize-vacation-photos-iphone/   # Post 1 from GEO runbook
├── /blog/best-vacation-photo-organizer/     # Post 2
├── /blog/sort-travel-photos-by-trip/        # Post 3
├── /blog/organized-10000-photos/            # Post 4 (data-driven)
├── /privacy/                  # Privacy policy (required for App Store link)
├── /support/                  # Support page (required for App Store)
├── /sitemap.xml               # Auto-generated
├── /robots.txt                # AI crawler access
└── /rss.xml                   # RSS feed for blog
```

### Landing Page Sections
1. **Hero:** App icon + tagline + "Download on the App Store" badge + screenshot
2. **Problem:** "Your vacation photos deserve better than a messy camera roll"
3. **How it works:** 3-step visual (Import → Auto-organize by trip → Share albums)
4. **Features grid:** Trip detection, location sorting, smart albums, sharing
5. **Social proof:** App Store rating (5.0), review quotes
6. **FAQ section:** 5-8 questions (with FAQPage schema)
7. **Footer:** App Store link, privacy, support, social links

### Every Page Must Have (GEO Requirements)
- Answer capsule in first 60 words
- Question-format H2 headings
- FAQPage schema markup
- SoftwareApplication schema
- Author bio with real name
- Open Graph + Twitter Card meta tags
- `datePublished` + `dateModified` in Article schema

---

## Technical Requirements

### SEO Foundation (from TemplateGen pattern)

| # | Requirement | Priority | Effort |
|---|---|---|---|
| 1 | SSG/SSR — no client-side-only rendering | P0 | Built-in with Next.js |
| 2 | GA4 tracking (measurement ID from GEO runbook) | P0 | 15 min |
| 3 | Google Search Console verification | P0 | 10 min |
| 4 | Meta tags (title, description, OG, Twitter) per page | P0 | 1 hour |
| 5 | XML sitemap (auto-generated) | P0 | Built-in with next-sitemap |
| 6 | robots.txt with AI crawler access | P0 | 10 min |
| 7 | Unique H1 per page | P0 | Built-in |
| 8 | Schema markup (SoftwareApplication, FAQPage, HowTo, Article) | P1 | 2 hours |
| 9 | Blog system (MDX) | P1 | 2 hours |
| 10 | Image optimization (next/image, WebP) | P1 | Built-in |
| 11 | RSS feed | P2 | 30 min |
| 12 | Email capture (newsletter) | P2 | 1 hour |

### robots.txt (GEO-critical)
```
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: https://vacationphotos.swapp1990.org/sitemap.xml
```

### Schema Markup (on every page)
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Vacation Photos",
  "operatingSystem": "iOS",
  "applicationCategory": "PhotographyApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5.0",
    "ratingCount": "15"
  },
  "url": "https://apps.apple.com/app/id6756803475"
}
```

Plus per-page: `Article`, `FAQPage`, `HowTo`, `BreadcrumbList` as appropriate.

---

## Project Setup

### New Repo or Monorepo?

**Recommendation: New directory in existing vacation-photos repo**

```
vacation-photos/
├── ios/                    # (existing iOS app)
├── website/                # NEW — Next.js site
│   ├── src/
│   │   ├── app/            # Next.js App Router
│   │   │   ├── page.tsx    # Landing page
│   │   │   ├── blog/       # Blog pages
│   │   │   ├── privacy/
│   │   │   └── support/
│   │   ├── components/     # Shared components
│   │   └── content/        # MDX blog posts
│   ├── public/
│   │   ├── robots.txt
│   │   └── images/
│   ├── next.config.js
│   ├── package.json
│   └── tsconfig.json
```

### Key Dependencies
```json
{
  "next": "^15",
  "react": "^19",
  "@next/mdx": "^15",
  "next-sitemap": "^4",
  "schema-dts": "^1"
}
```

---

## Execution Plan

### Week 1: Foundation (2-3 hours total)

| Step | Task | Time |
|---|---|---|
| 1 | Create `website/` directory with Next.js scaffold | 30 min |
| 2 | Build landing page (hero, features, App Store link, FAQ) | 1 hour |
| 3 | Add robots.txt, sitemap, schema markup | 30 min |
| 4 | Set up DNS + nginx + Certbot on Molty | 30 min |
| 5 | Deploy static export, verify live | 15 min |
| 6 | Add GA4 + Google Search Console | 15 min |

### Week 2: Blog Infrastructure (2 hours)

| Step | Task | Time |
|---|---|---|
| 7 | Set up MDX blog system with layout template | 1 hour |
| 8 | Write + publish Post 1: "How to Organize Vacation Photos on iPhone" | 1 hour |
| 9 | Add Article + FAQPage schema to blog template | 30 min |

### Week 3: Content (from GEO runbook)

| Step | Task | Time |
|---|---|---|
| 10 | Publish Post 2: "Best Vacation Photo Organizer Apps" | 1 hour |
| 11 | Publish Post 3: "How to Sort Travel Photos by Trip" | 1 hour |
| 12 | Publish Post 4: "I Organized 10,000 Vacation Photos" | 1 hour |

### Week 4+: Distribution (from GEO runbook Phase 2)
- Product Hunt launch (link back to website)
- Listicle pitches (link back to website)
- Reddit engagement (profile links to website)
- Submit to app directories (all link to website)

---

## Success Metrics

| Metric | Baseline | Week 4 Target | Month 3 Target |
|---|---|---|---|
| Web referrer impressions | 0 | 50 | 500 |
| Indexed pages (GSC) | 0 | 6 | 15 |
| AI crawler visits (GA4) | 0 | any | 50/week |
| Blog organic traffic | 0 | 20/week | 200/week |
| App Store clicks from web | 0 | 5/week | 50/week |
| First AI citation | never | — | achieved |

---

## What This Unblocks

Once the website exists, every item in the GEO runbook becomes actionable:

- **Phase 0:** ✅ AI crawlers can access your content, GA4 tracks AI traffic, directories have a URL to link
- **Phase 1:** ✅ Blog posts have a home with proper schema markup
- **Phase 2:** ✅ Product Hunt launch has a website link, listicle authors can see your site, Reddit profile has a URL
- **Phase 3:** ✅ Content refresh has content to refresh, competitor citation monitoring has a baseline
- **Phase 4:** ✅ TikTok/Instagram bio links point somewhere

Without this website, the GEO runbook is a plan with no foundation. This is the single highest-leverage task.

---

*Plan v1 | Feb 21, 2026 | Companion to [GEO Runbook](geo-runbook-vacation-photos-lmwfy.md)*
