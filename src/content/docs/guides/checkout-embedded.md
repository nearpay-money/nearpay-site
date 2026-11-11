---

title: Embedded checkout
description: Mount the checkout in your page with @nearpay-money/js. It runs in an isolated iframe, so your page never handles addresses or wallets.
slug: checkout/embedded
eyebrow: Accept payments
---

Embedded checkout is the same checkout as the hosted page, mounted in an iframe on your site. Deposit addresses, amounts and wallet prompts stay inside the iframe on `pay.nearpay.money`; your page exchanges a small set of origin-checked messages with it. Scripts on your page — including third-party ones — can't swap a deposit address.

## 1. Create an embedded session

Set `ui_mode: "embedded"` and list the origins allowed to mount it. The checkout refuses any other parent page.

```bash
curl -X POST https://api.nearpay.money/v1/checkout/sessions \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 4900,
    "currency": "usd",
    "ui_mode": "embedded",
    "allowed_origins": ["https://shop.example"],
    "success_url": "https://shop.example/thanks"
  }'
```

`allowed_origins` takes `https://host[:port]` origins (up to 10); test mode also accepts `http://localhost`. Without it the API answers [`allowed_origins_required`](/errors/allowed_origins_required).

Send `id` and `client_secret` to your page. The client secret only authorises the payer routes of that one session; never send a secret key to a browser.

## 2. Mount it

With the script tag:

```html
<div id="pay"></div>
<script src="https://js.nearpay.money/v1/nearpay.js" crossorigin="anonymous"></script>
<script type="module" src="/checkout.js"></script>
```

```js
// checkout.js
const checkout = NearPay("pk_test_…").mountCheckout({
  sessionId,
  clientSecret,
  element: "#pay",
  appearance: { theme: "auto", accent: "#087a68", radius: 8 },
  onComplete: ({ sessionId, paymentIntentId }) => {
    // show a confirmation; fulfil from the webhook
  },
  onError: ({ code, message }) => console.warn(code, message),
});
// later: checkout.destroy();
```

Or from npm with `@nearpay-money/js`, or React with `@nearpay-money/react`:

```tsx
<NearPayProvider publishableKey="pk_test_…">
  <NearPayCheckout sessionId={id} clientSecret={clientSecret} onComplete={onComplete} />
</NearPayProvider>;
```

`NearPay()` takes a **publishable** key (`pk_…`) and refuses secret and restricted keys. The loader accepts messages only from the checkout origin and only from its own iframe.

### Appearance

| Option   | Values                                                                                  |
| -------- | --------------------------------------------------------------------------------------- |
| `theme`  | `light`, `dark` or `auto` (follows the customer's system)                               |
| `accent` | `#rgb` or `#rrggbb`; adjusted if needed so text and focus rings stay readable (WCAG AA) |
| `radius` | Control corner radius, 0–24 px                                                          |

### Events

| Callback                                     | When                                            |
| -------------------------------------------- | ----------------------------------------------- |
| `onReady`                                    | The checkout loaded                             |
| `onComplete({ sessionId, paymentIntentId })` | The payment completed (sent once)               |
| `onError({ code, message })`                 | The checkout hit an error it can't recover from |
| `onClose`                                    | The customer closed the checkout                |

The iframe resizes itself to its content.

## Content Security Policy

If your site sends a CSP, allow the loader and the checkout frame:

```text
script-src https://js.nearpay.money; frame-src https://pay.nearpay.money
```

## Custom payment UIs

To build your own payment UI instead of using the checkout, create a [payment intent](/payment-intents) — it returns a `client_secret` for the [payer API](/api/payer-api). You then take on what the checkout does for you, including verifying deposit-instruction attestations before showing any address.
