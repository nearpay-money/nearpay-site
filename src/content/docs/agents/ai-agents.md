---

title: Let AI agents pay
description: Give AI agents NearPay tools over MCP, charge them per request with x402 — also from other chains — and let them pay checkout sessions and hosted invoices within spending limits you set.
slug: agents/ai-agents
eyebrow: Agents
---

AI agents can pay with NearPay the same way people do: from a wallet they control, with every payment checked before it is signed. There are three ways in:

| You want to…                                         | Use                                                                                    |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Give an agent (Claude, any MCP client) payment tools | The MCP server [`@nearpay-money/mcp`](#the-mcp-server)                                 |
| Charge agents per request for your API               | An [x402 paywall](#charge-agents-with-x402), also cross-chain                          |
| Let an agent settle a checkout session or an invoice | [Agent checkout](#pay-a-checkout-session) and [hosted invoices](#pay-a-hosted-invoice) |

NearPay never holds the agent's funds or keys. The agent signs with its own key; NearPay's relayer submits the signed payload and pays gas, and it can't change the recipient or the amount.

## The MCP server

`@nearpay-money/mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server. It runs locally over stdio, or as a streamable HTTP server, and exposes two kinds of tools:

| Tool                              | Kind     | What it does                                                                                        |
| --------------------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `nearpay_create_checkout_session` | Merchant | Creates a checkout session with your API key and returns its URL                                    |
| `nearpay_get_payment_intent`      | Merchant | Reads a payment intent's status                                                                     |
| `nearpay_list_payments`           | Merchant | Lists recent payments                                                                               |
| `nearpay_pay_checkout_session`    | Payer    | Pays a checkout link (`…/c/cs_…#…`) or a hosted invoice link (`…/i/in_…#…`) from the agent's wallet |
| `nearpay_fetch_paid`              | Payer    | Fetches a URL and pays its x402 `402 Payment Required` response, within `max_amount`                |

Merchant tools use the API key you configure — use a restricted key (`rk_…`) with only the scopes the agent needs. Payer tools use the agent's signer and the spending limits you configure; the server holds no other credentials. For a desktop MCP client, register it as a stdio server:

```json
{
  "mcpServers": {
    "nearpay": {
      "command": "npx",
      "args": ["-y", "@nearpay-money/mcp"]
    }
  }
}
```

The keys, the agent's signer, the spending limits and the allowed merchants are set in the server's configuration — see the `@nearpay-money/mcp` README for the options. With live keys and a funded agent wallet, payments move real funds.

> **Test mode.** Configure test keys while you set up an agent: every payment then runs in the sandbox and no real funds move. See [Test mode and live mode](/test-mode).

## Charge agents with x402

[x402](https://www.x402.org) lets your API answer `402 Payment Required` with a price. `@nearpay-money/x402` adds a paywall to a route; NearPay is the facilitator that issues single-use payment requirements, verifies the agent's payment and settles it to your settlement destination before your handler runs. [Agent payments (x402)](/agents) covers the basics; this section adds payments from other chains.

### Accept payments from other chains

By default agents pay with `intents-transfer` from a NEAR Intents balance. Add `origins` and agents without one can deposit on another chain — for example USDC on Base — and NEAR Intents delivers exactly your price to you (the `exact` scheme with the `near-intents` method):

```ts
import express from "express";
import { paywall } from "@nearpay-money/x402";

const BASE_USDC = "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near";

const app = express();
app.get(
  "/premium",
  paywall(
    { amount: "10000", description: "Premium report", origins: [{ asset_id: BASE_USDC }] },
    { secretKey: process.env.NEARPAY_SECRET_KEY },
  ),
  (req, res) => res.json({ report: "…" }),
);
```

A 402 then offers both: the `intents-transfer` entry and one `near-intents` entry per origin. A cross-chain payment takes three requests:

1. **Quote** — the agent retries with a `quote` payload; the paywall gets a quote from NearPay (`POST /x402/near-intents/verify`) and answers a second `402` with the quoted amount, a deposit address and a refund deadline. Nothing is served yet.
2. **Deposit** — the agent sends the quoted amount to the deposit address on its own chain and retries with a `deposit` payload carrying the transaction.
3. **Settle** — the paywall settles (`POST /x402/near-intents/settle`). Cross-chain delivery takes minutes: while it is pending the agent gets `402` with `errorReason: settlement_pending` and retries later with the same payload. Your handler runs once, when the payment has settled.

If the route can't deliver, NEAR Intents refunds the deposit to the agent's address on its own chain. A settled operation is served only once; repeats are refused.

### Pay from an agent

```ts
import { evmDepositor, withX402 } from "@nearpay-money/x402";

const BASE_USDC = "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near";

// walletClient: a viem WalletClient for the agent's account on Base
const pay = withX402(fetch, null, {
  maxAmountPerRequest: { [BASE_USDC]: "50000" }, // 0.05 USDC per request, in origin units
  allowedPayTo: ["merchant.near"],
  crossChain: { originSigner: evmDepositor({ "eip155:8453": walletClient }) },
});

const res = await pay("https://api.merchant.example/premium");
```

The client prefers `intents-transfer` when you also pass a NEAR signer with enough Intents balance. For cross-chain payments it checks the quote against your limits **before** depositing, records the operation before sending funds (pass a persistent `store` so a restart can resume it with the same deposit) and never funds a second quote while one is pending.

## Pay a checkout session

An agent can pay a regular checkout session from its NEAR Intents account. With the session's client secret it asks for requirements (`POST /v1/checkout/sessions/{id}/agent_pay/requirements`), verifies the independent co-signature on them against keys pinned in the agent's configuration, signs, and submits (`POST /v1/checkout/sessions/{id}/agent_pay`). `@nearpay-money/agent-signer` does all of this and refuses to sign when the co-signature or any field doesn't match — the same protection people get in checkout. `nearpay_pay_checkout_session` wraps it for MCP clients.

## Pay a hosted invoice

Give the agent the invoice's `hosted_invoice_url` (`https://pay.nearpay.money/i/in_…#in_…_secret_…`) and call `nearpay_pay_checkout_session` with it. The tool:

1. opens the invoice's checkout session with the invoice secret — the same call the hosted invoice page makes:

   ```bash
   curl -X POST https://api.nearpay.money/v1/invoices/in_01jbz9k3m4n5p6q7r8s9t0v1w2/public/sessions \
     -H "X-NearPay-Invoice-Secret: $INVOICE_SECRET" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

2. continues with the returned `checkout_session` and `client_secret` exactly like [paying a checkout session](#pay-a-checkout-session).

The invoice is marked `paid` when the payment has settled at the merchant's destination, and the merchant receives `invoice.paid`. Treat the hosted link like a password: anyone holding it can pay — and see — the invoice.

## Spending limits

Every payer path enforces limits on the agent's side, before anything is signed:

- **Per request** — `maxAmountPerRequest`: one base-unit value for any asset, or a map per asset (assets not listed are refused). For `intents-transfer` it covers amount **plus fee**; for cross-chain payments, the quoted amount in the origin asset.
- **Recipients** — `allowedPayTo`: only these merchant accounts can be paid.
- **Budget** — the MCP server's payer tools also keep a running total per asset over the session, so many small payments can't add up past what you allowed.

A payment over a limit fails with an error instead of being paid; the agent never silently pays more. Give agents their own wallet with only the funds they need.

## Track agent payments

Agent payments appear in the dashboard under **Agent payments** and send `agent_payment.settled` or `agent_payment.failed`.

> **Test mode.** With test keys, MCP tools, x402 and agent checkout all run against the sandbox: signatures are checked for real, balances and settlement are simulated, and nothing touches mainnet. See [Test mode and live mode](/test-mode).
