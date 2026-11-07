/**
 * Money on the site is formatted at build time with the kit's integer formatter (INV-5: bigint base
 * units + decimals, never a float). Fee arithmetic uses bigint basis points.
 */
import { formatMoney } from "@nearpay-internal/ui";

export interface Asset {
  symbol: string;
  decimals: number;
}

export const USD: Asset = { symbol: "$", decimals: 2 };
export const USDC: Asset = { symbol: "USDC", decimals: 6 };

/** Formats base units with at least two fraction digits (more only when the value needs them). */
export function money(amount: bigint | string, asset: Asset): string {
  return formatMoney({ amount, decimals: asset.decimals, symbol: asset.symbol, minFraction: 2 });
}

/** `amount × bps / 10 000`, rounded up to the asset's base unit (a fee is never under-stated). */
export function feeFor(amount: bigint, bps: number): bigint {
  if (!Number.isInteger(bps) || bps < 0) throw new RangeError(`invalid bps: ${bps}`);
  const n = amount * BigInt(bps);
  return n / 10_000n + (n % 10_000n === 0n ? 0n : 1n);
}

/** Basis points as a percentage string: 100 → "1.00%", 30 → "0.30%". */
export function percent(bps: number): string {
  return `${formatMoney({ amount: BigInt(bps), decimals: 2, minFraction: 2 })}%`;
}

/** Rescales base units between decimals (exact when going up; the demo card only scales USD → USDC). */
export function rescale(amount: bigint, from: number, to: number): bigint {
  if (to >= from) return amount * 10n ** BigInt(to - from);
  const d = 10n ** BigInt(from - to);
  if (amount % d !== 0n) throw new RangeError("rescale would lose precision");
  return amount / d;
}
