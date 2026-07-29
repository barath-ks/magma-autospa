import { db } from "../lib/db";

async function run() {
  try {
    console.log("Adding 'name' column to 'users' table...");
    await db.execute(`ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT 'Unknown User'`);
    console.log("Successfully added 'name' column.");
  } catch (err: any) {
    if (err.message.includes("duplicate column name")) {
      console.log("Column 'name' already exists.");
    } else {
      console.error("Error migrating db:", err);
    }
  }
}

run();
