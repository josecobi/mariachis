# Los Mariachis — SEO Plan

Read this before building any page or component. The site exists to outrank a
parked squatter domain for the business name (see PROJECT-BRIEF.md). Every rule
below is a build requirement, not a post-launch polish item.

## 0. Blockers — resolve before launch, placeholder until then

| Item | Placeholder to use now | Where it's consumed |
|---|---|---|
| Final domain | `https://PLACEHOLDER-DOMAIN.example` | `site` in `astro.config.mjs`, canonical, OG, sitemap, JSON-LD `url` |
| City / full street address | `CITY, ST` | H1 suffix, `<title>`, NAP block, `PostalAddress` schema |
| Phone, hours | `TODO` | NAP block, `telephone`, `openingHoursSpecification` |
| Geo coordinates | `TODO` | `GeoCoordinates` schema (copy from GBP pin) |

Placeholders must be greppable: search for `PLACEHOLDER-DOMAIN`, `CITY, ST`,
and `TODO` before launch. Do not invent values.

## 1. Target query and brand signal

**Primary query:** `Los Mariachis` and `Los Mariachis restaurant` (+ city).
This is the query the parked domain currently wins. Everything below serves it.

- The brand name **"Los Mariachis"** must appear, verbatim, in:
  - the landing page `<h1>` (currently `Where Every Meal Becomes a Memory` — must change)
  - every page's `<title>` (see §3)
  - JSON-LD `name` on every page
  - the footer NAP block on every page
  - the logo/wordmark `alt` text
- Landing page H1 pattern: `Los Mariachis — Mexican Restaurant in CITY, ST`.
  The tagline can be the subheading; it is not the H1.
- Exactly one `<h1>` per page. Section titles are `<h2>`, dish names on the menu are `<h3>`.

## 2. NAP — single source of truth

Name, Address, Phone, hours must match the Google Business Profile **character
for character** (same abbreviations, same suite formatting, same phone format).
Mismatches split local-ranking signal between "entities."

- Store once in `src/data/business.json` (or the PageCMS singleton equivalent).
  Never hardcode NAP in a component.
- Render it in the footer on every page as a `<address>` element.
- Feed the same object into the JSON-LD (§4). One source, two outputs.

Shape:

```json
{
  "name": "Los Mariachis",
  "legalName": "Los Mariachis",
  "streetAddress": "TODO",
  "addressLocality": "CITY",
  "addressRegion": "ST",
  "postalCode": "TODO",
  "telephone": "+1-TODO",
  "geo": { "latitude": 0, "longitude": 0 },
  "hours": [{ "days": ["Monday"], "opens": "11:00", "closes": "21:00" }],
  "priceRange": "$$",
  "servesCuisine": "Mexican",
  "sameAs": ["<GBP URL>", "<Facebook>", "<Instagram>"]
}
```

## 3. Per-page head

`BaseLayout` owns the `<head>`. Pages pass props; they never emit head tags.
Titles ≤ 60 chars, descriptions 120–155 chars, brand name in every title.

| Route | `<title>` | Description (draft) | Schema (in addition to sitewide) |
|---|---|---|---|
| `/` | `Los Mariachis \| Mexican Restaurant in CITY, ST` | Authentic Mexican cuisine in CITY. Fresh, made-from-scratch dishes, house specialties, and a warm welcome. View our menu, hours, and location. | — |
| `/menu/` | `Menu \| Los Mariachis, CITY` | Full menu for Los Mariachis in CITY: tacos, platters, seafood, vegetarian dishes, kids' menu, and daily specials with current prices. | `Menu` → `MenuSection` → `MenuItem` |
| `/about/` | `About Us \| Los Mariachis, CITY` | The story behind Los Mariachis — family recipes, the people in the kitchen, and what makes our CITY restaurant a local favorite. | — |
| `/contact/` | `Contact & Hours \| Los Mariachis, CITY` | Find Los Mariachis in CITY: address, opening hours, phone, directions, and how to book a table. | `ContactPage` (optional) |

Every page must emit:

- `<link rel="canonical" href={new URL(Astro.url.pathname, Astro.site)} />`
- `og:title`, `og:description`, `og:image` (1200×630, default = hero), `og:url`, `og:type=website`, `og:locale`
- `twitter:card=summary_large_image`
- `<html lang="en">` (switch to `es` / add hreflang only if a Spanish version is scoped — not currently)

