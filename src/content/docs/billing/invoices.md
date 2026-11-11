---

title: Send an invoice
description: Bill a customer from the dashboard or the API. They pay on a hosted invoice page from their own wallet, and the payment settles directly to your settlement destination.
slug: billing/invoices
eyebrow: Billing
---

An invoice asks a customer to pay a fixed amount by a due date. You create it as a **draft**, **finalize** it — which gives it a number, a due date, a hosted payment page and a PDF — and **send** it. The customer opens the link, reviews the lines and pays from a wallet they already hold. NearPay is non-custodial: the payment settles directly to your [settlement destination](/settlement-destinations), never to a NearPay balance.

The lifecycle is `draft` → `open` → `paid`, with `void` and `uncollectible` as the other ways an open invoice can end:

| Status          | Meaning                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `draft`         | Editable. Not visible to the customer; no number, no PDF.                                               |
| `open`          | Finalized and payable on the hosted invoice page. Lines and amounts can no longer change.               |
| `paid`          | A payment for the full `amount_due` settled at your destination. Final.                                 |
| `void`          | Canceled by you. Final; the hosted page no longer accepts payments.                                     |
| `uncollectible` | Written off (by you, or after the last reminder of a subscription invoice). The customer can still pay. |

An invoice is only ever marked `paid` by a payment that settled. There is no "mark as paid" for money received elsewhere.

## Before you start

- A **customer** with an email address (`POST /v1/customers`). NearPay emails the invoice to that address.
- An **active settlement destination** that accepts the invoice's currency. Finalizing checks it.
- A secret key, or a restricted key with `invoices.write` (and `products.write` to create products and prices).

> **Test mode.** Invoices created with a test key are paid in the sandbox: no real funds move, and the hosted page shows **Simulate payment**. Test-mode emails, when enabled, carry a test-mode banner and a `[test]` subject tag. Open the `hosted_invoice_url` directly to test paying. See [Test mode and live mode](/test-mode).

## Create an invoice in the dashboard

1. Open **Billing** in the dashboard sidebar and start a new invoice.
2. Choose the customer, add lines from your products (or a custom description and amount) and optional tax rates.
3. Check the totals, the due date and the reminder schedule, then **finalize** the invoice.
4. **Send** it to email the customer the payment link — or copy the hosted invoice link and share it yourself.

The dashboard calls the same API as the steps below, so everything you do there shows up in your webhooks and `GET /v1/invoices`.

## Create an invoice with the API

### 1. Create a product and a price (optional)

Lines can come from a price, or have a custom description and amount. Prices are reusable and keep your invoices consistent.

```bash
curl -X POST https://api.nearpay.money/v1/products \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Design retainer"}'

curl -X POST https://api.nearpay.money/v1/prices \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"product": "prod_01jbz9k3m4n5p6q7r8s9t0v1w2", "unit_amount": 120000, "currency": "usd"}'
```

`unit_amount` is in minor units for fiat currencies (`120000` = $1,200.00). To price in a token instead, use `"currency": "asset"`, an `asset_id` and a base-unit string (`"unit_amount": "1200000000"` for 1,200 USDC with 6 decimals).

### 2. Create a draft

```bash
curl -X POST https://api.nearpay.money/v1/invoices \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Idempotency-Key: invoice-order-1042" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": "cus_01jbz9k3m4n5p6q7r8s9t0v1w2",
    "lines": [
      { "price": "price_01jbz9k3m4n5p6q7r8s9t0v1w2", "quantity": 1 },
      { "unit_amount": 25000, "description": "Extra revision round", "quantity": 2 }
    ],
    "days_until_due": 14,
    "description": "October retainer",
    "metadata": { "order_id": "1042" }
  }'
```

- `lines` — up to 100. A price line uses an active **one-time** price in the invoice currency; a custom line needs `unit_amount` and `description`.
- `currency` — defaults to the currency of the first price line; required when every line has a custom amount.
- `days_until_due` (default 30) or a fixed `due_date` (unix seconds).
- `default_tax_rates` or per-line `tax_rates` — see [Tax rates](/billing/tax-rates).
- `reminder_days` — when reminder emails go out, in days relative to the due date. Default `[-3, 0, 1, 3, 7]`; `[]` sends none.

Drafts can be changed with `PATCH /v1/invoices/{id}` (`lines` replaces every line) and deleted with `DELETE /v1/invoices/{id}`. Once an invoice is finalized, only `metadata` can change.

### 3. Finalize

```bash
curl -X POST https://api.nearpay.money/v1/invoices/in_01jbz9k3m4n5p6q7r8s9t0v1w2/finalize \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Finalizing checks the invoice (at least one line and a total above zero — otherwise [`invoice_empty`](/errors/invoice_empty); the customer exists; your destination accepts the currency and the total meets its minimum), then assigns the `number` (for example `INV-00042`), sets `due_date`, renders the PDF and returns `hosted_invoice_url`. It does not email anyone yet.

### 4. Send

```bash
curl -X POST https://api.nearpay.money/v1/invoices/in_01jbz9k3m4n5p6q7r8s9t0v1w2/send \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

