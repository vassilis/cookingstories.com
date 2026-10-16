import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Cookie, type Page } from "@playwright/test";
import postgres from "postgres";

/** Becomes an admin on first sign-in (ADMIN_EMAILS in playwright.config.ts). */
export const ADMIN_EMAIL = "e2e-admin@cookingstories.test";
export const READER_EMAIL = "e2e-reader@cookingstories.test";

export function e2eSql() {
  return postgres(process.env.E2E_DATABASE_URL!, { max: 1, onnotice: () => {} });
}

/**
 * Signs in through the real magic-link form. The e2e server runs with EMAIL_DELIVERY=log,
 * so instead of reading an inbox we take the one-time token Better Auth stored for this email.
 */
export async function signIn(page: Page, email: string) {
  const saved = join(SESSIONS_DIR, `${email}.json`);
  if (existsSync(saved)) {
    await page.context().addCookies(JSON.parse(readFileSync(saved, "utf8")) as Cookie[]);
    await page.goto("/");
    return;
  }

  // Better Auth allows five magic links per minute from one address. Sessions are reused
  // below, but if the limit is hit anyway, wait for the window to pass and try again.
  test.info().setTimeout(test.info().timeout + 75_000);
  await expect(async () => {
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: "Email me a link" }).click();
    await expect(page.getByRole("status")).toContainText("Check your inbox", { timeout: 3000 });
  }).toPass({ intervals: [20_000], timeout: 75_000 });

  const sql = e2eSql();
  try {
    const [row] = await sql<{ identifier: string }[]>`
      select identifier from verification
      where identifier like 'magic-link:%' and value::jsonb ->> 'email' = ${email}
      order by created_at desc limit 1`;
    const token = row.identifier.replace("magic-link:", "");
    await page.goto(`/api/auth/magic-link/verify?token=${token}&callbackURL=%2F`);
  } finally {
    await sql.end();
  }
  await expect(page).toHaveURL(/\/$/);
  mkdirSync(SESSIONS_DIR, { recursive: true });
  writeFileSync(saved, JSON.stringify(await page.context().cookies()));
}

/** Session cookies per email, so each reader signs in once per run. Cleared by global setup. */
export const SESSIONS_DIR = join(process.cwd(), ".playwright", "sessions");
