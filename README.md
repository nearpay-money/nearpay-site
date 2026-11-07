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
│   ├── lib/spec.ts      build-time model of @nearpay/spec (OpenAPI + error catalogue) → API reference,
│   │                    error pages, event types (rendered on every build; nothing generated is committed)
│   ├── components/, layouts/, styles/site.css   on top of @nearpay-internal/ui tokens + CSS
│   └── scripts/docs.ts  the only client script (docs copy buttons + search), 1.5 KB gz
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
(also emitted as a meta tag). Nothing is inlined; the marketing site ships no JavaScript.

## Status

Stage 2 step 2.3: marketing site (Figma marketing frames), pricing (indicative, Q-BIZ-02), legal drafts, developer
docs with the API reference and error pages generated from `@nearpay/spec` 0.2.0.

## Built with

Libraries are listed here as they are added (hackathon rule Q-005): Astro 5 (static output), `@astrojs/prism` (class-based code highlighting), `yaml`, `@nearpay/spec`, `@nearpay-internal/ui` (tokens, DM Sans, component CSS), `zod` (spec peer); development: TypeScript, `@astrojs/check`, Biome, Vitest, Playwright, `@axe-core/playwright`, React (build-time only, peer of the ui package for `formatMoney`). Code and documentation are written with AI assistance (Claude) under human direction and review.
