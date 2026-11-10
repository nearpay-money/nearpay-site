---

title: Checkout
description: A hosted payment page for one payment. Customers pay from the wallet, token and network they already hold.
slug: checkout
eyebrow: Accept payments
---

A **checkout session** is one payment page. You create it on your server with the price; NearPay shows the customer which tokens they can pay with, prices the route, and tells you when the payment has settled at your destination.

There are three ways to put it in front of customers:

|                                              | Best for                                      | How                          |
| -------------------------------------------- | --------------------------------------------- | ---------------------------- |
| **Hosted checkout**                          | Web shops, invoices, anything with a redirect | Redirect to `session.url`    |
| [**Embedded checkout**](/checkout/embedded)  | Keeping customers on your page                | Mount it with `@nearpay/js`  |
| [**Payment links**](/checkout/payment-links) | No code: share a URL or QR code               | Create a link once, reuse it |

## Create a session

```bash
curl -X POST https://api.nearpay.money/v1/checkout/sessions \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Idempotency-Key: order-1234" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 4900,
    "currency": "usd",
    "description": "Pro plan",
    "success_url": "https://shop.example/thanks",
    "cancel_url": "https://shop.example/cart",
    "metadata": { "order_id": "1234" }
  }'
```

The response is a [`CheckoutSession`](/api/checkout-sessions#object) with a `url`, a `client_secret` (for embedded checkout) and the `payment_intent` that will record the payment.

### Pricing

- **Fiat:** `currency` is a lower-case ISO 4217 code and `amount` is an integer in minor units — `4900` with `usd` is $49.00.
- **Asset:** set `currency: "asset"`, an `asset_id` and `amount` as a decimal string of base units — `"49000000"` is 49 USDC (6 decimals).

Amounts are never floats. The customer is shown the price, the payment fee and the total as separate lines before they approve.

### Settlement

The session settles to `settlement_destination`, or your default destination for the asset. The destination is snapshotted on the payment intent when it is created, so a later destination change never redirects a payment in flight.

### Lifetime

Sessions accept payments for `expires_in` seconds (300–86 400, default 3 600), then send `checkout.session.expired`. A payment that settles after expiry is still recorded — `late: true` on the intent — when `late_payments` allows it; otherwise it is an overpayment you can refund.

## What the customer sees

1. The amount, your business name and what they are paying for.
2. **Pay with** — a token and network they hold (for example `USDC · Base`), with the payment fee and total.
3. Approve in their wallet, or send to a deposit address. A deposit address is shown only after it has been independently co-signed, and checkout asks the customer to confirm the network first.
4. **Confirming your payment** while it settles, then **Payment complete** once NearPay has verified settlement evidence.

The business name shown is the legal name you declared for your account ("Business details declared by the merchant").

## After the payment

Listen for `payment_intent.succeeded` (or `checkout.session.completed`) on a [webhook endpoint](/webhooks) and fulfil the order there. The redirect to `success_url` is a convenience for the customer, not a confirmation.

To stop a session from accepting payments, call [`POST /v1/checkout/sessions/{id}/expire`](/api/checkout-sessions#expireCheckoutSession).
