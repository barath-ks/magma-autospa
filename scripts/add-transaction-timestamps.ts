import { db } from "../lib/db";

async function run() {
  try {
    console.log("Adding 'claimed_at' and 'finished_at' columns to 'transactions' table...");
    
    try {
      await db.execute(`ALTER TABLE transactions ADD COLUMN claimed_at DATETIME`);
      console.log("Successfully added 'claimed_at' column.");
    } catch (err: any) {
      if (err.message.includes("duplicate column name")) {
        console.log("Column 'claimed_at' already exists.");
      } else {
        throw err;
      }
    }

    try {
      await db.execute(`ALTER TABLE transactions ADD COLUMN finished_at DATETIME`);
      console.log("Successfully added 'finished_at' column.");
    } catch (err: any) {
      if (err.message.includes("duplicate column name")) {
        console.log("Column 'finished_at' already exists.");
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
