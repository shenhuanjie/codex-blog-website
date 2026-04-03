import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.POSTGRES_URL;

export function isDatabaseConfigured(): boolean {
  return Boolean(connectionString);
}

const sql = connectionString
  ? postgres(connectionString, {
      prepare: false,
      max: 1,
      // Suppress repeated "already exists" notices from idempotent setup SQL.
      onnotice: () => {},
    })
  : null;

export const db = sql ? drizzle(sql) : null;
export { sql };
