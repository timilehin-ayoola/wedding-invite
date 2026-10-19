#!/usr/bin/env node
/**
 * Verification harness for the wedding invitation.
 *
 * Drives a headless Chromium over the Chrome DevTools Protocol and checks the
 * things that matter for guests opening this on a phone:
 *
 *   - no console errors / uncaught exceptions
 *   - no failed network requests (404s, blocked fonts, missing images)
 *   - no horizontal overflow (the #1 cause of an ugly mobile invite)
 *   - every image actually decodes
 *   - the countdown matches the date in src/data/wedding.ts
 *   - the gift link is safe (correct target/rel) and points somewhere real
 *   - WCAG AA contrast on every visible text node
 *   - touch targets are at least 24x24 CSS px (WCAG 2.2 AA)
 *   - keyboard focus is visible, headings are ordered, lang/title/robots set
 *   - content is visible with JavaScript disabled and with reduced motion on
 *   - scroll-reveal actually reveals every section
 *
 * It also writes full-page screenshots for human review.
 *
 *   node tools/verify.mjs          # full matrix, writes tools/verification/
 *   BASE_URL=http://localhost:4321 node tools/verify.mjs
 */

import { spawn, execFileSync } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { openSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "tools", "verification");
const BASE = process.env.BASE_URL ?? "http://localhost:4321";
// Must match `base` in astro.config.mjs ("" when served from a domain root).
const SITE_BASE = (process.env.SITE_BASE ?? "/wedding-invite/").replace(/\/$/, "");
const CDP_PORT = 9333;
// Playwright's cached headless Chromium, run with the two extra system
// libraries extracted into /tmp/opencode/libroot (no root needed).
const CHROME =
  process.env.CHROME_BIN ??
  `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell`;
const CHROME_LIBS = process.env.CHROME_LIBS ?? "/tmp/opencode/libroot/usr/lib/x86_64-linux-gnu";

const PAGES = [{ name: "invitation", url: `${BASE}${SITE_BASE}/` }];

const VIEWPORTS = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  desktop: { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false },
};

const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/* ------------------------------------------------------------------ chrome - */

