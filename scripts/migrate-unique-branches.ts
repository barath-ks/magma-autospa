import { db } from "../lib/db";

async function run() {
  console.log("Adding UNIQUE constraint to branches.name...");
  try {
    // In SQLite, the best way to add uniqueness to an existing column is via a UNIQUE INDEX
    await db.execute({ sql: "CREATE UNIQUE INDEX IF NOT EXISTS idx_branches_name ON branches(name)", args: [] });
    console.log("Migration complete: idx_branches_name created successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

run();
