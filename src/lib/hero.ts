/**
 * Landing hero (design v2 Main artboard): the kit's `ConvergenceHero` — payment routes from several chains
 * converging on one settlement point — rendered to static HTML at build time (react-dom/server; React never
 * ships to the browser). The kit's component animates with SMIL started from a React effect; on this static
 * site the same schedule is driven by `startConvergence` (lib/convergence.ts, dependency-free), loaded from an
 * external module (src/scripts/hero.ts) so the strict CSP (`script-src 'self'`) holds.
 */
import { ConvergenceHero, Money, StatusBadge, type StatusBadgeProps } from "@nearpay-internal/ui";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";

export const HERO_LABELS = ["USDC on Base", "SOL on Solana", "ETH on Arbitrum", "BTC", "NEAR"] as const;
export const HERO_DESCRIPTION =
  "Payments in USDC on Base, SOL on Solana, ETH on Arbitrum, BTC and NEAR travel their own routes and settle in one place: a $49.00 payment received, settled as USDC to your NEAR wallet, confirmed in 1 block.";

/** The panel's static HTML (no inline styles, no scripts). Amount: bigint base units via the kit's `Money`. */
export function heroMarkup(): string {
  const card = h(
    "div",
    { className: "hero-received" },
    h(
      "div",
      { className: "hero-received__head" },
      h("span", { className: "hero-received__title" }, "Payment received"),
      // children go in the third argument (createElement); the props type marks them required
      h(StatusBadge, { tone: "success" } as StatusBadgeProps, "Paid"),
    ),
    h("p", { className: "hero-received__amount np-tabular" }, h(Money, { amount: 4900n, decimals: 2, symbol: "$" })),
    h("p", { className: "hero-received__sub" }, "Settled as USDC to your NEAR wallet"),
    h("hr", { className: "hero-received__rule" }),
    h("p", { className: "hero-received__row" }, h("span", null, "Confirmed in"), h("strong", null, "1 block")),
  );
  return renderToStaticMarkup(
    h(ConvergenceHero, {
      labels: HERO_LABELS,
      card,
      autoPlay: false,
      description: HERO_DESCRIPTION,
      className: "hero-panel",
    }),
  );
}
