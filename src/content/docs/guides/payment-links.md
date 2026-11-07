---

title: Payment links
description: A reusable URL that opens a new checkout for each customer. Share it anywhere — no code needed.
slug: checkout/payment-links
eyebrow: Accept payments
---

A payment link is a fixed price behind a shareable URL. Each visit creates its own checkout session, so one link can take many payments. Create links in the dashboard, or with the API:

```bash
curl -X POST https://api.nearpay.money/v1/payment_links \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2500,
    "currency": "usd",
    "description": "Workshop ticket",
    "max_uses": 100,
    "collect_email": true,
    "metadata": { "event": "nov-workshop" }
  }'
```

The response is a [`PaymentLink`](/api/payment-links#object) with its public `url`.

## Options

| Field                             | What it does                                                       |
| --------------------------------- | ------------------------------------------------------------------ |
| `amount`, `currency` / `asset_id` | The price — fixed once the link exists                             |
| `description`                     | What the customer pays for (required)                              |
| `max_uses`                        | Stop after this many **successful** payments                       |
| `collect_email`                   | Ask the customer for a receipt email                               |
| `success_url`                     | Where to send the customer after paying                            |
| `session_expires_in`              | Lifetime of each checkout session the link opens (default 3 600 s) |
| `settlement_destination`          | Where payments settle (default: your account default)              |

## Track payments

Payment intents created from a link have `source: "payment_link"`, carry the link's `metadata` and the link id in `payment_link`. List them with:

```bash
curl "https://api.nearpay.money/v1/payment_intents?payment_link=plink_01jbz9k3m4n5p6q7r8s9t0v1w2&status=succeeded" \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY"
```

## Deactivate a link

Links are never deleted. Set `active: false` to stop new payments; visitors then see that the link no longer accepts payments, and the API answers [`link_inactive`](/errors/link_inactive). A link that reached `max_uses` behaves the same.

```bash
curl -X PATCH https://api.nearpay.money/v1/payment_links/plink_01jbz9k3m4n5p6q7r8s9t0v1w2 \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"active": false}'
```

You can change `active`, `description`, `success_url`, `max_uses`, `collect_email` and `metadata`. The price can't change — create a new link instead.
