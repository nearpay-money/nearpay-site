---

title: Accept your first live payment
description: Go from a new account to a real payment in your own wallet. Add a payout wallet, get your secret key, create a checkout session and handle the webhook.
slug: get-started
eyebrow: Start here
---

This guide takes you from a new account to a real payment that lands in your own wallet. Customers pay from the wallet, token and network they already hold. The money settles directly to your payout wallet, and NearPay never holds it.

> **Test mode.** Want to try it without real funds first? Every step below also works in test mode, with simulated payments. Jump to [Try it first in test mode](#try-it-first-in-test-mode), or read [Test mode and live mode](/test-mode).

Using a coding agent? [Integrate with an AI agent](/build-with-ai) gives you a prompt that does these steps for you.

## What you need

- A wallet you control, on a chain NearPay supports, or a NEAR Intents account. This is where payments arrive.
- A server that can call an HTTPS API and receive webhooks. The examples use Node.js; every call also works with `curl`.
- About 15 minutes.

## 1. Create your account

1. Sign up in the [dashboard](https://dashboard.nearpay.money/signup) with a passkey, or with **Continue with Google**.
2. Open **Settings → Business details** and save your details: legal name, country, business type, address, representative and expected monthly volume. The registration number and website are optional.

There is no NearPay review: your details count as soon as you save them. Businesses registered in a country NearPay can't serve are declined automatically. Checkout shows your legal name as "Business details declared by the merchant".

## 2. Add your payout wallet

A payout wallet is where your payments arrive: a token on a network, sent to an address you control (for example `USDC · Base` to your address) or to your NEAR Intents account. In the API it's called a [settlement destination](/settlement-destinations).

1. Open **Payout wallets → Add payout wallet**.
2. Choose the token, the network and your address, and confirm with your passkey.
3. Sign the ownership message with that wallet. Signing proves you control the address and moves no funds.

The payout wallet is **active as soon as your signature checks out**. There is no waiting period. If your account has two or more owners or admins, a second one approves the wallet first.

With your business details saved and a payout wallet active, your account is live. The dashboard shows **Live payments are active**.

Adding a payout wallet and creating keys are confirmed with a passkey. If you signed up with Google, the dashboard asks you to add a passkey at that point.

## 3. Get your secret key

In **Developers → API keys**, with the dashboard's **Live / Test** switch set to **Live**, create a secret key. It starts with `sk_live_` and is shown only once.

Store it on your server as the environment variable `NEARPAY_SECRET_KEY`. Never put a secret key in a browser, an app or a repository.

The key's prefix tells you what it is and which mode it works in:

| Prefix                  | Key                                                             | Use it in                             |
| ----------------------- | --------------------------------------------------------------- | ------------------------------------- |
| `sk_live_` / `sk_test_` | Secret key: full access                                         | Your server only                      |
| `rk_live_` / `rk_test_` | Restricted key: only the scopes you choose                      | A service that needs a few operations |
| `pk_live_` / `pk_test_` | Publishable key: mounts [embedded checkout](/checkout/embedded) | The browser                           |

`_live_` keys move real money. `_test_` keys work on test data with simulated payments. Your code reads the key from `NEARPAY_SECRET_KEY`, so it stays the same in both modes.

## 4. Install the SDK

```bash
npm install @nearpay-money/node
```

The SDK is typed from `@nearpay-money/spec`, adds an `Idempotency-Key` to every `POST` and retries network errors safely. You can also call the REST API directly: every example in the [API reference](/api) has a `curl` version.

## 5. Create a checkout session

On your server, create a session with the price and send the customer to its URL:

```ts
import { NearPay } from "@nearpay-money/node";

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

On the checkout page the customer picks a token and network they hold, sees the price, the payment fee and the total, and approves in their wallet. The payment settles in your payout wallet's token. See [Checkout](/checkout) for pricing in tokens, expiry and the other options.

## 6. Handle the webhook

Fulfil orders when NearPay tells you a payment succeeded. NearPay confirms a payment on one block of its chain, checks the on-chain evidence that the money reached your wallet, then sends `payment_intent.succeeded`.

1. In **Developers → Notifications**, add an endpoint (or call `POST /v1/webhook_endpoints`). Live endpoints need a public `https` URL on port 443. Subscribe to `payment_intent.succeeded`.
2. Copy the endpoint's signing secret (`whsec_…`, shown once) to the environment variable `NEARPAY_WEBHOOK_SECRET`.
3. Verify every delivery against the raw request body:

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

Fulfil from the webhook, not from the redirect to `success_url`: a customer can close the tab before the redirect. Deliveries can repeat, so make fulfilment idempotent. [Receive webhooks](/webhooks) covers retries, ordering and secret rotation.

## 7. Go-live checklist

Before you send real customers to checkout:

- **Account:** your business details are saved and the dashboard shows **Live payments are active**.
- **Payout wallet:** a live payout wallet is active for the token you want to receive.
- **Keys:** production has your `sk_live_…` key in `NEARPAY_SECRET_KEY`, on the server only. Services that need only a few operations use a restricted key (`rk_live_…`).
- **Webhooks:** a live endpoint on a public `https` URL, its secret in `NEARPAY_WEBHOOK_SECRET`, and every delivery verified against the raw body.
- **Fulfilment:** orders are fulfilled on `payment_intent.succeeded`, once per payment, and the paid amount is checked against the order.
- **Edge cases:** you handle expired sessions (`checkout.session.expired`) and know how to [refund](/refunds). Refunds are signed from your own wallet.
- **Real test:** make one small real payment end to end and check that it appears in **Payments** and in your wallet. Each network has a minimum amount ([`amount_below_destination_minimum`](/errors/amount_below_destination_minimum)).

## Try it first in test mode

Test mode runs the same integration against a sandbox: the same API, SDK and dashboard, with simulated payments and no real funds. You don't need business details to use it.

1. In the dashboard, set the **Live / Test** switch to **Test**.
2. Add a test payout wallet. It's active immediately, without an ownership signature.
3. Create a test secret key (`sk_test_…`) and set it as `NEARPAY_SECRET_KEY` on your machine.
4. Run the same code from steps 4 to 6. Open `session.url`: test checkout shows a **Test mode — no real funds** banner and a **Simulate payment** button instead of asking a wallet to sign. Or pay the session from code:

   ```ts
   await nearpay.testHelpers.checkoutSessions.pay(session.id, { outcome: "succeeded" });
   ```

5. Receive the webhooks on your machine with the [CLI](/cli):

   ```bash
   npm install -g @nearpay-money/cli
   nearpay login
   nearpay listen --forward-to http://localhost:3000/webhooks/nearpay
   ```

   Set `NEARPAY_WEBHOOK_SECRET` to the secret `nearpay listen` prints.

In test mode the amount's last two digits pick a [sandbox scenario](/test-mode#sandbox-scenarios): amounts ending in `00` succeed after about 5 seconds, others simulate slow, underpaid, late or duplicate payments.

When it works, go live by switching to your live key and a live webhook endpoint. [Move from test to live](/test-mode#move-from-test-to-live) lists every step.
