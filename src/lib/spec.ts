/**
 * Build-time model of the public contract, read from the installed `@nearpay-money/spec` package:
 * `openapi/public.yaml` (API reference) and `errors/catalogue.yaml` (error pages). Nothing here is
 * hand-written contract: pages are rendered from this model on every build, so there are no generated
 * files to edit. Grouping, ordering and wording of group intros are presentation only.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { parse } from "yaml";

type Json = Record<string, unknown>;
const require = createRequire(import.meta.url);
const specRoot = dirname(require.resolve("@nearpay-money/spec/package.json"));

export const SPEC_PACKAGE_VERSION: string = (
  JSON.parse(readFileSync(join(specRoot, "package.json"), "utf8")) as { version: string }
).version;

const openapi = parse(readFileSync(join(specRoot, "openapi/public.yaml"), "utf8")) as Json;
const catalogue = parse(readFileSync(join(specRoot, "errors/catalogue.yaml"), "utf8")) as {
  version: string;
  errors: CatalogueError[];
};

const schemas = ((openapi.components as Json).schemas ?? {}) as Record<string, Json>;
export const OPENAPI_VERSION = String((openapi.info as Json).version);
export const API_BASE_URL = String(((openapi.servers as Json[])[0] as Json).url);

/* ------------------------------------------------------------------------------------------ */
/* Errors                                                                                       */
/* ------------------------------------------------------------------------------------------ */

export interface CatalogueError {
  code: string;
  status: number;
  type: string;
  retryable: boolean;
  generic?: boolean;
  message: string;
  example: string;
  doc_url: string;
  since: string;
}

export const ERRORS: readonly CatalogueError[] = catalogue.errors;
export const CATALOGUE_VERSION = catalogue.version;

/* ------------------------------------------------------------------------------------------ */
/* Schemas → display fields                                                                     */
/* ------------------------------------------------------------------------------------------ */

export interface Field {
  name: string;
  type: string;
  required: boolean;
  nullable: boolean;
  description?: string;
  /** Closed enum values, or documented values of an open (extensible) enum. */
  values?: string[];
  openEnum?: boolean;
  constValue?: string;
  defaultValue?: string;
  constraints: string[];
  children?: Field[];
  /** `anyOf` / discriminated unions of objects. */
  variants?: { name: string; fields: Field[] }[];
}

const MAX_DEPTH = 5;

function refName(ref: string): string {
  return ref.replace("#/components/schemas/", "");
}

function deref(s: Json): { schema: Json; ref?: string } {
  const ref = s.$ref;
  if (typeof ref === "string") {
    const target = schemas[refName(ref)];
    if (!target) throw new Error(`unknown $ref ${ref}`);
    return { schema: target, ref: refName(ref) };
  }
  return { schema: s };
}

const BASE_UNITS = "^(0|[1-9][0-9]{0,77})$";

function idPrefix(pattern: unknown): string | undefined {
  if (typeof pattern !== "string") return undefined;
  const m = /^\^([a-z0-9]+)_\[0-7\]/.exec(pattern);
  return m ? m[1] : undefined;
}

function scalarType(s: Json): string {
  const t = s.type;
  const types = Array.isArray(t) ? t.filter((x) => x !== "null") : t ? [t] : [];
  const base = types.join(" | ") || (s.const !== undefined ? typeof s.const : "any");
  if (base === "string") {
    const prefix = idPrefix(s.pattern);
    if (prefix) return `string (${prefix}_…)`;
    if (s.pattern === BASE_UNITS) return "string (base units)";
    if (typeof s.pattern === "string" && s.pattern.startsWith("^(nep141:")) return "string (asset id)";
    if (s.format) return `string (${String(s.format)})`;
  }
  return String(base);
}

function constraintsOf(s: Json): string[] {
  const out: string[] = [];
  if (typeof s.minimum === "number" && typeof s.maximum === "number" && s.maximum < 9007199254740991) {
    out.push(`${s.minimum}–${s.maximum}`);
  } else if (typeof s.minimum === "number" && s.minimum !== 0) out.push(`≥ ${s.minimum}`);
  if (typeof s.maxLength === "number" && !idPrefix(s.pattern)) {
    out.push(
      typeof s.minLength === "number" && s.minLength > 0
        ? `${s.minLength}–${s.maxLength} chars`
        : `≤ ${s.maxLength} chars`,
    );
  }
  if (typeof s.maxItems === "number") out.push(`≤ ${s.maxItems} items`);
  if (typeof s.maxProperties === "number") out.push(`≤ ${s.maxProperties} keys`);
  return out;
}

