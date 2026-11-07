import { defineConfig } from "@playwright/test";

// E2E against the built sites (pnpm build first), served with the production CSP header by
// scripts/serve.mjs. System Chrome; no browser downloads.
export const WEB = "http://127.0.0.1:4420";
export const DOCS = "http://127.0.0.1:4421";

export default defineConfig({
  testDir: "test/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 7_000 },
  reporter: [["list"]],
  use: {
    launchOptions: { executablePath: process.env.NP_CHROME_PATH ?? "/usr/bin/google-chrome" },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/serve.mjs --web 4420 --docs 4421",
    url: `${DOCS}/`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
