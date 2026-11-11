---

title: Refunds
description: NearPay prepares each refund; you authorise it in your own wallet. Funds return to the address the customer paid from.
slug: refunds
eyebrow: Accept payments
---

NearPay is non-custodial, so it can't send a refund for you. A refund works in two steps: **NearPay prepares** a transfer from your settlement destination back to the customer, and **your wallet signs it**. "Refunds require your wallet authorization."

Refunds always go to the customer's recorded refund address — the wallet they paid from, or the refund address they entered — in the asset and on the chain they paid with.

## 1. Create the refund

```bash
curl -X POST https://api.nearpay.money/v1/refunds \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Idempotency-Key: refund-order-1234" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_intent": "pi_01jbz9k3m4n5p6q7r8s9t0v1w2",
    "reason": "requested_by_customer"
  }'
```

- `amount` (base units of the settlement asset) defaults to everything still refundable: settled − refunded − pending refunds.
- `payment_attempt` refunds a specific settled attempt, such as an overpayment.
- `fee_mode`: `payer_absorbs` (default) sends exactly `amount` and the customer receives it minus route costs; `merchant_absorbs` delivers the equivalent of `amount` and you send slightly more.

The refund starts in `requires_action`. Its `next_action` is the exact transfer to sign. It can be `null` for a moment while the leg is prepared; you'll get `refund.requires_action` when it is ready.

## 2. Sign the next action

There are two kinds of leg, depending on your settlement destination and how the customer paid.

### Route legs: `sign_and_send`

For a destination that is an address on a chain, refunds travel back through a route to the customer's chain and token. `next_action` tells your wallet exactly what to send:

```json
{
  "type": "sign_and_send",
  "chain": "eip155:8453",
  "from": "0x8f24…c3D920",
  "to": "0x5a1c…93f1",
  "asset_id": "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near",
  "token": { … },
  "symbol": "USDC",
  "decimals": 6,
  "amount": "49000000",
  "memo": null,
  "deadline": 1793900000,
  "display": "Send 49.000000 USDC on Base to 0x5a1c…93f1"
}
```

Send exactly `amount` of the token (`token` says how to transfer it on that chain) from `from` to `to` before `deadline`, then report the transaction:

```bash
curl -X POST https://api.nearpay.money/v1/refunds/re_01jbz9k3m4n5p6q7r8s9t0v1w2/submit_tx \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tx_hash": "0x…"}'
```

NearPay also detects the transfer on its own; `submit_tx` just makes it faster.

### Intents legs: `sign_intent`

For a NEAR Intents account destination — and for customers who paid with an Intents transfer — the refund is a single signed transfer that NearPay relays. `next_action` includes the exact NEP-413 `signMessage` arguments (`nep413`), the exact string for ERC-191 or raw Ed25519 signers (`payload`), and the parsed `message` and `transfer` for a human-readable summary. Sign it unchanged and submit the result:

```bash
curl -X POST https://api.nearpay.money/v1/refunds/re_01jbz9k3m4n5p6q7r8s9t0v1w2/submit_tx \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"signed_intent": { "standard": "nep413", "payload": { "message": "…", "nonce": "…", "recipient": "intents.near" }, "public_key": "ed25519:…", "signature": "ed25519:…" }}'
```

A payload that differs from the one issued is refused with [`signed_intent_mismatch`](/errors/signed_intent_mismatch). NearPay's relayer only pays gas; it can't change the recipient or amount.

Always show your signer the `display` summary and check it against the refund before signing. The SDK's `refunds.signers` helpers build exactly the issued transfer and nothing else.

## 3. Track it

| Status            | Meaning                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| `requires_action` | Waiting for your signature on the current leg                           |
| `pending`         | Your transfer was detected; it is on its way to the customer            |
| `succeeded`       | Evidence shows the customer received it (`amount_received`, `evidence`) |
| `failed`          | The leg failed or the route returned the funds to your destination      |
| `canceled`        | You canceled before sending anything                                    |

Webhooks: `refund.created`, `refund.requires_action`, `refund.pending`, `refund.succeeded`, `refund.failed`, `refund.canceled`.

## Expired legs

Each leg has a `deadline`. If it passes before you send, call `POST /v1/refunds/{id}/prepare` for a new leg and sign that one — never send to an expired leg's address ([`leg_expired`](/errors/leg_expired)). If two legs end up paid, the extra one is marked `duplicate` and counted in `extra_amount_sent`.

## Cancel

`POST /v1/refunds/{id}/cancel` works while the refund is `requires_action` and nothing was sent for the current leg.

> **Test mode.** Test refunds aren't signed in a wallet. Call `POST /v1/test_helpers/refunds/{id}/simulate_deposit` to stand in for your transfer; the refund amount's last two digits choose a [sandbox scenario](/test-mode#refund-scenarios). See [Test mode and live mode](/test-mode).
