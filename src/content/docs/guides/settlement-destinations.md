---

title: Settlement destinations
description: Choose the currency, network and wallet where payments arrive. Funds settle directly there — NearPay never holds a balance.
slug: settlement-destinations
eyebrow: Accept payments
---

A **settlement destination** (`sd_…`) is where your payments end up: an asset on a network, sent to a wallet address you control or to your NEAR Intents account. Each payment snapshots its destination when it is created, so changing a destination never redirects a payment already in flight.

| Type              | Example                               | Notes                                                                                                       |
| ----------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `chain_address`   | `USDC · Base` to `0x8f24…c3D920`      | Any supported chain; destinations needing a memo or tag (many exchange deposit addresses) are not supported |
| `intents_account` | `USDC` to `acme.near` on NEAR Intents | Required for agent payments (x402); refunds are signed intents                                              |

## Manage destinations in the dashboard

Destinations are created and changed in the dashboard only, because they decide where money goes:

- adding or changing one needs a passkey confirmation;
- a new or changed destination becomes active after a **cooling-off period**, and you are notified;
- when your account has two or more admins, destination changes need a second approver;
- proving you control the address (signing a challenge) lifts the per-payment cap for unverified destinations ([`amount_above_unverified_cap`](/errors/amount_above_unverified_cap)).

Your API keys can **read** destinations: [`GET /v1/settlement_destinations`](/api/settlement-destinations).

## Pick a destination per payment

Sessions, payment links and payment intents settle to your default destination for the asset unless you pass `settlement_destination`. A destination that isn't active yet is refused with [`destination_not_active`](/errors/destination_not_active); amounts below the network's minimum with [`amount_below_destination_minimum`](/errors/amount_below_destination_minimum).

## What settles

Customers can pay with any supported token and network; NEAR Intents routes the payment and it settles in your destination's asset. Every payment intent shows the settled amount and the evidence (`attempts[].evidence`: transaction, chain, amount, explorer link). Balance transactions (`GET /v1/balance_transactions`) list what settled to your wallet for reconciliation — they are a statement, not a NearPay-held balance.
