---

title: Tax rates
description: Add sales tax or VAT to invoices and subscriptions with manual tax rates — inclusive or exclusive, computed per line in integer units with half-up rounding.
slug: billing/tax-rates
eyebrow: Billing
---

A tax rate is a percentage you define — for example 19 % VAT in Germany or 8.875 % sales tax in New York City — and apply to invoice lines and subscription items. NearPay computes the tax amounts and shows them on the hosted invoice page, the PDF and the invoice object. NearPay doesn't decide which rates apply to your sales: you choose the rates and when to use them.

## Create a tax rate

```bash
curl -X POST https://api.nearpay.money/v1/tax_rates \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "VAT",
    "percentage": "19",
    "inclusive": false,
    "jurisdiction": "DE",
    "country": "DE"
  }'
```

```ts
const vat = await nearpay.taxRates.create({ display_name: "VAT", percentage: "19", inclusive: false, country: "DE" });
vat.rate_ppm; // 190000 — the same rate in parts per million, for exact integer arithmetic
```

| Field          | Notes                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------- |
| `display_name` | Shown on invoices next to the amount, e.g. `VAT` or `Sales tax`.                                  |
| `percentage`   | A **decimal string**, 0–100 with at most 4 decimals: `"19"`, `"8.875"`. Never a float.            |
| `inclusive`    | `false`: the tax is added on top of the line amount. `true`: the line amount already contains it. |
| `jurisdiction` | Free text shown on invoices (`DE`, `US-NY`).                                                      |
| `country`      | Optional ISO country code.                                                                        |

`percentage` and `inclusive` can't change once created, so invoices always reproduce. To change a rate, create a new one and deactivate the old one with `PATCH /v1/tax_rates/{id}` and `{"active": false}`. Inactive rates can't be put on new invoices or subscriptions ([`tax_rate_inactive`](/errors/tax_rate_inactive)); invoices that already use them keep them. Tax rates are never deleted.

## Apply tax rates

On an **invoice**, set `default_tax_rates` for every line, or `tax_rates` on a line to override it (`[]` = no tax for that line):

```json
{
  "customer": "cus_01jbz9k3m4n5p6q7r8s9t0v1w2",
  "default_tax_rates": ["txr_01jbz9k3m4n5p6q7r8s9t0v1w2"],
  "lines": [
    { "price": "price_01jbz9k3m4n5p6q7r8s9t0v1w2" },
    { "unit_amount": 1500, "description": "Shipping", "tax_rates": [] }
  ]
}
```

On a **subscription**, use `default_tax_rates` or `tax_rates` per item; every renewal invoice gets them.

Each line takes up to 5 rates, and they must be all exclusive or all inclusive ([`tax_rates_mixed`](/errors/tax_rates_mixed)). Rates are copied onto an invoice when it is finalized, so later changes to a rate's name don't alter issued invoices.

## How tax is calculated

Tax is calculated **per line, per rate, in integer units** of the invoice currency (cents for USD, base units for tokens) and **rounded half-up**. The invoice totals add up the already rounded line amounts, so the PDF, the hosted page and the API always agree.

**Exclusive** — tax = amount × rate, added on top:

| Line amount | Rate    | Tax                                 | Customer pays |
| ----------- | ------- | ----------------------------------- | ------------- |
| $49.99      | 8.875 % | 4999 × 0.08875 = 443.66 → **$4.44** | $54.43        |

**Inclusive** — the line amount already contains the tax; tax = amount × rate ÷ (1 + rate):

| Line amount | Rate | Tax                                     | Net    | Customer pays |
| ----------- | ---- | --------------------------------------- | ------ | ------------- |
| $29.99      | 19 % | 2999 × 0.19 ÷ 1.19 = 478.82 → **$4.79** | $25.20 | $29.99        |

With several inclusive rates on one line, the divisor is 1 + the sum of the rates.

On the invoice:

- `subtotal` — sum of line amounts as priced (inclusive taxes stay inside),
- `tax` — sum of every tax amount,
- `total` — `subtotal` plus exclusive taxes: what the customer pays (`amount_due`),
- `total_excluding_tax` — `total − tax`,
- `total_tax_amounts` and each line's `tax_amounts` — the amount and taxable amount per rate.

To preview totals before you create an invoice, use the same functions NearPay uses. They take bigint amounts and the rates' `rate_ppm`:

```ts
import { computeInvoiceTotals } from "@nearpay-money/node"; // re-exported from @nearpay-money/spec

const totals = computeInvoiceTotals([
  { amount: 4999n, tax_rates: [{ id: "txr_01jbz9k3m4n5p6q7r8s9t0v1w2", rate_ppm: 88750, inclusive: false }] },
]);
totals.tax; // 444n
totals.total; // 5443n
```
