import { db } from "../lib/db";

async function run() {
  try {
    console.log("Adding 'status' and 'staff_id' columns to 'transactions' table...");
    
    try {
      await db.execute(`ALTER TABLE transactions ADD COLUMN status TEXT CHECK(status IN ('pending', 'in_progress', 'finished')) DEFAULT 'pending'`);
      console.log("Successfully added 'status' column.");
    } catch (err: any) {
      if (err.message.includes("duplicate column name")) {
        console.log("Column 'status' already exists.");
      } else {
        throw err;
      }
    }

    try {
      await db.execute(`ALTER TABLE transactions ADD COLUMN staff_id TEXT REFERENCES users(id) ON DELETE SET NULL`);
      console.log("Successfully added 'staff_id' column.");
    } catch (err: any) {
      if (err.message.includes("duplicate column name")) {
        console.log("Column 'staff_id' already exists.");
      } else {
        throw err;
      }
    }

    console.log("Migration complete.");
  } catch (err) {
    console.error("Error migrating db:", err);
  }
}

run();
