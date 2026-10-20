/**
 * ============================================================================
 *  THIS IS THE ONLY FILE YOU NEED TO EDIT TO UPDATE YOUR WEDDING DETAILS.
 * ============================================================================
 *
 *  Everything below is PLACEHOLDER CONTENT. Replace the names, dates, venue,
 *  story, photos, FAQ and gift link with your real details, then rebuild.
 *  Text in "quotes" is yours to change. Lines starting with // are notes.
 *
 *  After editing, run:  npm run build     (or `npm run dev` to preview)
 */

export type Photo = { src: string; alt: string; caption?: string; shape?: "wide" | "tall" };

export const wedding = {
  /* ------------------------------------------------------------------ meta */
  // Used for the browser tab and the preview card that appears when the link
  // is shared in WhatsApp, Instagram, iMessage, etc.
  meta: {
    title: "Timilehin & Fathia — Court Wedding Invitation",
    description:
      "Timilehin and Fathia are having their court wedding on Saturday, 15 November 2026 in Lagos. You are specially invited.",
    // Kept out of search engines so only people you send the link to can find
    // it. The page itself is public to anyone who has the link.
    noindex: true,
  },

  /* ------------------------------------------------------------- the couple */
  couple: {
    partnerOne: "Timilehin",
    partnerTwo: "Fathia",
    // Two letters, used as the little monogram / logo.
    monogram: "A&T",
    // Optional: a hashtag guests can use when posting photos.
    hashtag: "#TimilehinAndFathia2026",
  },

  /* ------------------------------------------------------------------ date */
  date: {
    // Machine-readable date & time, with the timezone offset (+01:00 = Lagos).
    // This drives the live countdown AND the "add to calendar" file.
    iso: "2026-11-15T15:00:00+01:00",
    // How the date reads to guests.
    long: "Saturday, 15 November 2026",
    short: "15 · 11 · 2026",
    // Shown next to the countdown when the big day is still ahead.
    countdownLabel: "until we say “I do”",
    // Shown once the date has passed.
    countdownPastLabel: "Married at last. Thank you for celebrating with us.",
    ceremonyTime: "3:00 PM",
    receptionTime: "5:30 PM",
    timezoneLabel: "West Africa Time (GMT+1)",
  },

  /* ----------------------------------------------------------------- venue */
  venue: {
    name: "The Grand Garden Estate",
    addressLines: ["12 Marina Crescent", "Lekki Phase 1", "Lagos, Nigeria"],
    // Any Google Maps link works — open the venue on Maps and copy the URL.
    mapUrl: "https://maps.google.com/?q=Lekki+Phase+1+Lagos",
    mapLabel: "Open in Google Maps",
    directions:
      "Gate opens at 2:30 PM. There is ample parking inside the compound, and the entrance is step-free.",
  },

  /* -------------------------------------------------------- hero invitation */
  hero: {
    kicker: "Together with our families",
    invitation: "You are warmly invited",
    guestGreeting: "Hello,",
    // One heartfelt line. Keep it short — it sits under your names.
    tagline: "Our court wedding — and we would love for you to celebrate with us.",
  },

  /* --------------------------------------------------------------- our story */
  story: {
    heading: "Our story",
    intro: "Every love story is beautiful. This is ours, told briefly.",
    paragraphs: [
      "We've been in the same environment since 2022, but we only started actually talking on 22 March 2025.",
      "We officially started dating on 6 May 2025. Now we're getting married by court on 15 November 2026 — and we can't wait to celebrate with you.",
    ],
    milestones: [
      { year: "2022", title: "Same space", text: "We were in the same environment, paths hadn't crossed in conversation yet." },
      { year: "22 Mar 2025", title: "First conversation", text: "We started talking on 22 March 2025." },
      { year: "6 May 2025", title: "We started dating", text: "We officially began dating on 6 May 2025." },
      { year: "15 Nov 2026", title: "Court wedding", text: "Our court wedding — the beginning of forever." },
    ],
  },

  /* --------------------------------------------------------------- the day */
  // Times can be written however they read most naturally to your guests.
  schedule: [
    { time: "2:30 PM", title: "Arrival & welcome drinks", detail: "Live palm-wine bar and small chops on the lawn." },
    { time: "3:00 PM", title: "Ceremony", detail: "Please be seated by 2:50 PM." },
    { time: "4:00 PM", title: "Cocktails & photos", detail: "Group photos on the garden steps." },
    { time: "5:30 PM", title: "Reception & dinner", detail: "Speeches, toasts and lots of dancing." },
    { time: "10:00 PM", title: "Last dance", detail: "Carriages at 11:00 PM." },
  ],

  /* --------------------------------------------------------------- gallery */
  gallery: {
    heading: "Us, lately",
    intro: "A few moments we love. Photos are placeholders — swap in your own.",
    // Files live in /public/gallery. Add or remove entries freely.
    photos: [
      { src: "/gallery/photo-1.svg", alt: "Placeholder photo one", caption: "Where it started", shape: "wide" },
      { src: "/gallery/photo-2.svg", alt: "Placeholder photo two", caption: "Our first trip", shape: "tall" },
      { src: "/gallery/photo-3.svg", alt: "Placeholder photo three", caption: "Sunday mornings", shape: "wide" },
      { src: "/gallery/photo-4.svg", alt: "Placeholder photo four", caption: "The proposal", shape: "tall" },
      { src: "/gallery/photo-5.svg", alt: "Placeholder photo five", caption: "Family dinner", shape: "wide" },
      { src: "/gallery/photo-6.svg", alt: "Placeholder photo six", caption: "Just us", shape: "tall" },
    ] as Photo[],
  },

  /* ------------------------------------------------------------- gift / giving */
  // This is a LINK OUT to a gift page you already own (GoFundMe, PayPal,
  // bank details page, etc.). The site never handles payments itself.
  gift: {
    heading: "With love, and gratitude",
    // The honest, pressure-free framing is deliberate — keep it kind.
    message:
      "Your presence is the greatest gift we could ask for. If you would still like to bless us with something, we have opened the link below — entirely optional, and only if it brings you joy.",
    note: "No pressure at all. A card, a prayer or a warm hug means every bit as much, and we mean that.",
    ctaLabel: "Give a gift (optional)",
    // IMPORTANT: replace with your real gift link.
    url: "https://example.com/our-gift-page",
    urlLabel: "opens in a new tab",
    alternatives: [
      { label: "Account Name", detail: "Your Account Name" },
      { label: "Bank", detail: "Your Bank Name" },
      { label: "Account Number", detail: "Your Account Number" },
    ],
  },

  /* ------------------------------------------------------------------- FAQ */
  faq: {
    heading: "Good to know",
    items: [
      { q: "What should I wear?", a: "Traditional or formal — whatever makes you feel wonderful. The ceremony is outdoors on grass, so comfortable shoes help." },
      { q: "Can I bring my children?", a: "Yes, children are very welcome. There is a supervised play corner from 4:00 PM." },
      { q: "Can I bring a plus one?", a: "If your invitation names them, absolutely. If you would like to bring someone, just message us and we will do our best." },
      { q: "Do I have to give a gift?", a: "Never. Your company is the gift. The gift link is only for anyone who genuinely wants to help — see the note in the section above." },
      { q: "What about parking and access?", a: "Free parking is available inside the estate, and the venue is step-free throughout." },
    ],
  },

  /* --------------------------------------------------------------- replies */
  // There is no RSVP form on this site. Guests reply to you directly.
  replies: {
    heading: "Let us know you're coming",
    text: "Kindly reply so we can plan — a message is all it takes.",
    contacts: [
      { name: "Timilehin", channel: "WhatsApp", value: "+234 000 000 0000" },
      { name: "Fathia", channel: "WhatsApp", value: "+234 000 000 0000" },
    ],
  },

  /* ---------------------------------------------------------------- footer */
  footer: {
    closing: "We cannot wait to celebrate with you.",
    signature: "With all our love, Timilehin & Fathia",
    // Used by the "share this invite" button.
    shareText: "You're invited to Timilehin & Fathia's court wedding — Saturday, 15 November 2026",
  },
};

export type Wedding = typeof wedding;
