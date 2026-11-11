/** Docs sidebar. Guides are Markdown in src/content/docs; reference pages are rendered from @nearpay-money/spec. */
import { GROUPS, operationsOf } from "./spec";

export interface NavItem {
  label: string;
  href: string;
  /** Extra text shown on the right (e.g. endpoint count). */
  meta?: string;
}
export interface NavGroup {
  heading: string;
  items: NavItem[];
}

export const NAV: readonly NavGroup[] = [
  {
    heading: "Start here",
    items: [
      { label: "Overview", href: "/" },
      { label: "Get started", href: "/get-started" },
      { label: "Integrate with an AI agent", href: "/build-with-ai" },
      { label: "Test mode", href: "/test-mode" },
    ],
  },
  {
    heading: "Accept payments",
    items: [
      { label: "Checkout", href: "/checkout" },
      { label: "Embedded checkout", href: "/checkout/embedded" },
      { label: "Payment links", href: "/checkout/payment-links" },
      { label: "Payment intents", href: "/payment-intents" },
      { label: "Refunds", href: "/refunds" },
      { label: "Customers", href: "/customers" },
      { label: "Settlement destinations", href: "/settlement-destinations" },
    ],
  },
  {
    heading: "Billing",
    items: [
      { label: "Send an invoice", href: "/billing/invoices" },
      { label: "Subscriptions", href: "/billing/subscriptions" },
      { label: "Tax rates", href: "/billing/tax-rates" },
    ],
  },
  {
    heading: "Webhooks",
    items: [
      { label: "Receive webhooks", href: "/webhooks" },
      { label: "Event types", href: "/webhooks/events" },
      { label: "Listen locally with the CLI", href: "/cli" },
    ],
  },
  {
    heading: "Agents",
    items: [
      { label: "Let AI agents pay", href: "/agents/ai-agents" },
      { label: "Agent payments (x402)", href: "/agents" },
    ],
  },
  {
    heading: "API reference",
    items: [
      { label: "Overview", href: "/api" },
      ...GROUPS.map((g) => ({ label: g.title, href: `/api/${g.slug}`, meta: String(operationsOf(g.slug).length) })),
    ],
  },
  {
    heading: "Resources",
    items: [
      { label: "Errors", href: "/errors" },
      { label: "Changelog", href: "/changelog" },
    ],
  },
];

/** Flat reading order for previous/next links. */
export const ORDER: readonly NavItem[] = NAV.flatMap((g) => g.items);

export function neighbours(path: string): { prev?: NavItem; next?: NavItem } {
  const i = ORDER.findIndex((item) => item.href === path);
  if (i === -1) return {};
  return { prev: ORDER[i - 1], next: ORDER[i + 1] };
}

/** The nav item that should be marked current for a path (error pages highlight "Errors"). */
export function currentHref(path: string): string {
  const clean = path.replace(/\/$/, "") || "/";
  if (clean.startsWith("/errors/")) return "/errors";
  return clean;
}
