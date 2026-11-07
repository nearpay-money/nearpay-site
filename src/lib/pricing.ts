/**
 * Default fee schedule — `nearpay-brain/roadmap/open-questions.md` Q-BIZ-02 (identity seeds it as the
 * `standard` schedule). Indicative until the owner answers Q-BIZ-02. Route classes follow rails §8.1.
 * The default fee bearer is the payer (Q-BIZ-04).
 */
export interface FeeRule {
  routeClass: "same_asset" | "stable_pair" | "volatile" | "intents_transfer";
  name: string;
  when: string;
  example: string;
  bps: number;
  /** Minimum fee in USD micros (1 000 000 = USD 1). */
  minFeeUsdMicros?: bigint;
}

export const FEE_SCHEDULE: readonly FeeRule[] = [
  {
    routeClass: "same_asset",
    name: "Same asset",
    when: "The customer pays in the asset you settle in, or the same asset on another network.",
    example: "USDC · Base → USDC · NEAR",
    bps: 20,
  },
  {
    routeClass: "stable_pair",
    name: "Stablecoin pair",
    when: "The customer pays with a different US-dollar stablecoin than the one you settle in.",
    example: "USDT · Arbitrum → USDC · Base",
    bps: 50,
  },
  {
    routeClass: "volatile",
    name: "Any other token",
    when: "The customer pays with a token whose price moves against your settlement asset.",
    example: "ETH · Ethereum → USDC · Base",
    bps: 100,
  },
  {
    routeClass: "intents_transfer",
    name: "Intents transfer",
    when: "The customer or agent pays from a NEAR Intents account, in your settlement asset.",
    example: "Agent payments (x402), Intents wallets",
    bps: 30,
    minFeeUsdMicros: 1_000n,
  },
] as const;

export const DEFAULT_FEE_BEARER = "payer" as const;
