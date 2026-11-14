---

title: Receive webhooks
description: Signed HTTPS events for payments, refunds, reviews and your account, with retries, secret rotation and resend.
slug: webhooks
eyebrow: Webhooks
---

NearPay sends an HTTPS `POST` to your endpoint when something happens to your objects. Use webhooks to fulfil orders, start refunds and keep your records in sync. See every type in [Event types](/webhooks/events).

## Create an endpoint

In the dashboard under **Developers → Webhooks**, or with the API:

```bash
curl -X POST https://api.nearpay.money/v1/webhook_endpoints \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://shop.example/webhooks/nearpay",
    "enabled_events": ["payment_intent.succeeded", "payment_intent.requires_review", "refund.requires_action", "refund.succeeded"]
  }'
```

The response includes the signing `secret` (`whsec_…`) **once**. Store it like a password. `enabled_events: ["*"]` subscribes to everything.

Endpoints must use `https` on port 443 and a public host. Private, loopback and internal addresses are refused ([`url_invalid`](/errors/url_invalid)).

> **Test mode.** Webhook endpoints belong to one mode: an endpoint created with a test key receives test events only. Test endpoints may also use `http`. To receive test events on your machine without a public URL, use [`nearpay listen`](/cli). See [Test mode and live mode](/test-mode).

## Verify signatures

Every delivery carries:

```http
NearPay-Signature: t=1793900000,v1=5257a869…,v1a=Hs1b…,kid=wh-3f2a9c…
NearPay-Event-Id: evt_01jbz9k3m4n5p6q7r8s9t0v1w2
NearPay-Event-Type: payment_intent.succeeded
```

- `v1` is a hex HMAC-SHA256 of `t + "." + raw_body` with your endpoint secret. During a secret rotation there are two `v1` values; accept the delivery if **any** matches.
- `v1a` is an Ed25519 signature of the same string; the public keys are at [`GET /v1/webhook_signing_keys`](/api/webhook-endpoints#listWebhookSigningKeys) (JWKS, selected by `kid`).
- Reject deliveries whose `t` is more than 300 seconds from your clock.

Always verify the **raw body bytes exactly as received** — parsing and re-serialising JSON changes them. With the SDK:

```ts
import { webhooks } from "@nearpay-money/node";

const event = webhooks.constructEvent(rawBody, req.headers["nearpay-signature"], [currentSecret, previousSecret]);
```

`constructEvent` compares in constant time, checks the tolerance and returns an event typed by `type`. Without the SDK:

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

function verify(rawBody: Buffer, header: string, secret: string, toleranceSec = 300): boolean {
  const parts = header.split(",").map((p) => p.split("=", 2) as [string, string]);
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${t}.`).update(rawBody).digest();
  return parts
    .filter(([k]) => k === "v1")
    .some(([, v]) => {
      const got = Buffer.from(v, "hex");
      return got.length === expected.length && timingSafeEqual(got, expected);
    });
}
```

## Handle events

- Answer `2xx` quickly (within 10 seconds) and do slow work afterwards. Any other status, a timeout or a redirect counts as a failure.
- **At least once, in any order.** The same event can arrive twice; deduplicate on the event `id`. Use `data.object.sequence` to ignore older versions of an object.
- Ignore event types you don't handle, but still answer `2xx`.
- `payment_intent.succeeded` means settlement evidence was verified at your destination — it's the signal to fulfil.

## Retries and failures

Failed deliveries are retried with backoff — about 1 m, 5 m, 30 m, 2 h, 5 h, 10 h, then every 12 h — for up to 72 hours. An endpoint that keeps failing for 72 hours is disabled (`disabled_reason: "failing"`) and account owners are emailed; re-enable it after fixing the problem.

The **delivery log** shows every attempt with its status code and error: `GET /v1/webhook_endpoints/{id}/deliveries` (last 30 days).

## Rotate the secret

```bash
curl -X POST https://api.nearpay.money/v1/webhook_endpoints/we_01jbz9k3m4n5p6q7r8s9t0v1w2/rotate_secret \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"expire_previous_in_seconds": 86400}'
```

The response carries the new `secret` once and `previous_secret_expires_at`. Until then every delivery is signed with both secrets (two `v1` values), so you can deploy the new secret without dropping events. `0` retires the old secret immediately.

## Test and resend

- **Send a test event:** `POST /v1/webhook_endpoints/{id}/test` delivers a `ping` event to that endpoint, whatever it subscribes to.
- **Resend an event:** `POST /v1/events/{id}/resend` with `{"endpoint": "we_…"}` delivers it again to one endpoint, or with `{}` to every enabled endpoint subscribed to its type. Events are kept for 30 days.
- **Develop locally (test mode):** [`nearpay listen --forward-to http://localhost:3000/webhooks`](/cli) forwards your test-mode events to your machine, signed like deliveries, and `nearpay trigger <event>` makes them happen.

## Delivery IP addresses

Deliveries come from NearPay's egress proxy. The production list of source IP addresses will be published on this page before general availability; until then, rely on signature verification rather than IP allow-lists.
