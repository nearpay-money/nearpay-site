// One Astro project, two static sites (ADR-0019): `NP_SITE=web` → dist/web (apex domain),
// `NP_SITE=docs` → dist/docs (docs.<domain>). Routes live in src/routes/<site>/ and are injected for the
// selected site only, so each build contains exactly its own pages.
//
// Strict CSP (default-src 'none'; script-src 'self'; style-src 'self'): nothing is inlined — stylesheets
// and scripts are always emitted as files (inlineStylesheets: never, assetsInlineLimit: 0), code blocks use
// Prism (class-based tokens; Shiki writes style="" attributes), and scripts/check-dist.mjs fails the build
// on any inline script, inline style, style attribute or third-party URL.
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";

const SITE = process.env.NP_SITE === "docs" ? "docs" : "web";
const ORIGINS = {
  web: process.env.NP_WEB_URL ?? "https://nearpay.money",
  docs: process.env.NP_DOCS_URL ?? "https://docs.nearpay.money",
};

const routesDir = fileURLToPath(new URL(`./src/routes/${SITE}/`, import.meta.url));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** Maps src/routes/<site>/a/[b].astro → /a/[b]; index files → their folder; .ts files are endpoints. */
function routePattern(file) {
  const rel = relative(routesDir, file).split(sep).join("/");
  const noExt = rel.replace(/\.(astro|ts)$/, "");
  const path = noExt === "index" ? "" : noExt.replace(/\/index$/, "");
  return `/${path}`;
}

const siteRoutes = {
  name: "nearpay-site-routes",
  hooks: {
    "astro:config:setup": ({ injectRoute }) => {
      for (const file of walk(routesDir)) {
        if (!/\.(astro|ts)$/.test(file) || file.includes(`${sep}_`)) continue;
        injectRoute({ pattern: routePattern(file), entrypoint: file, prerender: true });
      }
    },
  },
};

export default defineConfig({
  site: ORIGINS[SITE],
  outDir: `./dist/${SITE}`,
  output: "static",
  trailingSlash: "never",
  build: { format: "file", inlineStylesheets: "never", assets: "_assets" },
  devToolbar: { enabled: false },
  // Each site has its own cache so the two builds never share stale content-collection data.
  cacheDir: `./node_modules/.astro-${SITE}`,
  markdown: {
    syntaxHighlight: "prism",
    smartypants: false,
  },
  vite: {
    build: { assetsInlineLimit: 0 },
    // Prism loads grammars with require(); keep it external to the SSR bundle.
    ssr: { external: ["prismjs", "@astrojs/prism"] },
    define: { "import.meta.env.NP_SITE": JSON.stringify(SITE) },
  },
  integrations: [siteRoutes],
});
