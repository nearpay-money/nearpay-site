#!/usr/bin/env node
import { spawn } from "node:child_process";
// Full-page screenshots of the main screens at 1440 and 390 px for design review.
//   node scripts/screenshots.mjs [outDir]   (default /home/claude/shots/site; needs a built dist/)
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const out = process.argv[2] ?? "/home/claude/shots/site";
mkdirSync(out, { recursive: true });
const WEB = "http://127.0.0.1:4410";
const DOCS = "http://127.0.0.1:4411";
const pages = [
  ["web-home", `${WEB}/`],
  ["web-pricing", `${WEB}/pricing`],
  ["web-payments", `${WEB}/payments`],
  ["web-billing", `${WEB}/billing`],
  ["web-support", `${WEB}/support`],
  ["web-terms", `${WEB}/terms`],
  ["docs-home", `${DOCS}/`],
  ["docs-get-started", `${DOCS}/get-started`],
  ["docs-checkout-embedded", `${DOCS}/checkout/embedded`],
  ["docs-refunds", `${DOCS}/refunds`],
  ["docs-webhooks", `${DOCS}/webhooks`],
  ["docs-event-types", `${DOCS}/webhooks/events`],
  ["docs-test-mode", `${DOCS}/test-mode`],
  ["docs-agents", `${DOCS}/agents`],
  ["docs-ai-agents", `${DOCS}/agents/ai-agents`],
  ["docs-billing-invoices", `${DOCS}/billing/invoices`],
  ["docs-billing-subscriptions", `${DOCS}/billing/subscriptions`],
  ["docs-billing-tax-rates", `${DOCS}/billing/tax-rates`],
  ["docs-cli", `${DOCS}/cli`],
  ["docs-api-invoices", `${DOCS}/api/invoices`],
  ["docs-api-events", `${DOCS}/api/events`],
  ["docs-api-hosted-invoices", `${DOCS}/api/hosted-invoices`],
  ["docs-changelog", `${DOCS}/changelog`],
  ["docs-api", `${DOCS}/api`],
  ["docs-api-refunds", `${DOCS}/api/refunds`],
  ["docs-errors", `${DOCS}/errors`],
  ["docs-error-page", `${DOCS}/errors/amount_exceeds_refundable`],
  ["docs-search", `${DOCS}/search?q=refund`],
];

const server = spawn(process.execPath, [join(import.meta.dirname, "serve.mjs"), "--web", "4410", "--docs", "4411"], {
  stdio: "ignore",
});
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ executablePath: process.env.NP_CHROME_PATH ?? "/usr/bin/google-chrome" });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
    for (const [name, url] of pages) {
      await page.goto(url, { waitUntil: "networkidle" });
      await page.screenshot({ path: join(out, `${name}-${width}.png`), fullPage: true });
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(`screenshots saved to ${out}`);
