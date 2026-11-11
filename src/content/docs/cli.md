---

title: Listen to events locally with the CLI
description: Log in from your terminal, stream test-mode events, forward them to your local webhook handler signed like real deliveries, and trigger test events on demand.
slug: cli
eyebrow: Webhooks
---

The NearPay CLI is the fastest way to build a webhook handler: it streams your account's events as they happen and forwards each one to `localhost`, signed like a webhook delivery. It works in **test mode only**.

## Install

```bash
npm install -g @nearpay-money/cli
nearpay --version
```

The package is `@nearpay-money/cli`; the command is `nearpay`. It needs Node.js 22 or later.

## Log in

```bash
nearpay login
```

The CLI prints a short code and opens the dashboard in your browser. Check that the code in the browser matches the one in your terminal, then approve with your passkey. An owner, admin or developer of the account can approve. Use `--no-browser` to print the link instead of opening it — for example on a remote machine.

Approving creates a **restricted test-mode key** for this device (`rk_test_…`, named `CLI · <device name>`). It can only touch test-mode objects, expires after 90 days, and is stored in your operating system's keychain (on machines without one, such as CI containers, in an owner-only file — the CLI tells you when it does that). The code must be approved within 15 minutes.

```bash
nearpay whoami     # which account and key the CLI uses
nearpay logout     # deletes the key from this machine
```

`logout` only removes the local copy. To revoke the key itself, delete it under **Developers → API keys** in the dashboard. To use another test key instead of logging in, pass `--api-key rk_test_…` or set `NEARPAY_API_KEY`; work with several accounts using `--profile <name>`.

## Stream events

```bash
nearpay listen
```

Every new event is printed as it happens: time, type, event id and the object it is about. Filter with `--events` (comma-separated types; default all) and print each event's full JSON with `--print-json`:

```bash
nearpay listen --events invoice.paid,customer.subscription.deleted --print-json
```

The stream resumes where it left off after a dropped connection, so no event is skipped while the CLI reconnects. It's built on [`GET /v1/events/stream`](/api/events#streamEvents), which you can also use from your own tools — [`@nearpay-money/node`](https://www.npmjs.com/package/@nearpay-money/node) wraps it as `nearpay.events.stream()`.

## Forward events to your app

```bash
nearpay listen --forward-to http://localhost:3000/webhooks
```

At start the CLI prints a webhook signing secret (`whsec_…`) for this session. Each event is POSTed to your URL as JSON with the same headers a webhook delivery has — `NearPay-Signature`, `NearPay-Event-Id` and `NearPay-Event-Type` — and the response status is printed next to the event.

Verify forwarded events exactly as you'll verify real webhooks, using the secret the CLI printed:

```ts
import express from "express";
import { NearPay } from "@nearpay-money/node";

const nearpay = new NearPay(process.env.NEARPAY_SECRET_KEY!);
const app = express();

// The raw body is required: the signature covers the exact bytes.
app.post("/webhooks", express.raw({ type: "application/json" }), (req, res) => {
  let event;
  try {
    event = nearpay.webhooks.constructEvent(
      req.body,
      req.header("NearPay-Signature") ?? "",
      process.env.NEARPAY_WEBHOOK_SECRET!,
    );
  } catch {
    return res.status(400).end();
  }
  if (event.type === "invoice.paid") {
    // grant access for event.data.object.subscription, mark the order paid, …
  }
  res.status(200).end();
});

app.listen(3000);
```

Set `NEARPAY_WEBHOOK_SECRET` to the CLI's secret while developing and to your endpoint's secret in production. The CLI signs with the `v1` HMAC only; `verifyEd25519` (the `v1a` signature) applies to real deliveries, not forwarded ones.

> Events from the stream are not webhook deliveries: NearPay doesn't retry them, and they don't touch your webhook endpoints or their delivery log. Use [webhook endpoints](/webhooks) for production.

## Trigger test events

In a second terminal, make something happen:

```bash
nearpay trigger payment_intent.succeeded
nearpay trigger invoice.paid
nearpay trigger --list
```

`trigger` makes real API calls with your test key — it creates the objects and drives the [sandbox](/test-mode), so the events you get are the same ones your integration will see. For example, `invoice.paid` creates a product, a price, a customer and an invoice, finalizes and sends it, then pays it through the sandbox. The CLI waits until the event appears (`--no-wait` to skip, `--timeout` to change the 90-second limit).

| Can be triggered                                                                                   | Not yet                                                                       |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `checkout.session.*`, `payment_intent.*`, `refund.*`                                               | `invoice.overdue`, `customer.subscription.renewal_upcoming` (no clock helper) |
| `invoice.created`, `finalized`, `sent`, `paid`, `payment_failed`, `voided`, `marked_uncollectible` | `agent_payment.*`, `review.*`, `account.updated`, `ping`                      |
| `customer.subscription.created`, `updated`, `deleted`                                              |                                                                               |

`nearpay trigger --list` shows the current list with the steps each fixture runs.

## Inspect and resend events

```bash
nearpay events list --type invoice.paid --limit 5
nearpay events resend evt_01jbz9k3m4n5p6q7r8s9t0v1w2 --endpoint we_01jbz9k3m4n5p6q7r8s9t0v1w2
```

`resend` sends a past event (last 30 days) to your webhook endpoints again — all enabled endpoints subscribed to it, or one with `--endpoint`.

## Limits

- Test mode only: a live key gets [`livemode_forbidden`](/errors/livemode_forbidden) from the event stream.
- At most 5 streams per account at a time; the server closes each stream after an hour and the CLI reconnects automatically.
- Events are kept for 30 days.
