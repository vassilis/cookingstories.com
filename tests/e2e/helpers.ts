import { expect, type Page } from "@playwright/test";
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
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a link" }).click();
  await expect(page.getByRole("status")).toContainText("Check your inbox");

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
}
