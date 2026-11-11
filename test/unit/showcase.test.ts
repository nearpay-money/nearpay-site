import { describe, expect, it } from "vitest";
import { FLOW_PAYMENTS, odometer, prng, qrPath } from "../../src/lib/showcase";

describe("showcase helpers (home page mockups)", () => {
  it("formats the flow diagram's sample payments from base units", () => {
    expect(FLOW_PAYMENTS.map((p) => p.pays)).toEqual(["0.01408 ETH", "0.2722 SOL", "49.10 USDT"]);
    expect(FLOW_PAYMENTS.map((p) => p.route)).toEqual([0, 1, 2]);
  });

  it("splits a figure into odometer digits that spin more on the right", () => {
    const parts = odometer("$12,480.00");
    expect(parts.filter((p) => p.kind === "char").map((p) => (p.kind === "char" ? p.char : ""))).toEqual([
      "$",
      ",",
      ".",
    ]);
    const digits = parts.flatMap((p) => (p.kind === "digit" ? [p] : []));
    expect(digits.map((d) => d.digit)).toEqual([1, 2, 4, 8, 0, 0, 0]);
    expect(digits.map((d) => d.cycles)).toEqual([0, 0, 0, 0, 1, 1, 2]);
    expect(odometer("4 s")).toEqual([
      { kind: "digit", digit: 4, cycles: 2 },
      { kind: "char", char: " " },
      { kind: "char", char: "s" },
    ]);
  });

  it("draws a deterministic decorative QR pattern", () => {
    const a = qrPath(7);
    expect(a).toBe(qrPath(7));
    expect(a).not.toBe(qrPath(8));
    expect(a.startsWith("M0 0h7v7h-7z")).toBe(true);
    expect(a).toMatch(/^[Mhvz0-9 -]+$/);
    expect(() => qrPath(1, 20)).toThrow(RangeError);
    expect(() => qrPath(1, 21.5)).toThrow(RangeError);
  });

  it("prng stays in [0, 1)", () => {
    const r = prng(42);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
