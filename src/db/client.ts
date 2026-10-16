import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as appSchema from "./schema";
import * as authSchema from "./auth-schema";

export const schema = { ...appSchema, ...authSchema };

export type Database = PostgresJsDatabase<typeof schema>;

/** A Drizzle client for a connection URL. The app uses src/db; tests and scripts call this directly. */
export function createDb(url: string, options: { max?: number } = {}): { db: Database; close: () => Promise<void> } {
  const client = postgres(url, { max: options.max ?? 10 });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}
