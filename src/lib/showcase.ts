/**
 * Build-time helpers for the home page's animated product mockups (payment flow diagram and showcase cards).
 * Everything here returns plain data or strings for static markup: the animations themselves are CSS
 * keyframes (styles/showcase.css), so the page ships no extra JavaScript.
 *
 * All amounts are sample data, formatted from bigint base units with the kit's formatter (lib/money.ts).
 */
import { type Asset, money } from "./money";

export const ETH: Asset = { symbol: "ETH", decimals: 18 };
export const SOL: Asset = { symbol: "SOL", decimals: 9 };
export const USDT: Asset = { symbol: "USDT", decimals: 6 };

/** One payment of the flow diagram: what the customer sends, on which chain, and which route it takes. */
export interface FlowPayment {
  pays: string;
  chain: string;
  token: string;
  /** Route index in the diagram (0 = top curve, 1 = straight, 2 = bottom curve). */
  route: 0 | 1 | 2;
}

/** The diagram's three sample payments: different tokens and chains in, the same $49.00 in USDC on Base out. */
export const FLOW_PAYMENTS: readonly FlowPayment[] = [
  { pays: money(14_080_000_000_000_000n, ETH), chain: "Arbitrum", token: "ETH", route: 0 },
  { pays: money(272_200_000n, SOL), chain: "Solana", token: "SOL", route: 1 },
  { pays: money(49_100_000n, USDT), chain: "BNB Chain", token: "USDT", route: 2 },
];

export type OdometerPart = { kind: "digit"; digit: number; cycles: 0 | 1 | 2 } | { kind: "char"; char: string };

/**
 * Splits a formatted figure into rolling digit columns and fixed characters. The rightmost digits spin
 * more full turns than the leading ones, so the count-up reads like a real odometer.
 */
export function odometer(text: string): OdometerPart[] {
  const digits = [...text].filter((c) => c >= "0" && c <= "9").length;
  let seen = 0;
  return [...text].map((char): OdometerPart => {
    if (char < "0" || char > "9") return { kind: "char", char };
    const fromRight = digits - 1 - seen;
    seen += 1;
    const cycles = fromRight === 0 ? 2 : fromRight < 3 ? 1 : 0;
    return { kind: "digit", digit: Number(char), cycles };
  });
}

/** Small deterministic PRNG (mulberry32), so the decorative QR pattern is identical on every build. */
export function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A decorative QR-style pattern (it encodes nothing) as one SVG path in a `size × size` module grid:
 * three finder squares plus seeded random modules. One `<path>` keeps the markup light.
 */
export function qrPath(seed: number, size = 25): string {
  if (!Number.isInteger(size) || size < 21) throw new RangeError(`invalid QR size: ${size}`);
  const rnd = prng(seed);
  const finders: Array<[number, number]> = [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ];
  const inFinderZone = (x: number, y: number) =>
    finders.some(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7);
  const parts: string[] = [];
  for (const [fx, fy] of finders) {
    // 7×7 ring, then the 3×3 centre (even-odd fill keeps the ring hollow)
    parts.push(`M${fx} ${fy}h7v7h-7zM${fx + 1} ${fy + 1}v5h5v-5z`, `M${fx + 2} ${fy + 2}h3v3h-3z`);
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (inFinderZone(x, y)) continue;
      if (rnd() < 0.46) parts.push(`M${x} ${y}h1v1h-1z`);
    }
  }
  return parts.join("");
}
