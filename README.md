# nearpay-site

> Public static sites from one Astro project: developer documentation (guides, API reference generated from nearpay-spec, webhooks, test mode, agents, error pages) and the marketing site (product, pricing, legal pages).

| | |
|---|---|
| Group | Frontends |
| Kind | static site |
| Ships as | docs.nearpay.money (`dist/docs`) and nearpay.money (`dist/web`) |
| Owns | Public docs and marketing content |
| Depends on (published artifacts only) | spec (public) |
| First built in | Stage 2 (step 2.3); marketing pages Stage 5 (step 5.2) |

Replaces `nearpay-docs` and `nearpay-web` (ADR-0019).

## Documentation

This repo stays surgical: design docs live in [`nearpay-brain`](../nearpay-brain/README.md), not here.

- `nearpay-brain/lld/sdks-and-tools.md` §4–§5 — **low-level design (dev-ready; implement from this)**
- `nearpay-brain/decisions/ADR-0019-site-repo.md` — why docs and marketing share this repo
- `nearpay-brain/roadmap/development-plan.md` — stage and step this repo is built in

## Layout

```
nearpay-site/
├── src/
│   ├── components/      shared layout and UI
│   ├── content/docs/    agents, api, errors, guides, test-mode, webhooks
│   └── pages/           marketing and legal pages
├── public/
├── scripts/             API reference + error pages from nearpay-spec
└── .github/workflows/
```

## Status

Scaffold only. Implementation starts in Stage 2 (step 2.3).

## Built with

Libraries are listed here as they are added (hackathon rule Q-005). Code and documentation are written with AI assistance (Claude) under human direction and review.