function isNullSchema(s: Json): boolean {
  return s.type === "null";
}

/** Describes one schema as a display field (recursing into objects, arrays and unions). */
export function toField(name: string, raw: Json, required: boolean, depth = 0, seen: string[] = []): Field {
  let nullable = false;
  let s = raw;
  let description = typeof raw.description === "string" ? raw.description : undefined;

  // anyOf with a null member → nullable; single remaining member → that member
  if (Array.isArray(s.anyOf)) {
    const members = (s.anyOf as Json[]).filter((m) => !isNullSchema(m));
    nullable = members.length < (s.anyOf as Json[]).length;
    if (members.length === 1 && members[0]) {
      s = { ...members[0], description: description ?? members[0].description };
    } else if (members.every((m) => typeof m.$ref === "string" || m.properties) && !s.discriminator) {
      return union(name, members, required, nullable, description, depth, seen);
    }
  }
  if (Array.isArray(s.type) && s.type.includes("null")) nullable = true;

  const { schema, ref } = deref(s);
  if (ref) {
    description = description ?? (typeof schema.description === "string" ? schema.description : undefined);
    if (seen.includes(ref) || depth >= MAX_DEPTH) {
      return { name, type: `object (${ref})`, required, nullable, description, constraints: [] };
    }
    const inner = toField(name, schema, required, depth, [...seen, ref]);
    return { ...inner, nullable: inner.nullable || nullable, description: description ?? inner.description };
  }

  if (schema.discriminator && Array.isArray(schema.anyOf ?? schema.oneOf)) {
    const members = (schema.anyOf ?? schema.oneOf) as Json[];
    return union(name, members, required, nullable, description, depth, seen);
  }

  const field: Field = {
    name,
    type: "",
    required,
    nullable,
    description,
    constraints: constraintsOf(schema),
  };
  if (Array.isArray(schema.enum)) field.values = (schema.enum as unknown[]).filter((v) => v !== null).map(String);
  if (Array.isArray(schema["x-extensible-enum"])) {
    field.values = (schema["x-extensible-enum"] as unknown[]).map(String);
    field.openEnum = true;
  }
  if (schema.const !== undefined) field.constValue = String(schema.const);
  if (schema.default !== undefined && typeof schema.default !== "object") field.defaultValue = String(schema.default);

  if (Array.isArray(schema.anyOf)) {
    // a union of scalars (e.g. integer minor units | decimal-string base units)
    const members = (schema.anyOf as Json[]).filter((m) => !isNullSchema(m));
    field.type = members
      .map((m) => (m.const !== undefined ? JSON.stringify(m.const) : scalarType(deref(m).schema)))
      .join(" | ");
    return field;
  }

  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== "null") : schema.type;
  if (type === "object" || schema.properties) {
    const props = (schema.properties ?? {}) as Record<string, Json>;
    const req = new Set((schema.required as string[] | undefined) ?? []);
    const keys = Object.keys(props);
    if (keys.length > 0) {
      field.type = "object";
      field.children = keys
        .sort((a, b) => Number(req.has(b)) - Number(req.has(a)) || order(a) - order(b) || a.localeCompare(b))
        .map((k) => toField(k, props[k] as Json, req.has(k), depth + 1, seen));
    } else if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === "object" &&
      Object.keys(schema.additionalProperties).length > 0
    ) {
      field.type = `map of ${scalarType(schema.additionalProperties as Json)}`;
    } else {
      field.type = "object";
    }
    return field;
  }
  if (type === "array") {
    const items = (schema.items ?? {}) as Json;
    const inner = toField("[]", items, true, depth + 1, seen);
    field.type = `array of ${inner.children ? "objects" : inner.type}`;
    if (inner.children) field.children = inner.children;
    if (inner.variants) field.variants = inner.variants;
    if (!field.values && inner.values) {
      field.values = inner.values;
      field.openEnum = inner.openEnum;
    }
    return field;
  }
  field.type = scalarType(schema);
  return field;
}

/** Common fields first, then alphabetical (id, object, …). */
function order(key: string): number {
  const first = ["id", "object", "type", "status", "amount", "currency", "livemode", "created"];
  const i = first.indexOf(key);
  return i === -1 ? first.length : i;
}

