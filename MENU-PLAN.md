# Los Mariachis — Menu Page Plan

Read `.clinerules`, `PROJECT-BRIEF.md`, and `SEO-PLAN.md` before starting.
This plan is broken into tasks that each fit the 5-tool-call / one-component
rule. **Do one task, stop, wait for review, then do the next.** Do not skip
ahead or combine tasks.

Everything below was verified against the repo on 2026-09-19:

- Astro **7.3.3**, Tailwind **4.x** via `@tailwindcss/vite`, CSS-first (`@theme` in `src/styles/global.css`, no `tailwind.config.*`).
- Content config file for Astro 7 is `src/content.config.ts` (verified in `node_modules/astro/dist/content/`).
- No `src/content/`, no `src/data/`, no `.pages.yml`, no `@astrojs/sitemap` exist yet.
- Existing files you will touch or reuse: `src/layouts/BaseLayout.astro`, `src/components/Hero.astro`, `src/styles/global.css`, `src/assets/*.jpg`.
- Design tokens already defined: `cream`, `cream-dark`, `charcoal`, `charcoal-light`, `gold`, `gold-light`, `gold-dark`, `warm-gray`, `warm-gray-light`, `terracotta`; fonts `font-heading` (DM Serif Display) and `font-body` (Inter); utilities `.animate-reveal` / `.animate-reveal-delay-{1,2,3}` (scroll-driven, reduced-motion guarded).

---

## 1. Goal

Build the `/menu/` page: the full restaurant menu, editable by the owner via
PagesCMS, rendered as real text (SEO), zero client JS, Lighthouse 100.

**Look and feel:** a printed menu from a family-owned place, typeset with care.
Elegant / premium first, Mexican accent second. Light cream "paper" page (a
deliberate contrast to the dark hero on `/`). Terracotta is the accent color on
this page (gold stays the hero's accent). No clip-art, no sombreros, no
papel-picado bunting, no textures/backgrounds images. Warmth comes from copy,
Spanish dish names, italic section notes that read like the owner talking, and
generous whitespace — not from decoration.

---

## 2. Architecture

```
.pages.yml                        PagesCMS config (owner edits menu here)
src/content.config.ts             Astro content collection + zod schema
src/content/menu/NN-slug.json     one JSON file per menu section (22 files)
src/components/menu/MenuItem.astro
src/components/menu/MenuSection.astro
src/components/menu/MenuNav.astro
src/pages/menu.astro              the page; builds Menu JSON-LD from the collection
```

Two small edits to existing files (each needs approval per `.clinerules`):

- `src/layouts/BaseLayout.astro` — add optional `jsonLd` prop (SEO-PLAN §4 says pages pass props, never emit head tags).
- `src/components/Hero.astro` — "View Menu" button `href="#menu"` → `href="/menu/"`.

**No** header/nav/footer/`business.json` exist yet. Do not build them in this
plan. The menu page uses `BaseLayout` as-is; phone/address CTAs use the
greppable placeholders from SEO-PLAN §0.

---

## 3. Data model

### 3.1 Zod schema (`src/content.config.ts`)

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const menu = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/menu' }),
  schema: z.object({
    name: z.string(),                 // "Chicken Platters"
    order: z.number(),                // sort key, 10, 20, 30 … (gaps so the owner can insert)
    note: z.string().optional(),      // italic line under the h2, e.g. "All our platters are served with…"
    image: z.string().optional(),     // filename in src/assets, e.g. "pollo-ajo.jpg"
    imageAlt: z.string().optional(),  // required if image is set — describe the dish
    items: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
      price: z.number().nonnegative(), // 0 = placeholder, not yet entered by the owner
      options: z.string().optional(), // "chicken, beef, Mexican sausage or marinated pork"
      variants: z.array(z.object({    // sizes instead of a single price
        label: z.string(),            // "Small"
        price: z.number().nonnegative(),
      })).optional(),
      tags: z.array(z.enum(['spicy', 'veggie', 'house-special', 'kids'])).optional(),
    })),
  }),
});

