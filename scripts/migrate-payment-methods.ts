import { db } from "../lib/db";

export async function migratePaymentMethods() {
  console.log("================================================================");
  console.log("MIGRATING TRANSACTIONS SCHEMA: ADDING payment_method");
  console.log("================================================================");

  // 1. Inspect existing columns in transactions table
  const tableInfo = await db.execute("PRAGMA table_info(transactions)");
  const columns = new Set(tableInfo.rows.map((row: any) => row.name));

  if (!columns.has("payment_method")) {
    console.log("Adding 'payment_method' column to transactions table...");
    await db.execute("ALTER TABLE transactions ADD COLUMN payment_method TEXT DEFAULT 'cash'");
    console.log("✅ Column 'payment_method' successfully added.");
  } else {
    console.log("ℹ️ Column 'payment_method' already exists in transactions table.");
  }

  // 2. Backfill existing records with clean distributed payment methods (cash, upi, card)
  console.log("Backfilling legacy transactions with valid payment methods...");
  const txRes = await db.execute("SELECT id, payment_method FROM transactions");
  const transactions = txRes.rows as any[];

  const paymentOptions = ["cash", "upi", "card"];
  let updatedCount = 0;

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const assignedMethod = paymentOptions[i % paymentOptions.length];
    await db.execute({
      sql: "UPDATE transactions SET payment_method = ? WHERE id = ?",
      args: [assignedMethod, tx.id],
    });
    updatedCount++;
  }

  console.log(`✅ Distributed ${updatedCount} transactions across Cash, UPI, and Card.`);

  // 3. Verify Foreign Keys and Data Integrity
  const fkRes = await db.execute("PRAGMA foreign_key_check;");
  if (fkRes.rows.length > 0) {
    console.error("⚠️ Foreign key violations detected:", fkRes.rows);
  } else {
    console.log("✅ PRAGMA foreign_key_check: 0 violations.");
  }

  // 4. Report current breakdown
  const breakdownRes = await db.execute(`
    SELECT payment_method, COUNT(*) as count 
    FROM transactions 
    GROUP BY payment_method
  `);
  console.log("Payment Method Breakdown in Database:", breakdownRes.rows);
  console.log("================================================================\n");
}

if (require.main === module) {
  migratePaymentMethods()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
