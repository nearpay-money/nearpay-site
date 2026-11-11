# nearpay-site

> Public static sites from one Astro project: developer documentation (guides, API reference generated from nearpay-spec, webhooks, test mode, agents, error pages) and the marketing site (product, pricing, legal pages).

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

This repo stays surgical: design docs live in [`nearpay-brain`](../nearpay-brain/README.md), not here.

- `nearpay-brain/lld/sdks-and-tools.md` §4–§5 — **low-level design (dev-ready; implement from this)**
- `nearpay-brain/decisions/ADR-0019-site-repo.md` — why docs and marketing share this repo
- `nearpay-brain/roadmap/development-plan.md` — stage and step this repo is built in

## Layout

```
nearpay-site/
├── astro.config.mjs     one project, two sites: NP_SITE=web → dist/web, NP_SITE=docs → dist/docs
├── src/
│   ├── routes/web/      marketing: home, payments, billing, pricing, support, privacy, terms, 404
│   ├── routes/docs/     docs: home, guides ([...slug]), api/, errors/, webhooks/events, search, 404
│   ├── content/docs/    hand-written guides (Markdown)
│   ├── lib/spec.ts      build-time model of @nearpay-money/spec (OpenAPI + error catalogue) → API reference,
│   │                    error pages, event types (rendered on every build; nothing generated is committed)
│   ├── components/, layouts/, styles/site.css   on top of @nearpay-internal/ui tokens + CSS
│   ├── lib/hero.ts      home hero: the kit's ConvergenceHero rendered to static HTML at build time
│   ├── lib/convergence.ts  hero animation schedule (dependency-free, shared with the browser module)
│   └── scripts/         client modules: docs.ts (copy buttons + search, 1.5 KB gz), hero.ts (hero animation, < 1 KB gz)
├── scripts/             check-dist (CSP/a11y/coverage gate), serve (preview with prod headers), screenshots
└── test/                unit (Vitest) and e2e (Playwright + axe, CSP-violation guard)
```

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
(also emitted as a meta tag). Nothing is inlined. The marketing site's only JavaScript is the home hero animation, an
external module (`src/scripts/hero.ts`) that starts SMIL animations on the build-time markup; it never runs under
`prefers-reduced-motion: reduce`, and the page is complete without it.

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

## Built with

Libraries are listed here as they are added (hackathon rule Q-005): Astro 5 (static output), `@astrojs/prism` (class-based code highlighting), `yaml`, `@nearpay-money/spec`, `@nearpay-internal/ui` (tokens, Instrument Sans, component CSS, brand files, ConvergenceHero), `zod` (spec peer); development: TypeScript, `@astrojs/check`, Biome, Vitest, Playwright, `@axe-core/playwright`, React and react-dom (build-time only: peer of the ui package for `formatMoney`, and server rendering of the hero; never shipped to the browser). Code and documentation are written with AI assistance (Claude) under human direction and review.
