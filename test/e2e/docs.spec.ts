import { DOCS, expect, expectAccessible, test } from "./harness";

const guides = [
  "/",
  "/get-started",
  "/test-mode",
  "/checkout",
  "/checkout/embedded",
  "/checkout/payment-links",
  "/payment-intents",
  "/refunds",
  "/customers",
  "/settlement-destinations",
  "/webhooks",
  "/webhooks/events",
  "/agents",
  "/changelog",
  "/api",
  "/api/refunds",
  "/errors",
  "/errors/leg_expired",
];

test.describe("docs", () => {
  for (const path of guides) {
    test(`${path} renders accessibly`, async ({ page }) => {
      await page.goto(`${DOCS}${path}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectAccessible(page);
    });
  }

  test("sidebar marks the current page and pages link forward", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${DOCS}/refunds`);
    const nav = page.getByRole("navigation", { name: "Docs", exact: true });
    await expect(nav.getByRole("link", { name: "Refunds", exact: true })).toHaveAttribute("aria-current", "page");
    await page
      .getByRole("navigation", { name: "Previous and next pages" })
      .getByRole("link", { name: /Customers/ })
      .click();
    await expect(page).toHaveURL(`${DOCS}/customers`);
  });

  test("API reference is generated from the spec, with error links", async ({ page }) => {
    await page.goto(`${DOCS}/api/refunds`);
    const op = page.locator("#createRefund");
    await expect(op.getByRole("heading", { name: "Create a refund and prepare its first leg." })).toBeVisible();
    await expect(op.locator(".method")).toHaveText("POST");
    await expect(op.getByText("Restricted key (rk_…) with refunds.write")).toBeVisible();
    await op.getByRole("link", { name: "amount_exceeds_refundable" }).click();
    await expect(page).toHaveURL(`${DOCS}/errors/amount_exceeds_refundable`);
    await expect(page.getByText("Not retryable")).toBeVisible();
    await expect(page.getByRole("link", { name: /POST \/v1\/refunds$/ })).toBeVisible();
  });

  test("event types come from the spec", async ({ page }) => {
    await page.goto(`${DOCS}/webhooks/events`);
    for (const t of ["refund.requires_action", "review.opened", "account.updated", "payment_intent.succeeded"]) {
      await expect(page.getByRole("rowheader", { name: t })).toBeVisible();
    }
  });

  test("nested attributes expand without JavaScript", async ({ page }) => {
    await page.goto(`${DOCS}/api/refunds`);
    const toggle = page.locator("#object summary", { hasText: "Show 11 child attributes" }).first();
    await toggle.click();
    await expect(page.locator("#object details[open] .param__name", { hasText: "tx_hash" }).first()).toBeVisible();
  });

  test("copy button copies and announces", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`${DOCS}/get-started`);
    const button = page.getByRole("button", { name: "Copy code" }).first();
    await button.click();
    await expect(button).toHaveText("Copied");
    await expect(page.getByRole("status").filter({ hasText: "Code copied to clipboard" })).toBeAttached();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("npm install @nearpay/node");
  });

  test("search finds guides, endpoints and error codes", async ({ page }) => {
    await page.goto(`${DOCS}/`);
    await page.getByRole("searchbox", { name: "Search the docs" }).fill("leg_expired");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/search\?q=leg_expired/);
    const results = page.locator("[data-search-results] a");
    await expect(results.first()).toHaveAttribute("href", "/errors/leg_expired");
    await page.locator("#search-page-input").fill("rotate secret");
    await expect(page.getByRole("status").filter({ hasText: /result/ })).toBeVisible();
    await expect(results.first()).toContainText(/secret/i);
  });

  test("mobile: the sidebar is a disclosure", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${DOCS}/webhooks`);
    await expect(page.locator(".docs-sidebar")).toBeHidden();
    await page.getByText("Menu", { exact: true }).click();
    await page.getByRole("navigation", { name: "Docs (menu)" }).getByRole("link", { name: "Test mode" }).click();
    await expect(page).toHaveURL(`${DOCS}/test-mode`);
    await expectAccessible(page);
  });
});
