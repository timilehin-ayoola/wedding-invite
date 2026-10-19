#!/usr/bin/env node
/**
 * Renders the /share-card route to public/share-card.png (1200x630) so the
 * invitation shows a proper preview image when the link is shared.
 *
 * Run after changing names/date/venue:
 *   npm run dev            # in one terminal
 *   node tools/make-share-card.mjs
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE = process.env.BASE_URL ?? "http://localhost:4321";
// Must match `base` in astro.config.mjs ("" when served from a domain root).
const SITE_BASE = (process.env.SITE_BASE ?? "/wedding-invite/").replace(/\/$/, "");
const CARD_URL = `${BASE}${SITE_BASE}/share-card/`;
const CHROME =
  process.env.CHROME_BIN ?? "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe";

const winTemp = (() => {
  try {
    const out = execFileSync("cmd.exe", ["/c", "echo %TEMP%"], { encoding: "utf8" }).trim();
    if (/^[A-Za-z]:\\/.test(out)) return out;
  } catch {
    /* fall through */
  }
  return "C:\\Users\\AYOOLA\\AppData\\Local\\Temp";
})();

const winOut = path.join(winTemp, "wedding-share-card.png");
const wslOut = "/mnt/c/" + winOut.replace(/^[A-Za-z]:\\/, "").replace(/\\/g, "/");

console.log(`Rendering ${CARD_URL} → ${winOut}`);

execFileSync(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1200,630",
    "--virtual-time-budget=9000",
    `--screenshot=${winOut}`,
    CARD_URL,
  ],
  { stdio: ["ignore", "inherit", "inherit"] },
);

if (!existsSync(wslOut)) {
  console.error(`Chrome did not write ${wslOut}`);
  process.exit(1);
}

const target = path.join(ROOT, "public", "share-card.png");
copyFileSync(wslOut, target);
console.log(`Wrote ${path.relative(ROOT, target)}`);
