// One Astro project, two static sites (ADR-0019): `NP_SITE=web` → dist/web (apex domain),
// `NP_SITE=docs` → dist/docs (docs.<domain>). Routes live in src/routes/<site>/ and are injected for the
// selected site only, so each build contains exactly its own pages.
//
// Strict CSP (default-src 'none'; script-src 'self'; style-src 'self'): nothing is inlined — stylesheets
// and scripts are always emitted as files (inlineStylesheets: never, assetsInlineLimit: 0), code blocks use
// Prism (class-based tokens; Shiki writes style="" attributes), and scripts/check-dist.mjs fails the build
// on any inline script, inline style, style attribute or third-party URL.
import { copyFileSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, sep } from "node:path";
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

/**
 * Brand files (design v2, "Convergence") come from the kit's `brand/` folder — the single source — and
 * are copied into `public/` (git-ignored) when the config loads, so dev and both builds serve them at
 * the root: favicon.svg/.ico, apple-touch-icon.png, icon-192/512 (+ maskable), og-image.png. The web
 * app manifest is written next to them.
 */
const BRAND_FILES = [
  "favicon.svg",
  "favicon.ico",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "og-image.png",
];
const brandAssets = {
  name: "nearpay-brand-assets",
  hooks: {
    "astro:config:setup": () => {
      const require = createRequire(import.meta.url);
      const brandDir = join(dirname(require.resolve("@nearpay-internal/ui/package.json")), "brand");
      const publicDir = fileURLToPath(new URL("./public/", import.meta.url));
      mkdirSync(publicDir, { recursive: true });
      for (const file of BRAND_FILES) copyFileSync(join(brandDir, file), join(publicDir, file));
      const manifest = {
        name: SITE === "docs" ? "NearPay Docs" : "NearPay",
        short_name: "NearPay",
        description: "Payments from any chain, settled on the chain you choose.",
        start_url: "/",
        display: "browser",
        background_color: "#FFFFFF",
        theme_color: "#12263F",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      };
      writeFileSync(join(publicDir, "site.webmanifest"), `${JSON.stringify(manifest, null, 2)}\n`);
    },
  },
};

/** Text of a hast node (header cells → table labels). */
function textOf(node) {
  if (node.type === "text") return node.value;
  return (node.children ?? []).map(textOf).join("");
}

/**
 * Wraps every Markdown table in a horizontally scrollable, keyboard-focusable region, so wide
 * tables (event names, long identifiers) scroll inside the article on phones instead of widening
 * the page. The label names the columns for screen readers.
 */
function rehypeScrollableTables() {
  const visit = (node) => {
    if (!node.children) return;
    node.children = node.children.map((child) => {
      if (child.type === "element" && child.tagName === "table") {
        const headers = [];
        const collect = (n) => {
          if (n.type === "element" && n.tagName === "th") headers.push(textOf(n).trim());
          else for (const c of n.children ?? []) collect(c);
        };
        collect(child);
        return {
          type: "element",
          tagName: "div",
          properties: {
            className: ["prose-table"],
            tabIndex: 0,
            role: "region",
            ariaLabel: headers.length ? `Table: ${headers.join(", ")}` : "Table",
          },
          children: [child],
        };
      }
      visit(child);
      return child;
    });
  };
  return (tree) => visit(tree);
}

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
    rehypePlugins: [rehypeScrollableTables],
  },
  vite: {
    build: { assetsInlineLimit: 0 },
    // Prism loads grammars with require(); keep it external to the SSR bundle.
    ssr: { external: ["prismjs", "@astrojs/prism"] },
    define: { "import.meta.env.NP_SITE": JSON.stringify(SITE) },
  },
  integrations: [brandAssets, siteRoutes],
});
