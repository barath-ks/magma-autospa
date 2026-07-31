import { db } from "../lib/db";
async function test() {
  const ids = ['48ECE1B7%', '2F8F9E52%'];
  for (const pattern of ids) {
    const tx = await db.execute({
      sql: `SELECT id FROM transactions WHERE id LIKE ? COLLATE NOCASE`,
      args: [pattern]
    });
    console.log(`Transactions matching ${pattern}:`, tx.rows);
    
    if (tx.rows.length > 0) {
      const fullId = tx.rows[0].id;
      const ts = await db.execute({
        sql: `SELECT * FROM transaction_services WHERE transaction_id = ?`,
        args: [fullId]
      });
      console.log(`Transaction Services for ${fullId}:`, ts.rows);
    }
  }
}
test();
