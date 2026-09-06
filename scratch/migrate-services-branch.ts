import { createClient } from "@libsql/client";
import { config } from "dotenv";

config({ path: ".env.local" });

async function migrate() {
  const db = createClient({ url: "file:local.db" });
  try {
    console.log("Adding branch_id column to services...");
    await db.execute("ALTER TABLE services ADD COLUMN branch_id TEXT REFERENCES branches(id) ON DELETE CASCADE");
    
    console.log("Backfilling branch_id for existing services...");
    await db.execute("UPDATE services SET branch_id = 'branch-1' WHERE branch_id IS NULL");
    
    console.log("Migration complete.");
  } catch (e: any) {
    if (e.message.includes("duplicate column name")) {
      console.log("Column already exists.");
      await db.execute("UPDATE services SET branch_id = 'branch-1' WHERE branch_id IS NULL");
    } else {
      console.error(e);
    }
  } finally {
    db.close();
  }
}
migrate();
