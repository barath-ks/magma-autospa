const { createClient } = require('@libsql/client');
const db = createClient({ url: 'file:local.db' });
async function run() {
  const r = await db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name IN ('customers', 'transactions', 'branches')");
  r.rows.forEach(row => console.log(row.sql));
}
run();
