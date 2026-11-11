import { describe, expect, it } from "vitest";
import { HOME_SECTIONS, headerNav, links, MOVED_PAGES } from "../../src/config/site";

describe("marketing header nav (owner, 2026-11-12)", () => {
  it("lists exactly How it works, Products, Developers, Pricing, Docs, in order", () => {
    expect(headerNav(true).map((i) => i.label)).toEqual(["How it works", "Products", "Developers", "Pricing", "Docs"]);
  });
  it("uses in-page anchors on the home page and /#anchor elsewhere", () => {
    expect(headerNav(true).map((i) => i.href)).toEqual([
      "#how-it-works",
      "#products",
      "#developers",
      "#pricing",
      "https://docs.nearpay.money",
    ]);
    expect(
      headerNav(false)
        .slice(0, 4)
        .map((i) => i.href),
    ).toEqual(["/#how-it-works", "/#products", "/#developers", "/#pricing"]);
  });
  it("forwards every old marketing page to a home section", () => {
    const ids = HOME_SECTIONS.map((s) => s.id as string);
    expect(Object.keys(MOVED_PAGES).sort()).toEqual(["billing", "payments", "pricing"]);
    for (const page of Object.values(MOVED_PAGES)) expect(ids).toContain(page.to);
    expect(MOVED_PAGES.pricing?.to).toBe("pricing");
    expect(links.pricing).toBe("https://nearpay.money/#pricing");
  });
});
