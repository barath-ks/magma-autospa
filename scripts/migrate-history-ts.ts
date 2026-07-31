import { db } from "../lib/db";
import { v4 as uuidv4 } from "uuid";

async function run() {
  console.log("Starting History Migration...");

  // 1. Alter transactions to add vehicle columns
  try {
    await db.execute({ sql: "ALTER TABLE transactions ADD COLUMN vehicle_number TEXT" });
    await db.execute({ sql: "ALTER TABLE transactions ADD COLUMN vehicle_model TEXT" });
    console.log("Added vehicle columns to transactions.");
  } catch (e: any) {
    if (!e.message?.includes('duplicate column name')) {
      console.log("Vehicle columns already exist or error occurred:", e.message);
    }
  }

  // 2. Create loyalty ledger table
  try {
    await db.execute({
      sql: `
        CREATE TABLE IF NOT EXISTS loyalty_points_ledger (
          id TEXT PRIMARY KEY,
          customer_id TEXT NOT NULL,
          type TEXT CHECK(type IN ('earned', 'redeemed')) NOT NULL,
          points INTEGER NOT NULL,
          related_transaction_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
          FOREIGN KEY (related_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
        )
      `
    });
    console.log("Created loyalty_points_ledger table.");
  } catch (e) {
    console.error("Error creating ledger table:", e);
  }

  // 3. Backfill vehicles onto transactions
  try {
    const updateRes = await db.execute({
      sql: `
        UPDATE transactions
        SET 
          vehicle_model = (SELECT vehicle_model FROM customers WHERE customers.id = transactions.customer_id),
          vehicle_number = (SELECT vehicle_number FROM customers WHERE customers.id = transactions.customer_id)
        WHERE vehicle_model IS NULL AND vehicle_number IS NULL
      `
    });
    console.log(`Backfilled vehicles for transactions.`);
  } catch (e) {
    console.error("Error backfilling vehicles:", e);
  }

  // 4. Backfill ledger from finished transactions
  try {
    const transactions = await db.execute({
      sql: `SELECT id, customer_id, points_awarded, finished_at FROM transactions WHERE status = 'finished' AND points_awarded > 0`
    });

    if (transactions.rows.length > 0) {
      const batch = transactions.rows.map((row: any) => ({
        sql: `INSERT OR IGNORE INTO loyalty_points_ledger (id, customer_id, type, points, related_transaction_id, created_at) VALUES (?, ?, 'earned', ?, ?, ?)`,
        args: [uuidv4(), row.customer_id, row.points_awarded, row.id, row.finished_at || new Date().toISOString()]
      }));
      await db.batch(batch, "write");
      console.log(`Backfilled ${batch.length} earned points ledger entries.`);
    } else {
      console.log("No finished transactions to backfill ledger.");
    }
  } catch (e) {
    console.error("Error backfilling earned ledger:", e);
  }

  // 5. Backfill ledger from redemptions
  try {
    const redemptions = await db.execute({
      sql: `SELECT id, customer_id, points_redeemed, created_at FROM redemptions`
    });

    if (redemptions.rows.length > 0) {
      const batch = redemptions.rows.map((row: any) => ({
        sql: `INSERT OR IGNORE INTO loyalty_points_ledger (id, customer_id, type, points, related_transaction_id, created_at) VALUES (?, ?, 'redeemed', ?, NULL, ?)`,
        args: [uuidv4(), row.customer_id, row.points_redeemed, row.created_at]
      }));
      await db.batch(batch, "write");
      console.log(`Backfilled ${batch.length} redeemed points ledger entries.`);
    } else {
      console.log("No redemptions to backfill ledger.");
    }
  } catch (e) {
    console.error("Error backfilling redeemed ledger:", e);
  }

  console.log("Migration Complete.");
}

run();
