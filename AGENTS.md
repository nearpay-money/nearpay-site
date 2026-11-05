# AGENTS.md — nearpay-site

You are working in **nearpay-site**, one of 26 NearPay repositories (`nearpay-brain/architecture/repositories.md`).
Scope: Public static sites from one Astro project: developer documentation (guides, API reference from nearpay-spec, webhooks, test mode, agents, error pages) and the marketing site (product, pricing, legal pages).

## Before changing anything

1. Read `../nearpay-brain/AGENTS.md`, then this repo's LLD (`../nearpay-brain/lld/sdks-and-tools.md` §4–§5) — it is the implementation spec; do not make design decisions it already makes.
2. Contracts (requests, responses, events, errors) come from `@nearpay/spec`. If one must change, open a PR in `nearpay-spec` first; never hand-write contract types here.
3. Check your change against invariants INV-1…INV-9 in `nearpay-brain/product/requirements.md`.

## Rules for this repo

- Generated API reference comes from `@nearpay/spec`; do not hand-edit generated pages.

## Never

- Import source code from another NearPay repo (depend on published packages/images only).
- Read or write another service's database.
- Add design documents here — update `nearpay-brain` and link to it.
- Commit secrets, private keys or real customer data.
- Merge changes to paths listed in `.github/CODEOWNERS` without the required human review.
