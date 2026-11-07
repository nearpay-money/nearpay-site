---

title: Test mode
description: Test keys route everything to a deterministic sandbox. Pick an outcome with the amount’s last two digits.
slug: test-mode
eyebrow: Start here
---

Objects created with `sk_test_…` / `pk_test_…` keys have `livemode: false` and always run on the **sandbox rail**. NEAR Intents has no testnet, so the sandbox simulates the route provider, the chains and settlement evidence. Test objects never reach a live provider, and live keys can't call test helpers.

## Sandbox scenarios

The scenario is chosen by the **last two digits of the amount** in minor units (cents for fiat, base units for asset-priced payments), so it works from any client — hosted checkout, embedded checkout, payment links or the API.

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

A refund address containing `sanctioned` (for example `sanctioned.test`) is blocked by screening, so you can test [`screening_blocked`](/errors/screening_blocked).

For example, `amount: 4905` with `currency: "usd"` creates a $49.05 payment that ends in review.

### Refund scenarios

Refund legs use the same table with the **refund amount's** last two digits (in the settlement asset's base units). Scenario `06` on a refund settles two legs, so you can see a `duplicate` leg.

## Simulate payments

- **Checkout:** test checkout shows **Simulate payment**; it calls `POST /v1/checkout/sessions/{id}/public/attempts/{attempt}/simulate_deposit`.
- **Step by step:** move an attempt yourself with [`POST /v1/test_helpers/payment_attempts/{attempt}/advance`](/api/test-helpers) and `{"to": "deposit" | "processing" | "success" | "refund" | "fail"}`.
- **Refunds:** after you create a refund, [`POST /v1/test_helpers/refunds/{id}/simulate_deposit`](/api/test-helpers) stands in for signing and sending from your wallet.

```bash
curl -X POST https://api.nearpay.money/v1/test_helpers/payment_attempts/pa_01jbz9k3m4n5p6q7r8s9t0v1w2/advance \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to": "success"}'
```

Test helpers answer [`livemode_forbidden`](/errors/livemode_forbidden) for live keys and live objects.

## Limits

Test keys are rate limited at 25 requests per second (live: 100). Test-mode webhook endpoints may use `http` URLs; live endpoints must use `https`.
