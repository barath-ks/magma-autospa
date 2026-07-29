import { db } from "../lib/db";

async function main() {
  console.log("Creating redemptions table...");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS redemptions (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      offer_id TEXT NOT NULL,
      points_redeemed INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
      FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
      FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE RESTRICT
    );
  `);

  console.log("Migration complete!");
}

main().catch(console.error);