function union(
  name: string,
  members: Json[],
  required: boolean,
  nullable: boolean,
  description: string | undefined,
  depth: number,
  seen: string[],
): Field {
  return {
    name,
    type: "one of",
    required,
    nullable,
    description,
    constraints: [],
    variants: members.map((m, i) => {
      const r = typeof m.$ref === "string" ? refName(m.$ref) : variantName(m, i);
      const f = toField(r, m, true, depth + 1, seen);
      return { name: r, fields: f.children ?? [] };
    }),
  };
}

/** Inline union members are named by their constant discriminator (`type: "sign_and_send"`), else by position. */
function variantName(m: Json, i: number): string {
  const props = (m.properties ?? {}) as Record<string, Json>;
  for (const [k, v] of Object.entries(props)) if (v.const !== undefined) return `${k}: ${String(v.const)}`;
  const req = (m.required as string[] | undefined) ?? [];
  return req.length ? `with ${req.join(", ")}` : `Option ${i + 1}`;
}

export function schemaFields(name: string): Field[] {
  return schemaRoot(name).children ?? [];
}

/** A named schema as one field: `children` for objects, `variants` for unions (e.g. `Event`). */
export function schemaRoot(name: string): Field {
  const s = schemas[name];
  if (!s) throw new Error(`unknown schema ${name}`);
  return toField(name, s, true, 0, [name]);
}

export function schemaDescription(name: string): string {
  return String(schemas[name]?.description ?? "");
}

/* ------------------------------------------------------------------------------------------ */
/* Operations                                                                                   */
/* ------------------------------------------------------------------------------------------ */

export type Method = "get" | "post" | "patch" | "delete";

export interface Operation {
  id: string;
  method: Method;
  path: string;
  summary: string;
  description?: string;
  group: string;
  auth: string[];
  idempotent: boolean;
  testModeOnly: boolean;
  stage: number;
  stepUp: boolean;
  pathParams: Field[];
  queryParams: Field[];
  /** Header params other than the common `Idempotency-Key` / `NearPay-Version`. */
  headerParams: Field[];
  acceptsIdempotencyKey: boolean;
  body?: { schema?: string; fields: Field[]; required: boolean };
  success: { status: string; description: string; schema?: string; contentType: string };
  errors: { status: string; codes: string[] }[];
  /** Example request body built from required fields (only values the spec gives as examples or defaults). */
  exampleBody?: Record<string, unknown>;
  /** Server-sent event frames (`event:` name → `data:` schema) of a `text/event-stream` route. */
  sseEvents?: { name: string; schema?: string }[];
}

export interface Group {
  slug: string;
  title: string;
  intro: string;
  /** Main object of the group, shown above its endpoints. */
  object?: string;
  guide?: { href: string; label: string };
  match: (path: string) => boolean;
}

