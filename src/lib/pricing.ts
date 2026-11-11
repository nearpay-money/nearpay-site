/**
 * Default fee schedule — `nearpay-brain/roadmap/open-questions.md` Q-BIZ-02 (identity seeds it as the
 * `standard` schedule). Indicative until the owner answers Q-BIZ-02. Route classes follow rails §8.1.
 * The default fee bearer is the payer (Q-BIZ-04).
 */
export interface FeeRule {
  routeClass: "same_asset" | "stable_pair" | "volatile" | "intents_transfer";
  name: string;
  when: string;
  /** Plain-text example (also the text alternative of `route`). */
  example: string;
  /** Example route as two chips on the home page: what the customer pays with, what you receive. */
  route?: readonly [pays: string, settles: string];
  bps: number;
  /** Minimum fee in USD micros (1 000 000 = USD 1). */
  minFeeUsdMicros?: bigint;
}

export const FEE_SCHEDULE: readonly FeeRule[] = [
  {
    routeClass: "same_asset",
    name: "Same asset",
    when: "The customer pays in the asset you settle in, or the same asset on another network.",
    example: "USDC on Base, settled as USDC on NEAR",
    route: ["USDC on Base", "USDC on NEAR"],
    bps: 20,
  },
  {
    routeClass: "stable_pair",
    name: "Stablecoin pair",
    when: "The customer pays with a different US-dollar stablecoin than the one you settle in.",
    example: "USDT on Arbitrum, settled as USDC on Base",
    route: ["USDT on Arbitrum", "USDC on Base"],
    bps: 50,
  },
  {
    routeClass: "volatile",
    name: "Any other token",
    when: "The customer pays with a token whose price moves against your settlement asset.",
    example: "ETH on Ethereum, settled as USDC on Base",
    route: ["ETH on Ethereum", "USDC on Base"],
    bps: 100,
  },
  {
    routeClass: "intents_transfer",
    name: "Intents transfer",
    when: "The customer or agent pays from a NEAR Intents account, in your settlement asset.",
    example: "Agent payments (x402) and NEAR Intents wallets",
    bps: 30,
    minFeeUsdMicros: 1_000n,
  },
] as const;

export const DEFAULT_FEE_BEARER = "payer" as const;
