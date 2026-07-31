import { db } from "../lib/db";
import { SCHEMA_SQL } from "../lib/schema";

async function run() {
  console.log("Applying schema updates...");
  
  // Extract just the password_history part for manual execution since Prisma/SQLite alter can be tricky, 
  // but CREATE TABLE IF NOT EXISTS is safe to run as part of the full schema
  const statements = SCHEMA_SQL.split(";").filter(s => s.trim().length > 0);
  for (const stmt of statements) {
    if (stmt.includes("password_history")) {
      await db.execute(stmt);
      console.log("password_history table created.");
    }
  }
}

run().catch(console.error);
