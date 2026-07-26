import { db } from "../lib/db";
import { SCHEMA_SQL } from "../lib/schema";

async function main() {
  console.log("Initializing database schema...");
  try {
    await db.executeMultiple(SCHEMA_SQL);
    console.log("Database schema initialized successfully.");
  } catch (err) {
    console.error("Error initializing schema:", err);
  }
}

main();
