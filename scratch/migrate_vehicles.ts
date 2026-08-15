import { createClient } from "@libsql/client";
import { v4 as uuidv4 } from "uuid";
import { SCHEMA_SQL } from "../lib/schema";

async function runMigration() {
  console.log("=== STARTING VEHICLE MIGRATION ===");
  const db = createClient({ url: "file:local.db" });

  try {
    // 1. Ensure the schema is applied (creates vehicles table if it doesn't exist)
    console.log("Applying schema...");
    const statements = SCHEMA_SQL.split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      if (stmt.includes("CREATE TABLE IF NOT EXISTS vehicles")) {
          await db.execute(stmt);
      }
    }
    
    // Check if vehicle_id exists in transactions
    try {
        await db.execute("ALTER TABLE transactions ADD COLUMN vehicle_id TEXT REFERENCES vehicles(id) ON DELETE RESTRICT");
        console.log("Added vehicle_id column to transactions");
    } catch (err: any) {
        if (err.message && err.message.includes("duplicate column name")) {
             console.log("vehicle_id column already exists in transactions");
        } else {
             console.log("Error adding vehicle_id (maybe it already exists or sqlite constraint issue):", err.message);
        }
    }

    // 2. Fetch all customers that have a vehicle_number
    const customersRes = await db.execute("SELECT id, vehicle_number, vehicle_model FROM customers WHERE vehicle_number IS NOT NULL AND vehicle_number != ''");
    console.log(`Found ${customersRes.rows.length} customers with vehicles to migrate.`);

    // 3. Migrate each
    for (const customer of customersRes.rows) {
      const vNum = (customer.vehicle_number as string).toUpperCase().trim();
      
      // Check if vehicle already exists (handle reruns)
      const existingRes = await db.execute({
        sql: "SELECT id FROM vehicles WHERE vehicle_number = ?",
        args: [vNum]
      });

      if (existingRes.rows.length === 0) {
        const vId = uuidv4();
        await db.execute({
          sql: `INSERT INTO vehicles (id, customer_id, vehicle_number, vehicle_type, vehicle_model)
                VALUES (?, ?, ?, 'sedan', ?)`,
          args: [vId, customer.id, vNum, customer.vehicle_model || null]
        });
        console.log(`Migrated vehicle ${vNum} for customer ${customer.id}`);
      } else {
        console.log(`Vehicle ${vNum} already exists, skipping.`);
      }
    }

    console.log("=== MIGRATION COMPLETE ===");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    db.close();
  }
}

runMigration();
