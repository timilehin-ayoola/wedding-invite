/**
 * Helpers so the site works from a sub-path as well as from a domain root.
 *
 * A GitHub Pages project site lives at https://<user>.github.io/<repo>/, so
 * every internal link needs that prefix. Astro supplies the prefix as
 * import.meta.env.BASE_URL, taken from `base` in astro.config.mjs.
 *
 * When `base` is "/" (a domain root, e.g. a custom domain) `base` here is an
 * empty string and every helper returns exactly what it was given.
 */
const raw: string = import.meta.env.BASE_URL ?? "/";

/** Base path without a trailing slash: "" at the root, "/wedding-invite" on Pages. */
export const base = raw.endsWith("/") ? raw.slice(0, -1) : raw;

/**
 * Prefix an internal path with the base.
 * External URLs (https:, mailto:, data:, //cdn…) and fragments (#main) are
 * returned untouched.
 */
export function withBase(path: string): string {
  if (!path) return base || "/";
  if (/^(?:#|[a-z][a-z0-9+.-]*:|\/\/)/i.test(path)) return path;
  return `${base}/${path.replace(/^\/+/, "")}`;
}
