---

title: Test mode and live mode
description: One API, two modes. Live mode moves real money to your own wallet. Test mode runs the same integration against a sandbox, with simulated payments and no real funds.
slug: test-mode
eyebrow: Start here
---

Every NearPay account has two modes:

- **Live mode** is the real product. Customers pay with real tokens from their own wallets, and the money settles directly to your payout wallet. NearPay never holds it.
- **Test mode** is a practice copy of your account. It has the same API, the same SDKs and the same dashboard, but payments are simulated in a sandbox and no real funds move.

You build and test in test mode, then switch to live mode by changing your keys. Your code stays the same.

## Live and test at a glance

|                    | Live mode                                                             | Test mode                                                                      |
| ------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Money              | Real funds settle to your payout wallet                               | Simulated. No real funds move                                                  |
| Keys               | `sk_live_…`, `pk_live_…`, `rk_live_…`                                 | `sk_test_…`, `pk_test_…`, `rk_test_…`                                          |
| Objects            | `livemode: true`                                                      | `livemode: false`                                                              |
| Available          | After you save your business details and a payout wallet is active    | Right after sign-up                                                            |
| Payout wallets     | Active once you sign the ownership check                              | Active immediately, no signature                                               |
| Payments           | Customers pay from their wallets. Confirmed on one block of the chain | The sandbox simulates chains, routing and settlement                           |
| Checkout           | Asks the customer's wallet to sign                                    | Shows a **Test mode — no real funds** banner and a **Simulate payment** button |
| Webhook endpoints  | Public `https` URL on port 443                                        | `http` also allowed                                                            |
| Test helpers, CLI  | Not available                                                         | [Test helpers](#simulate-payments) and [`nearpay listen` / `trigger`](/cli)    |
| Rate limit per key | 100 requests per second                                               | 25 requests per second                                                         |

## How the mode is chosen

**The API key decides the mode.** A request made with a live key reads and writes live objects; a request made with a test key reads and writes test objects. There is no mode parameter to set.

| Prefix                  | Key                                                             | Where it goes                         |
| ----------------------- | --------------------------------------------------------------- | ------------------------------------- |
| `sk_live_` / `sk_test_` | Secret key: full access to your account                         | Your server only                      |
| `rk_live_` / `rk_test_` | Restricted key: only the scopes you choose                      | A service that needs a few operations |
| `pk_live_` / `pk_test_` | Publishable key: mounts [embedded checkout](/checkout/embedded) | The browser                           |

Keep the key in an environment variable and the same code runs in either mode:

```ts
import { NearPay } from "@nearpay-money/node";

// sk_live_… in production, sk_test_… in development and CI
const nearpay = new NearPay(process.env.NEARPAY_SECRET_KEY!);
```

Every object carries `livemode` (`true` or `false`), so you can always tell which mode it came from.

**Test and live data are separate.** Payments, customers, products, payment links, payout wallets, webhook endpoints, events and API keys each belong to one mode. Nothing you create in test mode appears in live mode, and test objects can never reach a real chain.

## Switch modes

- **In your code:** set `NEARPAY_SECRET_KEY` (and `NEARPAY_WEBHOOK_SECRET`) per environment. Production gets the live values; development and CI get the test values.
- **In the dashboard:** use the **Live / Test** switch in the top bar. In test mode the dashboard shows a **You're in test mode** banner, and every page (payments, keys, webhooks, payout wallets) shows test data only.

Live keys and live webhook endpoints unlock once your business details are saved and a live payout wallet is active. Until then you can use test mode. [Get started](/get-started) walks through both.

## When to use each mode

Use **test mode** to:

- build your integration on your machine;
- run automated tests and CI without moving money;
- try outcomes that are hard to cause for real, such as underpaid, late or duplicate payments;
- demo the checkout without a funded wallet.

Use **live mode** to:

- take payments from real customers;
- make a small real payment before launch, to check the whole path end to end, from your checkout to your wallet.

## What's different in test mode

### Simulated payments

Test objects always run on the **sandbox rail**. NEAR Intents has no testnet, so the sandbox simulates the route provider, the chains and the settlement evidence. Signatures are still checked for real where they apply (for example in agent payments), but balances and settlement are simulated.

- Test checkout never asks a wallet to sign. It shows a **Simulate payment** button instead.
- Payout wallets added in test mode are active immediately, without an ownership signature, and receive sandbox settlements only.
- Refunds aren't signed in your wallet: a test helper stands in for your transfer.
- Test invoice emails carry a test-mode banner and a `[test]` subject tag.

### Test helpers

The `/v1/test_helpers/…` routes drive the sandbox: pay a session, move a payment step by step, simulate a refund transfer, or move a subscription's billing clock. They answer [`livemode_forbidden`](/errors/livemode_forbidden) for live keys and live objects. See [Simulate payments](#simulate-payments).

### The CLI

[`nearpay listen`](/cli) streams your test-mode events and forwards them to `localhost`, and `nearpay trigger` makes them happen. The CLI works in test mode only.

### Relaxed checks for local development

- Webhook endpoints may use `http` URLs.
- Embedded checkout accepts `http://localhost` in `allowed_origins`.

## Sandbox scenarios

In test mode you pick the outcome of a payment with the **last two digits of the amount** in minor units (cents for fiat, base units for asset-priced payments). This works from any client: hosted checkout, embedded checkout, payment links or the API.

| Amount ends in                  | What happens after the deposit                                       | Webhooks to expect                                                                    |
| ------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `00` (or any suffix not listed) | Settles in about 5 seconds                                           | `payment_intent.processing`, `payment_intent.succeeded`, `checkout.session.completed` |
| `01`                            | Settles after about 2 minutes (slow chain)                           | as above, later                                                                       |
| `02`                            | Underpaid: incomplete deposit, refunded to the payer at the deadline | `payment_intent.payment_failed`                                                       |
| `03`                            | Overpaid: succeeds, the excess is refunded to the payer              | `payment_intent.succeeded`                                                            |
| `04`                            | The provider fails after processing; the deposit is refunded         | `payment_intent.payment_failed`                                                       |
| `05`                            | Settles short of the expected amount: held for your review           | `payment_intent.requires_review`                                                      |
| `06`                            | A second deposit also settles (duplicate payment)                    | `payment_intent.succeeded`, `payment_intent.overpaid`                                 |
| `07`                            | Settles 5 minutes after the session expired (late payment)           | `checkout.session.expired`, then `payment_intent.succeeded` with `late: true`         |

For example, `amount: 4905` with `currency: "usd"` creates a $49.05 test payment that ends in review.

A refund address containing `sanctioned` (for example `sanctioned.test`) is blocked by screening, so you can test [`screening_blocked`](/errors/screening_blocked).

In live mode the amount has no special meaning: the customer's real payment decides what happens.

### Refund scenarios

Refund legs use the same table with the **refund amount's** last two digits (in the settlement asset's base units). Scenario `06` on a refund settles two legs, so you can see a `duplicate` leg.

