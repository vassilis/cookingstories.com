// Applies pending SQL migrations from ./drizzle. Runs on container start before the server.
// Plain JS so it works in the production image without TypeScript tooling.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "..", "drizzle");
const client = postgres(url, { max: 1, onnotice: () => {} });

try {
  await migrate(drizzle(client), { migrationsFolder });
  console.log("Migrations applied");
} finally {
  await client.end();
}