/** Presentation grouping of public routes (developer-facing resource names). Order = sidebar order. */
export const GROUPS: readonly Group[] = [
  {
    slug: "checkout-sessions",
    title: "Checkout sessions",
    intro:
      "A checkout session is a hosted or embedded payment page for one payment. Create one on your server, then redirect the customer to its `url` or mount it with `@nearpay-money/js`.",
    object: "CheckoutSession",
    guide: { href: "/checkout", label: "Checkout guide" },
    match: (p) => p.startsWith("/v1/checkout/sessions") && !p.includes("/public") && !p.includes("/agent_pay"),
  },
  {
    slug: "payment-intents",
    title: "Payment intents",
    intro:
      "A payment intent tracks one payment from creation to settlement. Every checkout session has one. Create intents directly for a custom payment UI on the payer API.",
    object: "PaymentIntent",
    guide: { href: "/payment-intents", label: "Payment intents guide" },
    match: (p) => p.startsWith("/v1/payment_intents"),
  },
  {
    slug: "payment-links",
    title: "Payment links",
    intro:
      "A payment link is a reusable URL that opens a new checkout session for every customer. Links are deactivated, never deleted.",
    object: "PaymentLink",
    guide: { href: "/checkout/payment-links", label: "Payment links guide" },
    match: (p) => p.startsWith("/v1/payment_links"),
  },
  {
    slug: "refunds",
    title: "Refunds",
    intro:
      "Refunds return money to the address the payer paid from. NearPay prepares each refund leg; your wallet signs it.",
    object: "Refund",
    guide: { href: "/refunds", label: "Refunds guide" },
    match: (p) => p.startsWith("/v1/refunds"),
  },
  {
    slug: "customers",
    title: "Customers",
    intro:
      "Customers group payments by the person or business paying you. Deleting a customer erases its personal data.",
    object: "Customer",
    guide: { href: "/customers", label: "Customers guide" },
    match: (p) => p.startsWith("/v1/customers"),
  },
  // stage 3 — billing
  {
    slug: "products",
    title: "Products",
    intro:
      "A product is something you sell. Products carry the name shown on invoices; their prices say how much and how often. Archive products with `active: false` — they are never deleted.",
    object: "Product",
    guide: { href: "/billing/invoices", label: "Invoices guide" },
    match: (p) => p.startsWith("/v1/products"),
  },
  {
    slug: "prices",
    title: "Prices",
    intro:
      "A price is a one-time or recurring amount for a product, in a fiat currency (minor units) or an asset (base units). Prices are immutable except `active`, `nickname` and `metadata`: create a new price to change an amount.",
    object: "Price",
    guide: { href: "/billing/subscriptions", label: "Subscriptions guide" },
    match: (p) => p.startsWith("/v1/prices"),
  },
  {
    slug: "tax-rates",
    title: "Tax rates",
    intro:
      "Manual tax rates applied per invoice line: an exact decimal percentage, inclusive or exclusive. Percentage and inclusiveness are immutable; deactivate a rate to retire it.",
    object: "TaxRate",
    guide: { href: "/billing/tax-rates", label: "Tax rates guide" },
    match: (p) => p.startsWith("/v1/tax_rates"),
  },
  {
    slug: "invoices",
    title: "Invoices",
    intro:
      "An invoice bills a customer. Drafts are editable; finalizing assigns a number, a due date, the hosted invoice URL and the PDF. Customers pay on the hosted invoice page — there is no “mark as paid” without a payment.",
    object: "Invoice",
    guide: { href: "/billing/invoices", label: "Invoices guide" },
    match: (p) => p.startsWith("/v1/invoices") && !p.includes("/public"),
  },
  {
    slug: "subscriptions",
    title: "Subscriptions",
    intro:
      "A subscription bills a customer every period with an emailed invoice (`collection_method: send_invoice`). Changes apply from the next renewal; there is no proration.",
    object: "Subscription",
    guide: { href: "/billing/subscriptions", label: "Subscriptions guide" },
    match: (p) => p.startsWith("/v1/subscriptions"),
  },
  {
    slug: "settlement-destinations",
    title: "Settlement destinations",
    intro:
      "Where payments settle: an asset on a network and your wallet address or NEAR Intents account. Read them with an API key; create and change them in the dashboard (passkey, cooling-off period and approvals).",
    object: "SettlementDestination",
    guide: { href: "/settlement-destinations", label: "Settlement destinations guide" },
    match: (p) => p.startsWith("/v1/settlement_destinations"),
  },
  {
    slug: "balance-transactions",
    title: "Balance transactions",
    intro:
      "Statement lines for reconciliation: what was paid, what settled at your destination, fees and refunds. They describe settlements to your wallet, not a NearPay-held balance.",
    object: "BalanceTransaction",
    match: (p) => p.startsWith("/v1/balance_transactions"),
  },
  {
    slug: "webhook-endpoints",
    title: "Webhook endpoints",
    intro:
      "Endpoints receive signed events over HTTPS. Manage subscriptions, rotate secrets, send test events and read the delivery log.",
    object: "WebhookEndpoint",
    guide: { href: "/webhooks", label: "Webhooks guide" },
    match: (p) => p.startsWith("/v1/webhook_endpoints") || p.startsWith("/v1/webhook_signing_keys"),
  },
  {
    slug: "events",
    title: "Events",
    intro:
      "Events record changes to your objects for 30 days. Every webhook delivery carries one event. Resend an event to one or all endpoints.",
    object: "Event",
    guide: { href: "/webhooks/events", label: "Event types" },
    match: (p) => p.startsWith("/v1/events"),
  },
  {
    slug: "payer-api",
    title: "Payer API",
    intro:
      "Routes the checkout (and `@nearpay-money/js` custom UIs) call on behalf of the payer, authorised by the session’s client secret in `X-NearPay-Client-Secret`. Never send a secret key from a browser.",
    object: "PublicCheckoutSession",
    match: (p) => p.startsWith("/v1/checkout/sessions/{id}/public"),
  },
  {
    slug: "hosted-invoices",
    title: "Hosted invoice API",
    intro:
      "Routes the hosted invoice page (and paying agents) call on behalf of the customer, authorised by the invoice secret from the hosted URL fragment in `X-NearPay-Invoice-Secret`. Payment continues on the payer API with the returned checkout session.",
    object: "PublicInvoice",
    guide: { href: "/billing/invoices#the-hosted-invoice-page", label: "Hosted invoice page" },
    match: (p) => p.startsWith("/v1/invoices/{id}/public"),
  },
  {
    slug: "agent-payments",
    title: "Agent payments",
    intro: "Payments made by AI agents: x402 payments to your API and agent payments of checkout sessions.",
    object: "AgentPayment",
    guide: { href: "/agents", label: "Agent payments guide" },
    match: (p) => p.startsWith("/v1/agent_payments") || p.includes("/agent_pay"),
  },
  {
    slug: "x402",
    title: "x402 facilitator",
    intro:
      "NearPay as an x402 facilitator for the `exact` scheme: `intents-transfer` from a NEAR Intents account, and cross-chain `near-intents` deposits from other chains. Issue payment requirements, verify payloads and settle them. `@nearpay-money/x402` calls these for you.",
    guide: { href: "/agents", label: "Agent payments guide" },
    match: (p) => p.startsWith("/x402/"),
  },
  {
    slug: "assets",
    title: "Assets",
    intro: "Assets and networks NearPay can accept and settle.",
    object: "Asset",
    match: (p) => p.startsWith("/v1/assets"),
  },
  {
    slug: "attestations",
    title: "Deposit attestations",
    intro:
      "Independent co-signatures over deposit instructions. Checkout and `@nearpay-money/agent-signer` verify them against pinned keys before showing an address or signing.",
    match: (p) => p.startsWith("/v1/attestations"),
  },
  {
    slug: "cli-login",
    title: "CLI login",
    intro:
      "Device authorization for `nearpay login`: the CLI starts a login, a team member approves it in the dashboard, and the CLI receives a restricted test-mode key. `@nearpay-money/cli` calls these for you.",
    object: "CliLogin",
    guide: { href: "/cli", label: "CLI guide" },
    match: (p) => p.startsWith("/v1/cli/"),
  },
  {
    slug: "test-helpers",
    title: "Test helpers",
    intro: "Test-mode-only routes that drive the sandbox rail step by step. They refuse live-mode keys.",
    guide: { href: "/test-mode", label: "Test mode guide" },
    match: (p) => p.startsWith("/v1/test_helpers"),
  },
];