NearPay emails the customer a link to the hosted invoice page and sets `status_transitions.sent_at`. You can send again — for example after the customer changed their email — at most once every 10 minutes per invoice ([`rate_limited`](/errors/rate_limited) otherwise). A customer without an email answers [`customer_email_missing`](/errors/customer_email_missing).

### The same with `@nearpay-money/node`

```ts
import { writeFile } from "node:fs/promises";
import { NearPay } from "@nearpay-money/node";

const nearpay = new NearPay(process.env.NEARPAY_SECRET_KEY!);

const draft = await nearpay.invoices.create({
  customer: "cus_01jbz9k3m4n5p6q7r8s9t0v1w2",
  lines: [
    { price: "price_01jbz9k3m4n5p6q7r8s9t0v1w2" },
    { unit_amount: 25000, description: "Extra revision round", quantity: 2 },
  ],
  days_until_due: 14,
});
const invoice = await nearpay.invoices.finalize(draft.id);
await nearpay.invoices.send(invoice.id);

const pdf = await nearpay.invoices.pdf(invoice.id); // Uint8Array
await writeFile(pdf.filename ?? `${invoice.number}.pdf`, pdf);
```

## The hosted invoice page

`hosted_invoice_url` looks like `https://pay.nearpay.money/i/in_…#in_…_secret_…`. The part after `#` is the **invoice secret**: anyone with the full link can view and pay the invoice, so share it only with the customer. The secret stays in the URL fragment, which browsers never send to servers. For the same reason the URL is `null` in webhook events — read it with `GET /v1/invoices/{id}` when you need it.

On the page the customer sees your business name, the invoice number, the due date, every line with its tax and the amount due. They can download the PDF, then pay:

- **Connect a wallet** they already use and pay in a token and network of their choice, or
- **Send from another wallet** to a deposit address. Before any address is shown, checkout verifies an independent co-signature over the deposit instructions.

The payment runs through a normal checkout session (`invoice` is set on the session and its payment intent), so payer fees, late payments and refunds work exactly like [checkout](/checkout). The page stays payable while the invoice is `open` or `uncollectible`.

> AI agents can pay hosted invoices too — see [Let AI agents pay](/agents/ai-agents#pay-a-hosted-invoice).

## PDF

Every finalized invoice has a PDF at `invoice_pdf`. Download it with your key:

```bash
curl https://api.nearpay.money/v1/invoices/in_01jbz9k3m4n5p6q7r8s9t0v1w2/pdf \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -o INV-00042.pdf
```

The response is `application/pdf` (the file name is in `Content-Disposition`). The PDF is re-rendered when the status changes and then carries a `PAID`, `VOID` or `UNCOLLECTIBLE` stamp; everything else stays identical. Drafts have no PDF ([`state_conflict`](/errors/state_conflict)).

## Emails to your customer

NearPay sends these emails to the customer's address, with your business name:

| Email    | When                                                        |
| -------- | ----------------------------------------------------------- |
| Invoice  | When you send the invoice (and each time you send it again) |
| Reminder | On each day of `reminder_days` while the invoice is unpaid  |
| Receipt  | When the invoice is paid                                    |
| Voided   | When you void an invoice                                    |

Reminder days that have already passed when you finalize are skipped. Marking an invoice uncollectible doesn't stop the customer from paying it.

## Close an invoice without payment

- **Void** (`POST /v1/invoices/{id}/void`) cancels an open invoice for good. If a payment could still be on its way — an attempt in flight — the void is refused with [`attempt_in_flight`](/errors/attempt_in_flight); try again later.
- **Mark uncollectible** (`POST /v1/invoices/{id}/mark_uncollectible`) writes it off and stops reminders. The hosted page stays payable, and a later payment moves the invoice to `paid`.

A payment that still settles after an invoice was paid or voided is listed in the invoice's `payment_intents`; refund it like an overpayment.

## Webhooks

| Event                          | When                                                          |
| ------------------------------ | ------------------------------------------------------------- |
| `invoice.created`              | A draft was created                                           |
| `invoice.finalized`            | The draft was finalized (`open`)                              |
| `invoice.sent`                 | The invoice was emailed                                       |
| `invoice.paid`                 | A payment settled for the full amount                         |
| `invoice.payment_failed`       | A payment attempt failed; the invoice stays open              |
| `invoice.overdue`              | The due date passed without payment                           |
| `invoice.voided`               | You voided the invoice                                        |
| `invoice.marked_uncollectible` | Written off by you, or after the last reminder (subscription) |

Fulfil on `invoice.paid`. Each invoice has a `sequence` that increases with every change: ignore webhook objects with a lower `sequence` than one you already processed. Try these events locally with [`nearpay trigger invoice.paid`](/cli).
