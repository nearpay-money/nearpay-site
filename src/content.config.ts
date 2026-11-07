import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/** Hand-written docs guides (Markdown). The API reference and error pages are rendered from @nearpay/spec. */
const docs = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** URL path on the docs site, without a leading slash (e.g. `checkout/embedded`). */
    slug: z.string(),
    eyebrow: z.string().optional(),
  }),
});

export const collections = { docs };
