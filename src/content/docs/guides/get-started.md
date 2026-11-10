---

title: Get started
description: Create a test checkout session, take a simulated payment and receive a signed webhook.
slug: get-started
eyebrow: Start here
---

This guide takes you from a new account to a confirmed test payment. Everything here runs in **test mode**: it uses the sandbox rail, so no real funds move.

## 1. Create an account and get test keys

1. Sign up in the [dashboard](https://dashboard.nearpay.money/signup) with a passkey.
2. Add a **settlement destination** — the asset, network and wallet where payments arrive (for example `USDC · Base` to your own address).
3. Open **Developers → API keys** and copy your test secret key (`sk_test_…`).

Keep secret keys on your server. Use a restricted key (`rk_…`) with only the scopes a service needs.

## 2. Install the SDK

```bash
npm install @nearpay/node
```

The SDK is typed from `@nearpay/spec`, adds an `Idempotency-Key` to every `POST` and retries network errors safely. You can also call the REST API directly — every example in the [API reference](/api) has a `curl` version.

## 3. Create a checkout session

```ts
import { NearPay } from "@nearpay/node";

const nearpay = new NearPay(process.env.NEARPAY_SECRET_KEY!);

const session = await nearpay.checkout.sessions.create(
  {
    amount: 4900, // fiat amounts are integer minor units: $49.00
    currency: "usd",
    success_url: "https://shop.example/thanks",
    metadata: { order_id: "1234" },
  },
  { idempotencyKey: "order-1234" },
);

// Send the customer to the hosted checkout
redirect(session.url);
```

The amount's last two digits pick a [sandbox scenario](/test-mode) in test mode: `…00` succeeds after a few seconds.

## 4. Pay in test mode

Open `session.url`. Test checkout shows a **Test mode — no real funds** banner and a **Simulate payment** button instead of asking a wallet to sign. The sandbox moves the payment through deposit, processing and settlement.

## 5. Receive the webhook

Create an endpoint under **Developers → Webhooks** (or with `POST /v1/webhook_endpoints`) subscribed to `payment_intent.succeeded`, and verify every delivery against the raw body:

```ts
app.post("/webhooks/nearpay", express.raw({ type: "application/json" }), (req, res) => {
  let event;
  try {
    event = nearpay.webhooks.constructEvent(
      req.body,
      req.headers["nearpay-signature"],
      process.env.NEARPAY_WEBHOOK_SECRET!,
    );
  } catch {
    return res.status(400).end(); // not from NearPay, or tampered
  }
  if (event.type === "payment_intent.succeeded") {
    fulfil(event.data.object.metadata.order_id);
  }
  res.status(200).end();
});
```

Fulfil orders from the webhook, not from the redirect to `success_url`: a customer can close the tab, and `payment_intent.succeeded` is sent only after NearPay has verified settlement evidence at your destination.

## 6. Go live

Live mode needs two things:

- **Your business details.** Declare them in the dashboard (legal name, country, business type, address, representative and expected volume; the registration number and website are optional). Live mode turns on as soon as you save them — there is no NearPay review. Businesses registered in a country NearPay cannot serve are declined automatically.
- **An active live settlement destination.** New destinations and changes to them become active after a cooling-off period.

Then swap `sk_test_…` for `sk_live_…`. Live payments settle directly to your wallet — NearPay never holds a balance for you.
