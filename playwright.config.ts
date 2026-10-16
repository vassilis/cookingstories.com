import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Locally, E2E_DATABASE_URL lives in .env.local; CI sets it directly.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
const databaseUrl = process.env.E2E_DATABASE_URL;
if (!databaseUrl) throw new Error("E2E_DATABASE_URL is not set (a throwaway database; it gets reset).");

// Keep in sync with ADMIN_EMAIL in tests/e2e/helpers.ts.
const ADMIN_EMAIL = "e2e-admin@cookingstories.test";

/*
 * End-to-end tests run against a production build (`next build` + `next start`) on port 3100,
 * so they don't clash with `pnpm dev` on 3000. Set E2E_REUSE_BUILD=1 to skip rebuilding.
 */
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.E2E_REUSE_BUILD ? `pnpm start -p ${PORT}` : `pnpm build && pnpm start -p ${PORT}`,
    url: `${baseURL}/api/auth/ok`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: databaseUrl,
      BETTER_AUTH_URL: baseURL,
      BETTER_AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-0123456789",
      BREVO_API_KEY: "not-used-in-e2e",
      EMAIL_FROM: "e2e@cookingstories.test",
      EMAIL_DELIVERY: "log",
      ADMIN_EMAILS: ADMIN_EMAIL,
    },
  },
});
