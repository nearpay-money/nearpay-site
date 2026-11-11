import { spawn } from "node:child_process";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const out = process.argv[2] ?? "/home/claude/shots/site-cleanup";
const WEB = "http://127.0.0.1:4430";
const server = spawn(process.execPath, [join(import.meta.dirname, "serve.mjs"), "--web", "4430", "--docs", "4431"], {
  stdio: "ignore",
});
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1243/chrome-linux64/chrome" });
const settle = (page) =>
  page.evaluate(() => {
    for (const a of document.getAnimations()) {
      try {
        a.pause();
        a.currentTime = 9000;
      } catch {}
    }
  });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
    await page.goto(`${WEB}/`, { waitUntil: "networkidle" });
    await settle(page);
    await page.screenshot({ path: join(out, `landing-full-${width}.png`), fullPage: true });
    const box = await page.locator("#pricing").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: 0, y: r.top + window.scrollY, width: window.innerWidth, height: r.height };
    });
    await page.screenshot({ path: join(out, `pricing-${width}.png`), fullPage: true, clip: box });
    if (width === 1440) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.locator(".web-nav__link", { hasText: "Products" }).hover();
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(out, `header-hover-${width}.png`), clip: { x: 0, y: 0, width, height: 120 } });
      await page.mouse.move(5, 500);
      await page.locator(".web-nav__link", { hasText: "Pricing" }).click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: join(out, `anchor-pricing-${width}.png`) });
      await page.goto(`${WEB}/#how-it-works`, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      await page.screenshot({ path: join(out, `anchor-how-${width}.png`) });
      await page.goto(`${WEB}/support`, { waitUntil: "networkidle" });
      await page.locator(".web-nav__link", { hasText: "Developers" }).click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: join(out, `anchor-developers-from-support-${width}.png`) });
    } else {
      await page.goto(`${WEB}/`, { waitUntil: "networkidle" });
      await page.locator("summary[aria-label='Menu']").click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(out, `mobile-menu-${width}.png`) });
      await page.locator(".web-menu__panel a", { hasText: "Products" }).click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: join(out, `anchor-products-${width}.png`) });
      await page.goto(`${WEB}/pricing`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      console.log("old /pricing ->", page.url());
      await page.screenshot({ path: join(out, `old-pricing-url-${width}.png`) });
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
