import { execFileSync } from "node:child_process";
import postgres from "postgres";

/** Fresh database for every run: migrate, wipe, then load the 44 house recipes. */
export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL!;
  const env = { ...process.env, DATABASE_URL: url };
  execFileSync("node", ["scripts/migrate.mjs"], { env, stdio: "inherit" });

  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await sql`truncate table recipe_translations, recipes, session, account, verification, "user" cascade`;
  } finally {
    await sql.end();
  }

  execFileSync("node", ["scripts/seed.mjs"], { env, stdio: "inherit" });
}
