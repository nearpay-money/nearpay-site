/**
 * Hand-written guidance shown on the generated error pages ("What to do"). Facts about each code
 * (status, type, retryable, message, since, routes) come from the spec; this file only adds advice.
 * A code without an entry gets advice derived from its type and `retryable` flag.
 */
import type { CatalogueError } from "./spec";

export interface ErrorNote {
  /** What to do, one or two sentences each. */
  fix: string[];
  /** Where the error comes from when it is not an API-key integration (dashboard, console, checkout). */
  surface?: "dashboard" | "console" | "checkout" | "service";
}

const N: Record<string, ErrorNote> = {
  invalid_request: {
    fix: [
      "Check `param` in the error body: it names the field that failed. Fix the request; retrying it unchanged fails again.",
    ],
  },
  resource_missing: {
    fix: [
      "Check the id and that you use a key of the same mode: test-mode objects are invisible to live keys and the other way round.",
      "Events and deliveries older than 30 days are no longer available.",
    ],
  },
  authentication_required: {
    fix: [
      "Send your secret key as `Authorization: Bearer sk_…`, or the session’s client secret in `X-NearPay-Client-Secret` on payer routes.",
    ],
  },
  invalid_api_key: {
    fix: [
      "Copy the key again from Developers in the dashboard. Rolled or revoked keys stop working; expired restricted keys too.",
    ],
  },
  permission_denied: {
    fix: [
      "Use a secret key, or add the missing scope to the restricted key. The message names the action that was refused.",
    ],
  },
  csrf_token_invalid: { fix: ["Reload the dashboard and try again."], surface: "dashboard" },
  ip_not_allowed: {
    fix: ["Add the server’s IP address to the key’s allow-list in the dashboard, or call from an allowed address."],
  },
  account_suspended: {
    fix: ["Live-mode changes are blocked while the account is suspended. Contact support from the dashboard."],
  },
  step_up_required: {
    fix: ["Confirm with your passkey when the dashboard asks, then repeat the action."],
    surface: "dashboard",
  },
  rate_limited: {
    fix: [
      "Wait for `Retry-After` seconds, then retry with the same `Idempotency-Key`. Spread bursts; test keys have lower limits than live keys.",
    ],
  },
  idempotency_key_reused: {
    fix: ["Use a new `Idempotency-Key` for a different request. Reuse a key only to retry exactly the same request."],
  },
  idempotency_in_progress: {
    fix: [
      "The first request with this key is still running. Retry after `Retry-After` with the same key to get its result.",
    ],
  },
  api_error: {
    fix: [
      "Retry with the same `Idempotency-Key` and exponential backoff. If it persists, contact support with the `request_id`.",
    ],
  },
  state_conflict: {
    fix: ["Retrieve the object to see its current status, then choose an action allowed in that status."],
  },
  livemode_forbidden: {
    fix: ["Test helpers and simulations run in test mode only. Use a `sk_test_…` key and a test-mode object."],
  },
  link_expired: { fix: ["Request a new sign-in link."], surface: "dashboard" },
  link_used: { fix: ["Sign-in links work once. Request a new one."], surface: "dashboard" },
  webauthn_failed: { fix: ["Try the passkey again, or use another registered passkey."], surface: "dashboard" },
  invalid_client: {
    fix: ["Internal service credential error; it does not apply to API-key integrations."],
    surface: "service",
  },
  turnstile_failed: { fix: ["Reload the checkout and complete the human check again."], surface: "checkout" },
  invalid_setting: { fix: ["The message names the setting and why it was refused. Correct the value and save again."] },
  scope_unknown: { fix: ["Use scopes from the restricted-key list in the dashboard; names are case-sensitive."] },
  address_invalid: {
    fix: ["Check the address format for the chain (for example a `0x…` address on EVM chains or `name.near` on NEAR)."],
  },
  asset_unsupported: { fix: ["List supported assets with `GET /v1/assets` and use one of their `asset_id`s."] },
  memo_destination_unsupported: {
    fix: [
      "Use a wallet address that does not need a memo or tag, such as a self-custodied wallet instead of an exchange deposit address.",
    ],
  },
  destination_in_use: {
    fix: ["This address and asset are already a settlement destination of an account. Use the existing destination."],
  },
  recovery_lock: {
    fix: [
      "Settlement destinations are locked for a while after account recovery, to protect your funds. Try again after the time in the message.",
    ],
  },
  screening_blocked: {
    fix: ["The address failed sanctions screening and cannot be used. Do not retry with the same address."],
  },
  attestation_invalid: {
    fix: ["Sign the current challenge with the wallet that controls the destination address, then submit again."],
    surface: "dashboard",
  },
  challenge_expired: {
    fix: ["Request a new ownership challenge for the destination and sign that one."],
    surface: "dashboard",
  },
  destination_not_active: {
    fix: [
      "Use an active settlement destination. New or changed destinations become active after their cooling-off period and approval.",
    ],
  },
  account_not_live: {
    fix: [
      "Live mode needs approved business details and an active live settlement destination. The dashboard’s setup checklist shows what is missing; test mode works meanwhile.",
    ],
  },
  amount_below_destination_minimum: {
    fix: [
      "Raise the amount to at least the minimum in the message, or settle to a destination with a lower minimum (cheaper network).",
    ],
  },
  amount_above_unverified_cap: {
    fix: [
      "Prove ownership of the destination address in the dashboard (sign the ownership challenge) to lift the per-payment cap, or lower the amount.",
    ],
  },
  currency_unsupported: {
    fix: [
      'Price in a supported fiat currency (lower-case ISO 4217, such as `usd`) or set `currency: "asset"` with an `asset_id`.',
    ],
  },
  allowed_origins_required: {
    fix: [
      "Embedded sessions need `allowed_origins` with the https origin of the page that mounts the checkout (`http://localhost` is allowed in test mode).",
    ],
  },
  attempt_in_flight: {
    fix: [
      "A payment is already being processed for this session. Wait for it to finish; don’t ask the customer to pay again.",
    ],
  },
  client_secret_invalid: {
    fix: ["Pass the `client_secret` returned when the session was created, for that same session."],
  },
  session_not_open: {
    fix: ["The session completed, expired or was canceled. Create a new checkout session for a new payment."],
  },
  too_many_attempts: { fix: ["The session reached its attempt limit. Create a new checkout session."] },
  route_too_slow: {
    fix: [
      "Payments from that chain cannot finish before the session expires. Choose a faster network or create a session with a longer `expires_in`.",
    ],
    surface: "checkout",
  },
  refund_address_invalid: { fix: ["Enter a valid address on the chain the customer pays from; refunds go there."] },
  geo_blocked: { fix: ["Payments are not available from the payer’s region."], surface: "checkout" },
  intent_invalid: {
    fix: [
      "Sign exactly the requirement you were given (recipient, token, amount, fee, memo and deadline) and submit it before the deadline.",
    ],
  },
  insufficient_balance: {
    fix: [
      "The signer’s NEAR Intents balance cannot cover the amount plus fee. Top up the Intents account, then sign a new payload.",
    ],
  },
  rail_unavailable: {
    fix: [
      "Payments are paused or the route provider is down. Retry later with the same `Idempotency-Key`; nothing was charged.",
    ],
  },
  route_unavailable: { fix: ["There is no route between these assets right now. Pay with another token or network."] },
  pricing_unavailable: {
    fix: ["NearPay will not guess a price. Retry shortly; settling in a USD stablecoin avoids most price lookups."],
  },
  deadline_too_short: { fix: ["Too little time remains for this chain. Start a new payment."] },
  quote_rejected: {
    fix: [
      "The route provider refused the quote (the message carries its reason). Try another token, network or amount.",
    ],
  },
  quote_integrity_failed: { fix: ["NearPay refused a quote that failed its checks. Retry; a new quote is requested."] },
  ticket_invalid: {
    fix: ["The attestation ticket expired. Reload the checkout to start a new attempt."],
    surface: "checkout",
  },
  attestation_refused: {
    fix: ["Do not send funds to these deposit instructions. Start a new payment."],
    surface: "checkout",
  },
  attestation_stale: {
    fix: ["These deposit instructions expired or already settled. Start a new payment instead of reusing them."],
    surface: "checkout",
  },
  attestation_unavailable: {
    fix: ["Deposit instructions cannot be verified right now, so none are shown. Retry shortly."],
    surface: "checkout",
  },
  destination_not_intents_account: {
    fix: [
      "Agent payments settle to a NEAR Intents account. Add an Intents-account settlement destination for this asset.",
    ],
  },
  amount_below_minimum: { fix: ["Raise the amount to at least the minimum in the message."] },
  screening_unavailable: {
    fix: ["Screening is required for this amount and is unavailable. Retry shortly with the same `Idempotency-Key`."],
  },
  url_invalid: {
    fix: [
      "Use a public `https` URL on port 443 (test mode also allows `http`). Private, loopback and internal hosts are refused.",
    ],
  },
  event_type_unknown: { fix: ["Use event types from the event list, or `*` for all. Types are case-sensitive."] },
  last_owner: { fix: ["Make another member an owner first."], surface: "dashboard" },
  member_exists: { fix: ["The person is already a member or has a pending invitation."], surface: "dashboard" },
  invitation_invalid: { fix: ["Ask an admin for a new invitation."], surface: "dashboard" },
  approver_conflict: { fix: ["A different person must approve this change."], surface: "console" },
  two_person_required: { fix: ["Ask a second approver to confirm the action."], surface: "console" },
  authenticator_not_allowed: { fix: ["Use an allow-listed hardware security key."], surface: "console" },
  kyb_profile_incomplete: {
    fix: [
      "Fill in the business details listed in the message, then save them again. The registration number is optional.",
    ],
    surface: "dashboard",
  },
  intent_not_succeeded: {
    fix: [
      "Only succeeded payments can be refunded (or rejected short settlements). Retrieve the intent to check its status.",
    ],
  },
  attempt_not_settled: {
    fix: [
      "Refund an attempt only after its settlement is verified. Use the attempt id from `attempts[]` with `succeeded` status.",
    ],
  },
  amount_exceeds_refundable: {
    fix: ["Refund at most the refundable amount in the message: settled minus refunded minus refunds already pending."],
  },
  leg_expired: {
    fix: [
      "Call `POST /v1/refunds/{id}/prepare` to get a new leg, then sign and send that one. Never reuse an expired leg’s deposit address.",
    ],
  },
  signed_intent_mismatch: {
    fix: [
      "Sign `next_action.nep413` or `next_action.payload` exactly as returned, without changes, and submit it with `submit_tx`.",
    ],
  },
  review_requires_evidence: {
    fix: [
      "The intent is held for verification. Wait for evidence or reject it; it cannot be accepted without evidence.",
    ],
  },
  link_inactive: {
    fix: ["The payment link was deactivated or reached `max_uses`. Reactivate it or share a new link."],
  },
  customer_deleted: { fix: ["The customer was deleted and can’t be used. Create a new customer."] },
  reconciliation_day_open: { fix: ["Reconcile a UTC day only after it has ended."], surface: "console" },
  fx_rate_unavailable: { fix: ["No current exchange rate for this currency. Retry later, or price in USD."] },
  // stage 3 — billing and the developer tools
  currency_mismatch: {
    fix: [
      "Every line of an invoice (and every item of a subscription) must use the invoice’s currency. Create a price in that currency, or start a separate invoice.",
    ],
  },
  interval_mismatch: {
    fix: [
      "All items of a subscription share one billing period. Use recurring prices with the same `interval` and `interval_count`, or create a second subscription.",
    ],
  },
  price_inactive: {
    fix: ["Reactivate the price (`PATCH /v1/prices/{id}` with `active: true`) or use another active price."],
  },
  price_type_invalid: {
    fix: [
      "Invoice lines take `one_time` prices; subscription items take `recurring` prices. Use a price of the right type.",
    ],
  },
  tax_rate_inactive: {
    fix: ["Reactivate the tax rate or apply an active one. Rates already on finalized invoices are unaffected."],
  },
  tax_rates_mixed: {
    fix: [
      "A line’s tax rates must be all inclusive or all exclusive. Split the rates across lines, or use rates of one kind.",
    ],
  },
  invoice_empty: {
    fix: ["Add at least one line with a positive amount before finalizing. Zero-total invoices can’t be finalized."],
  },
  customer_email_missing: {
    fix: [
      "Add an email address to the customer (`PATCH /v1/customers/{id}`), then send again — or share the `hosted_invoice_url` yourself.",
    ],
  },
  invoice_secret_invalid: {
    fix: [
      "Open the invoice from its full hosted link: the secret is the part after `#`. Ask the merchant to resend the invoice if the link is incomplete.",
    ],
    surface: "checkout",
  },
  invoice_not_payable: {
    fix: [
      "The invoice is already paid or was voided. Nothing more is due; contact the merchant if you expected to pay.",
    ],
    surface: "checkout",
  },
};

export function errorNote(e: CatalogueError): ErrorNote {
  const note = N[e.code];
  if (note) return note;
  if (e.retryable) return { fix: ["Retry later with the same `Idempotency-Key` and exponential backoff."] };
  return { fix: ["Fix the request according to the message; retrying it unchanged fails again."] };
}

export const SURFACE_TEXT: Record<NonNullable<ErrorNote["surface"]>, string> = {
  dashboard: "You see this error in the NearPay dashboard; API-key integrations don’t receive it.",
  console: "This error comes from NearPay’s internal ops console.",
  checkout: "Payers see this error in checkout; the hosted and embedded checkout explain it in plain language.",
  service: "This error is internal to NearPay’s services.",
};
