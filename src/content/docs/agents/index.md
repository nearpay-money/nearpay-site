---

title: Agent payments (x402)
description: Charge AI agents per request with the x402 protocol. Agents sign a transfer from their NEAR Intents account; NearPay verifies and settles it.
slug: agents
eyebrow: Agents
---

[x402](https://www.x402.org) lets an HTTP API ask for payment with a `402 Payment Required` response. An agent that understands it signs a payment and retries the request. NearPay acts as the **facilitator** for the `exact` scheme with the `intents-transfer` method on `near:mainnet`: agents sign a transfer from their NEAR Intents account, and NearPay verifies and settles it to your Intents account.

## Requirements

- A **NEAR Intents account settlement destination** for the asset you charge in ([`destination_not_intents_account`](/errors/destination_not_intents_account) otherwise).
- A secret key, or a restricted key with `agentpay.facilitate`.

## Put a price on a route

```bash
npm install @nearpay-money/x402
```

```ts
import express from "express";
import { paywall } from "@nearpay-money/x402";

const app = express();

app.get(
  "/premium",
  // 10000 base units of the default asset (0.01 USDC)
  paywall({ amount: "10000", description: "Premium report" }, { secretKey: process.env.NEARPAY_SECRET_KEY }),
  (req, res) => res.json({ report: "…", paidBy: res.locals.x402.payer }),
);
```

For fetch-style handlers (Next.js route handlers) use `withPaywall`; for Hono, `honoPaywall` from `@nearpay-money/x402/hono`.

What the paywall does:

1. No `PAYMENT-SIGNATURE` header → it asks NearPay for fresh payment requirements (`POST /x402/requirements`, one per 402 response — they are single-use) and answers `402` with a `PAYMENT-REQUIRED` header.
2. With a payment → it checks the amount and resource locally, verifies (`POST /x402/verify`) and settles (`POST /x402/settle`) **before** your handler runs. The response carries `PAYMENT-RESPONSE` with the settlement transaction.
3. A replayed payment is refused with `402 requirement_consumed`, so one payment gets one response.

Settlement happens before your handler: if your handler then fails, the agent has paid without getting the resource. Keep paid handlers simple and reliable.

## Pay as an agent

```ts
import { withX402, decodePaymentResponse } from "@nearpay-money/x402";
import { nearSigner } from "@nearpay-money/agent-signer";

const pay = withX402(fetch, nearSigner({ accountId: "agent.near", keyPair }), {
  maxAmountPerRequest: { "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1": "50000" },
  allowedPayTo: ["merchant.near"],
});

const res = await pay("https://api.merchant.example/premium");
decodePaymentResponse(res); // { success, transaction, payer, amount }
```

Spend limits apply to amount **plus fee** in base units; a request over the limit throws instead of paying. The agent's Intents account needs a balance in the asset.

## The payment

A NearPay requirement looks like this:

```json
{
  "scheme": "exact",
  "network": "near:mainnet",
  "amount": "10000",
  "asset": "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
  "payTo": "merchant.near",
  "maxTimeoutSeconds": 120,
  "extra": {
    "assetTransferMethod": "intents-transfer",
    "paymentFlow": "authorization",
    "fee": { "to": "treasury.nearpay.near", "amount": "25" },
    "binding": "np1:…",
    "verifyingContract": "intents.near",
    "deadline": "2026-11-07T12:02:00.000Z"
  }
}
```

The agent signs exactly two transfers — the amount to `payTo` and the fee to `fee.to`, both with the `binding` as memo — before `deadline`. The fee is the [intents-transfer rate](https://nearpay.money/#pricing). NearPay's relayer submits the signed payload and pays gas; it can't change the recipients or amounts.

## Agents paying checkout sessions

Agents can also pay a regular checkout session from an Intents account: `POST /v1/checkout/sessions/{id}/agent_pay/requirements`, then `POST /v1/checkout/sessions/{id}/agent_pay` with the signed payload (both with the session's client secret). `@nearpay-money/agent-signer` verifies the independent co-signature on the requirement before it signs — the same protection the human checkout uses.

## Payments from other chains

Agents without a NEAR Intents balance can pay from another chain — for example USDC on Base — with the `near-intents` method: add `origins` to the paywall and NEAR Intents delivers exactly your price. See [Let AI agents pay](/agents/ai-agents#accept-payments-from-other-chains).

## Track agent payments

Agent payments appear as `AgentPayment` objects (`GET /v1/agent_payments`) and send `agent_payment.settled` or `agent_payment.failed`. Verify failures carry an `invalidReason` such as `insufficient_funds`, `requirement_expired` or `amount_mismatch`.

## Test mode

With a test key, requirements, verification and settlement run against the sandbox Intents simulator: signatures are checked for real, balances are simulated and nothing touches mainnet.
