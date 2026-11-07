---

title: Changelog
description: Changes to the NearPay API and these docs.
slug: changelog
eyebrow: Resources
---

API versions are dates (current: `2026-11-01`). Additive changes — new endpoints, fields, event types and enum values — ship without a new version. The contract package `@nearpay/spec` is versioned separately.

## @nearpay/spec 0.2.0 — 7 November 2026

- **Refunds:** create, prepare, submit and cancel refunds; route legs (`sign_and_send`) and NEAR Intents legs (`sign_intent`); test helper to simulate the merchant's transfer.
- **Payment links:** reusable priced links with `max_uses`, `collect_email` and deactivation.
- **Customers:** create, update, list by email and delete (erases personal data).
- **Payment intents:** `POST /v1/payment_intents` for custom UIs; reviews (`accept` / `reject`); new list filters — `amount[…]`, `currency`, `asset_id`, `settlement_asset_id`, `source`, `customer`, `payment_link`, `checkout_session`, `metadata[key]`.
- **Webhooks:** secret rotation with an overlap window, event resend, and new event types `refund.*`, `review.opened`, `review.closed`, `account.updated`.
- 17 new error codes, each with its own [error page](/errors).

## @nearpay/spec 0.1.5

- Webhook delivery log (`GET /v1/webhook_endpoints/{id}/deliveries`).
- `sequence` on checkout sessions and agent payments; `replayed` on x402 settle responses.

## @nearpay/spec 0.1.0

- Checkout sessions, payment intents, webhook endpoints, events, agent payments and the x402 facilitator.
