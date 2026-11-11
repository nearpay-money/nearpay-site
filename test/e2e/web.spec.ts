import { expect, expectAccessible, test, WEB } from "./harness";

test.describe("marketing site", () => {
  test("home matches the design v2 artboard copy and structure", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${WEB}/`);
    await expect(page).toHaveTitle("NearPay — Get paid from any chain. Settle where you choose.");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Get paid from any chain. Settle where you choose.",
    );
    const nav = page.getByRole("navigation", { name: "Main" }).first();
    for (const label of ["Checkout", "Payment links", "Subscriptions", "Agent payments", "Docs"]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }
    const header = page.locator(".web-header");
    await expect(header.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      /dashboard\.nearpay\.money\/signin$/,
    );
    const ctas = page.locator("a", { hasText: "Start accepting payments" });
    await expect(ctas).toHaveCount(3); // header pill, hero, mobile menu (closed disclosure)
    for (const cta of await ctas.all()) await expect(cta).toHaveAttribute("href", /dashboard\.nearpay\.money\/signup$/);
    await expect(page.getByRole("link", { name: "See a live checkout" })).toHaveAttribute(
      "href",
      /docs\.nearpay\.money\/get-started$/,
    );
    await expect(page.locator(".hero__lede")).toHaveText(
      "Customers pay with any token on any chain. It lands in your own wallet — NearPay never holds the funds.",
    );
    await expect(page.getByText("No sign-up review")).toHaveCount(0); // note line removed (owner feedback)
    // Calm hero: the tagline sits on exactly two lines at 1440, the panel is no wider than 512 px and the
    // whole section fits the first screen with the chain strip peeking in.
    const title = await page.locator(".hero__title").evaluate((el) => {
      const cs = getComputedStyle(el);
      return { height: el.getBoundingClientRect().height, line: Number.parseFloat(cs.lineHeight) };
    });
    expect(Math.round(title.height / title.line)).toBe(2);
    const panelBox = await page.locator(".np-convergence").boundingBox();
    expect(panelBox?.width ?? 0).toBeLessThanOrEqual(512);
    expect((panelBox?.y ?? 0) + (panelBox?.height ?? 0)).toBeLessThan(900);
    expect((await page.locator(".chain-strip").boundingBox())?.y ?? 900).toBeLessThan(900 - 48);

    // Hero panel: the kit's ConvergenceHero (chain chips, settlement card, text alternative).
    const hero = page.locator(".np-convergence");
    for (const chip of ["USDC on Base", "SOL on Solana", "ETH on Arbitrum", "BTC", "NEAR"]) {
      await expect(hero.locator(".np-convergence__label", { hasText: new RegExp(`^${chip}$`) })).toBeVisible();
    }
    const card = hero.locator(".np-convergence__card");
    await expect(card).toContainText("Payment received");
    await expect(card.locator(".np-badge")).toHaveText("Paid");
    await expect(card).toContainText("$49.00");
    await expect(card).toContainText("Settled as USDC to your NEAR wallet");
    await expect(card).toContainText(/Confirmed in\s*1 block/);
    await expect(hero.locator("figcaption")).toContainText("settle in one place");
    await expect(hero.getByRole("button")).toHaveCount(0); // illustrative, not interactive

    await expect(page.getByText("Accept payments from every major chain. Settle on the one you choose.")).toBeVisible();
    for (const chain of ["NEAR", "Ethereum", "Base", "Arbitrum", "Solana", "Bitcoin", "Polygon", "BNB Chain"]) {
      await expect(page.locator(".chain-strip__list li", { hasText: new RegExp(`^${chain}$`) })).toBeVisible();
    }
    for (const h of [
      "A payment, from wallet to wallet, in seconds.",
      "The customer pays their way",
      "NEAR Intents routes it",
      "You’re paid, with proof",
      "One API call to a hosted checkout.",
      "We never hold your money",
      "Every payment is checked",
      "Live in minutes",
    ]) {
      await expect(page.getByRole("heading", { name: h })).toBeVisible();
    }
    await expect(page.locator(".code-panel")).toContainText("nearpay.checkout.sessions.create");
    await expect(page.getByRole("link", { name: "Read the quickstart" })).toHaveAttribute("href", /\/get-started$/);
    await expect(page.getByRole("link", { name: "Explore the API" })).toHaveAttribute(
      "href",
      /docs\.nearpay\.money\/api$/,
    );
    await expect(page.getByText("NearPay. Payments on NEAR Intents.")).toBeVisible();
    const footer = page.getByRole("navigation", { name: "Footer" });
    for (const label of ["Pricing", "Docs", "Support", "Privacy", "Terms"])
      await expect(footer.getByRole("link", { name: label })).toBeVisible();
    const text = ((await page.locator("main").textContent()) ?? "").toLowerCase();
    expect(text).not.toContain("verified business");
    expect(text).not.toContain("one settlement out");
    await expectAccessible(page);
  });

  test("hero animates from an external module, one dot at a time", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${WEB}/`);
    const scripts = page.locator("script");
    for (const s of await scripts.all()) {
      expect(await s.getAttribute("src")).toMatch(/^\/_assets\/.+\.js$/);
      expect(((await s.textContent()) ?? "").trim()).toBe("");
    }
    const hero = page.locator(".np-convergence");
    await expect(hero).toHaveAttribute("data-motion", "on");
    // 600 ms after load a dot starts its 1.5 s trip: mid-way exactly one dot is visible.
    await page.waitForTimeout(1200);
    const visible = await page.$$eval(
      ".np-convergence__dot",
      (dots) => dots.filter((d) => Number(getComputedStyle(d).opacity) > 0.5).length,
    );
    expect(visible).toBe(1);
    // No layout shift: the panel keeps its fixed 600 × 520 ratio (site-level crop of the kit's 600 × 560 drawing).
    const box = await hero.boundingBox();
    expect(Math.abs((box?.width ?? 0) / (box?.height ?? 1) - 600 / 520)).toBeLessThan(0.01);
  });

  test("hero is static under prefers-reduced-motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${WEB}/`);
    const hero = page.locator(".np-convergence");
    await expect(hero).toHaveAttribute("data-motion", "off");
    await page.waitForTimeout(1200);
    for (const dot of await hero.locator(".np-convergence__dot").all()) await expect(dot).toBeHidden();
    await expect(hero.locator(".np-convergence__card")).toContainText("$49.00");
  });

  test("brand: icons, manifest, og:image and theme colour", async ({ page, request }) => {
    await page.goto(`${WEB}/`);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#12263F");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/og-image\.png$/);
    for (const [path, type] of [
      ["/favicon.svg", "image/svg+xml"],
      ["/favicon.ico", "image/x-icon"],
      ["/apple-touch-icon.png", "image/png"],
      ["/og-image.png", "image/png"],
      ["/icon-192.png", "image/png"],
      ["/icon-512.png", "image/png"],
      ["/icon-maskable-512.png", "image/png"],
    ]) {
      const res = await request.get(`${WEB}${path}`);
      expect(res.status(), path).toBe(200);
      expect(res.headers()["content-type"]).toBe(type);
    }
    const svg = await (await request.get(`${WEB}/favicon.svg`)).text();
    expect(svg).toContain("M6 11c13 0 15 13 28 13"); // Convergence mark
    const manifest = await (await request.get(`${WEB}/site.webmanifest`)).json();
    expect(manifest.theme_color).toBe("#12263F");
    expect(manifest.icons.map((i: { src: string }) => i.src)).toContain("/icon-maskable-512.png");
    await expect(page.locator(".web-header .site-logo svg path")).toHaveAttribute("stroke", "#007A68");
    await expect(page.locator(".web-header .site-logo svg circle")).toHaveAttribute("fill", "#5B5BD6");
  });

  test("keyboard focus is visible (3 px violet ring)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${WEB}/`);
    await page.keyboard.press("Tab"); // skip link
    await page.keyboard.press("Tab"); // logo
    const outline = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement as Element);
      return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`;
    });
    expect(outline).toBe("solid 3px rgb(91, 91, 214)");
  });

  test("mobile: menu is a keyboard-operable disclosure, no horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${WEB}/`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const card = page.locator(".np-convergence__card");
    const panel = await page.locator(".np-convergence").boundingBox();
    const cardBox = await card.boundingBox();
    expect((cardBox?.y ?? 0) + (cardBox?.height ?? 0)).toBeLessThanOrEqual((panel?.y ?? 0) + (panel?.height ?? 0));
    const menu = page.locator("summary[aria-label='Menu']");
    await menu.focus();
    await page.keyboard.press("Enter");
    const menuPanel = page.locator(".web-menu__panel");
    await expect(menuPanel.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(menuPanel.getByRole("link", { name: "Start accepting payments" })).toBeVisible();
    await expect(menuPanel.getByRole("link", { name: "Pricing" })).toBeVisible();
    await menuPanel.getByRole("link", { name: "Pricing" }).click();
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
