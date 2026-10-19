import { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";
import * as schema from "./schema";

// Any Drizzle Postgres database with this schema: the app and scripts use postgres-js against
// Supabase, tests use an in-memory PGlite.
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export const dbOptions = { schema, casing: "snake_case" } as const;

// Kept on globalThis because `next dev` re-runs this module on every code change; a module-level
// variable would open a new pool each time, and Supabase's session pooler allows only 15
// connections in all.
const cache = globalThis as unknown as { biomarkerDb?: Db };

// DATABASE_URL comes from .env.local: Supabase → Connect → Session pooler connection string.
export function getDb(): Db {
  if (!cache.biomarkerDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
    // prepare: false keeps it working through Supabase's transaction pooler too. A few
    // connections is plenty for one person's app and leaves room for scripts and migrations.
    cache.biomarkerDb = drizzle(postgres(url, { prepare: false, max: 5 }), dbOptions);
  }
  return cache.biomarkerDb;
}
