import { describe, expect, it } from "vitest";
import { feeFor, money, percent, rescale, USD, USDC } from "../../src/lib/money";
import { FEE_SCHEDULE } from "../../src/lib/pricing";

describe("money (INV-5: integers only)", () => {
  it("formats the hero card amounts", () => {
    expect(money(4900n, USD)).toBe("$49.00");
    expect(money(49n, USD)).toBe("$0.49");
    expect(money(rescale(4949n, 2, 6), USDC)).toBe("49.49 USDC");
    expect(money(rescale(4900n, 2, 6), USDC)).toBe("49.00 USDC");
  });
  it("computes basis-point fees in bigint, rounding up", () => {
    expect(feeFor(10_000n, 50)).toBe(50n);
    expect(feeFor(10_000n, 100)).toBe(100n);
    expect(feeFor(4_999n, 20)).toBe(10n); // 9.998 → 10
    expect(feeFor(0n, 30)).toBe(0n);
    expect(() => feeFor(1n, -1)).toThrow(RangeError);
    expect(() => feeFor(1n, 1.5)).toThrow(RangeError);
  });
  it("renders percentages from bps", () => {
    expect(percent(100)).toBe("1.00%");
    expect(percent(30)).toBe("0.30%");
    expect(percent(20)).toBe("0.20%");
  });
  it("rescales exactly or refuses", () => {
    expect(rescale(1_000_000n, 6, 2)).toBe(100n);
    expect(() => rescale(1n, 6, 2)).toThrow(RangeError);
  });
  it("carries the Q-BIZ-02 default schedule", () => {
    const bps = Object.fromEntries(FEE_SCHEDULE.map((r) => [r.routeClass, r.bps]));
    expect(bps).toEqual({ same_asset: 20, stable_pair: 50, volatile: 100, intents_transfer: 30 });
    expect(FEE_SCHEDULE.find((r) => r.routeClass === "intents_transfer")?.minFeeUsdMicros).toBe(1000n);
  });
});
