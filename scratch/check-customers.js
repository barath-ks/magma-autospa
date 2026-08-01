const { createClient } = require('@libsql/client');
const db = createClient({ url: 'file:local.db' });
async function run() {
  const r = await db.execute("SELECT COUNT(*) as count FROM customers");
  console.log('Customer Count:', r.rows[0].count);
}
run();
