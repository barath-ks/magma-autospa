import { createClient } from "@libsql/client";
import { config } from "dotenv";

config({ path: ".env.local" });

async function migrate() {
  const db = createClient({ url: "file:local.db" });
  try {
    console.log("Backfilling branch_id for service_offers...");
    await db.execute("UPDATE service_offers SET branch_id = 'branch-1' WHERE branch_id IS NULL");
    
    console.log("Backfilling branch_id for combos...");
    await db.execute("UPDATE combos SET branch_id = 'branch-1' WHERE branch_id IS NULL");
    
    console.log("Migration complete.");
  } catch (e: any) {
    console.error(e);
  } finally {
    db.close();
  }
}
migrate();
