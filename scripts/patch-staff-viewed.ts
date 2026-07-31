import { db } from "../lib/db";

async function run() {
  console.log("Adding staff_viewed column to shift_requests table...");
  try {
    await db.execute("ALTER TABLE shift_requests ADD COLUMN staff_viewed BOOLEAN DEFAULT 0;");
    console.log("Success! Column added.");
  } catch (e: any) {
    if (e.message.includes("duplicate column name")) {
      console.log("Column already exists. Skipping.");
    } else {
      console.error("Error migrating table:", e);
    }
  }
}

run();
