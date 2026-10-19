// npm run db:seed: add catalog entries missing from the database at DATABASE_URL.
import { config } from "dotenv";
import { getDb } from "@/db";
import { seedCatalog } from "./seed";

config({ path: ".env.local", quiet: true });

seedCatalog(getDb()).then((added) => {
  console.log("Added:", added);
  process.exit(0);
});
