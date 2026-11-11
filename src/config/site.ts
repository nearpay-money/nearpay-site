/**
 * Public URLs of the NearPay surfaces the sites link to. Overridable at build time (local stack:
 * `NP_WEB_URL=https://nearpay.localhost` etc.); defaults are production.
 */
const env = (name: string, fallback: string): string => {
  const value = process.env[name];
  return value && /^https?:\/\/[^/]+$/.test(value) ? value : fallback;
};

export const urls = {
  web: env("NP_WEB_URL", "https://nearpay.money"),
  docs: env("NP_DOCS_URL", "https://docs.nearpay.money"),
  dashboard: env("NP_DASHBOARD_URL", "https://dashboard.nearpay.money"),
  api: env("NP_API_URL", "https://api.nearpay.money"),
} as const;

export const links = {
  signup: `${urls.dashboard}/signup`,
  signin: `${urls.dashboard}/signin`,
  dashboard: urls.dashboard,
  docsHome: urls.docs,
  docsGetStarted: `${urls.docs}/get-started`,
  docsCheckout: `${urls.docs}/checkout`,
  docsPaymentLinks: `${urls.docs}/checkout/payment-links`,
  docsInvoices: `${urls.docs}/billing/invoices`,
  docsAgents: `${urls.docs}/agents`,
  docsApi: `${urls.docs}/api`,
  pricing: `${urls.web}/#pricing`,
  support: `${urls.web}/support`,
  privacy: `${urls.web}/privacy`,
  terms: `${urls.web}/terms`,
} as const;

/**
 * Sections of the landing page the header links to (owner, 2026-11-12), in order. `id` is the element id on
 * the home page: an in-page anchor there, `/#id` from every other page. "Docs" goes to the docs site.
 */
export const HOME_SECTIONS = [
  { id: "how-it-works", label: "How it works" },
  { id: "products", label: "Products" },
  { id: "developers", label: "Developers" },
  { id: "pricing", label: "Pricing" },
] as const;
export type HomeSection = (typeof HOME_SECTIONS)[number]["id"];

/** Header nav: the home sections, then Docs. `onHome` makes the section links in-page anchors. */
export function headerNav(onHome: boolean): { label: string; href: string }[] {
  return [
    ...HOME_SECTIONS.map((s) => ({ label: s.label, href: `${onHome ? "" : "/"}#${s.id}` })),
    { label: "Docs", href: urls.docs },
  ];
}

/**
 * Old marketing pages (removed 2026-11-12; their content now lives on the home page). Each old URL still
 * builds as a tiny noindex page that forwards to the matching home section with `<meta http-equiv="refresh">`
 * (not governed by CSP; no script) and shows a plain link as the fallback, so old links never dead-end.
 */
export const MOVED_PAGES: Readonly<Record<string, { to: HomeSection; title: string }>> = {
  payments: { to: "products", title: "Payments" },
  billing: { to: "products", title: "Billing" },
  pricing: { to: "pricing", title: "Pricing" },
};

/** Positioning line (owner, 2026-11-11): the home headline, page titles and meta. */
export const TAGLINE = "Accept crypto payments. Hassle-free.";
export const BRAND_COLOR = "#12263F";

/** Content-Security-Policy every page is built to satisfy (also served as an HTTP header by nearpay-deploy). */
export const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
].join("; ");
