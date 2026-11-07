#!/usr/bin/env node
// Static preview server for both built sites, with the production security headers (CSP from
// src/config/site.ts, mirrored here because this runs without a TS loader). Used by Playwright and
// the screenshot script.
//   node scripts/serve.mjs [--web 4400] [--docs 4401]
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
};

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? Number(process.argv[i + 1]) : fallback;
}

/** Resolves a URL path to a file the way the static hosts do: exact, `.html`, `/index.html`. */
export function resolveFile(root, urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split("?")[0] ?? "/")).replace(/^(\.\.[/\\])+/, "");
  const base = join(root, clean);
  if (!resolve(base).startsWith(resolve(root))) return null;
  for (const candidate of [base, `${base}.html`, join(base, "index.html")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function serve(root, port) {
  const server = createServer((req, res) => {
    const file = resolveFile(root, req.url ?? "/");
    const headers = {
      "Content-Security-Policy": CSP,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cross-Origin-Opener-Policy": "same-origin",
    };
    if (!file) {
      const notFound = join(root, "404.html");
      res.writeHead(404, { ...headers, "Content-Type": TYPES[".html"] });
      if (existsSync(notFound)) createReadStream(notFound).pipe(res);
      else res.end("Not found");
      return;
    }
    res.writeHead(200, { ...headers, "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  server.listen(port, "127.0.0.1", () => console.log(`serving ${root} on http://127.0.0.1:${port}`));
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const here = new URL("..", import.meta.url).pathname;
  serve(join(here, "dist/web"), arg("web", 4400));
  serve(join(here, "dist/docs"), arg("docs", 4401));
}
