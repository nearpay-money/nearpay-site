/**
 * Shared fixture: every test fails on a CSP violation, a console error or a request to another
 * origin (no third-party scripts, fonts or images), and can run axe (WCAG 2.2 AA rules).
 */
import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page } from "@playwright/test";

export const WEB = "http://127.0.0.1:4420";
export const DOCS = "http://127.0.0.1:4421";

export const test = base.extend<{ guard: undefined }>({
  guard: [
    async ({ page }, use) => {
      const problems: string[] = [];
      await page.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (e) => {
          (window as unknown as { __csp: string[] }).__csp ??= [];
          (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`);
        });
      });
      page.on("console", (m) => {
        if (m.type() !== "error") return;
        const allow404 = base.info().annotations.some((a) => a.type === "allow-404");
        if (allow404 && m.text().includes("status of 404")) return;
        problems.push(`console: ${m.text()}`);
      });
      page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
      page.on("request", (r) => {
        const url = new URL(r.url());
        if (!["127.0.0.1", "localhost"].includes(url.hostname) && url.protocol !== "data:") {
          problems.push(`third-party request: ${r.url()}`);
        }
      });
      await use(undefined);
      for (const p of page.context().pages()) {
        const csp = await p.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []).catch(() => []);
        problems.push(...csp.map((c) => `csp: ${c}`));
      }
      expect(problems, problems.join("\n")).toEqual([]);
    },
    { auto: true },
  ],
});

export async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const summary = results.violations.map(
    (v) =>
      `${v.id}: ${v.nodes
        .map((n) => n.target.join(" "))
        .slice(0, 3)
        .join(", ")}`,
  );
  expect(summary, summary.join("\n")).toEqual([]);
}

export { expect };
