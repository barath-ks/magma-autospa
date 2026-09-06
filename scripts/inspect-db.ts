import { db } from "../lib/db";

async function main() {
  const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log("Tables:", tables.rows.map(r => r.name));

  const offersCols = await db.execute("PRAGMA table_info(offers)");
  console.log("Offers columns:", offersCols.rows);
}

main().catch(console.error);
