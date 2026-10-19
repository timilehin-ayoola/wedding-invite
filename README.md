# Wedding invitation

A one-page wedding invitation for family and friends, shared by link. Guests
open it straight from WhatsApp — no password, no app, no sign-up.

It includes: the invitation itself, a live countdown to the day, your story, an
order of the day, the venue with a map link, a photo gallery, a **link out** to
your own gift page, a short FAQ, and your contact details for replies.

There is deliberately **no RSVP form and no payment handling**. Guests reply to
you directly, and any giving happens on a gift page you already own.

---

## 1. Change your details — one file

Everything guests read lives in **`src/data/wedding.ts`**. That is the only file
you need to edit. Every line is commented and the content is clearly marked as
placeholder.

Open it and work through the sections in order:

| Section | What it controls |
| --- | --- |
| `meta` | Browser tab title, and the text under the link when it is shared |
| `couple` | Your two names, the monogram (`A&T`), your hashtag |
| `date` | The real date/time, and the wording guests see. **See below.** |
| `venue` | Venue name, address lines, Google Maps link, arrival notes |
| `hero` | The line above your names and the tagline under them |
| `story` | Your story, plus the milestone list (year / title / one line) |
| `schedule` | The order of the day — add or remove rows freely |
| `gallery` | Photo list (see §2) |
| `gift` | Your gift link and its wording (see §3) |
| `faq` | Questions and answers |
| `replies` | Who guests should message, and by when |
| `footer` | Closing line, signature, and the text used when sharing |

### The date matters most

```ts
iso: "2027-06-12T15:00:00+01:00",   // machine-readable: drives countdown + calendar
long: "Saturday, 12 June 2027",     // how guests read it
```

`iso` must be a real date with your timezone offset (`+01:00` = Lagos / West
Africa Time) and must agree with `long`, or the countdown and the
"add to calendar" file will disagree with the printed date. Keep the four-digit
year correct — it is what the countdown counts to.

When the day passes, the countdown automatically swaps to
`countdownPastLabel` instead of counting backwards.

---

## 2. Photos

The gallery ships with six placeholder images in `public/gallery/`. To use your
own:

1. Put your photos in `public/gallery/`.
2. Point each entry in `gallery.photos` at the file, e.g.
   `{ src: "/gallery/amara-tunde-01.jpg", alt: "…", caption: "…", shape: "wide" }`.
3. Write a real `alt` description for each one — it is what a guest using a
   screen reader hears.
4. `shape` is `"wide"` or `"tall"` and controls how the photo is cropped.

Before uploading, resize photos to about **1200–1600 px on the long edge** and
keep each under ~300 KB. Six large phone photos straight off a camera can easily
add 30 MB and make the page slow on mobile data.

## 3. The gift link

```ts
url: "https://example.com/our-gift-page",   // replace this
```

Replace it with the URL of the gift page you already use (GoFundMe, PayPal,
a bank-details page — whatever you have). The button opens it in a new tab with
`rel="noopener noreferrer"`.

The site itself never collects money or card details, which is why it stays a
simple, static page. If you would rather not mention gifts at all, delete the
whole `section--gift` block from the layout in `src/pages/index.astro`, or leave
`gift.alternatives` empty and soften `gift.message`.

---

## 4. Privacy

- Every guest page is marked `<meta name="robots" content="noindex, nofollow">`,
  so search engines stay out. The page is still public to **anyone who has the
  link** — treat the link as the invitation.
- Nothing is stored: no analytics, no cookies, no form submissions, no backend.
- Your phone numbers appear in the replies section. That is intentional (guests
  need them) and safe from search engines, but it is worth knowing before you
  share the link somewhere very public.

---

## 5. Commands