## Simulate payments

- **Checkout:** test checkout shows **Simulate payment**. It calls `POST /v1/checkout/sessions/{id}/public/attempts/{attempt}/simulate_deposit`.
- **Whole payment:** [`POST /v1/test_helpers/checkout_sessions/{id}/pay`](/api/test-helpers) pays an open test session as a payer would, with `{"outcome": "succeeded" | "payment_failed" | "refunded" | "none"}` (default `succeeded`). The normal events follow. [`nearpay trigger`](/cli) is built on it.
- **Step by step:** move an attempt yourself with [`POST /v1/test_helpers/payment_attempts/{attempt}/advance`](/api/test-helpers) and `{"to": "deposit" | "processing" | "success" | "refund" | "fail"}`.
- **Refunds:** after you create a refund, [`POST /v1/test_helpers/refunds/{id}/simulate_deposit`](/api/test-helpers) stands in for signing and sending from your wallet.
- **Subscriptions:** [`POST /v1/test_helpers/subscriptions/{id}/advance_clock`](/api/test-helpers) moves a test subscription's billing clock to the next `renewal_upcoming`, `renewal` or `overdue` point.

With the Node SDK:

```ts
const session = await nearpay.checkout.sessions.create({
  amount: 4900,
  currency: "usd",
  success_url: "https://shop.example/thanks",
});
await nearpay.testHelpers.checkoutSessions.pay(session.id, { outcome: "succeeded" });
// payment_intent.succeeded and checkout.session.completed follow
```

With `curl`:

```bash
curl -X POST https://api.nearpay.money/v1/test_helpers/payment_attempts/pa_01jbz9k3m4n5p6q7r8s9t0v1w2/advance \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "success"}'
```

These calls work only while `NEARPAY_SECRET_KEY` holds a test key.

## Move from test to live

When your integration works in test mode:

1. Save your business details and add a live payout wallet in the dashboard. Live mode turns on at once, with no NearPay review. See [Get started](/get-started#1-create-your-account).
2. Create a live secret key (`sk_live_…`) and set it as `NEARPAY_SECRET_KEY` in production.
3. Create a live webhook endpoint (public `https`) and set its signing secret as `NEARPAY_WEBHOOK_SECRET`.
4. If you use embedded checkout, switch to your `pk_live_…` publishable key.
5. Recreate what you need in live mode, such as products, prices, payment links and tax rates. Test objects stay in test mode.
6. Keep test helper calls out of production code paths. They fail with live keys.

Then work through the [go-live checklist](/get-started#7-go-live-checklist).
