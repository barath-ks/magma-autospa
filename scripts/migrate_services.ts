import { db } from "../lib/db";

async function run() {
  console.log("Starting services migration...");
  
  try {
    // 1. Add columns (ignore if already exist)
    try {
      await db.execute("ALTER TABLE services ADD COLUMN duration_minutes INTEGER;");
      console.log("Added column: duration_minutes");
    } catch (e: any) {
      if (e.message.includes("duplicate column name")) console.log("Column 'duration_minutes' already exists.");
      else throw e;
    }

    try {
      await db.execute("ALTER TABLE services ADD COLUMN category TEXT;");
      console.log("Added column: category");
    } catch (e: any) {
      if (e.message.includes("duplicate column name")) console.log("Column 'category' already exists.");
      else throw e;
    }

    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

run();
