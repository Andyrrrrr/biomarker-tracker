import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as schema from "./schema";

// With Supabase's Data API on, its public key can read and write any table in `public` that has
// row-level security off. The API is turned off (README), but RLS is the second lock: the app
// reads through Drizzle and never adds policies, so every table needs .enableRLS().
describe("schema", () => {
  const tables = Object.values(schema as Record<string, unknown>).filter((v): v is PgTable => is(v, PgTable));

  it("finds the tables", () => {
    expect(tables.length).toBeGreaterThan(0);
  });

  it.each(tables.map((t) => [getTableConfig(t).name, t] as const))("%s has row-level security on", (_, table) => {
    expect(getTableConfig(table).enableRLS).toBe(true);
  });
});
