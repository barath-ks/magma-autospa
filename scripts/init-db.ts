import "dotenv/config";
import { db } from "../lib/db";
import { SCHEMA_SQL } from "../lib/schema";

async function main() {
  console.log("Initializing database schema...");

  // pg does not have executeMultiple — split on semicolons and run each statement
  const statements = SCHEMA_SQL
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const client = await db.connect();
  try {
    for (const sql of statements) {
      await client.query(sql);
    }
    console.log(`Database schema initialized successfully (${statements.length} statements).`);
  } catch (err) {
    console.error("Error initializing schema:", err);
    process.exit(1);
  } finally {
    client.release();
    await db.end();
  }
}

main();
