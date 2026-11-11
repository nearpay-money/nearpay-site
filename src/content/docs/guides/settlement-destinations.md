---

title: Settlement destinations
description: Choose the token, network and wallet where payments arrive. Funds settle directly there, and NearPay never holds a balance.
slug: settlement-destinations
eyebrow: Accept payments
---

A **settlement destination** (`sd_…`) is where your payments end up: a token on a network, sent to a wallet address you control or to your NEAR Intents account. The dashboard calls it a **payout wallet**. Each payment snapshots its destination when it is created, so changing a destination never redirects a payment already in flight.

| Type              | Example                               | Notes                                                                                                       |
| ----------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `chain_address`   | `USDC · Base` to `0x8f24…c3D920`      | Any supported chain; destinations needing a memo or tag (many exchange deposit addresses) are not supported |
| `intents_account` | `USDC` to `acme.near` on NEAR Intents | Required for agent payments (x402); refunds are signed intents                                              |

## Add a payout wallet in the dashboard

Destinations are created and changed in the dashboard only (**Payout wallets**), because they decide where money goes:

- adding or changing one needs a passkey confirmation;
- you prove you control the address by signing an ownership message with that wallet. Signing moves no funds;
- when your account has two or more owners or admins, a second one approves the change;
- NearPay screens the address automatically.

A live destination is **active as soon as the ownership check passes** (and the approval, if one is needed). There is no waiting period. Your account's security contacts get an email when it becomes active.

> **Test mode.** Payout wallets added in test mode are active immediately, without an ownership signature, and receive simulated settlements only. They don't exist in live mode. See [Test mode and live mode](/test-mode).

Your API keys can **read** destinations: [`GET /v1/settlement_destinations`](/api/settlement-destinations).

## Pick a destination per payment

Sessions, payment links and payment intents settle to your default destination for the token unless you pass `settlement_destination`. A destination that isn't active is refused with [`destination_not_active`](/errors/destination_not_active); amounts below the network's minimum with [`amount_below_destination_minimum`](/errors/amount_below_destination_minimum).

## What settles

Customers can pay with any supported token and network; NEAR Intents routes the payment and it settles in your destination's token. Every payment intent shows the settled amount and the evidence (`attempts[].evidence`: transaction, chain, amount, explorer link). Balance transactions (`GET /v1/balance_transactions`) list what settled to your wallet for reconciliation. They are a statement, not a NearPay-held balance.
