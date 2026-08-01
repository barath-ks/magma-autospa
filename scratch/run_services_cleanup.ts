import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const db = createClient({
  url: process.env.LIBSQL_URL || "file:local.db",
});

async function main() {
  console.log("=== Running Services Cleanup ===");

  // Hard delete both Old Wash records
  await db.execute({
    sql: `DELETE FROM services WHERE name = 'Old Wash'`
  });
  console.log("✅ Hard-deleted 'Old Wash' (2 rows).");

  // Soft-delete lesser-used Wash (ID: 20781896-5dec-4814-be42-f168381f1487)
  await db.execute({
    sql: `UPDATE services SET is_active = 0 WHERE id = '20781896-5dec-4814-be42-f168381f1487'`
  });
  console.log("✅ Soft-deleted lesser-used 'Wash'.");

  // Soft-delete lesser-used Wax (ID: b51d249a-980a-43ea-a593-dd5173a24fdb)
  await db.execute({
    sql: `UPDATE services SET is_active = 0 WHERE id = 'b51d249a-980a-43ea-a593-dd5173a24fdb'`
  });
  console.log("✅ Soft-deleted lesser-used 'Wax'.");

  console.log("\\n=== Verification ===");

  // Check active services count and names
  const activeRes = await db.execute("SELECT name FROM services WHERE is_active = 1");
  console.log(`Active services count: ${activeRes.rows.length}`);
  console.log("Active service names:");
  activeRes.rows.forEach(r => console.log(`- ${r.name}`));

  // Check for duplicates
  const dupRes = await db.execute(`
    SELECT name, COUNT(*) as count 
    FROM services 
    WHERE is_active = 1 
    GROUP BY name 
    HAVING count > 1
  `);
  if (dupRes.rows.length === 0) {
    console.log("✅ Zero duplicates among active services.");
  } else {
    console.log("❌ Found active duplicates:", dupRes.rows);
  }

  // Check for orphans in transaction_services
  const orphanRes = await db.execute(`
    SELECT COUNT(*) as count
    FROM transaction_services
    WHERE service_id NOT IN (SELECT id FROM services)
  `);
  console.log(`Orphaned rows in transaction_services: ${orphanRes.rows[0].count}`);
  if (orphanRes.rows[0].count === 0) {
    console.log("✅ Zero orphaned rows after hard-deletes.");
  } else {
    console.log("❌ Found orphaned rows!");
  }
}

main().catch(console.error);