/**
 * Public developer routes: callable with an API key or a client secret, or anonymous routes outside
 * dashboard sign-in. Dashboard-session-only routes (`/v1/auth/*`, account, team, API keys,
 * settlement-destination management) are excluded — they are the dashboard's own API.
 */
/**
 * Stage 4 auto-debit (mandates, spec ≥ 0.4.0) is not documented on the site yet: the billing guides say auto-debit
 * is "not available yet" (lld/sdks-and-tools.md), so its routes stay out of the reference until it ships.
 */
export function isUndocumentedRoute(path: string): boolean {
  return (
    path.startsWith("/v1/mandates") || path.startsWith("/v1/test_helpers/mandates") || /\/public\/mandate/.test(path)
  );
}

export function isDeveloperRoute(path: string, auth: string[]): boolean {
  if (path.startsWith("/v1/auth/")) return false;
  if (isUndocumentedRoute(path)) return false;
  return auth.some((a) => a !== "session");
}

const METHODS: Method[] = ["get", "post", "patch", "delete"];
const COMMON_HEADERS = new Set(["Idempotency-Key", "NearPay-Version"]);

function paramField(p: Json): Field {
  const schema = (p.schema ?? {}) as Json;
  const f = toField(
    String(p.name),
    { ...schema, description: p.description ?? schema.description },
    Boolean(p.required),
  );
  if (p.style === "deepObject") f.type = "map of string";
  return f;
}

