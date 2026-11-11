---

title: Changelog
description: Changes to the NearPay API and these docs.
slug: changelog
eyebrow: Resources
---

API versions are dates (current: `2026-11-01`). Additive changes — new endpoints, fields, event types and enum values — ship without a new version. The contract package `@nearpay-money/spec` is versioned separately.

## @nearpay-money/spec 0.3.0 — 8 November 2026

- **Billing:** products, prices (one-time and recurring), manual tax rates, invoices (draft → finalize → send, void, mark uncollectible, PDF), a hosted invoice page with its own API, and subscriptions billed by emailed invoice with reminders and dunning. Guides: [Send an invoice](/billing/invoices), [Subscriptions](/billing/subscriptions), [Tax rates](/billing/tax-rates).
- **Events stream:** `GET /v1/events/stream` sends new events as server-sent events (test-mode keys), with resume by `Last-Event-ID`. The [CLI](/cli) uses it for `nearpay listen`.
- **CLI login:** device authorization routes behind `nearpay login`; approval creates a 90-day restricted test key.
- **Cross-chain x402:** `/x402/near-intents/requirements`, `/verify` and `/settle` let agents pay from other chains ([Let AI agents pay](/agents/ai-agents)). `AgentPayment.transfer_method` and `origin`.
- **Test helper:** `POST /v1/test_helpers/checkout_sessions/{id}/pay` pays a test session in one call; the sandbox helpers now also accept restricted keys.
- **Webhooks:** 12 new event types, `invoice.*` and `customer.subscription.*`.
- `invoice` on payment intents and checkout sessions; `listPaymentIntents?invoice=`.
- 10 new error codes, each with its own [error page](/errors).

## @nearpay-money/spec 0.2.0 — 7 November 2026

- **Refunds:** create, prepare, submit and cancel refunds; route legs (`sign_and_send`) and NEAR Intents legs (`sign_intent`); test helper to simulate the merchant's transfer.
- **Payment links:** reusable priced links with `max_uses`, `collect_email` and deactivation.
- **Customers:** create, update, list by email and delete (erases personal data).
- **Payment intents:** `POST /v1/payment_intents` for custom UIs; reviews (`accept` / `reject`); new list filters — `amount[…]`, `currency`, `asset_id`, `settlement_asset_id`, `source`, `customer`, `payment_link`, `checkout_session`, `metadata[key]`.
- **Webhooks:** secret rotation with an overlap window, event resend, and new event types `refund.*`, `review.opened`, `review.closed`, `account.updated`.
- 17 new error codes, each with its own [error page](/errors).

## @nearpay-money/spec 0.1.5

- Webhook delivery log (`GET /v1/webhook_endpoints/{id}/deliveries`).
- `sequence` on checkout sessions and agent payments; `replayed` on x402 settle responses.

## @nearpay-money/spec 0.1.0

- Checkout sessions, payment intents, webhook endpoints, events, agent payments and the x402 facilitator.
