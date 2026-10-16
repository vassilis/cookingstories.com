import "server-only";
import { createDb, schema, type Database } from "./client";

export { schema };
export type { Database };

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { db?: Database };

/** Lazily connects so importing this module never needs a database (e.g. during `next build`). */
export function db(): Database {
  if (!globalForDb.db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalForDb.db = createDb(url).db;
  }
  return globalForDb.db;
}
