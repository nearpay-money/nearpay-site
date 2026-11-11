---

title: Recurring billing with subscriptions
description: Bill customers every week, month or year. Each period NearPay creates, finalizes and emails a renewal invoice; reminders and dunning follow up on unpaid ones.
slug: billing/subscriptions
eyebrow: Billing
---

A subscription bills a customer for one or more recurring prices every period. In v1 every period is paid by **invoice**: at the start of each period NearPay creates the renewal [invoice](/billing/invoices), finalizes it and emails it to the customer, who pays it on the hosted invoice page from their own wallet. Payments settle directly to your settlement destination.

> **Automatic payments are not available yet.** Subscriptions use `collection_method: send_invoice`: the customer approves every payment. Automatic collection from a customer-approved allowance (a NEAR vault mandate) is planned for a later release and is not live. Nothing in the API collects funds without the customer paying the invoice.

## 1. Create a recurring price

```bash
curl -X POST https://api.nearpay.money/v1/prices \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "product": "prod_01jbz9k3m4n5p6q7r8s9t0v1w2",
    "unit_amount": 4900,
    "currency": "usd",
    "recurring": { "interval": "month" }
  }'
```

`interval` is `day`, `week`, `month` or `year`; `interval_count` (1–12, default 1) bills every _n_ intervals — `{"interval": "month", "interval_count": 3}` is quarterly. Prices are immutable: to change an amount, create a new price and move subscriptions to it.

## 2. Create the subscription

```bash
curl -X POST https://api.nearpay.money/v1/subscriptions \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Idempotency-Key: subscribe-cus-1042" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": "cus_01jbz9k3m4n5p6q7r8s9t0v1w2",
    "items": [{ "price": "price_01jbz9k3m4n5p6q7r8s9t0v1w2", "quantity": 1 }],
    "days_until_due": 7,
    "dunning": { "reminder_days": [-3, 0, 3, 7], "on_exhausted": "cancel" }
  }'
```

```ts
const subscription = await nearpay.subscriptions.create({
  customer: "cus_01jbz9k3m4n5p6q7r8s9t0v1w2",
  items: [{ price: "price_01jbz9k3m4n5p6q7r8s9t0v1w2" }],
  trial_period_days: 14, // optional free trial
});
```

- `items` — 1 to 20 active recurring prices. All items share one currency ([`currency_mismatch`](/errors/currency_mismatch)) and one billing period ([`interval_mismatch`](/errors/interval_mismatch)).
- The customer needs an email address ([`customer_email_missing`](/errors/customer_email_missing)): every invoice is emailed.
- `days_until_due` (default 7) — each invoice is due this many days after it is issued.
- `trial_period_days` — no invoice until the trial ends; the status is `trialing` until then.
- `default_tax_rates`, or `tax_rates` per item — see [Tax rates](/billing/tax-rates).
- `description` and `metadata` are copied onto every invoice of the subscription.

Without a trial, the first invoice is created, finalized and emailed right away, and the subscription is `incomplete` until it is paid.

## Billing periods and renewals

Periods are computed from the `billing_cycle_anchor` (creation time, or the end of the trial). Monthly periods keep the anchor's day of month and fall back to the last day of shorter months: a subscription started on 31 January renews on 28 (or 29) February, then on 31 March.

At `current_period_end` NearPay:

1. creates the invoice for the next period (`billing_reason: subscription_cycle`, the period on each line),
2. finalizes it and emails it to the customer,
3. advances `current_period_start` and `current_period_end`.

Three days before a period ends you receive `customer.subscription.renewal_upcoming`, and the customer gets a heads-up email. Invoices are always issued in advance for the period that is starting; NearPay doesn't bill in arrears for periods that passed while a subscription was paused.

## Statuses

| Status       | Meaning                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| `incomplete` | The first invoice is open. Becomes `active` when it is paid.                                             |
| `trialing`   | In the free trial. The first invoice is issued when the trial ends.                                      |
| `active`     | The latest invoices are paid. Renewals continue.                                                         |
| `past_due`   | An invoice passed its due date unpaid. Reminders continue; paying it returns the subscription to active. |
| `unpaid`     | Dunning ran out and `on_exhausted` is `unpaid`: no new invoices until the latest one is paid.            |
| `canceled`   | Ended — canceled by you, or dunning ran out with `on_exhausted: cancel`. Final.                          |

## Reminders and dunning

Every subscription invoice gets the subscription's `dunning.reminder_days` (default `[-3, 0, 1, 3, 7]`, in days relative to the due date). When an invoice is still unpaid:

1. **At the due date** you receive `invoice.overdue`, and the subscription becomes `past_due`.
2. **On each reminder day** the customer gets a reminder email with the payment link.
3. **After the last reminder** the invoice becomes `uncollectible` (`uncollectible_reason: dunning_exhausted`) and the subscription is `canceled` or `unpaid`, as `dunning.on_exhausted` says (default `cancel`).

An uncollectible invoice can still be paid. Paying the latest invoice of an `unpaid` subscription makes it `active` again and renewals resume from the current period.

## Change a subscription

`PATCH /v1/subscriptions/{id}` changes `items` (which replaces every item), `days_until_due`, `default_tax_rates`, `dunning`, `description`, `settlement_destination` and `metadata`. Changes apply from the **next renewal invoice**; invoices already created stay as issued. The currency and billing period can't change — new items must match them. There is no proration (`proration_behavior` accepts only `none`). Canceled subscriptions can't be changed ([`state_conflict`](/errors/state_conflict)).

```ts
await nearpay.subscriptions.update(subscription.id, {
  items: [{ price: "price_01jbz9k3m4n5p6q7r8s9t0v1w3" }], // the new plan, from the next period
});
```

## Cancel

```bash
curl -X POST https://api.nearpay.money/v1/subscriptions/sub_01jbz9k3m4n5p6q7r8s9t0v1w2/cancel \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"at_period_end": true}'
```

With `at_period_end: true` the subscription stays active until `current_period_end` and then ends without a renewal invoice (`cancel_at_period_end: true` until then; undo it with `PATCH` and `"cancel_at_period_end": false`). Without it, the subscription ends now. Canceling creates no refund or credit, and open invoices are left as they are — void them if the customer shouldn't pay them.

## Webhooks

| Event                                    | When                                                                 |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `customer.subscription.created`          | The subscription was created                                         |
| `customer.subscription.updated`          | Status, items, period or cancellation changed                        |
| `customer.subscription.deleted`          | The subscription ended (`status: canceled`)                          |
| `customer.subscription.renewal_upcoming` | Three days before the current period ends                            |
| `invoice.*`                              | Every renewal invoice, as for [invoices](/billing/invoices#webhooks) |

Grant access on `invoice.paid` for the subscription's `latest_invoice`, and revoke it on `customer.subscription.deleted` (or when the status becomes `unpaid`).

> **Test mode.** Test subscriptions renew on the real clock, and their invoices are paid in the sandbox. To skip ahead, [`POST /v1/test_helpers/subscriptions/{id}/advance_clock`](/api/test-helpers) moves a test subscription's billing clock to its next `renewal_upcoming`, `renewal` or `overdue` point. The CLI triggers `customer.subscription.created`, `updated` and `deleted`. See [Test mode and live mode](/test-mode).
