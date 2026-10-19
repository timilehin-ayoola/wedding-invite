import { defineConfig } from "astro/config";

// `site` is the public origin (used for canonical URLs and the social-share
// preview image). `base` is the sub-path the site is served from.
//
// A GitHub Pages project site is published at
//   https://<user>.github.io/<repo>/
// so `site` is the Pages origin and `base` MUST match the repository name.
// If you rename the repository, change the base below — and see the note in
// README.md about custom domains.
export default defineConfig({
  output: "static",
  site: process.env.SITE_URL ?? "https://timilehin-ayoola.github.io",
  base: process.env.SITE_BASE ?? "/wedding-invite/",
  compressHTML: true,
  devToolbar: { enabled: false },
});
