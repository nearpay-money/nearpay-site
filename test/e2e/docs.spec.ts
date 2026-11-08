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
  "/agents/ai-agents",
  "/billing/invoices",
  "/billing/subscriptions",
  "/billing/tax-rates",
  "/cli",
  "/changelog",
  "/api",
  "/api/refunds",
  "/api/invoices",
  "/api/subscriptions",
  "/api/hosted-invoices",
  "/api/events",
  "/api/cli-login",
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

  test("billing guides: sidebar group, test-mode callout, non-custodial copy, no Stage 4 promise", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${DOCS}/billing/invoices`);
    const nav = page.getByRole("navigation", { name: "Docs", exact: true });
    await expect(nav.getByRole("link", { name: "Send an invoice" })).toHaveAttribute("aria-current", "page");
    for (const label of ["Subscriptions", "Tax rates", "Listen locally with the CLI", "Let AI agents pay"]) {
      await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    const main = page.locator("main");
    await expect(main.getByText(/settles directly to your/).first()).toBeVisible();
    await expect(main.locator("blockquote", { hasText: "Test mode." })).toBeVisible();
    await expect(main).not.toContainText(/verified (merchant|business|identity)/i);
    await page.goto(`${DOCS}/billing/subscriptions`);
    await expect(
      page.locator("main blockquote", { hasText: "Automatic payments are not available yet." }),
    ).toBeVisible();
  });

  test("Stage 3 reference: PDF bytes, the event stream frames, the invoice-secret header", async ({ page }) => {
    await page.goto(`${DOCS}/api/invoices`);
    const pdf = page.locator("#getInvoicePdf");
    await expect(pdf.getByText("application/pdf", { exact: true })).toBeVisible();
    await expect(pdf.locator("pre")).toContainText("-o invoice.pdf");
    await expect(page.getByText("Restricted key (rk_…) with invoices.write").first()).toBeVisible();
    await page.goto(`${DOCS}/api/events`);
    const stream = page.locator("#streamEvents");
    await expect(stream.getByRole("table")).toContainText("EventStreamReset");
    await expect(stream.getByRole("rowheader", { name: "reset" })).toBeVisible();
    await expect(stream.getByRole("link", { name: "Event", exact: true })).toHaveAttribute(
      "href",
      "/api/events#object",
    );
    await expect(stream.locator("pre")).toContainText("Accept: text/event-stream");
    await page.goto(`${DOCS}/api/hosted-invoices`);
    await expect(page.locator("#createPublicInvoiceSession pre")).toContainText(
      "X-NearPay-Invoice-Secret: $INVOICE_SECRET",
    );
    await expect(page.locator("#createPublicInvoiceSession pre")).not.toContainText("Authorization");
  });

  test("phones: no page scrolls sideways; wide tables scroll inside a focusable region", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of [
      "/billing/invoices",
      "/billing/subscriptions",
      "/billing/tax-rates",
      "/cli",
      "/agents/ai-agents",
      "/api/invoices",
      "/api/events",
      "/errors/amount_exceeds_refundable",
      "/search?q=refund",
    ]) {
      await page.goto(`${DOCS}${path}`);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width, path).toBeLessThanOrEqual(390);
    }
    await page.goto(`${DOCS}/cli`);
    const region = page.getByRole("region", { name: /^Table: Can be triggered, Not yet$/ });
    await expect(region).toHaveAttribute("tabindex", "0");
    await region.focus();
    await expect(region).toBeFocused();
  });

  test("event types come from the spec", async ({ page }) => {
    await page.goto(`${DOCS}/webhooks/events`);
    for (const t of [
      "refund.requires_action",
      "review.opened",
      "account.updated",
      "payment_intent.succeeded",
      "invoice.paid",
      "customer.subscription.renewal_upcoming",
    ]) {
      await expect(page.getByRole("rowheader", { name: t })).toBeVisible();
    }
  });

  test("nested attributes expand without JavaScript", async ({ page }) => {
    await page.goto(`${DOCS}/api/refunds`);
    const toggle = page
      .locator("#object summary", { hasText: "Show 12 child attributes" /* refund legs, spec 0.3.0 */ })
      .first();
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
