import { expect, expectAccessible, test, WEB } from "./harness";

test.describe("marketing site", () => {
  test("home matches the Figma copy and structure", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${WEB}/`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Their wallet. Your currency. One simple checkout.",
    );
    const nav = page.getByRole("navigation", { name: "Main" }).first();
    for (const label of ["Payments", "Billing", "For developers", "Pricing"]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "Get started" }).first()).toHaveAttribute(
      "href",
      /dashboard\.nearpay\.money\/signup$/,
    );
    const card = page.getByRole("figure", { name: "Illustrative checkout · fees vary by payment" });
    await expect(card).toContainText("Pay with");
    await expect(card).toContainText("USDC · Base");
    await expect(card).toContainText(/Payment fees\s*\$0\.49/);
    await expect(card).toContainText("Pay 49.49 USDC");
    await expect(card).toContainText("Merchant receives 49.00 USDC");
    await expect(card).toContainText("Straight to their chosen destination");
    await expect(card.getByRole("button")).toHaveCount(0); // illustrative, not interactive
    await expect(page.getByText("Wallet-only checkout · No NearPay-held balances")).toBeVisible();
    for (const h of [
      "Meet customers where they are",
      "Receive what works for you",
      "Know when you’re paid",
      "A better way to get paid.",
      "Built for the business behind the payment.",
      "Your next customer is ready to pay.",
    ]) {
      await expect(page.getByRole("heading", { name: h })).toBeVisible();
    }
    for (const h of ["Payments", "Billing · coming next", "Agent payments"]) {
      await expect(page.getByRole("heading", { name: h, exact: true })).toBeVisible();
    }
    const footer = page.getByRole("navigation", { name: "Footer" });
    for (const label of ["Docs", "Support", "Privacy", "Terms"])
      await expect(footer.getByRole("link", { name: label })).toBeVisible();
    await expectAccessible(page);
  });

  test("mobile: menu is a keyboard-operable disclosure", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${WEB}/`);
    await expect(page.getByText("Crypto payments, simplified")).toBeVisible();
    await expect(page.getByRole("heading", { name: "One platform. More ways to get paid." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ready for your next payment?" })).toBeVisible();
    const menu = page.locator("summary[aria-label='Menu']");
    await menu.focus();
    await page.keyboard.press("Enter");
    const panel = page.locator(".web-menu__panel");
    await expect(panel.getByRole("link", { name: "Pricing" })).toBeVisible();
    await panel.getByRole("link", { name: "Pricing" }).click();
    await expect(page).toHaveURL(`${WEB}/pricing`);
    await expectAccessible(page);
  });

  test("pricing shows the indicative Q-BIZ-02 schedule", async ({ page }) => {
    await page.goto(`${WEB}/pricing`);
    await expect(page.getByText("Indicative pricing · may change before general availability")).toBeVisible();
    const rows = page.locator(".price-table tbody tr");
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(0)).toContainText("0.20%");
    await expect(rows.nth(1)).toContainText("0.50%");
    await expect(rows.nth(2)).toContainText("1.00%");
    await expect(rows.nth(3)).toContainText("0.30%");
    await expect(rows.nth(3)).toContainText("minimum $0.001");
    await expect(page.getByText("NearPay never holds your balance")).toBeVisible();
    await expectAccessible(page);
  });

  for (const path of ["/payments", "/billing", "/support", "/privacy", "/terms"]) {
    test(`${path} is accessible and honest`, async ({ page }) => {
      await page.goto(`${WEB}${path}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const text = ((await page.locator("main").textContent()) ?? "").toLowerCase();
      expect(text).not.toContain("verified business");
      expect(text).not.toContain("identity verified");
      expect(text).not.toContain("nearpay balance:");
      await expectAccessible(page);
    });
  }

  test("unknown pages get the 404 page", async ({ page }) => {
    test.info().annotations.push({ type: "allow-404" });
    const res = await page.goto(`${WEB}/nope`);
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "We can’t find that page." })).toBeVisible();
  });
});