`Astro.site` **must** be set in `astro.config.mjs` or canonical/OG/sitemap all break.

## 4. Structured data (JSON-LD)

Sitewide block in `BaseLayout`, built from `business.json` — one `@graph` with:

- `Restaurant` (subtype of `LocalBusiness`): `@id`, `name`, `url`, `telephone`,
  `address` (`PostalAddress`), `geo`, `openingHoursSpecification`, `servesCuisine`,
  `priceRange`, `image`, `sameAs`, `hasMenu` → `{domain}/menu/`
- `WebSite` with `name` and `url`

Menu page adds:

- `Menu` → `hasMenuSection[]` → `hasMenuItem[]` with `name`, `description`,
  `offers.price` + `priceCurrency`, generated from the PageCMS menu collection.
  This means the CMS schema must have per-item `name`, `description`, `price`,
  `section` fields and per-section `name` — design the collection with this in mind.

Rules:

- Build the object in the frontmatter and emit with
  `<script type="application/ld+json" set:html={JSON.stringify(schema)} />`.
  **Never write JSON-LD as a literal template** — the current
  `BaseLayout.astro` block has `"{title}"` as a literal string and must be replaced.
- Validate with https://validator.schema.org and Google's Rich Results Test before launch.

## 5. Technical baseline

- `npx astro add sitemap --yes` → `@astrojs/sitemap`; link `/sitemap-index.xml` from `public/robots.txt`.
- `public/robots.txt`: allow all, `Sitemap:` line.
- Trailing-slash policy: pick one in `astro.config.mjs` (`trailingSlash: 'always'` recommended) and use it consistently in internal links and canonical.
- Images: `<Image />` only, every food photo gets a descriptive `alt` naming the dish
  (`"Carne asada platter with rice, beans, and tortillas"`), decorative images get `alt=""`.
  Hero image gets `loading="eager"` + `fetchpriority="high"`; everything else lazy.
- Fonts: current Google Fonts `<link>` is a render-blocking third-party request.
  Self-host via `@fontsource` or Astro's `fonts` config to keep LCP and Lighthouse at 100.
- Internal linking: header nav links all four pages; landing page links to
  `/menu/` prominently (first CTA) and to `/contact/`.
- 404 page (`src/pages/404.astro`) with nav so crawlers and users recover.
- Zero client JS stays the default — CWV is a ranking input.

## 6. Content rules (per page)

- **Landing:** H1 (§1), 1–2 paragraphs that naturally say "Mexican restaurant in CITY",
  featured dishes with real names, hours + address visible above the fold or in the first
  scroll, CTA to menu.
- **Menu:** one `<h2>` per section, `<h3>` per item, real descriptions (not just names),
  prices in text — not images. This page carries the most unique text on the site; do not
  render the menu as an image or PDF.
- **About:** owner/family story, years in business, neighbourhood. Use the real names the
  owner is comfortable publishing — E-E-A-T signals for a local business are people and place.
- **Contact:** NAP block, embedded map (static image with a link out, not an iframe — JS/CLS
  cost), hours table, phone as `tel:` link.

## 7. Post-launch checklist (outside the codebase — for Jose / the owner)

1. Add the new domain as the website on the Google Business Profile.
2. Verify the domain in Google Search Console; submit the sitemap; request indexing for all four URLs.
3. Same in Bing Webmaster Tools (free, and it feeds DuckDuckGo).
4. File a Google legal removal request for the parked domain (adult content on a
   trademark-style query — "Report inappropriate content" / DMCA path). This is owner
   priority #1 and does not depend on the site.
5. Update printed menu cards / QR code to the new domain (brief open item).
6. Get the new URL onto every existing citation: Yelp, TripAdvisor, Facebook, Instagram,
   Apple Maps, local directories. Consistent NAP everywhere.
7. Re-run Lighthouse + Rich Results Test on the live domain.

## 8. What "done" looks like for an agent task

Before finishing any page/component task, check:

- [ ] Page passes `title` + `description` to `BaseLayout`, matching the §3 table
- [ ] Exactly one `<h1>`, contains "Los Mariachis" on `/`
- [ ] No hardcoded NAP — reads from `business.json`
- [ ] Every `<Image />` has a meaningful `alt` or `alt=""`
- [ ] No `<script>` shipped to the client without a stated reason
- [ ] `npm run build` succeeds and `dist/` contains `sitemap-index.xml`
