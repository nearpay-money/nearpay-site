import { expect, expectAccessible, test, WEB } from "./harness";

test.describe("marketing site", () => {
  test("home: landing v3 copy, header and structure", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${WEB}/`);
    await expect(page).toHaveTitle("NearPay | Accept crypto payments. Hassle-free.");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Accept crypto payments. Hassle-free.");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /any token on any blockchain/);
    // Header nav (owner, 2026-11-12): exactly these links, in order; sections are in-page anchors here.
    const nav = page.getByRole("navigation", { name: "Main" }).first();
    await expect(nav.getByRole("link")).toHaveText(["How it works", "Products", "Developers", "Pricing", "Docs"]);
    expect(await nav.getByRole("link").evaluateAll((els) => els.map((e) => e.getAttribute("href")))).toEqual([
      "#how-it-works",
      "#products",
      "#developers",
      "#pricing",
      "https://docs.nearpay.money",
    ]);
    for (const old of ["Checkout", "Payment links", "Subscriptions", "Agent payments"]) {
      await expect(nav.getByRole("link", { name: old, exact: true })).toHaveCount(0);
    }
    // Header (owner 2026-11-11): two rectangular buttons, no pill CTA and no plain-text Sign in link.
    const actions = page.locator(".web-header__actions");
    await expect(actions.getByRole("link")).toHaveCount(2);
    const signin = actions.getByRole("link", { name: "Sign in" });
    await expect(signin).toHaveClass(/np-button--secondary/);
    await expect(signin).toHaveAttribute("href", /dashboard\.nearpay\.money\/signin$/);
    const contact = actions.getByRole("link", { name: "Contact team" });
    await expect(contact).toHaveClass(/np-button--primary/);
    await expect(contact).toHaveAttribute("href", "/support");
    await expect(contact.locator("svg")).toHaveCount(1); // chevron
    expect(await contact.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(91, 91, 214)");
    expect(await signin.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(255, 255, 255)");
    await expect(page.locator("a", { hasText: "Start accepting payments" })).toHaveCount(0);
    await expect(page.locator("a", { hasText: "See a live checkout" })).toHaveCount(0);

    // Hero
    await expect(page.locator(".hero__lede")).toHaveText(
      "Customers pay however they like: any token, any blockchain. You get paid exactly how you like, in your own wallet.",
    );
    const heroActions = page.locator(".hero__actions a");
    await expect(heroActions).toHaveCount(2);
    await expect(heroActions.nth(0)).toHaveText("Get started");
    await expect(heroActions.nth(0)).toHaveClass(/np-button--primary/);
    await expect(heroActions.nth(0)).toHaveAttribute("href", /docs\.nearpay\.money\/get-started$/);
    await expect(heroActions.nth(1)).toHaveText("Sign up");
    await expect(heroActions.nth(1)).toHaveClass(/np-button--secondary/);
    await expect(heroActions.nth(1)).toHaveAttribute("href", /dashboard\.nearpay\.money\/signup$/);
    // Calm hero: two lines at 1440, panel ≤ 512 px, the section fits the first screen with the chain strip peeking in.
    const title = await page.locator(".hero__title").evaluate((el) => {
      const cs = getComputedStyle(el);
      return { height: el.getBoundingClientRect().height, line: Number.parseFloat(cs.lineHeight) };
    });
    expect(Math.round(title.height / title.line)).toBe(2);
    const panelBox = await page.locator(".np-convergence").boundingBox();
    expect(panelBox?.width ?? 0).toBeLessThanOrEqual(512);
    expect((panelBox?.y ?? 0) + (panelBox?.height ?? 0)).toBeLessThan(900);
    expect((await page.locator(".chain-strip").boundingBox())?.y ?? 900).toBeLessThan(900 - 48);
    // The hero has no colour wash behind the panel (owner, 2026-11-14): plain background at every width.
    await expect(page.locator(".hero-aurora")).toHaveCount(0);

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

    // Payment flow diagram: decorative drawing + the three steps as real content.
    const flow = page.locator(".flow");
    await expect(flow.locator(".flow-diagram")).toHaveAttribute("aria-hidden", "true");
    await expect(flow.locator(".np-sr-only")).toContainText("payment_intent.succeeded");
    await expect(flow.locator(".flow-steps > li")).toHaveCount(3);
    for (const text of ["ETH", "SOL", "USDT", "Arbitrum", "Solana", "BNB Chain", "+49.00 USDC", "on Base", "1 block"]) {
      await expect(flow.locator(".flow-diagram")).toContainText(text);
    }
    await expect(flow.locator(".fl-route__svg--h path")).toHaveCount(6);

    for (const h of [
      "A payment, from wallet to wallet, in seconds.",
      "The customer pays their way",
      "Routed on-chain, never held",
      "You’re paid, with proof",
      "Every way to get paid in crypto.",
      "Checkout on your site",
      "Payment links",
      "Invoices and subscriptions",
      "A dashboard for every payment",
      "Agent payments",
      "One API call to a hosted checkout.",
      "One fee per successful payment.",
      "Same asset",
      "Stablecoin pair",
      "Any other token",
      "Intents transfer",
      "You choose who covers the fee",
      "Network fees are separate",
      "Test mode is free",
      "We never hold your money",
      "Every payment is checked",
      "Live in minutes",
    ]) {
      await expect(page.getByRole("heading", { name: h, exact: true })).toBeVisible();
    }
    // Showcase cards: decorative stages with a text alternative each, no raster images.
    const cards = page.locator(".sc-card");
    await expect(cards).toHaveCount(6);
    const stages = page.locator(".sc-stage");
    await expect(stages).toHaveCount(5);
    for (const stage of await stages.all()) await expect(stage).toHaveAttribute("aria-hidden", "true");
    for (const c of await page.locator(".sc-card:not(.sc-card--dev)").all()) {
      await expect(c.locator(":scope > .np-sr-only")).toHaveText(/^Animated example: .+/);
    }
    await expect(page.locator(".showcase img")).toHaveCount(0);
    await expect(page.locator(".sc-card--checkout .mk")).toContainText("Pay with crypto");
    await expect(page.locator(".sc-card--checkout .mk")).toContainText("Payout address verified for Pebblequest");
    await expect(page.locator(".sc-card--billing .mk")).toContainText("$1,500.00");
    await expect(page.locator(".sc-card--dashboard .mk")).toContainText("Recent payments");
    await expect(page.locator(".sc-card--links .mk")).toContainText("pay.nearpay.money/l/");
    await expect(page.locator(".sc-card--agents .mk")).toContainText("402");
    await expect(page.locator(".sc-card--agents .mk")).toContainText("Paid to the API owner’s wallet");
    await expect(flow.locator(".fl-quote")).toContainText("= 0.01408 ETH");
    const log = page.locator(".evlog__list");
    for (const e of ["checkout.session.completed", "payment_intent.succeeded"]) await expect(log).toContainText(e);
    await expect(log).toContainText("200 OK");

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
    expect(text).not.toContain("settled by nearpay");
    // Contrast is checked on held frames rather than at a random moment: a frame caught mid cross-fade (two
    // labels at half opacity) is not a state anyone reads. Each frame below has every card mid-story with its
    // labels fully shown (Sent invoice, Confirming row, token picker, 402…); reduced motion covers the end state.
    for (const ms of [2000, 6000, 9000]) {
      await page.evaluate((t) => {
        for (const a of document.getAnimations()) {
          a.pause();
          a.currentTime = t;
        }
      }, ms);
      await expectAccessible(page);
    }
  });

  test("buttons: one rectangular system, no pills, no arrows in labels", async ({ page }) => {
    for (const path of ["/", "/support", "/privacy", "/404"]) {
      test.info().annotations.push({ type: "allow-404" });
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${WEB}${path}`);
      const buttons = page.locator(".np-button");
      expect(await buttons.count()).toBeGreaterThan(0);
      for (const b of await buttons.all()) {
        const { radius, text } = await b.evaluate((el) => ({
          radius: getComputedStyle(el).borderTopLeftRadius,
          text: el.textContent ?? "",
        }));
        expect(radius, `${path}: ${text}`).toBe("8px");
        expect(text).not.toContain("→");
      }
    }
  });

  test("header nav links change colour on hover and focus, never underline", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${WEB}/`);
    const link = page.locator(".web-nav__link", { hasText: "Products" });
    const before = await link.evaluate((el) => getComputedStyle(el).color);
    expect(await link.evaluate((el) => getComputedStyle(el).transitionProperty)).toContain("color");
    await link.hover();
    await page.waitForTimeout(400);
    const hovered = await link.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { color: cs.color, line: cs.textDecorationLine };
    });
    expect(hovered.color).not.toBe(before);
    expect(hovered.color).toBe("rgb(91, 91, 214)");
    expect(hovered.line).toBe("none");
    await page.mouse.move(0, 400);
    await link.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(400);
    expect(await link.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(91, 91, 214)");
  });

  test("showcase and flow animate with CSS only, without layout shift", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${WEB}/`);
    const running = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) => (a.effect as KeyframeEffect | null)?.target?.closest?.(".showcase, .flow")).length,
    );
    expect(running).toBeGreaterThan(40);
    const heights = () =>
      page.$$eval(".sc-stage, .flow-panel", (els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
    const first = await heights();
    await page.waitForTimeout(2500);
    expect(await heights()).toEqual(first);
    // Only the hero module ships as script; no script anywhere else on the page.
    await expect(page.locator(".showcase script, .flow script")).toHaveCount(0);
  });

  test("reduced motion: showcase and flow are still, on their final frames", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${WEB}/`);
    const running = await page.evaluate(() =>
      document
        .getAnimations()
        // keyframe animations only (colour transitions on hover are fine under reduced motion)
        .filter((a): a is CSSAnimation => a instanceof CSSAnimation)
        .filter((a) => (a.effect as KeyframeEffect | null)?.target?.closest?.(".showcase, .flow"))
        .map((a) => a.animationName),
    );
    expect(running).toEqual([]);
    const opacity = (sel: string) =>
      page
        .locator(sel)
        .first()
        .evaluate((el) => getComputedStyle(el).opacity);
    expect(await opacity(".mkc-success")).toBe("1"); // checkout: paid
    expect(await opacity(".mki-st2")).toBe("1"); // invoice: Paid
    expect(await opacity(".mki-st0")).toBe("0");
    expect(await opacity(".mkl-toast")).toBe("1"); // link: paid
    expect(await opacity(".mka-l6")).toBe("1"); // agent: 200 OK
    expect(await opacity(".fl-received")).toBe("1"); // flow: merchant paid
    expect(await opacity(".fl-wait")).toBe("0");
    expect(await opacity(".mk-cursor")).toBe("0");
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
    // 600 ms after the module starts a dot makes its 1.5 s trip, one payment every 2.4 s: a dot shows up, and
    // never more than one at a time. (Polled rather than sampled at a fixed time: the home page is heavier since
    // landing v3, so the checks above can take long enough on a busy machine to miss a fixed 1.2 s window.)
    const counts: number[] = [];
    await expect
      .poll(
        async () => {
          const n = await page.$$eval(
            ".np-convergence__dot",
            (dots) => dots.filter((d) => Number(getComputedStyle(d).opacity) > 0.5).length,
          );
          counts.push(n);
          return n;
        },
        { timeout: 5_000, intervals: [50] },
      )
      .toBe(1);
    expect(Math.max(...counts)).toBeLessThanOrEqual(1);
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
    // The animated product mock-ups fade text in and out; the contrast check must not catch a frame in between.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(`${WEB}/`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
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
    await expect(menuPanel.getByRole("link", { name: "Sign in" })).toHaveClass(/np-button--secondary/);
    await expect(menuPanel.getByRole("link", { name: "Contact team" })).toHaveAttribute("href", "/support");
    await expect(menuPanel.getByRole("link", { name: "Contact team" })).toBeVisible();
    await expect(menuPanel.locator(".web-menu__list a:not(.np-button)")).toHaveText([
      "How it works",
      "Products",
      "Developers",
      "Pricing",
      "Docs",
    ]);
    await expectAccessible(page);
    // A section link scrolls to the section and closes the menu (scripts/menu.ts), so the panel doesn't cover it.
    await menuPanel.getByRole("link", { name: "Pricing" }).click();
    await expect(page).toHaveURL(`${WEB}/#pricing`);
    await expect(page.locator(".web-menu")).not.toHaveAttribute("open", "");
    await expect(page.locator("#pricing-title")).toBeInViewport();
    // Escape closes an open menu and returns focus to the menu button.
    await menu.click();
    await expect(page.locator(".web-menu")).toHaveAttribute("open", "");
    await page.keyboard.press("Escape");
    await expect(page.locator(".web-menu")).not.toHaveAttribute("open", "");
    await expect(menu).toBeFocused();
  });

  test("header: sticky, and section links from other pages go to /#anchor", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${WEB}/support`);
    const nav = page.getByRole("navigation", { name: "Main" }).first();
    expect(await nav.getByRole("link").evaluateAll((els) => els.map((e) => e.getAttribute("href")))).toEqual([
      "/#how-it-works",
      "/#products",
      "/#developers",
      "/#pricing",
      "https://docs.nearpay.money",
    ]);
    await expect(
      page.getByRole("navigation", { name: "Footer" }).getByRole("link", { name: "Pricing" }),
    ).toHaveAttribute("href", "/#pricing");
    await nav.getByRole("link", { name: "Developers" }).click();
    await expect(page).toHaveURL(`${WEB}/#developers`);
    await expect(page.locator("#dev-title")).toBeInViewport();
    // Sticky: still at the top after scrolling.
    expect((await page.locator(".web-header").boundingBox())?.y).toBe(0);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
  });

  test("section anchors land just under the sticky header (desktop and phone)", async ({ page }) => {
    for (const [width, height] of [
      [1440, 900],
      [390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      for (const [id, heading] of [
        ["how-it-works", "#flow-title"],
        ["products", "#showcase-title"],
        ["developers", "#developers"], // the card (its copy is vertically centred in a tall card on desktop)
        ["pricing", "#pricing-title"],
      ] as const) {
        await page.goto("about:blank"); // a fresh load each time (not a same-page fragment change)
        await page.goto(`${WEB}/#${id}`);
        await page.waitForFunction(() => document.readyState === "complete");
        // Wait until the scroll position has settled (a smooth scroll, if any, has finished).
        let last = -1;
        await expect
          .poll(
            async () => {
              const y = await page.evaluate(() => window.scrollY);
              const settled = y > 0 && y === last;
              last = y;
              return settled;
            },
            { intervals: [250] },
          )
          .toBe(true);
        const header = (await page.locator(".web-header").boundingBox())?.height ?? 0;
        const top = (await page.locator(heading).boundingBox())?.y ?? -1;
        expect(top, `${width}: #${id}`).toBeGreaterThanOrEqual(header);
        expect(top, `${width}: #${id}`).toBeLessThan(header + 140);
      }
    }
  });

  test("in-page navigation scrolls smoothly, and instantly under reduced motion", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${WEB}/`);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("smooth");
    await page.locator(".web-nav__link", { hasText: "Pricing" }).click();
    await expect(page).toHaveURL(`${WEB}/#pricing`);
    await expect(page.locator("#pricing-title")).toBeInViewport();
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
  });

  test("old marketing URLs forward to the home sections", async ({ page, request }) => {
    for (const [old, target] of [
      ["/pricing", "/#pricing"],
      ["/payments", "/#products"],
      ["/billing", "/#products"],
    ]) {
      const res = await request.get(`${WEB}${old}`);
      expect(res.status(), old).toBe(200);
      const html = await res.text();
      expect(html).toContain(`<meta http-equiv="refresh" content="0; url=${target}">`);
      expect(html).toContain('<meta name="robots" content="noindex">');
      expect(html).toContain(`<link rel="canonical" href="https://nearpay.money${target}">`);
      expect(html).toMatch(new RegExp(`<a class="np-button[^"]*" href="${target}">Go to `));
      await page.goto(`${WEB}${old}`);
      await expect(page).toHaveURL(`${WEB}${target}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Accept crypto payments. Hassle-free.");
    }
  });

  test("pricing section shows the indicative Q-BIZ-02 schedule, before the navy band", async ({ page }) => {
    // Still frames for axe (the showcase above loops; the home test holds its frames separately).
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${WEB}/`);
    const pricing = page.locator("section#pricing");
    await expect(pricing.getByText("Indicative pricing, may change before general availability")).toBeVisible();
    const rates = pricing.locator(".pr-rate");
    await expect(rates).toHaveCount(4);
    await expect(rates.locator(".pr-rate__name")).toHaveText([
      "Same asset",
      "Stablecoin pair",
      "Any other token",
      "Intents transfer",
    ]);
    await expect(rates.locator(".pr-rate__pct")).toHaveText(["0.20%", "0.50%", "1.00%", "0.30%"]);
    await expect(rates.nth(3)).toContainText("Minimum fee $0.001");
    await expect(rates.nth(1).locator(".np-sr-only")).toHaveText(
      "For example: USDT on Arbitrum, settled as USDC on Base.",
    );
    await expect(pricing).toContainText("including the route provider’s share");
    await expect(pricing).toContainText("NearPay never holds your balance");
    // Worked example (bigint cents): 0.50% of $100.00, customer covers it by default.
    const cases = pricing.locator(".pr-split__case");
    await expect(cases.nth(0)).toContainText("Your customer covers it (default)");
    await expect(cases.nth(0)).toContainText("$100.50");
    await expect(cases.nth(1)).toContainText("$99.50");
    await expect(pricing).toContainText("No real funds move, and nothing is charged.");
    // Order: showcase, pricing, then the final navy band.
    const order = await page.$$eval("main > section", (els) => els.map((e) => e.className.split(" ")[0]));
    expect(order.slice(-3)).toEqual(["showcase", "pricing", "promise-band"]);
    await pricing.scrollIntoViewIfNeeded();
    await expectAccessible(page);
  });

  for (const path of ["/support", "/privacy", "/terms"]) {
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
