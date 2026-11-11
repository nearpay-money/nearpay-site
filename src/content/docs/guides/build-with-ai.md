---

title: Integrate with an AI agent
description: A copy-paste prompt that has your coding agent add NearPay as the crypto payment provider for your project.
slug: build-with-ai
eyebrow: Start here
---

Coding agents such as Claude Code, Cursor or Codex can add NearPay to an existing project on their own. Paste the prompt below into your agent from the root of your project. It reads these docs, follows your project's stack and conventions, and builds everything in test mode first.

```text
Integrate NearPay (https://nearpay.money) into this project as its crypto payment provider.

Read the NearPay docs at https://docs.nearpay.money before writing code (start with Get started, Checkout, Webhooks and Test mode). Use the official SDK, @nearpay-money/node, or the REST API if this project doesn't run on Node.

Requirements:
- For each purchase, create a NearPay checkout session on the server and redirect the customer to its URL. Take the price from server-side data, never from the client, and include our order ID in the session metadata and in the idempotency key.
- Mark an order paid only when a verified NearPay webhook (payment_intent.succeeded) arrives and its amount matches the order. Make fulfilment idempotent, and handle expired sessions and refunds.
- Keep NEARPAY_SECRET_KEY and NEARPAY_WEBHOOK_SECRET in environment variables, on the server only.
- Build and test in test mode (sk_test_ keys, plus the NearPay CLI or test helpers) before anything goes live.
- Follow this project's existing structure, stack and conventions.

When you're done, summarise what changed, which environment variables to set, and what I need to do in the NearPay dashboard to go live.
```

Before you run it, [create an account](https://dashboard.nearpay.money/signup), add a settlement destination, and keep your test secret key (`sk_test_…`) at hand. Your agent will ask for it, or tell you where to put it.

The agent doesn't need to know what your project sells: it works that out from your code. If you want something specific, such as an embedded checkout instead of a redirect, or invoices for recurring plans, add it at the end of the prompt.
