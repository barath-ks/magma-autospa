import { db } from "../lib/db";

async function run() {
  console.log("Migrating Catalog tables (services & offers)...");
  
  try {
    await db.execute("ALTER TABLE services ADD COLUMN description TEXT DEFAULT ''");
    await db.execute("ALTER TABLE services ADD COLUMN is_active BOOLEAN DEFAULT 1");
    console.log("Added description and is_active to services.");
  } catch (e: any) {
    if (e.message.includes("duplicate column name")) {
      console.log("services columns already exist.");
    } else {
      console.error(e);
    }
  }

  try {
    await db.execute("ALTER TABLE offers ADD COLUMN description TEXT DEFAULT ''");
    await db.execute("ALTER TABLE offers ADD COLUMN is_active BOOLEAN DEFAULT 1");
    console.log("Added description and is_active to offers.");
  } catch (e: any) {
    if (e.message.includes("duplicate column name")) {
      console.log("offers columns already exist.");
    } else {
      console.error(e);
    }
  }

  console.log("Migration complete.");
}

run().catch(console.error);
