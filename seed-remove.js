const { createClient } = require('@libsql/client');

const db = createClient({ url: 'file:local.db' });

async function removeSeed() {
  const branchId = 'branch-1';
  
  // Find transactions from June 15, 2026 (Month seed)
  const monthSeedRes = await db.execute({
    sql: "SELECT id FROM transactions WHERE branch_id = ? AND created_at LIKE '2026-06-15 10:0%'",
    args: [branchId]
  });
  
  // Find transactions from July 20, 2026 (Week seed)
  const weekSeedRes = await db.execute({
    sql: "SELECT id FROM transactions WHERE branch_id = ? AND created_at LIKE '2026-07-20 10:0%'",
    args: [branchId]
  });
  
  const idsToRemove = [...monthSeedRes.rows.map(r => r.id), ...weekSeedRes.rows.map(r => r.id)];
  
  if (idsToRemove.length === 0) {
    return console.log('No seed data found to remove.');
  }

  for (const id of idsToRemove) {
    await db.execute({
      sql: 'DELETE FROM transaction_services WHERE transaction_id = ?',
      args: [id]
    });
    await db.execute({
      sql: 'DELETE FROM transactions WHERE id = ?',
      args: [id]
    });
  }
  
  console.log(`Successfully removed ${idsToRemove.length} seeded test transactions!`);
}

removeSeed().catch(console.error);
