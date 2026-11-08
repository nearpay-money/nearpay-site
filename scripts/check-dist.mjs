#!/usr/bin/env node
// Post-build gate for both sites (runs after `astro build`):
// - strict CSP: no inline <script>, no <style> elements, no style="" attributes, no inline event
//   handlers, no javascript: URLs; scripts and stylesheets are same-origin files;
// - no third-party scripts, stylesheets, fonts or images (links to other sites are fine);
// - every HTML page has <html lang>, one <h1>, a <title> and a skip link target (#main);
// - docs: one page per error code of the @nearpay/spec catalogue, and every public route of the
//   OpenAPI document appears on an API reference page;
// - internal links: every same-site `href="/…"` / `href="#…"` resolves to a built page (or file), and
//   its `#fragment` to an element id on that page (step 3.3).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative } from "node:path";
import { parse } from "yaml";

const root = new URL("..", import.meta.url).pathname;
const problems = [];

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

export function checkHtml(file, html) {
  const where = relative(root, file);
  const out = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = m[1] ?? "";
    if (/type=["']?application\/(ld\+)?json/i.test(attrs)) continue;
    if (!/\bsrc=/.test(attrs) || (m[2] ?? "").trim()) out.push(`${where}: inline <script>`);
    const src = /\bsrc=["']([^"']+)/.exec(attrs)?.[1] ?? "";
    if (/^(https?:)?\/\//.test(src)) out.push(`${where}: third-party script ${src}`);
  }
  if (/<style[\s>]/i.test(html)) out.push(`${where}: <style> element`);
  if (/\sstyle\s*=/i.test(html.replace(/<pre[\s\S]*?<\/pre>/gi, ""))) out.push(`${where}: style="" attribute`);
  if (/\son[a-z]+\s*=\s*["']/i.test(html.replace(/<pre[\s\S]*?<\/pre>/gi, "").replace(/<code[\s\S]*?<\/code>/gi, ""))) {
    out.push(`${where}: inline event handler`);
  }
  if (/href=["']\s*javascript:/i.test(html)) out.push(`${where}: javascript: URL`);
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    const href = /href=["']([^"']+)/.exec(tag)?.[1] ?? "";
    if (/rel=["'](stylesheet|preload|icon|modulepreload)/.test(tag) && /^(https?:)?\/\//.test(href)) {
      out.push(`${where}: third-party ${tag}`);
    }
  }
  for (const m of html.matchAll(/<img\b[^>]*src=["']([^"']+)/gi)) {
    if (/^(https?:)?\/\//.test(m[1] ?? "")) out.push(`${where}: third-party image ${m[1]}`);
  }
  if (!/<html lang="en"/.test(html)) out.push(`${where}: missing <html lang>`);
  if (!/<title>[^<]+<\/title>/.test(html)) out.push(`${where}: missing <title>`);
  const h1 = html.match(/<h1\b/g)?.length ?? 0;
  if (h1 !== 1) out.push(`${where}: ${h1} <h1> elements`);
  if (!/id="main"/.test(html)) out.push(`${where}: missing #main`);
  return out;
}

/** Same-site href → built file (`format: "file"`: `/a/b` → `a/b.html`, `/` → `index.html`). */
export function targetOf(dir, href) {
  const path = href.split("#")[0].split("?")[0];
  if (path === "/" || path === "") return join(dir, "index.html");
  const clean = path.replace(/\/$/, "");
  return /\.[a-z0-9]+$/i.test(clean) ? join(dir, clean) : join(dir, `${clean}.html`);
}

/** Element ids of a page (`id="…"`), for fragment checks. */
export function idsOf(html) {
  return new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
}

/** Broken same-site links and fragments of one built site. */
export function checkLinks(dir, files) {
  const out = [];
  const pages = new Map();
  for (const f of files) if (f.endsWith(".html")) pages.set(f, readFileSync(f, "utf8"));
  const exists = (f) => {
    try {
      return statSync(f).isFile();
    } catch {
      return false;
    }
  };
  for (const [file, html] of pages) {
    const where = relative(root, file);
    const code = html.replace(/<pre[\s\S]*?<\/pre>/gi, "");
    for (const m of code.matchAll(/<a\b[^>]*\shref="([^"]+)"/gi)) {
      const href = m[1].replace(/&amp;/g, "&");
      if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) continue; // other sites, mailto:
      const target = href.startsWith("#") ? file : targetOf(dir, href);
      if (!href.startsWith("#") && !exists(target)) {
        out.push(`${where}: broken link ${href}`);
        continue;
      }
      const fragment = href.includes("#") ? decodeURIComponent(href.split("#")[1]) : "";
      if (!fragment || !target.endsWith(".html")) continue;
      const ids = idsOf(pages.get(target) ?? readFileSync(target, "utf8"));
      if (!ids.has(fragment)) out.push(`${where}: link ${href} has no #${fragment} target`);
    }
  }
  return out;
}

function checkCss(file, css) {
  const where = relative(root, file);
  const out = [];
  for (const m of css.matchAll(/url\(\s*["']?((?:https?:)?\/\/[^"')]+)/g)) out.push(`${where}: remote url(${m[1]})`);
  if (/@import\s+(url\()?["']?(https?:)?\/\//.test(css)) out.push(`${where}: remote @import`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const site of ["web", "docs"]) {
    const dir = join(root, "dist", site);
    const files = walk(dir);
    for (const f of files) {
      if (f.endsWith(".html")) problems.push(...checkHtml(f, readFileSync(f, "utf8")));
      if (f.endsWith(".css")) problems.push(...checkCss(f, readFileSync(f, "utf8")));
    }
    problems.push(...checkLinks(dir, files));
    console.log(`${site}: ${files.filter((f) => f.endsWith(".html")).length} pages checked (incl. internal links)`);
  }

  const require = createRequire(import.meta.url);
  const specRoot = dirname(require.resolve("@nearpay/spec/package.json"));
  const catalogue = parse(readFileSync(join(specRoot, "errors/catalogue.yaml"), "utf8"));
  for (const e of catalogue.errors) {
    try {
      statSync(join(root, "dist/docs/errors", `${e.code}.html`));
    } catch {
      problems.push(`docs: no page for error ${e.code}`);
    }
  }
  const openapi = parse(readFileSync(join(specRoot, "openapi/public.yaml"), "utf8"));
  const reference = walk(join(root, "dist/docs/api"))
    .filter((f) => f.endsWith(".html"))
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");
  let routes = 0;
  for (const [path, item] of Object.entries(openapi.paths)) {
    for (const method of ["get", "post", "patch", "delete"]) {
      const op = item[method];
      if (!op) continue;
      const auth = op["x-nearpay"]?.auth ?? [];
      const developer = !path.startsWith("/v1/auth/") && auth.some((a) => a !== "session");
      if (!developer) continue;
      routes += 1;
      if (!reference.includes(`id="${op.operationId}"`))
        problems.push(`docs: ${method.toUpperCase()} ${path} missing from the API reference`);
    }
  }
  console.log(`docs: ${catalogue.errors.length} error pages, ${routes} public routes expected in the reference`);

  if (problems.length) {
    console.error(`\ncheck-dist: ${problems.length} problem(s)\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    process.exit(1);
  }
  console.log("check-dist: ok");
}
