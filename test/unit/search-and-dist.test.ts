import { describe, expect, it } from "vitest";
import { checkHtml } from "../../scripts/check-dist.mjs";
import { resolveFile } from "../../scripts/serve.mjs";
import { rank, type SearchDoc } from "../../src/lib/search";

const docs: SearchDoc[] = [
  { title: "Refunds", href: "/refunds", section: "Guide", text: "Sign refunds in your wallet", keywords: "leg" },
  {
    title: "leg_expired",
    href: "/errors/leg_expired",
    section: "Error",
    text: "The refund's leg expired",
    keywords: "",
  },
  { title: "Webhooks", href: "/webhooks", section: "Guide", text: "Signed events", keywords: "rotation" },
];

describe("search", () => {
  it("ranks title matches first and requires every term", () => {
    expect(rank(docs, "refund").map((d) => d.href)).toEqual(["/refunds", "/errors/leg_expired"]);
    expect(rank(docs, "refund leg").length).toBe(2);
    expect(rank(docs, "rotation")[0]?.href).toBe("/webhooks");
    expect(rank(docs, "  ")).toEqual([]);
    expect(rank(docs, "zzz")).toEqual([]);
  });
});

const page = (body: string, head = "") =>
  `<html lang="en"><head><title>T</title>${head}</head><body><main id="main"><h1>T</h1>${body}</main></body></html>`;

describe("check-dist (strict CSP gate)", () => {
  it("accepts a clean page", () => {
    expect(checkHtml("x.html", page('<script type="module" src="/_assets/a.js"></script>'))).toEqual([]);
  });
  it("flags inline scripts, styles, handlers and third-party assets", () => {
    const bad = page(
      '<script>alert(1)</script><style>a{}</style><p style="color:red" onclick="x()">x</p><script src="https://cdn.example/x.js"></script><img src="https://img.example/a.png"><a href="javascript:void 0">x</a>',
      '<link rel="stylesheet" href="https://fonts.example/a.css">',
    );
    const problems = checkHtml("x.html", bad).join("\n");
    for (const s of [
      "inline <script>",
      "<style>",
      "style=",
      "event handler",
      "third-party script",
      "third-party image",
      "javascript:",
      "third-party <link",
    ]) {
      expect(problems).toContain(s);
    }
  });
  it("checks document structure", () => {
    const problems = checkHtml("x.html", "<html><body><h1>a</h1><h1>b</h1></body></html>").join("\n");
    expect(problems).toMatch(/lang/);
    expect(problems).toMatch(/title/);
    expect(problems).toMatch(/2 <h1>/);
    expect(problems).toMatch(/#main/);
  });
});

describe("preview server", () => {
  it("resolves clean URLs inside the root only", () => {
    const root = new URL("../../src/routes/docs", import.meta.url).pathname;
    expect(resolveFile(root, "/search.astro")).toMatch(/search\.astro$/);
    expect(resolveFile(root, "/../../package.json")).toBeNull();
    expect(resolveFile(root, "/missing")).toBeNull();
  });
});
