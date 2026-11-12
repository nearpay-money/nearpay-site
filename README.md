# nearpay-site

The two public static sites, built from one Astro project: the developer documentation (guides, an API reference generated from `nearpay-spec`, webhooks, test mode, agents, error pages) and the marketing site (product, pricing, legal pages).

Part of [NearPay](https://github.com/nearpay-money/nearpay) — start there for the live demo, the architecture diagram and the full "do X, see Y" walkthrough.

- **Where it sits:** served as static files at https://nearpay.money (`dist/web`) and https://docs.nearpay.money (`dist/docs`). At build time it reads `@nearpay-money/spec` for the API reference, error pages and event types; at run time it calls nothing.
- **Status:** both sites are live. NearPay runs on NEAR mainnet as a closed beta.

|                                       |                                                                 |
| ------------------------------------- | --------------------------------------------------------------- |
| Group                                 | Frontends                                                       |
| Kind                                  | static site                                                     |
| Ships as                              | docs.nearpay.money (`dist/docs`) and nearpay.money (`dist/web`) |
| Owns                                  | Public docs and marketing content                               |
| Depends on (published artifacts only) | spec (public)                                                   |
| First built in                        | Stage 2 (step 2.3); marketing pages Stage 5 (step 5.2)          |

Replaces `nearpay-docs` and `nearpay-web` (ADR-0019).

## Documentation

Design docs live in [`nearpay-brain`](https://github.com/nearpay-money/nearpay-brain), not here.

- [`lld/sdks-and-tools.md`](https://github.com/nearpay-money/nearpay-brain/blob/main/lld/sdks-and-tools.md) §4–§5 — low-level design this repo is implemented from
- [`decisions/ADR-0019-site-repo.md`](https://github.com/nearpay-money/nearpay-brain/blob/main/decisions/ADR-0019-site-repo.md) — why docs and marketing share this repo
- [`roadmap/development-plan.md`](https://github.com/nearpay-money/nearpay-brain/blob/main/roadmap/development-plan.md) — stage and step this repo is built in

## Layout

```
nearpay-site/
├── astro.config.mjs     one project, two sites: NP_SITE=web → dist/web, NP_SITE=docs → dist/docs
├── src/
│   ├── routes/web/      marketing: home (incl. pricing), support, privacy, terms, 404; [moved] forwards the old
│   │                    /payments, /billing, /pricing URLs to home sections
│   ├── routes/docs/     docs: home, guides ([...slug]), api/, errors/, webhooks/events, search, 404
│   ├── content/docs/    hand-written guides (Markdown)
│   ├── lib/spec.ts      build-time model of @nearpay-money/spec (OpenAPI + error catalogue) → API reference,
│   │                    error pages, event types (rendered on every build; nothing generated is committed)
│   ├── components/, layouts/, styles/site.css   on top of @nearpay-internal/ui tokens + CSS
│   ├── lib/hero.ts      home hero: the kit's ConvergenceHero rendered to static HTML at build time
│   ├── lib/convergence.ts  hero animation schedule (dependency-free, shared with the browser module)
│   └── scripts/         client modules: docs.ts (copy buttons + search, 1.5 KB gz), hero.ts (hero animation, < 1 KB gz),
│                        menu.ts (closes the marketing mobile menu after a section link / on Escape)
├── scripts/             check-dist (CSP/a11y/coverage gate), serve (preview with prod headers), screenshots
└── test/                unit (Vitest) and e2e (Playwright + axe, CSP-violation guard)
```

## Verify this repo

Needs Node 22 (`.nvmrc`), pnpm 9 and, for step 4, Google Chrome. No Docker. `.npmrc` points the `@nearpay-money` and `@nearpay-internal` scopes at a local package registry, so start that first.

1. Start the local registry (no Docker, Node 22 only):
   `git clone https://github.com/nearpay-money/nearpay-deploy ../nearpay-deploy && ../nearpay-deploy/scripts/registry.sh start`
   → `curl http://127.0.0.1:4873/-/ping` answers `{}`.
2. `pnpm install --frozen-lockfile` → ends with `Done in …`, no registry errors.
3. `pnpm test` (unit tests of the spec model, search and the dist checks, money formatting, the hero and the showcase data) → `Test Files  6 passed (6)`, `Tests  32 passed (32)`.
4. `pnpm verify` (the full gate: `astro check` and `tsc`, lint, unit tests with the coverage gate, build of both sites with `scripts/check-dist.mjs`, then Playwright with axe against the built sites served with the production CSP header) → exits 0; the Playwright list ends with `58 passed` (about 2 minutes). The browser is the system Chrome at `/usr/bin/google-chrome`; set `NP_CHROME_PATH` to another path if needed. Known flake: in one of our three runs the mobile-menu test failed once on an axe colour-contrast check of an animated mockup and passed when re-run (`pnpm e2e`).

To see the result without building: open https://docs.nearpay.money and https://nearpay.money.

## Commands

```
pnpm build            # both sites + scripts/check-dist.mjs
pnpm dev / dev:docs   # dev servers (web on 4321, docs on 4322)
pnpm verify           # typecheck (astro check + tsc) + Biome + coverage-gated unit tests + build + e2e
pnpm shots [dir]      # 1440/390 screenshots of the main screens
```

Links to other NearPay surfaces default to production and can be overridden at build time:
`NP_WEB_URL`, `NP_DOCS_URL`, `NP_DASHBOARD_URL`, `NP_API_URL`.

**CSP:** every page satisfies `default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'`
(also emitted as a meta tag). Nothing is inlined. The marketing site's JavaScript is two small external modules: the
home hero animation (`src/scripts/hero.ts`, starts SMIL animations on the build-time markup; never runs under
`prefers-reduced-motion: reduce`) and `src/scripts/menu.ts` (closes the mobile menu after a section link is chosen
or on Escape). Every page is complete without them.

**Brand (design v2, "Convergence"):** favicon.svg/.ico, apple-touch-icon, PWA icons and og-image.png are copied from
`@nearpay-internal/ui/brand/` into `public/` (git-ignored) when the Astro config loads; `site.webmanifest` is written
next to them. Theme colour `#12263F`.

## Status

Stage 2 step 2.3: marketing site (Figma marketing frames), pricing (indicative, Q-BIZ-02), legal drafts, developer
docs with the API reference and error pages generated from `@nearpay-money/spec` 0.2.0.

Stage 3 step 3.3: docs on `@nearpay-money/spec` 0.3.0 and `@nearpay-internal/ui` 0.3.0 — guides "Send an invoice",
"Recurring billing with subscriptions", "Tax rates", "Listen to events locally with the CLI" and "Let AI agents pay";
reference groups for products, prices, tax rates, invoices (incl. PDF), subscriptions, the hosted invoice API, CLI
login, cross-chain x402 and the event stream (frames table); error notes for the 0.3.0 codes. `check-dist` also
checks every internal link and `#fragment`; Markdown tables scroll inside a focusable region on phones.

Design v2 (owner-approved 2026-11-11): home from the Main artboard (Convergence logo, ConvergenceHero panel, chain
strip, payment sequence, developer section, non-custodial band); every other page restyled on `@nearpay-internal/ui`
0.5.0 tokens and Instrument Sans with the same header and footer.

Landing v3 (owner, 2026-11-11): new hero copy and buttons, a multi-colour aurora behind the hero panel, header
"Sign in" / "Contact team" buttons and one rectangular button system (8 px radius) on both sites, the payment
sequence as an animated diagram (`components/web/PaymentFlow.astro`) and a product showcase bento
(`components/web/showcase/`: checkout, payment links, invoices and subscriptions, dashboard, agent payments,
developers). All mockups are HTML/CSS/SVG with sample data, animated with CSS keyframes only (`styles/showcase.css`,
home only; transform/opacity, still final frames under `prefers-reduced-motion`); no new JavaScript.

Site cleanup (owner, 2026-11-12): the old Payments, Billing and Pricing pages are gone. The sticky header links to the
landing sections, in order: How it works (`#how-it-works`), Products (`#products`), Developers (`#developers`),
Pricing (`#pricing`), then Docs; in-page anchors on the home page (smooth scrolling unless reduced motion, landing
just under the header), `/#anchor` from other pages (`config/site.ts` `headerNav`). Pricing is a home section
(`components/web/Pricing.astro`: the indicative Q-BIZ-02 schedule, who covers the fee, network fees, free test mode).
The hosting config lives in nearpay-deploy, so the old URLs build as tiny noindex forwarding pages
(`routes/web/[moved].astro`, `<meta http-equiv="refresh">` — not governed by CSP, no script — plus a plain link,
canonical = the target section).

Docs are live-first (2026-11-12): "Get started" walks through a first live payment (payout wallet, secret key, checkout session, webhook); "Test mode and live mode" is the single page that explains the difference. Current pins (`package.json`): `@nearpay-money/spec` 0.5.0, `@nearpay-internal/ui` 0.5.0.

## Built with

- Runtime (build time; the output is static): Astro 5, `@astrojs/prism` (class-based code highlighting), `yaml`, `@nearpay-money/spec`, `@nearpay-internal/ui` (tokens, Instrument Sans, component CSS, brand files, ConvergenceHero), `zod` (spec peer).
- Development: TypeScript, `@astrojs/check`, Biome, Vitest, Playwright, `@axe-core/playwright`, React and react-dom (build time only: peer of the ui package and server rendering of the hero; never shipped to the browser).
- Licence: Apache-2.0 (`LICENSE`).

Code and documentation are written with AI assistance (Claude) under human direction and review. Built for the NEAR Hackathon (Nov 2026).
