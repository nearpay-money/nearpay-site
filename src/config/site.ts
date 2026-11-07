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
  dashboard: urls.dashboard,
  docsHome: urls.docs,
  docsGetStarted: `${urls.docs}/get-started`,
  docsCheckout: `${urls.docs}/checkout`,
  docsAgents: `${urls.docs}/agents`,
  docsApi: `${urls.docs}/api`,
  pricing: `${urls.web}/pricing`,
  support: `${urls.web}/support`,
  privacy: `${urls.web}/privacy`,
  terms: `${urls.web}/terms`,
} as const;

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