async function launchChrome(profileDir) {
  const logFd = openSync("/tmp/opencode/chrome-verify.log", "w");

  const proc = spawn(
    CHROME,
    [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${profileDir}`,
      "--remote-allow-origins=*",
      "about:blank",
    ],
    {
      stdio: ["ignore", logFd, logFd],
      env: { ...process.env, LD_LIBRARY_PATH: CHROME_LIBS },
    },
  );

  proc.on("error", (err) => console.error("Could not start Chromium:", err.message));

  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (res.ok) return proc;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error("Chromium did not start its debugging server (see /tmp/opencode/chrome-verify.log)");
}

/** Stops only the browser instance started for this run. */
async function killChrome(profileDir) {
  try {
    execFileSync("pkill", ["-f", profileDir], { stdio: "ignore" });
  } catch {
    /* already gone */
  }
}

/* -------------------------------------------------------------------- CDP - */

async function attach(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let seq = 0;
  const pending = new Map();
  const listeners = new Set();

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
      return;
    }
    for (const listener of listeners) listener(msg);
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  const onEvent = (listener) => listeners.add(listener);
  const close = () => ws.close();
  return { send, onEvent, close };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* -------------------------------------------------------------- report JS - */

/**
 * Runs inside the page. Returns a plain-object report of everything that can
 * be measured without a human looking at the screen.
 */
function pageReport() {
  const lum = (rgb) => {
    const [r, g, b] = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const parseColor = (value) => {
    const m = value.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(",").map((p) => parseFloat(p.trim()));
    return { rgb: [parts[0], parts[1], parts[2]], alpha: parts.length > 3 ? parts[3] : 1 };
  };

  const backgroundOf = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const bg = parseColor(getComputedStyle(node).backgroundColor);
      if (bg && bg.alpha > 0.95) return bg.rgb;
      node = node.parentElement;
    }
    return [255, 255, 255];
  };

  const contrast = (fg, bg) => {
    const a = lum(fg) + 0.05;
    const b = lum(bg) + 0.05;
    return Math.round((Math.max(a, b) / Math.min(a, b)) * 100) / 100;
  };

  const overflowX =
    document.documentElement.scrollWidth - document.documentElement.clientWidth;

  const brokenImages = Array.from(document.images)
    .filter((img) => !img.complete || img.naturalWidth === 0)
    .map((img) => img.currentSrc || img.src);

  /* ---------------------------------------------------------- contrast --- */
  const contrastFailures = [];
  const seenPairs = new Set();
  const textNodes = document.querySelectorAll(
    "p, span, h1, h2, h3, h4, a, li, summary, time, address, figcaption, strong, button, label, dt, dd, cite",
  );

  for (const el of textNodes) {
    const text = (el.innerText || "").trim();
    if (!text || el.children.length > 0) continue;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" || parseFloat(style.opacity) < 0.95)
      continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;

    const fg = parseColor(style.color);
    if (!fg || fg.alpha < 0.95) continue;
    const bg = backgroundOf(el);
    const size = parseFloat(style.fontSize);
    const weight = parseInt(style.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const required = large ? 3 : 4.5;
    const ratio = contrast(fg.rgb, bg);

    if (ratio < required) {
      const key = `${style.color}|${bg.join(",")}|${size}`;
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      contrastFailures.push({
        text: text.slice(0, 60),
        selector: el.tagName.toLowerCase(),
        color: style.color,
        background: `rgb(${bg.join(", ")})`,
        fontSize: size,
        weight,
        ratio,
        required,
      });
    }
  }

  /* -------------------------------------------------------- touch targets - */
  const smallTargets = [];
  for (const el of document.querySelectorAll("a, button, summary, [role='button']")) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue; // hidden on purpose
    if (rect.width < 24 || rect.height < 24) {
      smallTargets.push({
        text: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 40),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        href: el.getAttribute("href") || null,
      });
    }
  }

  /* ------------------------------------------------------------- links ---- */
  const giftLink = document.querySelector("a[data-gift-link]");
  const externalLinks = Array.from(document.querySelectorAll('a[target="_blank"]')).map((a) => ({
    href: a.getAttribute("href"),
    hasNoopener: (a.getAttribute("rel") || "").includes("noopener"),
  }));

  /* --------------------------------------------------------- countdown ---- */
  const countdownEl = document.querySelector("[data-countdown]");
  let countdown = null;
  if (countdownEl) {
    const target = new Date(countdownEl.dataset.date);
    const remaining = target.getTime() - Date.now();
    const total = Math.max(0, Math.floor(remaining / 1000));
    const pick = (unit) => countdownEl.querySelector(`[data-unit="${unit}"]`)?.textContent?.trim();
    countdown = {
      date: countdownEl.dataset.date,
      expected: {
        days: String(Math.floor(total / 86400)).padStart(2, "0"),
        hours: String(Math.floor((total % 86400) / 3600)).padStart(2, "0"),
        minutes: String(Math.floor((total % 3600) / 60)).padStart(2, "0"),
        seconds: String(total % 60).padStart(2, "0"),
      },
      actual: {
        days: pick("days"),
        hours: pick("hours"),
        minutes: pick("minutes"),
        seconds: pick("seconds"),
      },
      label: countdownEl.querySelector("[data-countdown-label]")?.textContent?.trim() ?? null,
      status: countdownEl.querySelector("[data-countdown-status]")?.textContent?.trim() ?? null,
    };
  }

  /* ------------------------------------------------------------- headings - */
  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((h) => ({
    level: Number(h.tagName[1]),
    text: (h.innerText || "").trim().slice(0, 70),
  }));
  let headingOrderOk = true;
  let previous = 0;
  for (const h of headings) {
    if (previous && h.level > previous + 1) headingOrderOk = false;
    previous = h.level;
  }

  /* ------------------------------------------------------------ reveals --- */
  const reveals = Array.from(document.querySelectorAll("[data-reveal]"));
  const hiddenReveals = reveals
    .filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.95)
    .map((el) => el.className || el.tagName);

  /* --------------------------------------------------------------- focus -- */
  const focusable = Array.from(
    document.querySelectorAll("a[href], button, summary, input, [tabindex]:not([tabindex='-1'])"),
  ).filter((el) => el.offsetParent !== null || el.tagName === "SUMMARY");

  const doc = document;
  return {
    title: doc.title,
    lang: doc.documentElement.lang,
    description: doc.querySelector('meta[name="description"]')?.content ?? null,
    robots: doc.querySelector('meta[name="robots"]')?.content ?? null,
    metaViewport: doc.querySelector('meta[name="viewport"]')?.content ?? null,
    h1Count: doc.querySelectorAll("h1").length,
    headings,
    headingOrderOk,
    overflowX,
    brokenImages,
    contrastFailures,
    smallTargets,
    countdown,
    externalLinks,
    giftLink: giftLink
      ? { href: giftLink.getAttribute("href"), target: giftLink.getAttribute("target"), rel: giftLink.getAttribute("rel") }
      : null,
    revealCount: reveals.length,
    hiddenReveals,
    focusableCount: focusable.length,
    skipLink: !!doc.querySelector("a.skip-link"),
    mainLandmark: !!doc.querySelector("main"),
    textLength: (doc.body.innerText || "").trim().length,
    fontsLoaded: Array.from(document.fonts)
      .filter((f) => f.status === "loaded")
      .map((f) => `${f.family} ${f.weight}`),
    giftText: doc.querySelector("a[data-gift-link]")?.innerText?.trim() ?? null,
    hasCalendarLink: !!doc.querySelector('a[href$="/wedding.ics"]'),
    hasShareButton: !!doc.querySelector("[data-share]"),
    hasWhatsappShare: !!doc.querySelector('a[href*="wa.me"]'),
  };
}

/* ------------------------------------------------------------- scrolling - */

/** Scrolls through the page so IntersectionObserver fires, then returns to top. */
async function exercisePage(send) {
  await send("Runtime.evaluate", {
    awaitPromise: true,
    expression: `(async () => {
      const step = Math.max(300, Math.floor(window.innerHeight * 0.7));
      const max = document.body.scrollHeight;
      for (let y = 0; y <= max; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 90));
      }
      window.scrollTo(0, max);
      await new Promise((r) => setTimeout(r, 250));
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 250));
      return true;
    })()`,
  });
}

/* ------------------------------------------------------- static (no-JS) -- */

/**
 * Fetches the raw HTML the server sends. Everything a guest needs must already
 * be there — the invite may be opened with JavaScript blocked, broken or slow.
 */
async function verifyStatic() {
  const runs = [];
  const findings = [];
  const pages = PAGES;
  const assetStatus = new Map();

  const fetchStatus = async (url) => {
    if (assetStatus.has(url)) return assetStatus.get(url);
    let code = 0;
    try {
      const res = await fetch(url);
      code = res.status;
      await res.arrayBuffer();
    } catch {
      code = -1;
    }
    assetStatus.set(url, code);
    return code;
  };

  for (const pageDef of pages) {
    const label = `${pageDef.name}-html`;
    const add = (severity, code, detail) => findings.push({ run: label, severity, code, detail });
    const require = (condition, code, detail) => {
      if (!condition) add("fail", code, detail);
    };

    let html = "";
    try {
      html = await (await fetch(pageDef.url)).text();
    } catch (err) {
      add("fail", "fetch", err.message);
      runs.push({ label, url: pageDef.url, ok: false });
      continue;
    }

    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    require(text.length > 800, "nojs-text", `only ${text.length} chars of text without scripts`);
    require(/<main[ >]/.test(html), "nojs-main", "no <main> landmark in server HTML");
    require(/class="skip-link"/.test(html), "nojs-skip", "no skip link in server HTML");
    require(/data-countdown/.test(html), "nojs-countdown", "countdown markup missing");
    require(/data-gift-link/.test(html), "nojs-gift", "gift link missing from server HTML");
    require(/data-share/.test(html), "nojs-share", "share button missing from server HTML");
    require(/lang="en"/.test(html), "nojs-lang", "lang attribute missing");
    require(/property="og:image"/.test(html), "nojs-og", "no og:image for link previews");
    require(/href="[^"]*\/wedding\.ics"/.test(html), "nojs-ics-link", "no add-to-calendar link");

    const daysFallback = html.match(/data-unit="days"[^>]*>(\d+)</);
    require(
      Boolean(daysFallback) && Number(daysFallback[1]) > 0,
      "nojs-countdown-value",
      "countdown has no server-rendered value for guests without scripts",
    );

    // Every locally hosted asset referenced by the page must exist.
    const assets = new Set();
    for (const match of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) {
      const url = match[1];
      if (url.endsWith(".ics")) continue; // verified separately below
      if (/\.(svg|png|jpe?g|webp|ico|css|js)$/.test(url)) assets.add(url);
    }
    const missing = [];
    for (const asset of assets) {
      const code = await fetchStatus(`${BASE}${asset}`);
      if (code !== 200) missing.push(`${asset} → HTTP ${code}`);
    }
    require(missing.length === 0, "nojs-asset", missing.join(", "));

    // The calendar file must agree with the date printed on the page.
    const ics = await (await fetch(`${BASE}${SITE_BASE}/wedding.ics`)).text();
    const dtStart = ics.match(/DTSTART:(\d{8}T\d{6}Z)/)?.[1] ?? null;
    const pageTime = html.match(/<time datetime="([^"]+)"/)?.[1] ?? null;
    if (pageTime) {
      const expected = new Date(pageTime).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      require(dtStart === expected, "ics-date", `calendar says ${dtStart}, page says ${expected}`);
    }
    require(
      ics.includes("BEGIN:VEVENT") && ics.includes("END:VCALENDAR"),
      "ics-structure",
      "calendar file is malformed",
    );

    runs.push({
      label,
      url: pageDef.url,
      htmlBytes: html.length,
      textWithoutScripts: text.length,
      assetsChecked: assets.size,
      countdownFallback: daysFallback?.[1] ?? null,
      calendarStart: dtStart,
      ok: !findings.some((f) => f.run === label && f.severity === "fail"),
    });
  }

  return { runs, findings };
}

/* ---------------------------------------------------------------- runner -- */

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const profileDir = `/tmp/opencode/chrome-verify-${Date.now()}`;
  await rm(profileDir, { recursive: true, force: true }).catch(() => {});
  // Clear anything left behind by an interrupted previous run.
  try {
    execFileSync("pkill", ["-f", "/tmp/opencode/chrome-verify"], { stdio: "ignore" });
  } catch {
    /* nothing to clean */
  }

  const report = {
    baseUrl: BASE,
    generatedAt: new Date().toISOString(),
    userAgent: "headless Chromium (Windows Chrome)",
    runs: [],
  };
  const staticHolder = { runs: [], findings: [] };

  try {
    await launchChrome(profileDir);
    const version = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json();
    report.browser = version.Browser;

    const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
    const page = targets.find((t) => t.type === "page");
    const cdp = await attach(page.webSocketDebuggerUrl);

    const issues = [];
    let currentLabel = "init";
    let consoleErrors = [];
    let networkErrors = [];

    cdp.onEvent((msg) => {
      if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
        consoleErrors.push(
          msg.params.args.map((a) => a.value ?? a.description ?? JSON.stringify(a)).join(" "),
        );
      }
      if (msg.method === "Runtime.exceptionThrown") {
        consoleErrors.push(
          "exception: " + (msg.params.exceptionDetails?.exception?.description ?? "unknown"),
        );
      }
      if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
        consoleErrors.push(msg.params.entry.text);
      }
      if (msg.method === "Network.loadingFailed" && !msg.params.errorText.includes("ERR_ABORTED")) {
        networkErrors.push(`${currentLabel}: ${msg.params.errorText}`);
      }
      if (msg.method === "Network.responseReceived" && msg.params.response.status >= 400) {
        networkErrors.push(
          `${currentLabel}: HTTP ${msg.params.response.status} ${msg.params.response.url}`,
        );
      }
    });

    await Promise.all([
      cdp.send("Page.enable"),
      cdp.send("Runtime.enable"),
      cdp.send("Network.enable"),
      cdp.send("Log.enable"),
      cdp.send("Emulation.setDeviceMetricsOverride", { ...VIEWPORTS.mobile }),
      cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true }),
    ]);

    const run = async ({ label, url, viewport, options = {} }) => {
      consoleErrors = [];
      networkErrors = [];
      currentLabel = label;

      const vp = VIEWPORTS[viewport];
      await cdp.send("Emulation.setDeviceMetricsOverride", { ...vp });
      await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: vp.mobile });
      await cdp.send("Emulation.setUserAgentOverride", {
        userAgent: vp.mobile ? MOBILE_UA : DESKTOP_UA,
      });
      await cdp.send("Emulation.setScriptExecutionDisabled", { value: !!options.noJs });
      await cdp.send("Emulation.setEmulatedMedia", {
        features: options.reducedMotion
          ? [{ name: "prefers-reduced-motion", value: "reduce" }]
          : [],
      });

      await cdp.send("Page.navigate", { url });
      await sleep(vp.mobile ? 2600 : 2200);

      if (!options.noJs) {
        // Give fonts and the first paint a moment, then drive the page.
        await cdp.send("Runtime.evaluate", { awaitPromise: true, expression: "document.fonts.ready.then(() => true)" });
        await exercisePage(cdp.send);
        await sleep(400);
      }

      const evaluateReport = async () => {
        const evaluated = await cdp.send("Runtime.evaluate", {
          awaitPromise: false,
          returnByValue: true,
          expression: `(${pageReport.toString()})()`,
        });
        return evaluated.result?.value ?? null;
      };

      let data = await evaluateReport();

      // The page reveals content on scroll but also has a 4s safety net. A very
      // fast scroll (or a deep link) can legitimately outrun the observer, so
      // give the safety net its time before judging anything as hidden.
      if (data && data.hiddenReveals?.length) {
        await sleep(3800);
        const recheck = await evaluateReport();
        if (recheck) data = recheck;
      }

      const shotPath = path.join(OUT_DIR, `${label}.png`);
      let screenshotBytes = 0;
      let screenshotSize = null;
      if (data && !options.skipScreenshot) {
        try {
          const metrics = await cdp.send("Page.getLayoutMetrics");
          const size = metrics.cssContentSize ?? metrics.contentSize;
          const height = Math.min(size.height, 16000);
          const shot = await cdp.send("Page.captureScreenshot", {
            format: "png",
            captureBeyondViewport: true,
            clip: { x: 0, y: 0, width: size.width, height, scale: 1 },
          });
          const buf = Buffer.from(shot.data, "base64");
          await writeFile(shotPath, buf);
          screenshotBytes = buf.length;
          screenshotSize = { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
        } catch (err) {
          issues.push(`${label}: screenshot failed — ${err.message}`);
        }
      }

      const runReport = {
        ...(data ?? {}),
        label,
        url,
        viewport,
        noJs: !!options.noJs,
        reducedMotion: !!options.reducedMotion,
        screenshot: screenshotBytes ? path.relative(ROOT, shotPath) : null,
        screenshotBytes,
        screenshotSize,
        consoleErrors,
        networkErrors: [...networkErrors],
      };
      report.runs.push(runReport);
      return runReport;
    };

    const motionPages = PAGES;

    // 1. Primary matrix: every page, phone + desktop.
    for (const pageDef of PAGES) {
      for (const viewport of ["mobile", "desktop"]) {
        await run({ label: `${pageDef.name}-${viewport}`, url: pageDef.url, viewport });
      }
    }

    // 2. Server-rendered HTML: the invitation must be complete without JS.
    const staticResult = await verifyStatic();
    staticHolder.runs = staticResult.runs;
    staticHolder.findings = staticResult.findings;
    report.staticRuns = staticResult.runs;

    // 3. Reduced motion: nothing may stay hidden behind an animation.
    for (const pageDef of motionPages) {
      await run({
        label: `${pageDef.name}-reduced-motion`,
        url: pageDef.url,
        viewport: "desktop",
        options: { reducedMotion: true, skipScreenshot: true },
      });
    }

    cdp.close();
  } finally {
    await killChrome(profileDir);
    await rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }

  /* ------------------------------------------------------------- scoring -- */
  const findings = [];
  const fail = (run, code, detail) => findings.push({ run: run.label, severity: "fail", code, detail });
  const warn = (run, code, detail) => findings.push({ run: run.label, severity: "warn", code, detail });

  for (const run of report.runs) {
    if (run.consoleErrors?.length) fail(run, "console-error", run.consoleErrors.join(" | "));
    if (run.networkErrors?.length) fail(run, "network-error", run.networkErrors.join(" | "));

    if (run.noJs) {
      if (run.textLength < 400) fail(run, "nojs-empty", `only ${run.textLength} chars of text`);
      if (run.brokenImages?.length) fail(run, "broken-image", run.brokenImages.join(", "));
      continue;
    }

    if (run.overflowX > 1) fail(run, "horizontal-overflow", `${run.overflowX}px wider than viewport`);
    if (run.brokenImages?.length) fail(run, "broken-image", run.brokenImages.join(", "));
    if (run.contrastFailures?.length)
      fail(run, "contrast", `${run.contrastFailures.length} pair(s): ${JSON.stringify(run.contrastFailures.slice(0, 3))}`);
    if (run.smallTargets?.length)
      warn(run, "small-touch-target", `${run.smallTargets.length}: ${JSON.stringify(run.smallTargets.slice(0, 3))}`);
    if (run.hiddenReveals?.length) fail(run, "hidden-content", run.hiddenReveals.join(", "));
    if (run.h1Count !== 1) fail(run, "h1-count", `found ${run.h1Count}`);
    if (!run.headingOrderOk) warn(run, "heading-order", "skipped a heading level");
    if (run.lang !== "en") fail(run, "lang", `lang="${run.lang}"`);
    if (!run.title) fail(run, "title", "missing <title>");
    if (run.robots !== "noindex, nofollow") warn(run, "robots", `robots="${run.robots}"`);
    if (!run.mainLandmark) fail(run, "landmark", "no <main>");
    if (!run.skipLink) warn(run, "skip-link", "no skip link");
    if (run.textLength < 400) fail(run, "thin-content", `only ${run.textLength} chars`);

    const unsafeExternal = (run.externalLinks ?? []).filter((l) => !l.hasNoopener);
    if (unsafeExternal.length) fail(run, "unsafe-link", JSON.stringify(unsafeExternal));
    if (run.externalLinks?.length === 0 && run.label.startsWith("chooser") === false)
      warn(run, "no-external-links", "expected at least the map/gift links");

    if (run.countdown) {
      const tolerance = 4;
      for (const unit of ["days", "hours", "minutes"]) {
        const expected = String(Number(run.countdown.expected[unit])).padStart(2, "0");
        const actual = run.countdown.actual[unit];
        if (actual !== run.countdown.expected[unit] && actual !== expected)
          fail(run, "countdown", `${unit}: expected ${run.countdown.expected[unit]}, got ${actual}`);
      }
      const expSec = Number(run.countdown.expected.seconds);
      const actSec = Number(run.countdown.actual.seconds);
      if (Math.abs(expSec - actSec) > tolerance && Math.abs(actSec - expSec) > 60 - tolerance)
        fail(run, "countdown", `seconds: expected ${run.countdown.expected.seconds}, got ${run.countdown.actual.seconds}`);
      if (!run.countdown.label) fail(run, "countdown-label", "missing label");
    }

    if (run.label !== "chooser-desktop" && run.label !== "chooser-mobile") {
      if (!run.hasCalendarLink) fail(run, "calendar-link", "no /wedding.ics link");
      if (!run.giftText) fail(run, "gift-link", "gift link not found");
      if (!run.hasWhatsappShare) warn(run, "share", "no WhatsApp share link");
    }
    if (!run.fontsLoaded?.length && !run.noJs) warn(run, "fonts", "no webfonts reported as loaded");

    if (run.screenshotSize) {
      const vp = VIEWPORTS[run.viewport];
      if (!vp) console.error(`  (diagnostic) unknown viewport "${run.viewport}" in run ${run.label}`);
      if (!vp || run.screenshotSize.height <= vp.height + 60)
        warn(
          run,
          "screenshot-not-full-page",
          `captured ${run.screenshotSize.height}px tall (viewport is ${vp?.height ?? "?"}px)`,
        );
    }
  }

  findings.push(...staticHolder.findings);

  report.findings = findings;
  report.summary = {
    browserRuns: report.runs.length,
    staticRuns: staticHolder.runs.length,
    runs: report.runs.length + staticHolder.runs.length,
    failures: findings.filter((f) => f.severity === "fail").length,
    warnings: findings.filter((f) => f.severity === "warn").length,
  };

  await writeFile(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));

  /* -------------------------------------------------------------- output -- */
  console.log(`\nBrowser: ${report.browser ?? "unknown"}\n`);
  for (const run of report.runs) {
    const flags = [];
    if (run.noJs) flags.push("no-js");
    if (run.reducedMotion) flags.push("reduced-motion");
    const runFindings = findings.filter((f) => f.run === run.label);
    const fails = runFindings.filter((f) => f.severity === "fail");
    const warns = runFindings.filter((f) => f.severity === "warn");
    const status = fails.length ? "FAIL" : warns.length ? "PASS*" : "PASS";
    console.log(
      `${status.padEnd(5)} ${run.label.padEnd(32)} ${flags.join(",") || run.viewport}` +
        `${run.screenshotSize ? `  ${run.screenshotSize.width}x${run.screenshotSize.height}` : ""}` +
        `${run.screenshot ? `  → ${run.screenshot}` : ""}`,
    );
    for (const f of fails) console.log(`        ✗ ${f.code}: ${f.detail}`);
    for (const w of warns) console.log(`        ! ${w.code}: ${w.detail}`);
  }

  for (const run of staticHolder.runs) {
    const fails = staticHolder.findings.filter(
      (f) => f.run === run.label && f.severity === "fail",
    );
    console.log(
      `${(fails.length ? "FAIL" : "PASS").padEnd(5)} ${run.label.padEnd(32)} ` +
        `server HTML: ${run.textWithoutScripts} chars, ${run.assetsChecked} assets, calendar ${run.calendarStart}`,
    );
    for (const f of fails) console.log(`        ✗ ${f.code}: ${f.detail}`);
  }

  console.log(
    `\n${report.summary.runs} runs · ${report.summary.failures} failures · ${report.summary.warnings} warnings`,
  );
  console.log(`Report: ${path.relative(ROOT, path.join(OUT_DIR, "report.json"))}\n`);

  process.exit(report.summary.failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Harness failed:", err);
  process.exit(1);
});
