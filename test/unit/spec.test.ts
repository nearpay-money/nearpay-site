import { WEBHOOK_TYPE_NAMES } from "@nearpay-money/spec";
import { describe, expect, it } from "vitest";
import { errorNote, SURFACE_TEXT } from "../../src/lib/error-notes";
import { currentHref, NAV, neighbours } from "../../src/lib/nav";
import {
  authLabel,
  canonicalHeader,
  curlExample,
  ERRORS,
  GENERIC_ERROR_CODES,
  GROUPS,
  isDeveloperRoute,
  OPERATIONS,
  operationsOf,
  operationsReturning,
  SPEC_PACKAGE_VERSION,
  schemaDescription,
  schemaFields,
  schemaRoot,
} from "../../src/lib/spec";

describe("spec model", () => {
  it("reads @nearpay-money/spec 0.5.0", () => {
    expect(SPEC_PACKAGE_VERSION).toBe("0.5.0");
    expect(ERRORS).toHaveLength(89); // 87 (spec 0.3.0) + 2 Stage 4 codes
  });
  it("lists only developer routes, each in a group", () => {
    expect(OPERATIONS.length).toBe(100); // 62 (Stages 1–2) + 38 (Stage 3: billing, hosted invoices, stream, CLI login, x402 near-intents, test helpers incl. the subscription clock); Stage 4 mandates not documented yet
    for (const id of ["getCliLogin", "approveCliLogin", "denyCliLogin"]) {
      expect(
        OPERATIONS.some((o) => o.id === id),
        id,
      ).toBe(false); // dashboard-session only
    }
    expect(operationsOf("invoices").map((o) => o.id)).toContain("getInvoicePdf");
    expect(
      operationsOf("hosted-invoices")
        .map((o) => o.id)
        .sort(),
    ).toEqual(["createPublicInvoiceSession", "getPublicInvoice", "getPublicInvoicePdf"]);
    expect(
      operationsOf("cli-login")
        .map((o) => o.id)
        .sort(),
    ).toEqual(["createCliLogin", "pollCliLogin"]);
    expect(operationsOf("x402").map((o) => o.id)).toContain("x402NearIntentsSettle");
    expect(operationsOf("test-helpers").map((o) => o.id)).toContain("payCheckoutSessionTestHelper");
    expect(OPERATIONS.some((o) => o.path.startsWith("/v1/auth/"))).toBe(false);
    expect(OPERATIONS.some((o) => o.id === "createApiKey")).toBe(false); // session-only
    expect(OPERATIONS.some((o) => o.id === "updateRefundRecipient")).toBe(false);
    for (const g of GROUPS) expect(operationsOf(g.slug).length, g.slug).toBeGreaterThan(0);
    expect(isDeveloperRoute("/v1/assets", ["anonymous"])).toBe(true);
    expect(isDeveloperRoute("/v1/auth/signup", ["anonymous"])).toBe(false);
    expect(isDeveloperRoute("/v1/account", ["session"])).toBe(false);
  });
  it("describes request bodies, including inline ones", () => {
    const create = OPERATIONS.find((o) => o.id === "createRefund");
    expect(create?.body?.schema).toBe("RefundCreate");
    expect(create?.body?.fields.find((f) => f.name === "payment_intent")?.required).toBe(true);
    const rotate = OPERATIONS.find((o) => o.id === "rotateWebhookEndpointSecret");
    expect(rotate?.body?.schema).toBeUndefined();
    expect(rotate?.body?.fields[0]?.name).toBe("expire_previous_in_seconds");
    expect(rotate?.body?.fields[0]?.constraints).toContain("0–86400");
  });
  it("renders unions, nullables, enums and id types", () => {
    const refund = schemaFields("Refund");
    const next = refund.find((f) => f.name === "next_action");
    expect(next?.nullable).toBe(true);
    expect(next?.variants?.map((v) => v.name)).toEqual(["RefundSignAndSend", "RefundSignIntent"]);
    expect(refund.find((f) => f.name === "status")?.openEnum).toBe(true);
    expect(refund.find((f) => f.name === "id")?.type).toBe("string (re_…)");
    expect(refund.find((f) => f.name === "amount")?.type).toBe("string (base units)");
    expect(refund.find((f) => f.name === "asset_id")?.type).toBe("string (asset id)");
    const event = schemaRoot("Event");
    expect(event.variants?.length).toBe(WEBHOOK_TYPE_NAMES.length);
    const submission = schemaRoot("RefundSubmission");
    expect(submission.variants?.map((v) => v.name)).toEqual(["with tx_hash", "with signed_intent"]);
    expect(schemaDescription("Refund")).toMatch(/non-custodial/);
    expect(() => schemaRoot("Nope")).toThrow();
  });
  it("maps errors to routes and pages", () => {
    expect(GENERIC_ERROR_CODES).toContain("invalid_request");
    expect(operationsReturning("leg_expired").map((o) => o.id)).toContain("submitRefundTx");
    for (const e of ERRORS) expect(e.doc_url).toBe(`https://docs.nearpay.money/errors/${e.code}`);
    expect(errorNote(ERRORS[0]!).fix.length).toBeGreaterThan(0);
    expect(errorNote({ ...ERRORS[0]!, code: "x_retry", retryable: true }).fix[0]).toMatch(/Retry/);
    expect(errorNote({ ...ERRORS[0]!, code: "x_fix", retryable: false }).fix[0]).toMatch(/Fix/);
    expect(Object.keys(SURFACE_TEXT)).toHaveLength(4);
  });
  it("labels auth and builds curl examples", () => {
    expect(authLabel(["secret_key", "restricted_key:refunds.write"])).toEqual([
      "Secret key (`sk_…`)",
      "Restricted key (`rk_…`) with `refunds.write`",
    ]);
    expect(authLabel(["client_secret"])[0]).toMatch(/X-NearPay-Client-Secret/);
    expect(authLabel(["anonymous", "session"])).toEqual(["None (public)", "Dashboard session"]);
    const create = OPERATIONS.find((o) => o.id === "createCheckoutSession");
    const curl = curlExample(create!);
    expect(curl).toContain("-X POST https://api.nearpay.money/v1/checkout/sessions");
    expect(curl).toContain("Idempotency-Key");
    expect(curl).toContain('"success_url"');
    const get = curlExample(OPERATIONS.find((o) => o.id === "getRefund")!);
    expect(get).toContain("/v1/refunds/re_01jbz9k3m4n5p6q7r8s9t0v1w2");
    const payer = curlExample(OPERATIONS.find((o) => o.id === "getPublicCheckoutSession")!);
    expect(payer.match(/X-NearPay-Client-Secret/g)).toHaveLength(1);
    const hosted = curlExample(OPERATIONS.find((o) => o.id === "getPublicInvoice")!);
    expect(hosted).toContain('-H "X-NearPay-Invoice-Secret: $INVOICE_SECRET"');
    expect(hosted).not.toContain("Authorization");
    expect(curlExample(OPERATIONS.find((o) => o.id === "getInvoicePdf")!)).toContain("-o invoice.pdf");
    const stream = OPERATIONS.find((o) => o.id === "streamEvents")!;
    expect(curlExample(stream)).toContain('-H "Accept: text/event-stream" -N');
    expect(stream.sseEvents).toEqual([
      { name: "ready", schema: "EventStreamReady" },
      { name: "event", schema: "Event" },
      { name: "reset", schema: "EventStreamReset" },
    ]);
    expect(canonicalHeader("x-nearpay-invoice-secret")).toBe("X-NearPay-Invoice-Secret");
    expect(canonicalHeader("last-event-id")).toBe("Last-Event-Id");
  });
  it("navigation covers every reference group", () => {
    const hrefs = NAV.flatMap((g) => g.items.map((i) => i.href));
    for (const g of GROUPS) expect(hrefs).toContain(`/api/${g.slug}`);
    expect(neighbours("/get-started").prev?.href).toBe("/");
    expect(neighbours("/nope")).toEqual({});
    expect(currentHref("/errors/rate_limited")).toBe("/errors");
    expect(currentHref("/")).toBe("/");
  });
});