function exampleValue(s: Json, depth = 0): unknown {
  const { schema } = deref(s);
  if (Array.isArray(schema.examples) && schema.examples.length > 0) return schema.examples[0];
  if (schema.default !== undefined) return schema.default;
  if (schema.const !== undefined) return schema.const;
  if (Array.isArray(schema.enum)) return schema.enum[0];
  if (Array.isArray(schema.anyOf)) {
    const first = (schema.anyOf as Json[]).find((m) => !isNullSchema(m));
    return first ? exampleValue(first, depth) : null;
  }
  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== "null") : schema.type;
  if (type === "object" && schema.properties && depth < 3) return exampleObject(schema, depth + 1);
  if (type === "array") return [];
  if (type === "integer" || type === "number") {
    return typeof schema.minimum === "number" && schema.minimum > 0 ? schema.minimum : 1000;
  }
  if (type === "boolean") return false;
  if (schema.format === "uri") return "https://example.com";
  if (schema.pattern === BASE_UNITS) return "1000000";
  return "…";
}

function exampleObject(schema: Json, depth = 0): Record<string, unknown> {
  const props = (schema.properties ?? {}) as Record<string, Json>;
  const req = (schema.required as string[] | undefined) ?? [];
  return Object.fromEntries(req.map((k) => [k, exampleValue(props[k] ?? {}, depth)]));
}

function buildOperations(): Operation[] {
  const ops: Operation[] = [];
  for (const [path, item] of Object.entries(openapi.paths as Record<string, Json>)) {
    for (const method of METHODS) {
      const o = item[method] as Json | undefined;
      if (!o) continue;
      const x = (o["x-nearpay"] ?? {}) as Json;
      const auth = (x.auth as string[] | undefined) ?? [];
      if (!isDeveloperRoute(path, auth)) continue;
      const group = GROUPS.find((g) => g.match(path));
      if (!group) throw new Error(`no reference group for ${method.toUpperCase()} ${path}`);
      const params = ((o.parameters ?? []) as Json[]).map((p) => ({ p, f: paramField(p) }));
      const responses = (o.responses ?? {}) as Record<string, Json>;
      const successCode = Object.keys(responses).find((c) => c.startsWith("2")) ?? "200";
      const success = responses[successCode] ?? {};
      const content = (success.content ?? {}) as Record<string, Json>;
      const contentType = Object.keys(content)[0] ?? "application/json";
      const successSchema = (content[contentType]?.schema ?? {}) as Json;
      const bodyRef = ((
        ((o.requestBody as Json | undefined)?.content as Json | undefined)?.["application/json"] as Json | undefined
      )?.schema ?? {}) as Json;
      const bodyName = typeof bodyRef.$ref === "string" ? refName(bodyRef.$ref) : undefined;
      const op: Operation = {
        id: String(o.operationId),
        method,
        path,
        summary: String(o.summary ?? o.operationId),
        description: typeof o.description === "string" ? o.description : undefined,
        group: group.slug,
        auth,
        idempotent: Boolean(x.idempotent),
        testModeOnly: Boolean(x.test_mode_only),
        stage: Number(x.stage ?? 1),
        stepUp: Boolean(x.step_up),
        pathParams: params.filter(({ p }) => p.in === "path").map(({ f }) => f),
        queryParams: params.filter(({ p }) => p.in === "query").map(({ f }) => f),
        headerParams: params
          .filter(({ p }) => p.in === "header" && !COMMON_HEADERS.has(String(p.name)))
          .map(({ f }) => f),
        acceptsIdempotencyKey: params.some(({ p }) => p.name === "Idempotency-Key"),
        success: {
          status: successCode,
          description: String(success.description ?? ""),
          schema: typeof successSchema.$ref === "string" ? refName(successSchema.$ref) : undefined,
          contentType,
        },
        sseEvents: Array.isArray(success["x-sse-events"])
          ? (success["x-sse-events"] as string[]).map((name, i) => {
              const member = ((successSchema.anyOf as Json[] | undefined) ?? [])[i];
              return { name, schema: typeof member?.$ref === "string" ? refName(member.$ref) : undefined };
            })
          : undefined,
        errors: Object.entries(responses)
          .filter(([code, r]) => code !== "default" && Array.isArray(r["x-error-codes"]))
          .map(([status, r]) => ({ status, codes: r["x-error-codes"] as string[] })),
      };
      if (o.requestBody) {
        const resolved = bodyName ? (schemas[bodyName] as Json) : bodyRef;
        op.body = {
          schema: bodyName,
          fields: bodyName ? schemaFields(bodyName) : (toField("body", bodyRef, true).children ?? []),
          required: Boolean((o.requestBody as Json).required),
        };
        op.exampleBody = exampleObject(resolved);
      }
      ops.push(op);
    }
  }
  const groupIndex = (slug: string) => GROUPS.findIndex((g) => g.slug === slug);
  const methodIndex = (m: Method) => ["post", "get", "patch", "delete"].indexOf(m);
  return ops.sort(
    (a, b) =>
      groupIndex(a.group) - groupIndex(b.group) ||
      a.path.split("/").length - b.path.split("/").length ||
      a.path.localeCompare(b.path) ||
      methodIndex(a.method) - methodIndex(b.method),
  );
}

