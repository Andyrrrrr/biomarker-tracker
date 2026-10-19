import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { dbOptions, type Db } from "@/db";
import { seedCatalog } from "@/db/seed/seed";

// A fresh in-memory Postgres with the real migrations and catalog.
export async function testDb(): Promise<Db> {
  const db = drizzle(new PGlite(), dbOptions);
  await migrate(db, { migrationsFolder: "drizzle" });
  await seedCatalog(db as unknown as Db);
  return db as unknown as Db;
}
