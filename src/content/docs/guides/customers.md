---

title: Customers
description: Group payments by the person or business paying you, and send receipts to the right address.
slug: customers
eyebrow: Accept payments
---

A **customer** (`cus_…`) is someone you know who pays you. Attach one to a checkout session or payment intent to group their payments and to use their email for receipts.

```bash
curl -X POST https://api.nearpay.money/v1/customers \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ana@example.com",
    "name": "Ana Silva",
    "metadata": { "crm_id": "C-1029" }
  }'
```

Then pass `customer` when you create a session:

```json
{
  "amount": 4900,
  "currency": "usd",
  "customer": "cus_01jbz9k3m4n5p6q7r8s9t0v1w2",
  "success_url": "https://shop.example/thanks"
}
```

The customer's email is the receipt address unless the session sets `customer_email`. Emails are never included in events or webhooks.

## Wallets

`wallets[]` records wallets you know the customer uses (`{address, chain}`). It is informational: **refunds always go to the refund address recorded on the payment**, never to a wallet from the customer record.

## Find a customer's payments

```bash
curl "https://api.nearpay.money/v1/payment_intents?customer=cus_01jbz9k3m4n5p6q7r8s9t0v1w2" \
  -H "Authorization: Bearer $NEARPAY_SECRET_KEY"
```

List customers by exact email with `GET /v1/customers?email=ana@example.com`.

## Delete a customer

`DELETE /v1/customers/{id}` erases the customer's personal data and returns `{id, object: "customer", deleted: true}`. Their payments stay in your records without the personal data. A deleted customer can't be attached to new payments ([`customer_deleted`](/errors/customer_deleted)).
