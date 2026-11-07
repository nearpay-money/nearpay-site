import { WEBHOOK_TYPE_NAMES } from "@nearpay/spec";
import { describe, expect, it } from "vitest";
import { errorNote, SURFACE_TEXT } from "../../src/lib/error-notes";
import { currentHref, NAV, neighbours } from "../../src/lib/nav";
import {
  authLabel,
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
  it("reads @nearpay/spec 0.2.0", () => {
    expect(SPEC_PACKAGE_VERSION).toBe("0.2.0");
    expect(ERRORS).toHaveLength(77);
  });
  it("lists only developer routes, each in a group", () => {
    expect(OPERATIONS.length).toBe(62);
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
    expect(curlExample(OPERATIONS.find((o) => o.id === "getPublicCheckoutSession")!)).toContain(
      "X-NearPay-Client-Secret",
    );
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