Node **22.22 or newer** is required (Astro's own requirement).

```bash
npm install          # once
npm run dev          # local preview at http://localhost:4321
npm run build        # production build into dist/
npm run preview      # serve the built dist/ locally
npm run check        # type-check; catches mistyped field names in wedding.ts
npm run verify       # automated browser + no-JS checks (see §7)
npm run share-card   # regenerate the WhatsApp/#link preview image (see §6)
```

---

## 6. The link preview image

When the link is pasted into WhatsApp, iMessage, Instagram or Facebook, it shows
a 1200×630 card instead of plain text. That image is
`public/share-card.png`, generated from `src/pages/share-card.astro`.

**After you change the names, date or venue, regenerate it** (the dev server
must be running):

```bash
npm run dev        # in one terminal
npm run share-card # in another
```

The card uses the same fonts and colours as the invitation, so it always
matches.

---

## 7. What `npm run verify` checks

Start the site first (`npm run dev` or `npm run preview`), then run
`npm run verify`. It drives a real headless Chrome over the page at phone and
desktop sizes and proves, automatically:

- the page renders with **no console errors and no failed requests**;
- **no JavaScript at all** still shows the whole invitation, including a
  server-rendered countdown (the live countdown is an enhancement, not a
  requirement);
- with **reduced motion** requested, nothing stays hidden behind an animation;
- every text/background pair meets **WCAG AA contrast**, and every tap target is
  at least 24×24 px;
- no horizontal scrolling, no broken images, one clear `<h1>`, sensible heading
  order, a skip link, and working `lang`/`title`/`robots` metadata;
- the external gift link carries `rel="noopener"`;
- the "add to calendar" file matches the date printed on the page.

It writes screenshots to `tools/verification/` and a machine-readable summary to
`tools/verification/report.json`.

It needs a Chrome binary. It uses Playwright's cached headless Chromium by
default; override with `CHROME_BIN=/path/to/chrome` and, on a minimal Linux box,
`CHROME_LIBS=/path/to/extra/libs`.

---

## 8. Deploying (GitHub Pages)

The site is fully static — no server, no database. Every push to `main` runs
`.github/workflows/deploy.yml`, which builds the site and publishes it to GitHub
Pages:

**https://timilehin-ayoola.github.io/wedding-invite/**

One-time setup, in the repository:

1. **Settings → Pages → Source: “GitHub Actions”.** (The first workflow run tries
   to switch this on for you; if it fails, set it by hand and re-run the job.)
2. On **GitHub Free**, Pages only publishes from **public** repositories. Private
   repositories need GitHub Pro. Either way the published site is public — which
   is fine for an invitation shared by link, but remember that in a *public* repo
   anyone can read `src/data/wedding.ts`, including any phone numbers.
3. Push to `main` and watch the **Actions** tab.

### The `/wedding-invite/` prefix

A GitHub Pages *project* site lives under a sub-path, not at the domain root, so
`astro.config.mjs` sets:

```js
site: "https://timilehin-ayoola.github.io",
base: "/wedding-invite/",
```

`base` **must match the repository name**. If you rename the repo, change it. All
internal links go through `withBase()` in `src/utils/base.ts`, so you do not need
to edit any page.

### Custom domain later

Add a `public/CNAME` file containing the domain, then set `site` to
`https://your-domain.com` and `base` to `/` (or run the build with
`SITE_BASE=/`). Both values also accept the `SITE_URL` / `SITE_BASE` environment
variables, which is handy if you host somewhere else in future.

### After changing names, date or venue

The link preview image is a pre-rendered PNG, so regenerate it before pushing:

```bash
npm run build && npm run preview    # in one terminal
npm run share-card                  # in another
```

---

## 9. Project layout

```
src/
  data/wedding.ts        ← the only file you edit for content
  pages/
    index.astro          the invitation (Classic Elegant styling)
    wedding.ics.ts       "add to calendar" file, built from the same date
    share-card.astro     source for the 1200x630 link-preview image
  components/
    Head.astro           titles, social-share meta, privacy, fonts
    Countdown.astro      countdown markup + a no-JS fallback
    Behaviours.astro     scroll reveals, live countdown, copy-link (plain JS)
    Sprig.astro          small floral divider (used by the floral alternate)
  styles/base.css        reset, focus styles, reveal + reduced-motion rules
  utils/base.ts          sub-path helper (GitHub Pages /wedding-invite/)
  design-alternates/     two unused design directions (not built)
public/
  gallery/               placeholder photos
  share-card.png         generated link-preview image
tools/
  verify.mjs             the automated checks
  make-share-card.mjs    renders share-card.png
```

### The other design directions

Two alternative designs were built and not used. They are kept in
`src/design-alternates/`, which sits **outside** `src/pages`, so they are never
built or published. To look at one again, copy it into `src/pages/`:

```bash
cp src/design-alternates/floral.astro src/pages/floral.astro   # → /floral/
```

Delete the copy afterwards so it does not ship to guests.
