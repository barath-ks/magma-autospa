const { createClient } = require('@libsql/client');
const path = require('path');

const dbPath = path.resolve(__dirname, '../local.db');
const db = createClient({ url: `file:${dbPath}` });

async function run() {
  try {
    console.log('Adding email column to customers table...');
    await db.execute("ALTER TABLE customers ADD COLUMN email TEXT;");
    console.log('Migration successful.');
  } catch (err) {
    if (err.message && err.message.includes("duplicate column name")) {
      console.log('Column email already exists. Skipping.');
    } else {
      console.error('Migration failed:', err);
      process.exit(1);
    }
  }
}

run();
