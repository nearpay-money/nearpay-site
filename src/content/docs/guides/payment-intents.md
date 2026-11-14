---

title: Payment intents
description: The record of one payment, from creation to verified settlement, and how to find payments with list filters.
slug: payment-intents
eyebrow: Accept payments
---

Every checkout session, payment link visit and API payment has a **payment intent** (`pi_…`). It holds the price, the settlement destination and fee as snapshotted at creation, every payment attempt and its settlement evidence, overpayments and refunds.

## Status

| Status             | Meaning                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| `requires_payment` | Waiting for the customer to pay                                         |
| `processing`       | A deposit was detected; the payment is routing and being verified       |
| `requires_review`  | Settled short, or held for verification — needs your decision           |
| `succeeded`        | Settlement evidence at your destination was verified. Fulfil the order. |
| `canceled`         | You canceled it                                                         |
| `expired`          | No payment before the session expired                                   |

New statuses may be added; treat unknown values as "not succeeded yet". An intent is `succeeded` only after NearPay verified on-chain evidence that the funds reached your destination — never from a provider's status alone. The evidence (`attempts[].evidence`) includes the transaction hash, the chain, the amount received and a block-explorer link.

## Amounts

- `amount` / `currency` — what you priced (integer minor units for fiat, base-unit strings for assets).
- `amount_settled`, `amount_refunded`, `amount_refund_pending` — base units of `settlement_asset_id`.
- `fee.bearer` and `fee.total_bps` — who covered NearPay's fee and its rate for this payment.

## Find payments with list filters

`GET /v1/payment_intents` takes typed filters that combine with AND. There is no free-text search; filter on the fields you stored.

| Filter                                         | Example                                               |
| ---------------------------------------------- | ----------------------------------------------------- |
| `status`                                       | `status=succeeded`                                    |
| `created[gte]`, `created[lte]`                 | Unix seconds: `created[gte]=1793836800`               |
| `amount[gte                                    | gt                                                    | lte | lt]` | Priced amount, base units: `amount[gte]=10000` |
| `currency`                                     | `currency=usd`, or `asset` for asset-priced intents   |
| `asset_id`, `settlement_asset_id`              | Pricing or settlement asset                           |
| `source`                                       | `checkout`, `payment_link`, `api`, `invoice`          |
| `customer`, `payment_link`, `checkout_session` | Object ids                                            |
| `metadata[key]`                                | Exact match, up to 10 keys: `metadata[order_id]=1234` |

```bash
curl -G https://api.nearpay.money/v1/payment_intents \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  --data-urlencode "status=succeeded" \
  --data-urlencode "metadata[order_id]=1234" \
  --data-urlencode "limit=20"
```

Lists return up to `limit` objects (1–100) newest first; continue with `starting_after=<last id>` while `has_more` is `true`.

## Reviews

An intent in `requires_review` has a `review_reason`:

- `short_settlement` — less than the expected amount settled. **Accept** it as paid, or **reject** it; rejecting creates a refund of the settled amount for you to sign by default.
- `verification_held` — evidence is not verified yet. It can't be accepted until evidence arrives ([`review_requires_evidence`](/errors/review_requires_evidence)); you may reject it.

```bash
curl -X POST https://api.nearpay.money/v1/payment_intents/pi_01jbz9k3m4n5p6q7r8s9t0v1w2/review \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"decision": "accept"}'
```

## Overpayments

If a customer pays twice, pays after you canceled, or pays after expiry, the extra settlement is listed in `overpayments[]` and `payment_intent.overpaid` is sent. Refund it with `payment_attempt` set to that attempt (see [Refunds](/refunds)).

## Create intents directly

`POST /v1/payment_intents` creates an intent without a checkout page and returns a `client_secret` for the [payer API](/api/payer-api) — for custom payment UIs. It requires `return_url`. Most integrations should use [Checkout](/checkout) instead.