export const OPERATIONS: readonly Operation[] = buildOperations();

export function operationsOf(group: string): Operation[] {
  return OPERATIONS.filter((o) => o.group === group);
}

/** Generic error codes every route can return (the `default` response). */
export const GENERIC_ERROR_CODES: readonly string[] = ERRORS.filter((e) => e.generic).map((e) => e.code);

/** Routes that document a given error code (for the error pages). */
export function operationsReturning(code: string): Operation[] {
  return OPERATIONS.filter((o) => o.errors.some((e) => e.codes.includes(code)));
}

/** Human-readable authentication requirement of an operation. */
export function authLabel(auth: string[]): string[] {
  const out: string[] = [];
  if (auth.includes("secret_key")) out.push("Secret key (`sk_…`)");
  const scopes = auth.filter((a) => a.startsWith("restricted_key:")).map((a) => a.split(":")[1]);
  if (scopes.length) out.push(`Restricted key (\`rk_…\`) with \`${scopes.join("`, `")}\``);
  if (auth.includes("client_secret")) out.push("Client secret (`X-NearPay-Client-Secret`)");
  if (auth.includes("anonymous")) out.push("None (public)");
  if (auth.includes("session")) out.push("Dashboard session");
  return out;
}

/** Example `curl` for an operation, using placeholder ids from the spec's examples. */
export function curlExample(op: Operation): string {
  let path = op.path;
  for (const p of op.pathParams) path = path.replace(`{${p.name}}`, exampleId(op, p.name));
  const lines = [`curl ${op.method === "get" ? "" : `-X ${op.method.toUpperCase()} `}${API_BASE_URL}${path}`];
  if (op.auth.includes("secret_key") || op.auth.some((a) => a.startsWith("restricted_key"))) {
    lines.push(`  -H "Authorization: Bearer $NEARPAY_SECRET_KEY"`);
  } else if (op.auth.includes("client_secret")) {
    lines.push(`  -H "X-NearPay-Client-Secret: $CLIENT_SECRET"`);
  }
  // required route headers (the invoice secret); the client secret is covered by the auth line above
  for (const h of op.headerParams.filter((x) => x.required && x.name.toLowerCase() !== "x-nearpay-client-secret")) {
    lines.push(
      `  -H "${canonicalHeader(h.name)}: $${h.name
        .replace(/^x-nearpay-/, "")
        .replace(/-/g, "_")
        .toUpperCase()}"`,
    );
  }
  if (op.success.contentType === "text/event-stream") lines.push(`  -H "Accept: text/event-stream" -N`);
  if (op.acceptsIdempotencyKey) lines.push(`  -H "Idempotency-Key: $(uuidgen)"`);
  if (op.body) {
    lines.push(`  -H "Content-Type: application/json"`);
    const body = JSON.stringify(op.exampleBody ?? {}, null, 2).replace(/'/g, "'\\''");
    lines.push(`  -d '${body}'`);
  }
  if (op.success.contentType === "application/pdf") lines.push("  -o invoice.pdf");
  return lines.join(" \\\n");
}

/** `x-nearpay-invoice-secret` → `X-NearPay-Invoice-Secret` (header names are case-insensitive). */
export function canonicalHeader(name: string): string {
  return name
    .split("-")
    .map((w) => (w === "nearpay" ? "NearPay" : w.charAt(0).toUpperCase() + w.slice(1)))
    .join("-");
}

function exampleId(op: Operation, name: string): string {
  const p = op.pathParams.find((x) => x.name === name);
  const m = p?.type.match(/\(([a-z0-9]+)_…\)/);
  return m ? `${m[1]}_01jbz9k3m4n5p6q7r8s9t0v1w2` : `{${name}}`;
}