export const collections = { menu };
```

Rules:

- `image` is a **filename**, not a path. `MenuSection.astro` resolves it with
  `import.meta.glob('../../assets/*.jpg', { eager: true })`. (Reason: the
  `image()` schema helper wants a path relative to the JSON file, which is
  awkward for PagesCMS to write. A plain filename is stable in both.)
- **Prices are unknown.** The pasted menu has none. Every item and every
  variant gets the placeholder `"price": 0`. The component renders `$0.00` —
  unmistakably a placeholder, but it exercises the real layout (dotted leader,
  tabular numerals, right alignment) so the design can be reviewed. The owner
  replaces them in PagesCMS. Before launch: `grep -c '"price": 0' src/content/menu/*.json`
  must return 0 for every file. Items with `price: 0` are excluded from the
  JSON-LD `offers` so Google never sees a $0 menu.
- Items that have `variants` (sizes) also carry a top-level `price: 0`; the
  component ignores the top-level price when `variants` is present and shows
  the per-size prices instead.
- Section `note` holds the sentence that was copy-pasted onto every item in
  the source ("All our platters served with…"). It is rendered **once** per
  section. Item descriptions must not repeat it.

### 3.2 `.pages.yml` (PagesCMS)

Draft below. **Verify field types and `format` against the current PagesCMS
docs (https://pagescms.org/docs/) before writing the file** — `.clinerules`
forbids stating config from memory.

```yaml
media:
  input: src/assets
  output: /src/assets

content:
  - name: menu
    label: Menu sections
    type: collection
    path: src/content/menu
    format: json
    filename: '{fields.order}-{fields.name}.json'
    view:
      fields: [name, order]
      sort: [order]
    fields:
      - name: name
        label: Section name
        type: string
        required: true
      - name: order
        label: Order (lower = higher on the page)
        type: number
        required: true
      - name: note
        label: Note shown under the section title
        type: text
      - name: image
        label: Section photo (filename in src/assets)
        type: string
      - name: imageAlt
        label: Photo description (for screen readers / Google)
        type: string
      - name: items
        label: Dishes
        type: object
        list: true
        fields:
          - name: name
            label: Dish name
            type: string
            required: true
          - name: description
            type: text
          - name: price
            type: number
          - name: options
            label: Choices (e.g. "chicken, beef or steak")
            type: string
          - name: variants
            label: Sizes
            type: object
            list: true
            fields:
              - { name: label, type: string }
              - { name: price, type: number }
          - name: tags
            type: select
            list: true
            options:
              - { value: spicy, label: Spicy }
              - { value: veggie, label: Vegetarian }
              - { value: house-special, label: House special }
              - { value: kids, label: Kids }
```

---

## 4. Menu content — normalized

The pasted menu is a scrape with duplicated blocks and boilerplate repeated on
every item. Use **this** structure, not the raw paste. Keep Spanish dish names
exactly (they are the brand). Copy-edit descriptions lightly: fix typos, keep
the owner's voice. Do not invent dishes, ingredients, or prices.

Editorial decisions already made — do not re-litigate:

- "At a Glance" block dropped (it was a 3-item preview of other sections).
- "Others" block dissolved: Flautas + Burritos become their own section; its
  "Coctel De Camarones" description replaces the wrong one in Soups; its
  Sopes/Huarache/Quesadilla entries are duplicates; "Beef Tongue" (no
  description, already exists as Lengua tacos) is dropped — flag to owner.
- Drinks were nested under "Kids Menus" in the scrape. Split out.
- The three "Chicken / Beef / Pork" house-special blocks merge into one
  **House Specials** section (they share one serving note).
- "Fourth" → "Four". "monterrey jack" → "Monterey Jack". "Te" → "Té".
- Repeated serving sentences become the section `note`.

File naming: `src/content/menu/010-appetizers.json`, `020-soups.json`, …
The `id` Astro derives from the filename is the anchor slug — keep names short.

| order | file | name | note | image (src/assets) |
|---|---|---|---|---|
| 10 | `010-appetizers` | Appetizers | — | `nachos-pico.jpg` |
| 20 | `020-soups` | Soups | All our soups are served with a side of lime, cilantro, and onions. | `Soup-house.jpg` |
| 30 | `030-tacos` | Tacos | Three corn tacos filled with your choice of meat, garnished with onions and cilantro. Green or red salsa on the side. | `tacos-Carne-asada.jpg` |
| 40 | `040-tortas` | Tortas | All our tortas are stacked with layers of refried beans, mayo, fresh lettuce, tomatoes, onions, and jalapeño peppers. | `cuban.jpg` |
| 50 | `050-sopes-huaraches` | Sopes & Huaraches | — | — |
| 60 | `060-quesadillas` | Quesadillas | Made with grilled corn dough, stuffed with your choice of filling. Topped with cheese, lettuce, and cream. | — |
| 70 | `070-tostadas` | Tostadas | Three crispy corn tortillas topped with refried beans, lettuce, cheese, and cream. | — |
| 80 | `080-enchiladas` | Enchiladas | Four corn tortillas topped with our house-made mild spicy sauce, lettuce, cheese, and cream. Choose green or red. | — |
| 90 | `090-chilaquiles` | Chilaquiles | Crispy tortilla chips in mild spicy green or red sauce. Topped with cream, lettuce, and cheese. | — |
| 100 | `100-burritos-flautas` | Burritos & Flautas | — | `burrito.jpg` |
| 110 | `110-chicken-platters` | Chicken Platters | All our platters are served with house-made rice, beans, and four corn tortillas. | `pollo-ajo.jpg` |
| 120 | `120-beef-platters` | Beef Platters | (same platters note) | `carne-asada-platter.jpg` |
| 130 | `130-pork-platters` | Pork Platters | (same platters note) | `Costillas-en-salsa-verde.jpg` |
| 140 | `140-shrimp-platters` | Shrimp Platters | (same platters note) | `camarones-platter.jpg` |
| 150 | `150-seafood-platters` | Seafood Platters | (same platters note) | `camarones-platter-2.jpg` |
| 160 | `160-signature-platters` | Signature Platters | (same platters note) | — |
| 170 | `170-house-specials` | House Specials | Our house specials are served with house-made rice, beans, and a fresh house salad. | `House-speciality-Pechuga-Rellena.jpg` |
| 180 | `180-veggie` | Veggie Menu | Healthy and flavorful. All our veggie dishes are made with the same grilled vegetables: squash, potatoes, carrots, onions, green peppers, and string beans. | `Veggie-menu-enchiladas-vegetales.jpg` |
| 190 | `190-kids` | Kids Menu | — | `Chicken-Nugets-Kids-Menu.jpg` |
| 200 | `200-sides` | Sides | — | — |
| 210 | `210-drinks` | Drinks | — | — |
| 220 | `220-desserts` | Desserts | — | — |

Every section with an `image` needs an `imageAlt` that names the dish
(e.g. `"Costillas en salsa verde with rice, beans and tortillas"`).

### Items per section

**Every item below gets `"price": 0`** (placeholder, see §3.1). Where an item
lists `variants: Small, Large`, each variant also gets `"price": 0`. Example
of a complete item:

```json
{ "name": "French Fries", "price": 0, "variants": [{ "label": "Small", "price": 0 }, { "label": "Large", "price": 0 }] }
```

**Appetizers**
- Classic Nachos — Topped with melted Monterey Jack cheese, beans, and jalapeños. Served with house-made pico de gallo, lettuce, sour cream, and a sprinkle of fresh cheese. tags: `veggie`
- Classic Nachos with Meat — options: "chicken, beef, Mexican sausage or marinated pork"
- Chips & Pico de Gallo — tags: `veggie`
- Chips & Guacamole — tags: `veggie`
- French Fries — variants: Small, Large
- Grilled Mexican Fresh Cheese — tags: `veggie`
- Grilled Veggies — tags: `veggie`

**Soups**
- Coctel de Camarones — Mexican shrimp cocktail in a tangy tomato sauce with meaty shrimp, slices of avocado, and fresh chopped cilantro and onions.
- Pozole — White chicken pozole made with white hominy. Served with two crispy corn tortillas, lettuce, onions, and fresh radish on the side.
- Caldo de Pollo — Hearty chicken soup with lots of vegetables. Served with corn tortillas.
- Caldo de Res — Beef and vegetable broth. Served with corn tortillas.
- Caldo de Camarón — Hearty shrimp broth. Served with corn tortillas.
- Caldo de Mariscos — Our famous seafood soup with shrimp, fish, mussels, clams, and calamari. Served with corn tortillas. tags: `house-special`

**Tacos**
- Tacos — options: "marinated pork, chicken, Mexican sausage or steak"
- Tacos de Lengua — Beef tongue.
- Tacos Mixtos — Three tacos, each with a different meat.

**Tortas**
- Milanesa de Pollo — Breaded chicken breast.
- Milanesa de Res — Breaded beef steak.
- Carne Asada — Grilled steak.
- Pollo Asado — Grilled chicken.
- Cheese Steak
- Carne Enchilada — Marinated pork.
- Jamón y Queso — Ham and cheese.
- Huevo y Queso — Eggs and cheese.
- Huevos y Chorizo — Eggs and Mexican sausage.
- Hawaiiana — Ham, the sweetness of pineapple, and melted cheese.
- Cubana — Breaded beef, ham, scrambled eggs, and Mexican sausage with melted cheese. tags: `house-special`
- Rusa — Breaded chicken, ham, fresh cheese, and the sweetness of pineapple.

**Sopes & Huaraches**
- Sopes Sencillos — Three oval corn-dough sopes garnished with fresh lettuce, cheese, and cream. tags: `veggie`
- Sopes con Carne — options: "Mexican sausage, chicken, steak or marinated pork"
- Huarache Loco — Topped with your favorite meat, scrambled eggs, lettuce, cream, and cheese. Served with rice and beans. tags: `house-special`

**Quesadillas**
- 2 Quesadillas — options: "cheese, mushrooms, Mexican sausage, chicken, steak, tinga or ham"
- 2 Quesadillas de Camarón — Shrimp quesadillas topped with lettuce, cream, and cheese.

**Tostadas**
- Sencillas — No meat. tags: `veggie`  *(flag to owner: source said "with your choice of meat" on the plain one — confirm)*
- Especiales — options: "Mexican sausage, chicken, steak or marinated pork"
- Tinga — Shredded chicken with sliced onions in a tomato-chipotle sauce.
- Camarón — Shrimp.

**Enchiladas**
- Sencillas — tags: `veggie`
- Con Carne — options: "marinated pork, Mexican sausage, chicken or steak"

**Chilaquiles**
- Sencillos — tags: `veggie`
- Con Carne — options: "marinated pork, Mexican sausage, chicken or steak"
- Con Huevo — With two eggs made your way.

**Burritos & Flautas**
- Burrito — Handmade to order with your favorite meat. Filled with lettuce, tomato, onions, beans, cheese, and rice, wrapped in a warm flour tortilla. options: "Mexican sausage, chicken, steak or marinated pork"
- Flautas — Four crispy fried tacos filled with cheese or chicken. Topped with lettuce, cream, and cheese.

**Chicken Platters**
- Pechuga al Mojo de Ajo — Chicken breast tossed in garlic butter sauce.
- Pechuga a la Mexicana — Chicken breast with jalapeños, onions, and fresh tomato sauce.
- Pechuga Entomatada — Marinated chicken breast cooked tender and juicy in fresh tomato sauce.
- Fajitas de Pollo — Chicken fajitas with sautéed onions, green peppers, and fresh tomatoes.
- Pechuga en Salsa Verde — Grilled chicken breast in green sauce.

**Beef Platters**
- Bistec a la Mexicana — Steak cooked with jalapeños, onions, and fresh tomatoes.
- Bistec Encebollado — Steak with sautéed onions.
- Bistec Entomatado — Tender steak tossed in fresh tomato sauce.
- Fajitas de Bistec — Steak fajitas with sautéed onions, green peppers, and fresh tomatoes.
- Bistec en Salsa Verde — Skirt steak in green sauce.

**Pork Platters**
- Costillas en Salsa Verde — Pork ribs in a mildly spicy green sauce. tags: `house-special`
- Chicharrón — Fried pork skin in our mild house-made sauce, red or green.

**Shrimp Platters**
- Camarones a la Mexicana — Sautéed shrimp with jalapeños, onions, and tomato.
- Camarones Encebollados — Tender shrimp with sautéed onions.
- Camarones al Mojo de Ajo — Shrimp sautéed in garlic butter sauce.
- Camarones a la Diabla — Shrimp tossed in a diabolically hot tomato sauce. tags: `spicy`

**Seafood Platters**
- Filete Frito — Fried tilapia.
- Camarones Fritos — Fried shrimp.

**Signature Platters**
- Fajitas Mixtas — A fusion of fresh sautéed steak, chicken, and shrimp. tags: `house-special`

**House Specials**
- Pechuga Asada — Marinated chicken breast grilled to tender, juicy perfection.
- Milanesa de Pollo — Breaded boneless, skinless chicken breast.
- Pechuga Rellena — Chicken breast stuffed with cheese and ham. Includes grilled vegetables. tags: `house-special`
- Carne Asada — Tender grilled steak.
- Milanesa de Res — Breaded beef steak, golden brown.
- Carne Enchilada — Marinated pork.
- Chuleta Como a Ti Te Gusta — Pork chops cooked to order your way, grilled or stewed.

**Veggie Menu** (all items tags: `veggie`)
- 3 Sopes
- 2 Quesadillas
- 3 Tostadas
- Veggie Burrito
- Veggie Nachos
- 4 Enchiladas — Topped with your favorite sauce: green, red, or mole.
- 3 Veggie Tacos

**Kids Menu** (all items tags: `kids`)
- Chicken Tenders with Fries
- Chicken Nuggets

**Sides**
- Guacamole
- Pico de Gallo
- Crema — Cream.
- Queso — Cheese.
- Arroz y Frijoles — Rice and beans. variants: Small, Large
- House Salad — Tomatoes, onions, cucumbers, green peppers, and house dressing. variants: Small, Large

**Drinks**
- Horchata — Agua fresca.
- Jamaica — Agua fresca.
- Tamarindo — Agua fresca.
- Shakes
- Coffee
- Té
- Hot Chocolate

**Desserts**
- Flan Napolitano
- Gelatina

---

## 5. Design spec

### 5.1 Page anatomy (`src/pages/menu.astro`)

```
<BaseLayout title="Menu | Los Mariachis, CITY" description=(SEO-PLAN §3 text) jsonLd={menuSchema}>
  1. Intro band
  2. <MenuNav sections={…} />          sticky
  3. <div class="max-w-5xl mx-auto px-6">
       <MenuSection … /> × 22
     </div>
  4. Closing band
</BaseLayout>
```

**1. Intro band** — `bg-cream`, `pt-28 pb-16 text-center px-6`, inside `max-w-3xl mx-auto`:
- eyebrow: `text-terracotta text-xs tracking-[0.3em] uppercase font-medium mb-6` → "Family Owned · Made from Scratch"
- `<h1 class="font-heading text-5xl sm:text-6xl md:text-7xl text-charcoal leading-[1.05] mb-6">Our Menu</h1>`
- the three-piece separator from `Hero.astro` (line · dot · line) but in `terracotta` instead of gold, `mb-6`
- lede: `text-lg text-warm-gray max-w-xl mx-auto leading-relaxed` → "Recipes our family has cooked for years — house-made rice and beans, fresh salsas, and tortillas warmed to order."
- This is the only `<h1>` on the page.

**2. Sticky nav** — see `MenuNav.astro` below.

**3. Sections** — see `MenuSection.astro`. Container `max-w-5xl`. Sections separated by `border-b border-charcoal/10`; the last has no border.

**4. Closing band** — `bg-cream-dark py-16 px-6 text-center`, `max-w-2xl mx-auto`:
- `<p class="font-heading text-2xl md:text-3xl text-charcoal mb-4">` "Questions about allergies or a dish? Just ask."
- `<p class="text-sm text-warm-gray mb-8">` "Prices subject to change. Some items may not be available every day."
- two buttons, same classes as the Hero CTAs but terracotta: primary `bg-terracotta text-cream hover:bg-terracotta/90` → `href="tel:+1-TODO"` "Call Us"; secondary `border border-terracotta/40 text-terracotta hover:bg-terracotta/10` → `href="/contact/"` "Hours & Directions".

### 5.2 `MenuNav.astro`

Props: `sections: { id: string; name: string }[]`.

```html
<nav aria-label="Menu sections" class="sticky top-0 z-20 bg-cream/95 backdrop-blur border-y border-charcoal/10">
  <ul class="max-w-5xl mx-auto px-6 flex gap-7 overflow-x-auto py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <li><a href="#appetizers" class="whitespace-nowrap text-xs uppercase tracking-[0.18em] text-warm-gray hover:text-charcoal transition-colors">Appetizers</a></li>
    …
  </ul>
</nav>
```

- Pure anchor links. No JS, no active-state highlighting (that would need JS — stated reason not worth it).
- Sections get `scroll-mt-20` so the sticky bar does not cover the h2.
- Horizontal scroll on mobile; fits on one line at `lg` (22 short labels ≈ fits in 1024px at this tracking; if it wraps at lg, allow `lg:flex-wrap lg:justify-center` instead of scrolling).
- Add a fade hint on the right edge on small screens: a `pointer-events-none absolute right-0 inset-y-0 w-10 bg-gradient-to-l from-cream lg:hidden`.

### 5.3 `MenuSection.astro`

Props: `id`, `index` (1-based), `name`, `note?`, `image?`, `imageAlt?`, `items`.

```html
<section id={id} class="scroll-mt-20 py-14 md:py-20 border-b border-charcoal/10 last:border-b-0 animate-reveal" aria-labelledby={`${id}-heading`}>
  <header class="grid gap-6 md:grid-cols-[1fr_auto] md:items-end mb-10">
    <div>
      <span class="block text-terracotta text-xs tracking-[0.3em] font-medium mb-3">{String(index).padStart(2,'0')}</span>
      <h2 id={`${id}-heading`} class="font-heading text-3xl md:text-4xl text-charcoal leading-tight">{name}</h2>
      {note && <p class="mt-3 text-sm italic text-warm-gray max-w-prose leading-relaxed">{note}</p>}
    </div>
    {image && <Image … class="w-full md:w-56 aspect-[4/3] object-cover rounded-sm" />}
  </header>
  <ul class="grid md:grid-cols-2 gap-x-12 gap-y-7" role="list">
    {items.map(item => <MenuItem {...item} />)}
  </ul>
</section>
```

- `<Image>` props: `widths={[320, 448, 896]}`, `sizes="(min-width: 768px) 224px, 100vw"`, `format="webp"`, `quality={75}`, `loading="lazy"`, `decoding="async"`, `alt={imageAlt}`. Resolve the filename with `import.meta.glob('../../assets/*.jpg', { eager: true, import: 'default' })`; if the filename is not found, throw a build error with the section name (don't silently drop the photo).
- Sections with ≤ 3 items: keep the 2-col grid; it just looks like a short list. Do not special-case.
- Delay classes: none. One `.animate-reveal` per section is enough; per-item reveals look fussy.

### 5.4 `MenuItem.astro`

Props: `name`, `description?`, `price`, `options?`, `variants?`, `tags?`.

```html
<li>
  <div class="flex items-baseline gap-3">
    <h3 class="font-heading text-lg md:text-xl text-charcoal">{name}</h3>
    {tags?.map(t => <span class="…badge">{label}</span>)}
    {!variants && (
      <>
        <span aria-hidden="true" class="flex-1 border-b border-dotted border-charcoal/30 -translate-y-1"></span>
        <span class="text-charcoal font-medium tabular-nums">{fmt(price)}</span>
      </>
    )}
  </div>
  {description && <p class="mt-1.5 text-sm text-warm-gray leading-relaxed">{description}</p>}
  {options && <p class="mt-1.5 text-xs text-terracotta tracking-wide"><span class="uppercase tracking-[0.15em]">Choose</span> · {options}</p>}
  {variants && (
    <ul class="mt-1.5 flex flex-wrap gap-x-5 text-sm text-charcoal tabular-nums" role="list">
      {variants.map(v => <li>{v.label} {fmt(v.price)}</li>)}
    </ul>
  )}
</li>
```

- `fmt(price)` → `$12` for whole dollars, `$12.50` otherwise, and `$0.00` for the placeholder `0` (so it's obviously unset, not "free"). Implement: `price === 0 ? '$0.00' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(price)`.
- When `variants` is present, the top-level price and dotted leader are not rendered; sizes carry the prices.
- Badges: `text-[10px] uppercase tracking-[0.15em] px-1.5 py-0.5 border rounded-sm leading-none`. Colors: `spicy` → `border-terracotta/50 text-terracotta`, `veggie` → `border-gold-dark/50 text-gold-dark`, `house-special` → `bg-charcoal text-cream border-charcoal`, `kids` → `border-warm-gray/50 text-warm-gray`. Labels: "Spicy", "Veggie", "House Special", "Kids". No emoji.
- `h3` per dish is required by SEO-PLAN §1.

### 5.5 Print stylesheet (in `src/styles/global.css`)

Cheap, and owners of family restaurants print things. Add:

```css
@media print {
  nav[aria-label="Menu sections"] { display: none; }
  .animate-reveal { animation: none; opacity: 1; transform: none; }
}
```

Nothing else. Do not touch other rules in `global.css`.

---

## 6. JSON-LD (`src/pages/menu.astro` frontmatter)

Build one object and pass it as `jsonLd` to `BaseLayout`:

```ts
const menuSchema = {
  '@context': 'https://schema.org',
  '@type': 'Menu',
  name: 'Los Mariachis Menu',
  url: new URL('/menu/', Astro.site).href,
  hasMenuSection: sections.map(s => ({
    '@type': 'MenuSection',
    name: s.data.name,
    description: s.data.note,
    hasMenuItem: s.data.items.map(i => ({
      '@type': 'MenuItem',
      name: i.name,
      description: i.description,
      ...(i.price > 0 && { offers: { '@type': 'Offer', price: i.price, priceCurrency: 'USD' } }),
    })),
  })),
};
```

Strip `undefined` keys (`JSON.stringify` already drops them). Placeholder
prices (`0`) produce no `offers` — never publish a $0 price in structured data.
`Astro.site` must be set — Task 1 sets it to the placeholder from SEO-PLAN §0.

---

## 7. Tasks — do them in order, one at a time

Each task lists the files it may touch. If you believe another file needs
changing, say so and wait.

### Task 1 — Config
Files: `astro.config.mjs`, `src/content.config.ts` (new)
- Add to `astro.config.mjs`: `site: 'https://PLACEHOLDER-DOMAIN.example'`, `trailingSlash: 'always'`.
- Create `src/content.config.ts` with the schema in §3.1.
- Run `npx astro sync` — must exit 0. Stop.

### Task 2a — Content files, sections 10–60
Files: `src/content/menu/010-…` through `060-…` (6 new files)
- Write the JSON from §4 exactly. Use one bash heredoc per file or a single script that writes all six — either way ≤ 5 tool calls.
- Run `npx astro sync`. Stop.

### Task 2b — Content files, sections 70–120 (6 files). `npx astro sync`. Stop.
### Task 2c — Content files, sections 130–180 (6 files). `npx astro sync`. Stop.
### Task 2d — Content files, sections 190–220 (4 files). `npx astro sync`. Stop.

### Task 3 — PagesCMS config
Files: `.pages.yml` (new)
- Check the PagesCMS docs for the current field-type names and JSON collection support, then write §3.2 adjusted to what the docs say. Note in your reply anything you changed from the draft and why. Stop.

### Task 4 — `src/components/menu/MenuItem.astro` (new). Spec §5.4. Stop.

### Task 5 — `src/components/menu/MenuSection.astro` (new). Spec §5.3. Imports `MenuItem`. Stop.

### Task 6 — `src/components/menu/MenuNav.astro` (new). Spec §5.2. Stop.

### Task 7 — BaseLayout `jsonLd` prop (needs approval — ask before editing)
Files: `src/layouts/BaseLayout.astro`
- Add `jsonLd?: Record<string, unknown>` to `Props`.
- After the existing JSON-LD block, add: `{jsonLd && <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />}`.
- Do **not** fix the existing literal-template JSON-LD block in this task; that is SEO-PLAN work and a separate ask. Stop.

### Task 8 — `src/pages/menu.astro` (new)
- Frontmatter: `getCollection('menu')`, sort by `data.order`, build `sections` for the nav (`{ id: entry.id, name: entry.data.name }`), build `menuSchema` (§6).
- Body: §5.1 anatomy. Title/description from SEO-PLAN §3 (keep `CITY` placeholder literally).
- Add the print rules from §5.5 to `global.css` in this task (2 files total).
- `npm run build` must succeed. Stop.

### Task 9 — Hero link (needs approval — ask before editing)
Files: `src/components/Hero.astro`
- `href="#menu"` → `href="/menu/"` on the "View Menu" button. Nothing else. Stop.

### Task 10 — Verification (no file edits)
- `npm run build` clean.
- `npm run preview`, open `http://localhost:4321/menu/`, and confirm:
  - exactly one `<h1>`; 22 `<h2>`; every dish is an `<h3>`
  - `<script type="application/ld+json">` contains `"@type":"Menu"` with 22 sections and **no** `"offers"` key (all prices are still placeholders)
  - every dish row shows `$0.00` right-aligned on a dotted leader; sized items show `Small $0.00 · Large $0.00`
  - `grep -c '"price": 0' src/content/menu/*.json` — every file returns a count ≥ 1 (proves no price was invented)
  - no `<script>` other than JSON-LD in `dist/menu/index.html` (`grep -c "<script" dist/menu/index.html` → expect 2 with the existing sitewide block, or 1 if it's been removed)
  - all `<img>` in `dist/menu/index.html` have non-empty `alt` and `loading="lazy"`
  - sticky nav scrolls horizontally at 375px width without page overflow
  - Lighthouse on `/menu/` in Chrome (incognito, mobile): report all four scores; anything under 100, list the audit that failed
- Report the SEO-PLAN §8 checklist line by line. Note that `sitemap-index.xml` will be missing because `@astrojs/sitemap` is not installed — that is out of scope here; say so rather than installing it.

---

## 8. Open questions for the owner (do not guess — collect in your final report)

1. Prices for every item — all currently `$0.00` placeholders; the owner fills them in PagesCMS. Launch is blocked until `grep -c '"price": 0' src/content/menu/*.json` is 0 everywhere.
2. "Tostadas Sencillas" — with or without meat?
3. "Beef Tongue" in the Others list — is that a torta, a platter, or just the Lengua tacos?
4. Sizes/prices for French Fries, Arroz y Frijoles, House Salad (small/large).
5. Which sections should get the photos listed in §4 — the assignments are best guesses from filenames.
6. Are there daily specials? (The brief mentions "specials" as CMS content — not in this menu; would be a separate collection.)
