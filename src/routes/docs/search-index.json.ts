/** Static search index for the docs (guides, API operations and groups, error codes, event types). */

import { getCollection } from "astro:content";
import { WEBHOOK_TYPE_NAMES } from "@nearpay/spec";
import type { SearchDoc } from "../../lib/search";
import { ERRORS, GROUPS, OPERATIONS } from "../../lib/spec";

export async function GET(): Promise<Response> {
  const guides = await getCollection("docs");
  const docs: SearchDoc[] = [
    ...guides.map((g) => ({
      title: g.data.title,
      href: `/${g.data.slug}`,
      section: "Guide",
      text: g.data.description,
      keywords: (g.body ?? "").match(/^#{2,3} .+$/gm)?.join(" ") ?? "",
    })),
    ...GROUPS.map((g) => ({
      title: g.title,
      href: `/api/${g.slug}`,
      section: "API reference",
      text: g.intro.replace(/`/g, ""),
      keywords: `${g.object ?? ""} ${g.slug}`,
    })),
    ...OPERATIONS.map((o) => ({
      title: o.summary,
      href: `/api/${o.group}#${o.id}`,
      section: `${o.method.toUpperCase()} ${o.path}`,
      text: (o.description ?? o.summary).replace(/`/g, "").slice(0, 160),
      keywords: `${o.id} ${o.path} ${o.method}`,
    })),
    ...ERRORS.map((e) => ({
      title: e.code,
      href: `/errors/${e.code}`,
      section: `Error · ${e.status}`,
      text: e.example,
      keywords: e.type,
    })),
    {
      title: "Event types",
      href: "/webhooks/events",
      section: "Webhooks",
      text: "Every event NearPay sends to webhook endpoints.",
      keywords: WEBHOOK_TYPE_NAMES.join(" "),
    },
  ];
  return new Response(JSON.stringify(docs), { headers: { "Content-Type": "application/json; charset=utf-8" } });
}
